// ---------------------------------------------------------------------------
// 💳 GET /api/admin/payments — فهرست سفارش‌های پرداخت برای پنل ادمین (فاز ۵۹)
//
// فیلترها: unpaid (پرداخت‌نشدهٔ باز) | receipt_submitted | approved | rejected
//          | cancelled | expired (پرداخت‌نشدهٔ منقضی) | legacy (جریان قدیمی USDT)
// جست‌وجو: شناسهٔ سفارش / نام / ایمیل / عنوان کلاس / ایمیل یا نام کاربر
// پاسخ: ردیف‌های آمادهٔ نمایش + شمارندهٔ هر فیلتر برای badge تب
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { isAuthorized } from '@/lib/admin-auth'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { db } from '@/lib/db'
import { deriveOrderStatus } from '@/lib/order-status'
import { microToUsdString } from '@/lib/order-status'
import { getAdminPaymentCounts } from '@/lib/payments/service'

export const dynamic = 'force-dynamic'

type StatusFilter = 'all' | 'unpaid' | 'receipt_submitted' | 'approved' | 'rejected' | 'cancelled' | 'expired' | 'legacy'

export async function GET(req: NextRequest) {
  if (!(await isAuthorized(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ۱۲۰ درخواست در دقیقه — پنل ادمین
  const rl = await rateLimit('admin-payments', req, 120, 60, 60)
  if (!rl.ok) return tooManyRequests(rl)

  const url = new URL(req.url)
  const status = (url.searchParams.get('status') || 'all') as StatusFilter
  const q = (url.searchParams.get('q') || '').trim().slice(0, 80)
  const page = Math.max(1, Number(url.searchParams.get('page') || '1') || 1)
  const pageSize = Math.min(100, Math.max(5, Number(url.searchParams.get('pageSize') || '25') || 25))
  const now = new Date()

  const where: Record<string, unknown> = {}
  switch (status) {
    case 'unpaid':
      where.status = 'PENDING'
      break
    case 'receipt_submitted':
      where.status = 'RECEIPT_SUBMITTED'
      break
    case 'approved':
      where.status = 'PAID'
      break
    case 'rejected':
      where.status = 'REJECTED'
      break
    case 'cancelled':
      where.status = 'CANCELLED'
      break
    case 'expired':
      where.status = 'PENDING'
      where.expiresAt = { lte: now }
      break
    case 'legacy':
      where.paymentMethod = 'USDT_TRON'
      break
    default:
      break
  }

  if (q) {
    where.OR = [
      { ref: { contains: q.toUpperCase() } },
      { contactName: { contains: q } },
      { contactEmail: { contains: q } },
      { productTitle: { contains: q } },
      { user: { is: { OR: [{ email: { contains: q } }, { firstName: { contains: q } }, { lastName: { contains: q } }] } } },
    ]
  }

  try {
    const [total, orders] = await Promise.all([
      db.usdtOrder.count({ where }),
      db.usdtOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, country: true } },
        },
      }),
    ])
    const counts = await getAdminPaymentCounts()

    return NextResponse.json({
      total,
      page,
      pageSize,
      counts,
      orders: orders.map((o) => {
        const derived = deriveOrderStatus(o)
        return {
          ref: o.ref,
          status: derived,
          rawStatus: o.status,
          paymentMethod: o.paymentMethod,
          productTitle: o.productTitle,
          productId: o.productId,
          amountUsd: microToUsdString(o.expectedMicro),
          currency: o.currency,
          baseAmount: o.baseAmount,
          tierPercent: o.tierPercent,
          discountCode: o.discountCode,
          discountAmount: o.discountAmount,
          discountType: o.discountType,
          discountValue: o.discountValue,
          receiptStatus: o.receiptStatus,
          receiptSubmittedAt: o.receiptSubmittedAt?.toISOString() ?? null,
          receiptResubmits: o.receiptResubmits,
          rejectionReason: o.rejectionReason,
          reviewedAt: o.reviewedAt?.toISOString() ?? null,
          reviewedBy: o.reviewedBy,
          paidAt: o.paidAt?.toISOString() ?? null,
          createdAt: o.createdAt.toISOString(),
          updatedAt: o.updatedAt.toISOString(),
          expiresAt: o.expiresAt.toISOString(),
          customer: o.user
            ? {
                id: o.user.id,
                name: `${o.user.firstName} ${o.user.lastName}`.trim(),
                email: o.user.email,
                phone: o.user.phone,
                country: o.user.country,
              }
            : {
                id: null,
                name: o.contactName,
                email: o.contactEmail,
                phone: null,
                country: null,
              },
        }
      }),
    })
  } catch (e) {
    console.error('[admin/payments] list failed:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Failed to load payments' }, { status: 500 })
  }
}
