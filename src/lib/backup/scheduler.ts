// ---------------------------------------------------------------------------
// ⏱️ شیدولر پشتیبان‌گیری خودکار (فاز ۵۲ — بند 10-A)
//
// هر ۶۰ ثانیه تنظیمات را از دیتابیس می‌خواند؛ اگر پشتیبان خودکارِ موفقِ قبلی
// قدیمی‌تر از intervalHours باشد، یک پشتیبان SCHEDULED می‌سازد. نتیجهٔ هر
// پشتیبان (موفق/ناموفق) در جدول BackupLog ثبت می‌شود.
//
// شروع از src/instrumentation.ts (register) — یعنی حتی بدون بازدید ادمین هم
// پشتیبان خودکار اجرا می‌شود. الگوی ضد-HMR و ضد-اجرای موازی، همان الگوی
// شیدولر پرداخت است (نسخه روی globalThis).
// ---------------------------------------------------------------------------

import { db } from '@/lib/db'
import { createBackup, getBackupSettings, resolveDbPath } from './service'

const TICK_MS = 60_000
const SCHEDULER_VERSION = 2 // 🛡️ v2: گارد قناری دیتابیسِ خالی (تسک ۸۴)

const g = globalThis as unknown as {
  __ctBackupScheduler?: ReturnType<typeof setInterval>
  __ctBackupSchedulerVersion?: number
  __ctBackupTickRunning?: boolean
}

async function tick(): Promise<void> {
  if (g.__ctBackupTickRunning) return // دور قبلی تمام نشده — رد شود
  g.__ctBackupTickRunning = true
  try {
    const settings = await getBackupSettings()
    if (!settings.enabled) return
    const last = await db.backupLog.findFirst({
      where: { status: 'SUCCESS', trigger: 'SCHEDULED' },
      orderBy: { startedAt: 'desc' },
    })
    const due = !last || Date.now() - last.startedAt.getTime() >= settings.intervalHours * 3_600_000
    if (!due) return
    // 🛡️ گارد قناری (تسک ۸۴) — در هر دو حادثهٔ پاک‌سازی، همهٔ جدول‌ها صفر ردیف
    // شدند. پشتیبان‌گرفتن از دیتابیس خالی، بدترین سناریو است: اسم «SCHEDULED
    // SUCCESS» می‌گیرد و بعداً بازیابی را گمراه می‌کند. اگر قناری صفر بود،
    // پشتیبان رد شود و هشدار پررنگ ثبت گردد تا در dev.log فوراً دیده شود.
    const [canaryPosts, canaryUsers, canaryClasses] = await Promise.all([
      db.post.count(),
      db.user.count(),
      db.courseClass.count(),
    ])
    if (canaryPosts === 0 && canaryUsers === 0 && canaryClasses === 0) {
      console.error(
        '[backup-scheduler] 🚨 CANARY TRIPPED: live DB looks WIPED (0 posts, 0 users, 0 classes) — scheduled backup SKIPPED to protect real snapshots. Investigate immediately!'
      )
      return
    }
    const result = await createBackup('SCHEDULED')
    if (result.ok) {
      console.log(`[backup-scheduler] scheduled backup done: ${result.filename}`)
    } else {
      // شکست ثبت و لاگ می‌شود — دور بعدی دوباره تلاش می‌کند (بند 10-G)
      console.error(`[backup-scheduler] scheduled backup failed: ${result.error ?? 'unknown'}`)
    }
  } catch (e) {
    console.error('[backup-scheduler] tick failed:', e instanceof Error ? e.message : e)
  } finally {
    g.__ctBackupTickRunning = false
  }
}

/** فقط یک حلقهٔ زنده — از instrumentation و مسیرهای API فراخوانی می‌شود */
export function ensureBackupScheduler(): void {
  try {
    if (!resolveDbPath()) return // دیتابیس SQLite نیست — زمان‌بند معنا ندارد
    if (g.__ctBackupScheduler && g.__ctBackupSchedulerVersion === SCHEDULER_VERSION) return
    if (g.__ctBackupScheduler) clearInterval(g.__ctBackupScheduler) // حلقهٔ کهنه پس از HMR
    const iv = setInterval(() => {
      void tick()
    }, TICK_MS)
    if (typeof iv.unref === 'function') iv.unref() // نباید پروسه را سرپا نگه دارد
    g.__ctBackupScheduler = iv
    g.__ctBackupSchedulerVersion = SCHEDULER_VERSION
    // بررسی فوری هنگام بوت — اگر موعد رسیده باشد همان‌جا پشتیبان می‌سازد
    void tick()
  } catch (e) {
    console.error('[backup-scheduler] start failed:', e instanceof Error ? e.message : e)
  }
}
