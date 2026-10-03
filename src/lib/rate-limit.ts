// ---------------------------------------------------------------------------
// 🚦 محدودساز نرخ درخواست (Rate Limit) — DB-backed (فاز ۶۴)
// برای جلوگیری از brute-force ورود مدیر و اسپم فرم‌های عمومی.
// پنجرهٔ لغزان: اگر درخواست‌های یک IP از سقف عبور کند تا پایان پنجره بلاک است.
// نکته: نسخهٔ قبلی شمارنده‌ها را در حافظهٔ پروسه نگه می‌داشت که فقط در استقرار
// تک‌پروسه‌ای معنا داشت؛ روی Serverless (Vercel) هر نمونه شمارش مستقل می‌گرفت
// و سقف تلاش عملاً دور زدنی بود. اکنون شمارش در جدول‌های RateEvent و RateBlock
// بین همهٔ نمونه‌ها مشترک است.
// سیاست شکست: خطای دیتابیس = fail-open (فقط console.error) تا یک لغزش موقت DB
// کل مسیرهای عمومی را از کار نیندازد؛ این لایه دفاعی تکمیلی است، نه قلب سرویس.
// ---------------------------------------------------------------------------

import { db } from '@/lib/db'

// هر از گاهی ردیف‌های کهنه پاک می‌شوند تا جدول رشد نکند
// (پنجرهٔ پاک‌سازی: هر ۵ دقیقه؛ ردیف‌های بیش از یک ساعت قبل حذف می‌شوند —
// بزرگ‌ترین پنجرهٔ استفاده‌شده در call-siteها ۳۰ دقیقه است، پس یک ساعت امن است.
// هر نمونه مستقل و throttled پاک‌سازی می‌کند؛ deleteMany خودش idempotent است.)
const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanup(now: number): void {
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  const cutoff = new Date(now - 60 * 60 * 1000)
  void db.rateEvent.deleteMany({ where: { createdAt: { lt: cutoff } } }).catch(() => {})
  void db.rateBlock.deleteMany({ where: { until: { lt: cutoff } } }).catch(() => {})
}

/**
 * IP تقریبی کلاینت — در محیط پراکسی از هدر x-forwarded-for
 *
 * 🛡️ مدل اعتماد (سخت‌سازی امنیتی): «آخرین» عضو X-Forwarded-For استفاده می‌شود,
 * نه اولی. آخرین عضو را نزدیک‌ترین پراکسیِ قابل‌اعتماد به سرور اضافه می‌کند و
 * کلاینت نمی‌تواند آن را دست‌کاری کند؛ عضو اول در زنجیره‌های چندپراکسی تحت کنترل
 * مهاجم است. در استقرار Caddy مقدار XFF با remote_host واقعی «جایگزین» می‌شود
 * (Caddyfile: header_up X-Forwarded-For {remote_host})، پس تک‌عضوی است —
 * اما اگر روزی زنجیره عوض شد/پراکسی به‌جای جایگزینی الحاق کرد، «آخرین» همچنان
 * مقدار درست است و جعل هدرِ کلاینت هیچ‌وقت سطلِ rate-limit را دور نمی‌زند.
 * روی Vercel نیز Vercel خودش XFF را از لبه تنظیم می‌کند و آخرین عضو معتبر است.
 */
export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) {
    const parts = fwd.split(',').map((p) => p.trim()).filter((p) => p.length > 0)
    if (parts.length > 0) return parts[parts.length - 1] // ← نزدیک‌ترین هاپ به خودِ سرور
  }
  return req.headers.get('x-real-ip')?.trim() || 'local'
}

export interface RateResult {
  ok: boolean
  /** ثانیه تا رفع قفل (وقتی ok=false) */
  retryAfter: number
  remaining: number
}

/**
 * بررسی/ثبت یک درخواست در سطلِ name برای این IP — async؛ حتماً await شود.
 * limit: سقف درخواست در windowSec ثانیه.
 * lockoutSec: در صورت عبور از سقف، چقدر کامل بلاک بماند.
 */
export async function rateLimit(
  name: string,
  req: Request,
  limit: number,
  windowSec: number,
  lockoutSec = windowSec
): Promise<RateResult> {
  const now = Date.now()
  cleanup(now)
  const key = `${name}:${clientIp(req)}`
  const windowMs = windowSec * 1000

  try {
    // در حالت قفل؟
    const block = await db.rateBlock.findUnique({ where: { bucketKey: key } })
    if (block && block.until.getTime() > now) {
      return {
        ok: false,
        retryAfter: Math.ceil((block.until.getTime() - now) / 1000),
        remaining: 0,
      }
    }

    // تعداد درخواست‌های داخل پنجرهٔ لغزان
    const hits = await db.rateEvent.count({
      where: { bucketKey: key, createdAt: { gt: new Date(now - windowMs) } },
    })

    if (hits >= limit) {
      const until = new Date(now + lockoutSec * 1000)
      await db.rateBlock.upsert({
        where: { bucketKey: key },
        update: { until },
        create: { bucketKey: key, until },
      })
      return { ok: false, retryAfter: lockoutSec, remaining: 0 }
    }

    await db.rateEvent.create({ data: { bucketKey: key } })
    return { ok: true, retryAfter: 0, remaining: limit - hits - 1 }
  } catch (e) {
    // fail-open: دیتابیس در دسترس نیست → اجازهٔ عبور؛ فقط در لاگ
    console.error('[rate-limit] db unavailable — fail-open:', e instanceof Error ? e.message : e)
    return { ok: true, retryAfter: 0, remaining: limit }
  }
}

/** پاسخ استاندارد 429 با هدر Retry-After */
export function tooManyRequests(r: RateResult): Response {
  return new Response(
    JSON.stringify({ error: 'Too many requests. Please try again later.' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(Math.max(1, r.retryAfter)),
      },
    }
  )
}
