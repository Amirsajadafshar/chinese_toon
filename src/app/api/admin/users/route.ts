// ---------------------------------------------------------------------------
// 👥 GET /api/admin/users — فهرست کاربران ثبت‌نام‌شده برای پنل ادمین (فاز ۳۰)
//
// امنیت: فقط با x-admin-key (همان گارد پنل)؛ passwordHash هرگز select نمی‌شود.
// ثبت‌نام ≠ پرداخت: کاربر بدون هیچ سفارشی هم با وضعیت NO_PURCHASE نمایش
// داده می‌شود — هرگز حذف یا غیرفعال نمی‌شود.
// وضعیت خرید از روی سفارش‌های واقعی محاسبه می‌شود (derivePurchaseStatus) —
// متن ساختگی نیست.
//
// پارامترها:
//   filter = all | new | no-purchase | unpaid | paid | underpaid | expired | cancelled
//   q      = جست‌وجو در نام / ایمیل / تلگرام / کشور / شمارهٔ سفارش (ref)
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isAuthorized } from '@/lib/admin-auth'
import { deriveOrderStatus, derivePurchaseStatus, microToUsdString, PurchaseStatus } from '@/lib/order-status'

export const dynamic = 'force-dynamic'

const NEW_USER_DAYS = 7

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const url = new URL(req.url)
    const filter = url.searchParams.get('filter') ?? 'all'
    const q = (url.searchParams.get('q') ?? '').trim().toLowerCase()
    const now = new Date()

    // ⚠️ passwordHash در select نیست — هرگز نباید از API خارج شود
    const users = await db.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        country: true,
        countryCode: true,
        phone: true,
        telegramUsername: true,
        telegramId: true,
        // 🆔 فاز ۶۰ — کد یکتای پایدار دانش‌پذیر
        uniqueCode: true,
        createdAt: true,
        lastLoginAt: true,
        orders: {
          orderBy: { createdAt: 'desc' },
          select: {
            ref: true,
            productTitle: true,
            expectedMicro: true,
            status: true,
            expiresAt: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 1000, // 🛡️ سقف دفاعی — پاسخ هرگز بی‌کران نیست
    })

    const newCutoff = now.getTime() - NEW_USER_DAYS * 24 * 60 * 60 * 1000

    interface Row {
      id: string
      firstName: string
      lastName: string
      email: string
      country: string
      countryCode: string
      phone: string | null
      telegramUsername: string | null
      telegramId: string | null
      uniqueCode: string | null
      createdAt: string
      lastLoginAt: string | null
      isNew: boolean
      orderCount: number
      paidCount: number
      purchaseStatus: PurchaseStatus
      orderRefs: string[]
      activeOrder: {
        ref: string
        productTitle: string
        amountUsd: string
        status: string
        createdAt: string
        expiresAt: string
      } | null
    }

    const rows: Row[] = users.map((u) => {
      const derived = u.orders.map((o) => ({
        ...o,
        derived: deriveOrderStatus(o, now),
      }))
      const status = derivePurchaseStatus(u.orders, now)
      // سفارش پیگیری: اولین (جدیدترین) سفارشِ در انتظار پرداخت؛ نبود → جدیدترین سفارش
      const pending = derived.find((o) => o.derived === 'PENDING')
      const latest = derived[0]
      const follow = pending ?? latest
      return {
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        country: u.country,
        countryCode: u.countryCode,
        phone: u.phone,
        telegramUsername: u.telegramUsername,
        telegramId: u.telegramId,
        uniqueCode: u.uniqueCode ?? null,
        createdAt: u.createdAt.toISOString(),
        lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
        isNew: u.createdAt.getTime() >= newCutoff,
        orderCount: u.orders.length,
        paidCount: derived.filter((o) => o.derived === 'PAID').length,
        purchaseStatus: status,
        orderRefs: u.orders.map((o) => o.ref),
        activeOrder: follow
          ? {
              ref: follow.ref,
              productTitle: follow.productTitle,
              amountUsd: microToUsdString(follow.expectedMicro),
              status: follow.derived,
              createdAt: follow.createdAt.toISOString(),
              expiresAt: follow.expiresAt.toISOString(),
            }
          : null,
      }
    })

    // 🔎 فیلتر وضعیت
    const filtered = rows.filter((r) => {
      switch (filter) {
        case 'new':
          return r.isNew
        case 'no-purchase':
          return r.purchaseStatus === 'NO_PURCHASE'
        case 'unpaid':
          return r.purchaseStatus === 'UNPAID'
        case 'paid':
          return r.purchaseStatus === 'PAID'
        case 'underpaid':
          return r.purchaseStatus === 'UNDERPAID'
        case 'expired':
          return r.purchaseStatus === 'EXPIRED'
        case 'cancelled':
          return r.purchaseStatus === 'CANCELLED'
        default:
          return true
      }
    })

    // 🔎 جست‌وجو: نام / ایمیل / تلگرام / کشور / تلفن / ref هر سفارش کاربر
    const searched = q
      ? filtered.filter((r) => {
          const hay = [
            r.firstName,
            r.lastName,
            `${r.firstName} ${r.lastName}`,
            r.email,
            r.telegramUsername ? `@${r.telegramUsername}` : '',
            r.telegramUsername ?? '',
            r.country,
            r.phone ?? '',
            ...r.orderRefs,
          ]
            .join(' ')
            .toLowerCase()
          return hay.includes(q)
        })
      : filtered

    return NextResponse.json({
      users: searched,
      total: users.length,
      counts: {
        all: rows.length,
        new: rows.filter((r) => r.isNew).length,
        noPurchase: rows.filter((r) => r.purchaseStatus === 'NO_PURCHASE').length,
        unpaid: rows.filter((r) => r.purchaseStatus === 'UNPAID').length,
        paid: rows.filter((r) => r.purchaseStatus === 'PAID').length,
        underpaid: rows.filter((r) => r.purchaseStatus === 'UNDERPAID').length,
        expired: rows.filter((r) => r.purchaseStatus === 'EXPIRED').length,
        cancelled: rows.filter((r) => r.purchaseStatus === 'CANCELLED').length,
      },
    })
  } catch (e) {
    console.error('[GET /api/admin/users] error:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 })
  }
}
