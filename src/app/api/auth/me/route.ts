// ---------------------------------------------------------------------------
// 👤 GET /api/auth/me — پروفایل کاربر جاری + سفارش‌هایش با وضعیت واقعی
// وضعیت هر سفارش با deriveOrderStatus از دیتابیس محاسبه می‌شود (PENDINGِ
// منقضی‌شده = EXPIRED) — هیچ وضعیتی ساختگی نیست.
// 🎓 بند ۴ تسک: برای هر سفارش «وضعیت ثبت‌نام» (enrollment) هم جدا از وضعیت
// پرداخت، مشتق از رکوردهای ClassSchedule/Registration محاسبه و برگردانده
// می‌شود — سفارشِ پرداخت‌نشده هرگز «عضو فعال» نمایش داده نمی‌شود.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, toSafeUser } from '@/lib/user-auth'
import { deriveOrderStatus, microToUsdString } from '@/lib/order-status'
import { deriveEnrollmentStatus, enrollmentStepIndex, type EnrollmentStatus } from '@/lib/enrollment'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ user: null }, { status: 200 })

    const orders = await db.usdtOrder.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        ref: true,
        productTitle: true,
        productId: true,
        expectedMicro: true,
        txAmountMicro: true,
        status: true,
        txHash: true,
        paidAt: true,
        expiresAt: true,
        createdAt: true,
        packageSessions: true,
        discountCode: true,
        discountAmount: true,
        // 💳 فاز ۵۹ — روش پرداخت و وضعیت رسید دستی
        currency: true,
        paymentMethod: true,
        receiptStatus: true,
        receiptId: true,
        receiptSubmittedAt: true,
        reviewedAt: true,
        rejectionReason: true,
      },
    })

    // 🎓 زنجیرهٔ ثبت‌نام: کلاس متناظر هر productId + جلسات + ترجیحات ثبت‌شده
    const productIds = Array.from(new Set(orders.map((o) => o.productId)))
    const classes = productIds.length
      ? await db.courseClass.findMany({
          where: { productId: { in: productIds } },
          select: { id: true, productId: true, slug: true },
        })
      : []
    const classByProduct = new Map(classes.map((c) => [c.productId, c]))
    const classIds = Array.from(new Set(classes.map((c) => c.id)))

    const schedules = user.id && classIds.length
      ? await db.classSchedule.findMany({
          where: { userId: user.id, classId: { in: classIds } },
          select: { id: true, classId: true, startAt: true, status: true },
          orderBy: { startAt: 'asc' },
        })
      : []

    const now = new Date()
    const registration = await db.registration.findFirst({
      where: { email: user.email },
      orderBy: { createdAt: 'desc' },
      select: { preferredDays: true, preferredTimes: true },
    })
    const hasPreferences: boolean =
      !!registration &&
      ((!!registration.preferredDays && registration.preferredDays !== '[]') ||
        (!!registration.preferredTimes && registration.preferredTimes !== '[]'))

    // وضعیت ثبت‌نام هر سفارش + وضعیت کلی (پیشرفته‌ترین مرحلهٔ واقعی)
    const perOrder = orders.map((o) => {
      const cls = classByProduct.get(o.productId)
      const relevant = cls ? schedules.filter((s) => s.classId === cls.id) : []
      const enrollment = deriveEnrollmentStatus({
        paid: o.status === 'PAID',
        scheduleStatuses: Array.from(new Set(relevant.map((s) => s.status))),
        hasPreferences: hasPreferences,
      })
      const upcoming = relevant
        .filter((s) => (s.status === 'PROPOSED' || s.status === 'CONFIRMED') && s.startAt.getTime() > now.getTime())
        .sort((a, b) => a.startAt.getTime() - b.startAt.getTime())[0]
      return { o, enrollment, nextSessionAt: upcoming?.startAt.toISOString() ?? null }
    })
    const overall = perOrder.reduce<EnrollmentStatus>(
      (acc, cur) => (enrollmentStepIndex(cur.enrollment) > enrollmentStepIndex(acc) ? cur.enrollment : acc),
      perOrder.length > 0 ? 'ORDERED' : 'REGISTERED'
    )

    return NextResponse.json({
      user: toSafeUser(user),
      // 🎓 وضعیت کلی ثبت‌نام کاربر (کارت وضعیت حساب) — مشتق از دیتابیس
      enrollmentStatus: overall,
      hasSchedulePreferences: hasPreferences,
      orders: perOrder.map(({ o, enrollment, nextSessionAt }) => ({
        ref: o.ref,
        productTitle: o.productTitle,
        productId: o.productId,
        classSlug: classByProduct.get(o.productId)?.slug ?? null,
        sessions: o.packageSessions ?? null,
        amountUsd: microToUsdString(o.expectedMicro),
        status: deriveOrderStatus(o), // وضعیت واقعی — PENDING منقضی = EXPIRED
        rawStatus: o.status,
        // 🎓 وضعیت ثبت‌نام جدا از پرداخت — از رکوردهای واقعی
        enrollmentStatus: enrollment,
        nextSessionAt,
        discountCode: o.discountCode ?? null,
        // 💳 فاز ۵۹ — روش پرداخت، وضعیت رسید و دلیل ردّ (برای مالکِ سفارش)
        currency: o.currency || 'USD',
        paymentMethod: o.paymentMethod || 'USDT_TRON',
        receiptStatus: o.receiptStatus ?? null,
        receiptUrl: o.receiptId ? `/api/receipts/${o.receiptId}` : null,
        receiptSubmittedAt: o.receiptSubmittedAt?.toISOString() ?? null,
        reviewedAt: o.reviewedAt?.toISOString() ?? null,
        rejectionReason: o.rejectionReason ?? null,
        txHash: o.txHash,
        paidAt: o.paidAt?.toISOString() ?? null,
        createdAt: o.createdAt.toISOString(),
        expiresAt: o.expiresAt.toISOString(),
      })),
    })
  } catch (e) {
    console.error('[GET /api/auth/me] error:', e instanceof Error ? e.message : e)
    return NextResponse.json({ user: null, error: 'Failed to load profile' }, { status: 500 })
  }
}
