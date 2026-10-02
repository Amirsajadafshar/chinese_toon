// ---------------------------------------------------------------------------
// 🚀 instrumentation — هوک استارت‌آپ سرور (Next.js)
//
// از فاز ۵۲: زمان‌بند پشتیبان‌گیری خودکار این‌جا راه می‌افتد تا حتی بدون هیچ
// بازدیدی، پشتیبان دوره‌ای طبق تنظیمات اجرا شود (بند 10-A).
// در runtime غیر-nodejs (edge) هیچ‌کاری نمی‌کند.
// ---------------------------------------------------------------------------

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // 🟢 PostgreSQL (Vercel + Neon) detection.
    // در PostgreSQL، سه کارِ SQLite-only زیر باید skip شوند:
    //   ۱) ensureDatabaseFile — فایل دیتابیس محلی وجود ندارد (PostgreSQL شبکه‌ای‌ست)
    //   ۲) ensureBackupScheduler — VACUUM INTO / PRAGMA / sqlite_master نامعتبرند؛
    //      بکاپ‌گیری بر عهدهٔ Neon PITR است. (این تابع خودش روی resolveDbPath()==null
    //      گارد دارد، ولی صدا زدنش بی‌فایده است.)
    //   ۳) warmCriticalRoutes — به 127.0.0.1:PORT می‌زند که روی Vercel وجود ندارد.
    // ensureSchema نیز خودش روی PostgreSQL no-op می‌شود (گارد داخلی)، اما برای
    // وضوح و جلوگیری از لاگ‌های بی‌فایده، اینجا هم گارد می‌کنیم.
    const isPostgres = (() => {
      const u = (process.env.DATABASE_URL ?? '').trim().toLowerCase()
      return u.startsWith('postgres')
    })()

    if (isPostgres) {
      // 🟢 PostgreSQL: فقط try ensureSchema به‌عنوان امن‌سازی نهایی — روی
      // PostgreSQL no-op است. بقیهٔ مراحل SQLite-only skip می‌شوند.
      try {
        const { ensureSchema } = await import('@/lib/ensure-schema')
        await ensureSchema({ force: false, reason: 'startup-postgres' })
      } catch (e) {
        console.error('[instrumentation] ensure-schema (postgres) failed:', e instanceof Error ? e.message : e)
      }
      return // 🟢 PostgreSQL startup path کامل شد
    }

    // 🟡 SQLite local-dev path (تغییر نکرده — فقط داخل else قرار گرفت)
    try {
      const { ensureDatabaseFile } = await import('@/lib/db-bootstrap')
      const boot = ensureDatabaseFile()
      if (boot.restored) console.info('[instrumentation] database restored from backup at startup')
      if (boot.warning) console.warn(`[instrumentation] db-bootstrap: ${boot.warning}`)
    } catch (e) {
      console.error('[instrumentation] db-bootstrap failed:', e instanceof Error ? e.message : e)
    }
    try {
      const { ensureBackupScheduler } = await import('@/lib/backup/scheduler')
      ensureBackupScheduler()
    } catch (e) {
      console.error('[instrumentation] backup scheduler failed to start:', e instanceof Error ? e.message : e)
    }
    // 🛠️ فاز ۶۳ — خودترمیمیِ اسکیما در استارت‌آپ (SQLite فقط)
    try {
      const { ensureSchema } = await import('@/lib/ensure-schema')
      const schema = await ensureSchema({ force: true, reason: 'startup' })
      if (schema.createdTables.length > 0 || schema.addedColumns.length > 0) {
        console.warn(
          `[instrumentation] schema self-healing: created [${schema.createdTables.join(', ') || 'none'}], ` +
            `added columns [${schema.addedColumns.join(', ') || 'none'}]`
        )
      }
      if (schema.errors.length > 0) {
        console.error('[instrumentation] ensure-schema partial errors:', schema.errors.slice(0, 5))
      }
    } catch (e) {
      console.error('[instrumentation] ensure-schema failed:', e instanceof Error ? e.message : e)
    }
    // 🔥 گرم‌کردن مسیرهای حیاتی — فقط در dev محلی (SQLite). روی Vercel بی‌معنی است.
    void warmCriticalRoutes()
  }
}

/** گرم‌کردن مسیرهای حیاتی — فقط GETهای بی‌اثر؛ خطاها نادیده گرفته می‌شوند */
function warmCriticalRoutes(): void {
  const port = process.env.PORT ?? '3000'
  const routes = ['/', '/api/auth/me', '/api/settings', '/api/classes', '/api/payment-settings', '/api/auth/login', '/api/auth/register']
  const warm = (delayMs: number): void => {
    setTimeout(() => {
      for (const route of routes) {
        fetch(`http://127.0.0.1:${port}${route}`, { method: 'GET', cache: 'no-store' })
          .then(() => {
            if (route === '/') console.info('[instrumentation] warmup done')
          })
          .catch(() => {
            /* مسیر هنوز آماده نیست — مهم نیست؛ سرور خودش بعداً کامپایل می‌کند */
          })
      }
    }, delayMs)
  }
  warm(3_000) // تلاش اول بعد از بوت
  warm(12_000) // تلاش دوم برای مسیرهایی که هنوز گرم نشده‌اند
}

// ---------------------------------------------------------------------------
// 🚨 فاز ۵۳ (بند ۱۲) — هوک سراسری خطاهای سمت سرور Next.js: هر خطای گرفته‌نشده
// در route/actionها یک ردیف ErrorLog (category=SERVER) می‌سازد — با پیام امن
// و مسیر؛ بدون stack و بدون هیچ راز. شکستِ خودِ لاگ‌گیری هرگز منتشر نمی‌شود.
// ---------------------------------------------------------------------------
export async function onRequestError(
  request: Request,
  error: unknown,
  context: { routerKind?: string; routePath?: string; routeType?: string; revalidateReason?: string }
): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  try {
    const { logAppError } = await import('@/lib/error-log')
    let path = ''
    try {
      path = new URL(request.url).pathname
    } catch {
      path = ''
    }
    logAppError({
      category: 'SERVER',
      error,
      context: {
        path,
        routeKind: context?.routerKind,
        route: context?.routePath,
        method: request instanceof Request ? request.method : undefined,
      },
    })
  } catch {
    // لاگ‌گیری هرگز خودش خطا نمی‌اندازد
  }
}
