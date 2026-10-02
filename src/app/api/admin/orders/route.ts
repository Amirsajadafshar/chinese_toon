// ---------------------------------------------------------------------------
// 🧾 GET /api/admin/orders — مدیریت سفارش‌ها در پنل ادمین (بند ۱ تسک)
//
// امنیت: فقط با x-admin-key (همان گارد پنل). passwordHash و هر دادهٔ حساس
// هرگز select نمی‌شود. وضعیت‌ها همیشه سمت سرور از دیتابیس مشتق می‌شوند —
// هرگز از مرورگر نمی‌آیند (ضد دستکاری نمایش).
//
// پارامترها:
//   q          = جست‌وجو در ref / ایمیل / نام
//   status     = all | PENDING | DETECTED | PAID | UNDERPAID | EXPIRED | CANCELLED
//   enrollment = all | REGISTERED | ORDERED | PAID | PREFERENCES_SUBMITTED
//                | SCHEDULE_PROPOSED | ENROLLED | COMPLETED
//   page       = ۱-base (پیش‌فرض ۱)   pageSize = حداکثر ۱۰۰ (پیش‌فرض ۲۵)
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { isAuthorized } from '@/lib/admin-auth'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { buildAdminOrderRows, paymentStatusWhere, type AdminOrderRow } from '@/lib/payments/admin-orders'

export const dynamic = 'force-dynamic'

// 🛡️ سقف دفاعی اسکن درون‌حافظه (فیلتر وضعیت ثبت‌نام + شمارنده‌ها) — پاسخ هرگز بی‌کران نیست
const SCAN_CAP = 2000

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const rl = rateLimit('admin-orders', req, 120, 60, 60)
  if (!rl.ok) return tooManyRequests(rl)

  try {
    const url = new URL(req.url)
    const q = (url.searchParams.get('q') ?? '').trim()
    const status = (url.searchParams.get('status') ?? 'all').trim()
    const enrollment = (url.searchParams.get('enrollment') ?? 'all').trim()
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1)
    const pageSize = Math.min(100, Math.max(5, parseInt(url.searchParams.get('pageSize') ?? '25', 10) || 25))
    const now = new Date()

    // شرط دیتابیسی: q + وضعیت پرداخت (EXPIRED = PENDING منقضی — مشتق‌شده)
    const where: Prisma.UsdtOrderWhereInput = {}
    if (q) {
      where.OR = [
        { ref: { contains: q.toUpperCase() } },
        { contactEmail: { contains: q.toLowerCase() } },
        { contactName: { contains: q } },
      ]
    }
    const statusWhere = status !== 'all' ? paymentStatusWhere(status, now) : null
    if (statusWhere) Object.assign(where, statusWhere)

    // وضعیتِ ثبت‌نام مشتق‌شده است → فیلترش درون‌حافظه روی ردیف‌های ساخته‌شده اعمال می‌شود
    const needScan = enrollment !== 'all'
    const baseFind = {
      where,
      orderBy: { createdAt: 'desc' as const },
      select: {
        ref: true, userId: true, productId: true, productTitle: true,
        contactName: true, contactEmail: true, expectedMicro: true, status: true,
        expiresAt: true, createdAt: true, updatedAt: true, txHash: true,
        txAmountMicro: true, txFrom: true, paidAt: true, paymentMode: true,
        paymentAddress: true, network: true, pricePerSession: true,
        packageSessions: true, baseAmount: true, tierPercent: true,
        discountCode: true, discountAmount: true, discountType: true, discountValue: true,
      },
    }

    if (needScan) {
      // اسکن سقف‌دار → ساخت ردیف‌ها → فیلتر ثبت‌نام → برش صفحه
      const raw = await db.usdtOrder.findMany({ ...baseFind, take: SCAN_CAP })
      let rows: AdminOrderRow[] = await buildAdminOrderRows(raw, now)
      rows = rows.filter((r) => r.enrollmentStatus === enrollment)
      const total = rows.length
      const start = (page - 1) * pageSize
      const pageRows = rows.slice(start, start + pageSize)
      return NextResponse.json({
        rows: pageRows,
        meta: { total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)), counts: countsOf(rows) },
      })
    }

    const total = await db.usdtOrder.count({ where })
    const raw = await db.usdtOrder.findMany({
      ...baseFind,
      skip: (page - 1) * pageSize,
      take: pageSize,
    })
    const rows = await buildAdminOrderRows(raw, now)

    // شمارنده‌های چیپ‌ها — روی کل مجموعهٔ منطبق (بدون صفحه‌بندی، با همان سقف دفاعی)
    const allRaw = await db.usdtOrder.findMany({ ...baseFind, take: SCAN_CAP })
    const allRows = await buildAdminOrderRows(allRaw, now)

    return NextResponse.json({
      rows,
      meta: { total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)), counts: countsOf(allRows) },
    })
  } catch (e) {
    console.error('[GET /api/admin/orders] error:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Failed to load orders' }, { status: 500 })
  }
}

function countsOf(rows: AdminOrderRow[]): Record<string, number> {
  const c: Record<string, number> = {}
  for (const r of rows) c[r.paymentStatus] = (c[r.paymentStatus] ?? 0) + 1
  c.all = rows.length
  return c
}
