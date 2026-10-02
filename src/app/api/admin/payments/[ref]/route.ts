// ---------------------------------------------------------------------------
// 💳 GET /api/admin/payments/[ref] — جزئیات کامل یک سفارش (فاز ۵۹)
//
// شامل: اطلاعات مشتری + کلاس + مالی (اصلی/تخفیف/نهایی) + پرداخت + رسید +
// رویدادهای ممیزی — همه از دیتابیس، هیچ وضعیت تزئینی.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { isAuthorized } from '@/lib/admin-auth'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { db } from '@/lib/db'
import { deriveOrderStatus, microToUsdString } from '@/lib/order-status'
import { getOrderByRef, isValidOrderRef } from '@/lib/payments/service'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, ctx: { params: Promise<{ ref: string }> }) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = rateLimit('admin-payment-detail', req, 120, 60, 60)
  if (!rl.ok) return tooManyRequests(rl)

  const { ref } = await ctx.params
  if (!isValidOrderRef(ref)) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  try {
    const o = await getOrderByRef(ref)
    if (!o) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    const [user, cls, events] = await Promise.all([
      o.userId
        ? db.user.findUnique({
            where: { id: o.userId },
            select: {
              id: true, firstName: true, lastName: true, email: true, phone: true,
              country: true, countryCode: true, telegramUsername: true, createdAt: true, lastLoginAt: true,
            },
          })
        : Promise.resolve(null),
      db.courseClass.findFirst({
        where: { productId: o.productId },
        select: {
          id: true, slug: true, title: true, level: true, classType: true, format: true,
          schedule: true, packageSessions: true, sessionDurationMin: true, pricePerSession: true, packagePrice: true,
        },
      }),
      db.paymentEvent.findMany({
        where: { orderRef: ref },
        orderBy: { createdAt: 'desc' },
        take: 60,
      }),
    ])

    const derived = deriveOrderStatus(o)

    return NextResponse.json({
      order: {
        ref: o.ref,
        status: derived,
        rawStatus: o.status,
        paymentMethod: o.paymentMethod,
        productTitle: o.productTitle,
        productId: o.productId,
        amountUsd: microToUsdString(o.expectedMicro),
        currency: o.currency,
        baseAmount: o.baseAmount,
        pricePerSession: o.pricePerSession,
        packageSessions: o.packageSessions,
        tierPercent: o.tierPercent,
        discountCode: o.discountCode,
        discountAmount: o.discountAmount,
        discountType: o.discountType,
        discountValue: o.discountValue,
        receiptStatus: o.receiptStatus,
        receiptSubmittedAt: o.receiptSubmittedAt?.toISOString() ?? null,
        receiptResubmits: o.receiptResubmits,
        receiptFileName: o.receiptFileName,
        receiptMime: o.receiptMime,
        receiptSize: o.receiptSize,
        receiptUrl: o.receiptId ? `/api/receipts/${o.receiptId}` : null,
        rejectionReason: o.rejectionReason,
        reviewedAt: o.reviewedAt?.toISOString() ?? null,
        reviewedBy: o.reviewedBy,
        paidAt: o.paidAt?.toISOString() ?? null,
        createdAt: o.createdAt.toISOString(),
        updatedAt: o.updatedAt.toISOString(),
        expiresAt: o.expiresAt.toISOString(),
        // جریان قدیمی USDT — فقط برای سفارش‌های تاریخی پر است
        legacy:
          o.paymentMethod === 'USDT_TRON'
            ? { network: o.network, paymentMode: o.paymentMode, paymentAddress: o.paymentAddress, txHash: o.txHash }
            : null,
      },
      customer: user
        ? {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            name: `${user.firstName} ${user.lastName}`.trim(),
            email: user.email,
            phone: user.phone,
            country: user.country,
            countryCode: user.countryCode,
            telegramUsername: user.telegramUsername,
            memberSince: user.createdAt.toISOString(),
            lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
          }
        : {
            id: null,
            name: o.contactName,
            email: o.contactEmail,
            phone: null,
            country: null,
          },
      class: cls
        ? {
            id: cls.id,
            slug: cls.slug,
            title: cls.title,
            level: cls.level,
            classType: cls.classType,
            format: cls.format,
            schedule: cls.schedule,
            packageSessions: cls.packageSessions,
            sessionDurationMin: cls.sessionDurationMin,
            pricePerSession: cls.pricePerSession,
            packagePrice: cls.packagePrice,
          }
        : null,
      events: events.map((e) => ({
        id: e.id,
        kind: e.kind,
        txHash: e.txHash,
        detail: e.detail,
        createdAt: e.createdAt.toISOString(),
      })),
    })
  } catch (e) {
    console.error('[admin/payments] detail failed:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Failed to load payment detail' }, { status: 500 })
  }
}
