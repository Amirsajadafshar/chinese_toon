// ---------------------------------------------------------------------------
// 🔔 سیستم اعلان درون‌حسابی — تنها منبع حقیقت اعلان‌های مشتری (فاز ۵۲)
//
// یک سیستم، یک جدول: ScheduleNotification. از فاز ۴۸ فقط رویدادهای برنامهٔ
// جلسات این‌جا ذخیره می‌شد؛ از فاز ۵۲ رویدادهای حساب/سفارش/پرداخت هم با همان
// مدل و همان APIها ذخیره می‌شوند (ستون category) — سیستم دوم ساخته نمی‌شود.
//
// اصول:
//  • اعلان فقط از رویداد واقعی backend/DB ساخته می‌شود — کلاینت هرگز نمی‌تواند
//    اعلان بسازد یا وضعیت پرداخت را «ادعا» کند.
//  • notifyUser «fire-and-forget» است: خطای اعلان هرگز جریان اصلی (ثبت‌نام/
//    سفارش/پرداخت) را نمی‌شکند و rollback نمی‌کند.
//  • متن اعلان هرگز راز ندارد (بدون هش/توکن/کلید/آدرس کیف پول کامل).
// ---------------------------------------------------------------------------

import { db } from '@/lib/db'

export type NotificationCategory = 'schedule' | 'account' | 'order' | 'payment'

export interface NotifyInput {
  /** گیرنده — null/undefined یعنی اعلانی ساخته نمی‌شود (سفارش مهمان) */
  userId?: string | null
  category: NotificationCategory
  kind: string
  title: string
  body: string
  /** پیوند سفارش مرتبط (CT-XXXXXXXX) — برای اعلان‌های سفارش/پرداخت */
  orderRef?: string | null
}

/** ساخت اعلان fire-and-forget — هرگز throw نمی‌کند */
export function notifyUser(input: NotifyInput): void {
  if (!input.userId) return
  void db.scheduleNotification
    .create({
      data: {
        userId: input.userId,
        category: input.category,
        kind: input.kind,
        title: input.title.slice(0, 160),
        body: input.body.slice(0, 600),
        orderRef: input.orderRef ?? null,
      },
    })
    .catch((e: unknown) => {
      console.error('[notify] failed:', e instanceof Error ? e.message : e)
    })
}

/**
 * اعلان مرتبط با یک سفارش — userId سفارش از DB خوانده می‌شود (هرگز از ورودی
 * مرورگر). سفارش مهمان (userId=null) اعلانی نمی‌گیرد و این خطا نیست.
 */
export async function notifyOrderEvent(
  orderRef: string,
  input: { kind: string; category?: NotificationCategory; title: string; body: string }
): Promise<void> {
  try {
    const order = await db.usdtOrder.findUnique({
      where: { ref: orderRef },
      select: { userId: true },
    })
    if (!order?.userId) return
    notifyUser({
      userId: order.userId,
      category: input.category ?? 'order',
      kind: input.kind,
      title: input.title,
      body: input.body,
      orderRef,
    })
  } catch (e) {
    console.error('[notifyOrderEvent] failed:', e instanceof Error ? e.message : e)
  }
}
