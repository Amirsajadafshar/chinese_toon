// ---------------------------------------------------------------------------
// 🎓 وضعیت ثبت‌نام/عضویت (Enrollment) — مشتق‌شده از رکوردهای واقعی دیتابیس
//
// قانون طلایی (درخواست مالک): وضعیت ثبت‌نام هرگز از «وضعیت پرداخت» حدس زده
// نمی‌شود — سفارشِ پرداخت‌نشده هرگز «عضو فعال» نیست. این ماژول زنجیرهٔ
//   حساب کاربری → سفارش → پرداخت → ترجیحات برنامه → برنامهٔ جلسات
// را از رکوردهای User / UsdtOrder / Registration / ClassSchedule می‌سازد و
// یک برچسب واحدِ قابل‌فهم برای پنل ادمین و صفحهٔ حساب کاربری برمی‌گرداند.
//
// هیچ وضعیتی ذخیره نمی‌شود — همیشه لحظهٔ نمایش از دیتابیس محاسبه می‌شود
// (منبع یگانهٔ حقیقت؛ بدون مشکل همگام‌سازی).
// ---------------------------------------------------------------------------

export type EnrollmentStatus =
  | 'REGISTERED' // حساب ساخته شده — هنوز سفارشی ندارد (فقط صفحهٔ حساب)
  | 'ORDERED' // سفارش ساخته شده — پرداخت تأیید نشده
  | 'PAID' // پرداخت تأییدشده — در انتظار برنامه‌ریزی
  | 'PREFERENCES_SUBMITTED' // پرداخت‌شده + ترجیحات برنامه ثبت کرده
  | 'SCHEDULE_PROPOSED' // ادمین برنامهٔ جلسات پیشنهاد داده (در انتظار تأیید)
  | 'ENROLLED' // جلسهٔ تأییدشده دارد — دانش‌پذیر فعال
  | 'COMPLETED' // همهٔ جلساتش برگزار/تکمیل شده

/** ترتیب پیشرفت زنجیره — برای استپر ادمین و مقایسه */
export const ENROLLMENT_STEPS: EnrollmentStatus[] = [
  'REGISTERED',
  'ORDERED',
  'PAID',
  'PREFERENCES_SUBMITTED',
  'SCHEDULE_PROPOSED',
  'ENROLLED',
  'COMPLETED',
]

export function enrollmentStepIndex(s: EnrollmentStatus): number {
  return ENROLLMENT_STEPS.indexOf(s)
}

export function isEnrolledActive(s: EnrollmentStatus): boolean {
  return s === 'ENROLLED'
}

/**
 * مشتق‌سازی وضعیت ثبت‌نام برای «یک سفارش».
 *  • پرداخت تأییدنشده (PENDING/DETECTED/UNDERPAID/EXPIRED/CANCELLED) → ORDERED
 *    (حتی اگر جلسه‌ای برایش ثبت شده باشد — بدون پرداخت، عضویت قطعی نمی‌شود)
 *  • پرداخت‌شده: بالاترین مرحلهٔ واقعی از وضعیت جلسات ClassSchedule
 */
export function deriveEnrollmentStatus(input: {
  paid: boolean // status === 'PAID' روی رکورد سفارش
  scheduleStatuses: string[] // وضعیت جلسات مرتبط با این سفارش/کلاس
  hasPreferences: boolean // Registration با ترجیحات ساخت‌یافتهٔ برنامه
}): EnrollmentStatus {
  if (!input.paid) return 'ORDERED'
  const st = input.scheduleStatuses
  if (st.includes('CONFIRMED')) return 'ENROLLED'
  if (st.includes('PROPOSED')) return 'SCHEDULE_PROPOSED'
  if (st.includes('COMPLETED')) return 'COMPLETED'
  if (input.hasPreferences) return 'PREFERENCES_SUBMITTED'
  return 'PAID'
}

/** برچسب انگلیسی هر وضعیت — برای نمایش در پنل (محتوای نمایشی از site-content می‌آید) */
export const ENROLLMENT_LABELS: Record<EnrollmentStatus, string> = {
  REGISTERED: 'Registered',
  ORDERED: 'Ordered (unpaid)',
  PAID: 'Paid — awaiting scheduling',
  PREFERENCES_SUBMITTED: 'Preferences submitted',
  SCHEDULE_PROPOSED: 'Schedule proposed',
  ENROLLED: 'Enrolled — active',
  COMPLETED: 'Completed',
}
