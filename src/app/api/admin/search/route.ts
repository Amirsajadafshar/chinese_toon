// ---------------------------------------------------------------------------
// 🔎 GET /api/admin/search — جست‌وجوی سراسری پنل ادمین (فاز ۵۲ — بند ۸)
//
// جست‌وجو کامل سمت سرور/دیتابیس است — هیچ‌وقت «کل جدول» به مرورگر بارگذاری
// نمی‌شود (per-type take محدود). نتایج شامل: کاربران، سفارش‌ها، کلاس‌ها،
// کدهای تخفیف و شناسه/هش تراکنش‌ها.
// امنیت: isAuthorized + rate-limit + select امن (passwordHash هرگز select
// نمی‌شود؛ txHash کامل برای ادمین قابل قبول است — دادهٔ عمومی زنجیره است).
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isAuthorized } from '@/lib/admin-auth'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { deriveOrderStatus, microToUsdString } from '@/lib/order-status'

export const dynamic = 'force-dynamic'

const TAKE_PER_TYPE = 5

export async function GET(req: NextRequest) {
  if (!(await isAuthorized(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const rl = await rateLimit('admin-search', req, 90, 600, 300)
  if (!rl.ok) return tooManyRequests(rl)

  const q = (new URL(req.url).searchParams.get('q') ?? '').trim().slice(0, 60)
  if (q.length < 2) {
    return NextResponse.json({ q, total: 0, results: { users: [], orders: [], classes: [], discounts: [], payments: [] } })
  }

  try {
    const now = new Date()
    const [users, orders, classes, discounts, payments] = await Promise.all([
      // 👤 کاربران — فقط فیلدهای امن (بدون passwordHash)
      db.user.findMany({
        where: {
          OR: [
            { email: { contains: q } },
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { id: q },
            { telegramUsername: { contains: q } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: TAKE_PER_TYPE,
        select: { id: true, firstName: true, lastName: true, email: true, country: true, createdAt: true, lastLoginAt: true },
      }),
      // 🪙 سفارش‌ها — ref/ایمیل/نام تماس
      db.usdtOrder.findMany({
        where: {
          OR: [
            { ref: { contains: q.toUpperCase() } },
            { contactEmail: { contains: q } },
            { contactName: { contains: q } },
            { paymentAddress: { contains: q } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: TAKE_PER_TYPE,
        select: {
          ref: true, productTitle: true, contactEmail: true, contactName: true,
          expectedMicro: true, status: true, expiresAt: true, createdAt: true, paidAt: true,
        },
      }),
      // 🎓 کلاس‌ها — عنوان/slug/productId
      db.courseClass.findMany({
        where: {
          OR: [
            { title: { contains: q } },
            { slug: { contains: q.toLowerCase() } },
            { productId: { contains: q } },
          ],
        },
        orderBy: { sortOrder: 'asc' },
        take: TAKE_PER_TYPE,
        select: { id: true, title: true, slug: true, productId: true, status: true, packagePrice: true },
      }),
      // 🎟️ کدهای تخفیف — کد/یادداشت (شامل بایگانی‌شده‌ها با برچسب)
      db.discount.findMany({
        where: {
          OR: [
            { code: { contains: q.toUpperCase() } },
            { note: { contains: q } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: TAKE_PER_TYPE,
        select: { id: true, code: true, type: true, value: true, active: true, deletedAt: true, maxUses: true },
      }),
      // 🧾 تراکنش‌ها — هش یا ref سفارش
      db.paymentEvent.findMany({
        where: {
          OR: [
            { txHash: { contains: q } },
            { orderRef: { contains: q.toUpperCase() } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: TAKE_PER_TYPE,
        select: { id: true, kind: true, orderRef: true, txHash: true, createdAt: true },
      }),
    ])

    const results = {
      users: users.map((u) => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`.trim(),
        email: u.email,
        country: u.country,
        createdAt: u.createdAt.toISOString(),
      })),
      orders: orders.map((o) => ({
        ref: o.ref,
        productTitle: o.productTitle,
        contactEmail: o.contactEmail,
        amountUsd: microToUsdString(o.expectedMicro),
        status: deriveOrderStatus(o, now),
        createdAt: o.createdAt.toISOString(),
      })),
      classes: classes.map((cl) => ({
        id: cl.id,
        title: cl.title,
        slug: cl.slug,
        productId: cl.productId,
        status: cl.status,
        packagePrice: cl.packagePrice,
      })),
      discounts: discounts.map((d) => ({
        id: d.id,
        code: d.code,
        type: d.type,
        value: d.value,
        active: d.active,
        archived: !!d.deletedAt,
        maxUses: d.maxUses,
      })),
      payments: payments.map((p) => ({
        id: p.id,
        kind: p.kind,
        orderRef: p.orderRef,
        txHash: p.txHash,
        createdAt: p.createdAt.toISOString(),
      })),
    }
    const total = results.users.length + results.orders.length + results.classes.length + results.discounts.length + results.payments.length
    return NextResponse.json({ q, total, results })
  } catch (e) {
    console.error('[GET /api/admin/search] error:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
