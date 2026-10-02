// ---------------------------------------------------------------------------
// ⏱️ شیدولر سفارش‌ها — حلقهٔ سبک روی globalThis (سازگار با HMR حالت توسعه)
//
// فاز ۵۹: با حذف جریان آنلاین USDT/TRON، دیگر هیچ اسکن زنجیره‌ای وجود ندارد.
// تنها کار باقی‌مانده، بهداشت سفارش‌هاست — هر ۶۰ ثانیه:
//   ۱) سفارش‌های قدیمیِ پرداخت‌نشدهٔ بانکی (PENDING + منقضی) EXPIRED می‌شوند
//      (سهمیهٔ کد تخفیفشان هم آزاد می‌شود)
//   ۲) سفارش‌های قدیمیِ USDT (شبکهٔ TRON) هم برای سازگاریِ تاریخی منقضی می‌شوند
// RECEIPT_SUBMITTED هرگز منقضی نمی‌شود (تصمیم با ادمین است، نه تایمر) و
// هیچ مسیر خودکاری برای PAID وجود ندارد — تأیید فقط دستیِ ادمین است.
//
// ضد-اجرای هم‌زمان: اگر یک دور بیش از ۶۰ ثانیه طول بکشد، دور بعدی «رد می‌شود».
// نکتهٔ HMR: با «شمارهٔ نسخه» روی globalThis، ماژول جدید اینتروال کهنه را
// جایگزین می‌کند (بالا بردن SCHEDULER_VERSION = تعویض حلقه).
// ---------------------------------------------------------------------------

import { expireStaleOrders } from './service'

const SWEEP_INTERVAL_MS = 60_000
const SCHEDULER_VERSION = 5 // ← بالابردن نسخه = تعویض حلقه‌های کهنه پس از HMR

const g = globalThis as unknown as {
  __ctPayScheduler?: ReturnType<typeof setInterval>
  __ctPaySchedulerVersion?: number
  __ctPaySweepRunning?: boolean
}

/** فقط یک حلقهٔ زنده و فقط یک دور هم‌زمان نگه می‌دارد — از مسیرهای API فراخوانی می‌شود */
export function ensurePaymentScheduler(): void {
  if (g.__ctPayScheduler && g.__ctPaySchedulerVersion === SCHEDULER_VERSION) return
  if (g.__ctPayScheduler) {
    clearInterval(g.__ctPayScheduler) // حلقهٔ کهنهٔ نسخهٔ قبل (کلوزرهای قدیمی) — تعویض
  }
  const iv = setInterval(() => {
    if (g.__ctPaySweepRunning) return // دور قبلی هنوز تمام نشده — رد شود (idempotent)
    g.__ctPaySweepRunning = true
    Promise.resolve()
      .then(async () => {
        const bank = await expireStaleOrders('BANK')
        const legacy = await expireStaleOrders('mainnet')
        if (bank + legacy > 0) {
          console.log(`[payments] expiry sweep: ${bank} bank + ${legacy} legacy orders expired`)
        }
      })
      .catch((e) => {
        console.error('[payments] expiry sweep failed:', e instanceof Error ? e.message : e)
      })
      .finally(() => {
        g.__ctPaySweepRunning = false
      })
  }, SWEEP_INTERVAL_MS)
  // نباید پروسه را سرپا نگه دارد
  if (typeof iv.unref === 'function') iv.unref()
  g.__ctPayScheduler = iv
  g.__ctPaySchedulerVersion = SCHEDULER_VERSION
}
