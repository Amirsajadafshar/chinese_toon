// ---------------------------------------------------------------------------
// 🧾 GET /api/admin/orders/[ref] — جزئیات کامل یک سفارش برای پنل ادمین
//
// زنجیرهٔ کامل را با دادهٔ واقعی دیتابیس برمی‌گرداند:
//   User (حساب) → UsdtOrder (سفارش) → CourseClass (کلاس)
//   → PaymentEvent (پرداخت/راستی‌آزمایی) → ClassSchedule + Registration
//
// امنیت: فقط x-admin-key؛ passwordHash و رازها هرگز select نمی‌شوند.
// وضعیت‌ها سمت سرور مشتق می‌شوند (deriveOrderStatus/deriveEnrollmentStatus).
// لغو سفارش از همان مسیر موجود PATCH /api/payments/orders/[ref] انجام می‌شود
// (یک سیستم، یک مسیر — سیستم موازی ساخته نمی‌شود).
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isAuthorized } from '@/lib/admin-auth'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { buildAdminOrderRows } from '@/lib/payments/admin-orders'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, ctx: { params: Promise<{ ref: string }> }) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const rl = rateLimit('admin-orders-detail', req, 120, 60, 60)
  if (!rl.ok) return tooManyRequests(rl)

  const { ref } = await ctx.params

  try {
    const order = await db.usdtOrder.findUnique({
      where: { ref },
      select: {
        ref: true, userId: true, productId: true, productTitle: true,
        contactName: true, contactEmail: true, expectedMicro: true, status: true,
        currency: true, network: true, paymentMode: true, paymentAddress: true,
        addressIndex: true, expiresAt: true, createdAt: true, updatedAt: true,
        txHash: true, txAmountMicro: true, txFrom: true, paidAt: true,
        pricePerSession: true, packageSessions: true, baseAmount: true,
        tierPercent: true, discountCode: true, discountAmount: true,
        discountType: true, discountValue: true,
      },
    })
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    const [row] = await buildAdminOrderRows([order])
    if (!row) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    // 🎓 ردیف کلاس — برای جزئیات کامل (لینک صفحهٔ عمومی کلاس)
    const cls = await db.courseClass.findUnique({
      where: { productId: order.productId },
      select: { id: true, slug: true, title: true, level: true, classType: true, packageSessions: true, packagePrice: true, status: true },
    })

    // 🗓️ جلسات مرتبط (کامل) — با orderRef یا زنجیرهٔ userId+classId
    const userId = order.userId
    const clsId = cls?.id ?? null
    const schedules =
      userId && clsId
        ? await db.classSchedule.findMany({
            where: { OR: [{ orderRef: ref }, { userId, classId: clsId }] },
            orderBy: { startAt: 'asc' },
            select: {
              id: true, orderRef: true, startAt: true, endAt: true, durationMin: true,
              status: true, timezone: true, inputDate: true, inputTime: true, note: true,
              createdAt: true, updatedAt: true,
            },
          })
        : []

    // 📝 ثبت‌نام‌های همان ایمیل — آخرین ۳ مورد (ترجیحات برنامه)
    const email = (order.contactEmail || '').trim().toLowerCase()
    const registrations = email
      ? await db.registration.findMany({
          where: { email: { equals: email } },
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: {
            id: true, name: true, email: true, level: true, classType: true, classTitle: true,
            timezone: true, preferredDays: true, preferredTimes: true, daysPerWeek: true,
            scheduleAck: true, status: true, createdAt: true,
          },
        })
      : []

    // 🧾 رویدادهای پرداخت همین سفارش — خط زمانی راستی‌آزمایی
    const events = await db.paymentEvent.findMany({
      where: { orderRef: ref },
      orderBy: { createdAt: 'desc' },
      take: 60,
      select: { id: true, kind: true, orderRef: true, txHash: true, detail: true, createdAt: true },
    })

    return NextResponse.json({
      order: row,
      class: cls,
      schedules,
      registrations,
      events,
      // انقضای خام برای نمایش شمارش معکوس ادمین
      expiresAt: order.expiresAt.toISOString(),
      addressIndex: order.addressIndex,
      currency: order.currency,
    })
  } catch (e) {
    console.error('[GET /api/admin/orders/[ref]] error:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Failed to load order details' }, { status: 500 })
  }
}
