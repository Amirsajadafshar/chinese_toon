// ---------------------------------------------------------------------------
// 📊 استخراج وضعیت واقعی سفارش/خرید از دیتابیس — منبع یگانهٔ حقیقت
//
// قانون طلایی (درخواست مالک، فاز ۳۰): وضعیت نمایش‌داده‌شده در پنل ادمین و
// صفحهٔ کاربر باید از رکوردهای واقعی دیتابیس محاسبه شود — هرگز متن تزئینی
// نیست. سفارشی که PENDING است و زمان انقضایش گذشته، در نمایش «EXPIRED» است
// حتی اگر سوئیپر هنوز رکورد را به‌روز نکرده باشد.
//
// فاز ۵۹ — جریان پرداخت دستی (کارت بانکی + رسید):
//   RECEIPT_SUBMITTED = رسید آپلود شده و در انتظار بررسی ادمین — هرگز منقضی
//   نمایش داده نمی‌شود (مثل DETECTED؛ تصمیم با انسان است نه تایمر)
//   REJECTED = ادمین رسید را رد کرده — وضعیت پایانی تا ارسال دوبارهٔ رسید
// ---------------------------------------------------------------------------

export type DerivedOrderStatus =
  | 'PENDING' | 'DETECTED' | 'PAID' | 'UNDERPAID' | 'EXPIRED' | 'CANCELLED'
  | 'RECEIPT_SUBMITTED' | 'REJECTED'

/**
 * وضعیت مؤثر یک سفارش — انقضا لحظه‌ای محاسبه می‌شود.
 * DETECTED = (جریان قدیمی USDT) انتقال روی زنجیره دیده شده ولی تأیید نشده.
 * RECEIPT_SUBMITTED = رسید دستی در انتظار بررسی ادمین — هرگز منقضی نمی‌شود.
 */
export function deriveOrderStatus(order: { status: string; expiresAt: Date }, now = new Date()): DerivedOrderStatus {
  if (order.status === 'PAID') return 'PAID'
  if (order.status === 'RECEIPT_SUBMITTED') return 'RECEIPT_SUBMITTED'
  if (order.status === 'REJECTED') return 'REJECTED'
  if (order.status === 'UNDERPAID') return 'UNDERPAID'
  if (order.status === 'CANCELLED') return 'CANCELLED'
  if (order.status === 'DETECTED') return 'DETECTED'
  // PENDING — اگر مهلت تمام شده باشد نمایش EXPIRED است
  if (order.expiresAt.getTime() < now.getTime()) return 'EXPIRED'
  return 'PENDING'
}

export type PurchaseStatus =
  | 'NO_PURCHASE' | 'UNPAID' | 'UNDERPAID' | 'PAID' | 'EXPIRED' | 'CANCELLED'
  | 'RECEIPT_SUBMITTED'

/**
 * وضعیت خرید تجمیعیِ یک کاربر از روی همهٔ سفارش‌هایش.
 * اولویت‌بندی برای پیگیری ادمین:
 *  ۱) RECEIPT_SUBMITTED — رسیدی در انتظار بررسی ادمین (فوری‌ترین اقدام)
 *  ۲) UNPAID    — سفارش بازِ در انتظار پرداخت
 *  ۳) UNDERPAID — پرداخت ناکافی (جریان قدیمی)
 *  ۴) PAID      — حداقل یک خرید موفق
 *  ۵) EXPIRED   — سفارشی بدون پرداخت منقضی شده
 *  ۶) CANCELLED — فقط سفارش لغوشده
 *  ۷) NO_PURCHASE — ثبت‌نام کرده ولی هیچ سفارشی نساخته
 */
export function derivePurchaseStatus(
  orders: Array<{ status: string; expiresAt: Date }>,
  now = new Date()
): PurchaseStatus {
  const derived = orders.map((o) => deriveOrderStatus(o, now))
  if (derived.includes('RECEIPT_SUBMITTED')) return 'RECEIPT_SUBMITTED'
  // PENDING و DETECTED هر دو «پرداخت در جریان»اند — در همان سبد UNPAID پیگیری
  if (derived.includes('PENDING') || derived.includes('DETECTED')) return 'UNPAID'
  if (derived.includes('UNDERPAID')) return 'UNDERPAID'
  if (derived.includes('PAID')) return 'PAID'
  if (derived.includes('EXPIRED')) return 'EXPIRED'
  if (derived.includes('CANCELLED')) return 'CANCELLED'
  return 'NO_PURCHASE'
}

/** تبدیل میکرو به رشتهٔ نمایشی — تماماً عدد صحیح، بدون خطای اعشار */
export function microToUsdString(micro: number): string {
  const negative = micro < 0
  const abs = Math.abs(Math.trunc(micro))
  const whole = Math.floor(abs / 1_000_000)
  const frac = abs % 1_000_000
  const frac6 = frac.toString().padStart(6, '0').replace(/0+$/, '') || '0'
  const s = frac6 === '0' ? `${whole}` : `${whole}.${frac6}`
  return negative ? `-${s}` : s
}
