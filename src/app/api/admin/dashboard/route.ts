// ---------------------------------------------------------------------------
// 📊 GET /api/admin/dashboard — آمار واقعی داشبورد ادمین (فاز ۵۲ — بند ۷)
//
// همهٔ اعداد «همین لحظه» از دیتابیس محاسبه می‌شوند (COUNT/aggregate سرور) —
// هیچ آمار مهمی در مرورگر از روی دادهٔ بارگذاری‌شده حساب نمی‌شود.
// محرمانگی: هیچ رمز/هش/توکن/راز در پاسخ نیست؛ کاربران فقط فیلدهای امن.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isAuthorized } from '@/lib/admin-auth'
import { deriveOrderStatus, microToUsdString, type DerivedOrderStatus } from '@/lib/order-status'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const now = new Date()
    const d7 = new Date(Date.now() - 7 * 24 * 3600 * 1000)
    const d30 = new Date(Date.now() - 30 * 24 * 3600 * 1000)

    const [
      usersTotal,
      usersNew7d,
      usersNew30d,
      ordersAll,
      classesTotal,
      classesActive,
      discountsTotal,
      discountsActive,
      registrationsTotal,
      registrationsNew,
      paidRevenue,
      recentOrders,
      recentUsers,
      schedulesUpcoming,
    ] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { createdAt: { gte: d7 } } }),
      db.user.count({ where: { createdAt: { gte: d30 } } }),
      // وضعیت مؤثر (PENDING منقضی = EXPIRED) — از رکوردهای واقعی (فاز ۵۲: بند ۷)
      db.usdtOrder.findMany({ select: { status: true, expiresAt: true, expectedMicro: true, paidAt: true }, take: 20000 }),
      db.courseClass.count(),
      db.courseClass.count({ where: { status: 'active' } }),
      db.discount.count({ where: { deletedAt: null } }),
      db.discount.count({ where: { deletedAt: null, active: true } }),
      db.registration.count({ where: { deletedAt: null } }),
      db.registration.count({ where: { deletedAt: null, status: 'new' } }),
      db.usdtOrder.aggregate({ where: { status: 'PAID' }, _count: true, _sum: { expectedMicro: true } }),
      db.usdtOrder.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          ref: true, productTitle: true, contactName: true, contactEmail: true,
          expectedMicro: true, status: true, expiresAt: true, createdAt: true, paidAt: true,
        },
      }),
      db.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        // ⚠️ passwordHash عمداً select نمی‌شود — هرگز به پنل نمی‌رود
        select: { id: true, firstName: true, lastName: true, email: true, country: true, createdAt: true },
      }),
      db.classSchedule.count({ where: { status: { in: ['PROPOSED', 'CONFIRMED'] }, startAt: { gte: now } } }),
    ])

    const orderCounts: Record<DerivedOrderStatus, number> = {
      PENDING: 0, DETECTED: 0, PAID: 0, UNDERPAID: 0, EXPIRED: 0, CANCELLED: 0,
      RECEIPT_SUBMITTED: 0, REJECTED: 0,
    }
    for (const o of ordersAll) orderCounts[deriveOrderStatus(o, now)]++

    return NextResponse.json({
      users: { total: usersTotal, new7d: usersNew7d, new30d: usersNew30d },
      orders: {
        total: ordersAll.length,
        ...orderCounts,
        // Unpaid = در جریان پرداخت (PENDING + DETECTED) — همان سبد پیگیری ادمین
        unpaid: orderCounts.PENDING + orderCounts.DETECTED,
        // فاز ۵۹ — خلاصهٔ پرداخت دستی برای کارت‌های داشبورد (کلیک = فیلتر تب Payments)
        pendingReview: orderCounts.RECEIPT_SUBMITTED,
        approved: orderCounts.PAID,
        rejected: orderCounts.REJECTED,
        paidRevenueUsd: microToUsdString(paidRevenue._sum.expectedMicro ?? 0),
        paidCount: paidRevenue._count,
      },
      courses: { total: classesTotal, active: classesActive },
      discounts: { total: discountsTotal, active: discountsActive },
      registrations: { total: registrationsTotal, new: registrationsNew },
      schedules: { upcoming: schedulesUpcoming },
      recentOrders: recentOrders.map((o) => ({
        ref: o.ref,
        productTitle: o.productTitle,
        contactName: o.contactName,
        contactEmail: o.contactEmail,
        amountUsd: microToUsdString(o.expectedMicro),
        status: deriveOrderStatus(o, now),
        createdAt: o.createdAt.toISOString(),
        paidAt: o.paidAt?.toISOString() ?? null,
      })),
      recentRegistrations: recentUsers.map((u) => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`.trim(),
        email: u.email,
        country: u.country,
        createdAt: u.createdAt.toISOString(),
      })),
      generatedAt: now.toISOString(),
    })
  } catch (e) {
    console.error('[GET /api/admin/dashboard] error:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Failed to load dashboard stats' }, { status: 500 })
  }
}
