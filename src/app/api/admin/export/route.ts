// ---------------------------------------------------------------------------
// 📤 GET /api/admin/export?type=… — خروجی CSV سمت سرور (فاز ۵۳ — بند ۱۱)
//
// انواع: users | orders | payments | classes | schedules | discounts | enrollments
//  • تولید کامل سمت سرور/دیتابیس — مرورگر هیچ داده‌ای را تجمیع نمی‌کند
//  • محدود سقف هر خروجی (EXPORT_CAP ردیف) — پردازش سمت سرور برای دیتاست بزرگ
//  • فقط فیلدهای امن: ⛔ passwordHash، ⛔ توکن سشن، ⛔ کلید/xprv/seed.
//    txHash/آدرس تراکنش دادهٔ عمومی زنجیره‌اند و فقط در خروجی ادمین می‌آیند.
//  • isAuthorized: سشن ادمین + rate limit
//  • محافظت CSV-injection در src/lib/csv.ts
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isAuthorized, getAdminActor } from '@/lib/admin-auth'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { toCsv, safeFilename } from '@/lib/csv'
import { deriveOrderStatus, microToUsdString, derivePurchaseStatus, type PurchaseStatus } from '@/lib/order-status'
import { deriveEnrollmentStatus } from '@/lib/enrollment'
import { logAdminAction } from '@/lib/audit'

export const dynamic = 'force-dynamic'

const EXPORT_CAP = 5000

type ExportType = 'users' | 'orders' | 'payments' | 'classes' | 'schedules' | 'discounts' | 'enrollments'

const VALID_TYPES: ExportType[] = ['users', 'orders', 'payments', 'classes', 'schedules', 'discounts', 'enrollments']

export async function GET(req: NextRequest) {
  if (!(await isAuthorized(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const rl = await rateLimit('admin-export', req, 12, 600, 300)
  if (!rl.ok) return tooManyRequests(rl)

  const url = new URL(req.url)
  const type = (url.searchParams.get('type') ?? '').trim() as ExportType
  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json(
      { error: `Unknown export type. Valid: ${VALID_TYPES.join(', ')}` },
      { status: 400 }
    )
  }

  try {
    const now = new Date()
    let csv = ''
    let rows = 0

    if (type === 'users') {
      const users = await db.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: EXPORT_CAP,
        // ⛔ passwordHash عمداً select نمی‌شود — هرگز در خروجی نیست
        select: {
          id: true, email: true, firstName: true, lastName: true, country: true,
          countryCode: true, phone: true, telegramUsername: true, createdAt: true, lastLoginAt: true,
        },
      })
      rows = users.length
      csv = toCsv(
        ['id', 'email', 'first_name', 'last_name', 'country', 'country_code', 'phone', 'telegram', 'created_at', 'last_login_at'],
        users.map((u) => [u.id, u.email, u.firstName, u.lastName, u.country, u.countryCode, u.phone, u.telegramUsername, u.createdAt, u.lastLoginAt])
      )
    } else if (type === 'orders') {
      const orders = await db.usdtOrder.findMany({
        orderBy: { createdAt: 'desc' },
        take: EXPORT_CAP,
        select: {
          ref: true, productTitle: true, productId: true, contactName: true, contactEmail: true,
          expectedMicro: true, status: true, baseAmount: true, tierPercent: true, discountCode: true,
          discountAmount: true, discountType: true, discountValue: true, txHash: true, paidAt: true,
          createdAt: true, expiresAt: true, paymentMode: true,
        },
      })
      rows = orders.length
      csv = toCsv(
        ['ref', 'product_title', 'product_id', 'contact_name', 'contact_email', 'amount_usd', 'status_raw', 'status_derived', 'base_amount', 'tier_percent', 'discount_code', 'discount_amount', 'discount_type', 'discount_value', 'tx_hash', 'paid_at', 'created_at', 'expires_at', 'payment_mode'],
        orders.map((o) => [
          o.ref, o.productTitle, o.productId, o.contactName, o.contactEmail,
          microToUsdString(o.expectedMicro), o.status, deriveOrderStatus(o, now),
          o.baseAmount ?? '', o.tierPercent ?? '', o.discountCode ?? '', o.discountAmount ?? '',
          o.discountType ?? '', o.discountValue ?? '', o.txHash ?? '', o.paidAt ?? '',
          o.createdAt, o.expiresAt, o.paymentMode,
        ])
      )
    } else if (type === 'payments') {
      const events = await db.paymentEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: EXPORT_CAP,
        select: { id: true, kind: true, orderRef: true, txHash: true, detail: true, createdAt: true },
      })
      rows = events.length
      csv = toCsv(
        ['id', 'kind', 'order_ref', 'tx_hash', 'detail', 'created_at'],
        events.map((e) => [e.id, e.kind, e.orderRef, e.txHash, e.detail, e.createdAt])
      )
    } else if (type === 'classes') {
      const classes = await db.courseClass.findMany({
        orderBy: { sortOrder: 'asc' },
        take: EXPORT_CAP,
        select: {
          id: true, title: true, slug: true, productId: true, status: true, classType: true,
          level: true, pricePerSession: true, packageSessions: true, packagePrice: true,
          maxStudents: true, format: true, createdAt: true,
        },
      })
      rows = classes.length
      csv = toCsv(
        ['id', 'title', 'slug', 'product_id', 'status', 'class_type', 'level', 'price_per_session', 'package_sessions', 'package_price', 'max_students', 'format', 'created_at'],
        classes.map((c) => [c.id, c.title, c.slug, c.productId, c.status, c.classType, c.level, c.pricePerSession, c.packageSessions, c.packagePrice, c.maxStudents, c.format, c.createdAt])
      )
    } else if (type === 'schedules') {
      const schedules = await db.classSchedule.findMany({
        orderBy: { startAt: 'desc' },
        take: EXPORT_CAP,
        select: {
          id: true, status: true, startAt: true, endAt: true, durationMin: true, orderRef: true,
          createdAt: true, class: { select: { title: true } }, user: { select: { email: true, firstName: true, lastName: true } },
        },
      })
      rows = schedules.length
      csv = toCsv(
        ['id', 'status', 'start_at', 'end_at', 'duration_min', 'class_title', 'student_email', 'student_name', 'order_ref', 'created_at'],
        schedules.map((s) => [
          s.id, s.status, s.startAt, s.endAt, s.durationMin, s.class.title,
          s.user.email, `${s.user.firstName} ${s.user.lastName}`.trim(), s.orderRef, s.createdAt,
        ])
      )
    } else if (type === 'discounts') {
      const discounts = await db.discount.findMany({
        orderBy: { createdAt: 'desc' },
        take: EXPORT_CAP,
        select: {
          id: true, code: true, type: true, value: true, active: true, deletedAt: true,
          startsAt: true, endsAt: true, maxUses: true, perCustomer: true, createdAt: true,
          _count: { select: { redemptions: true } },
        },
      })
      rows = discounts.length
      csv = toCsv(
        ['code', 'type', 'value', 'active', 'archived', 'starts_at', 'ends_at', 'max_uses', 'per_customer', 'used_count', 'created_at'],
        discounts.map((d) => [
          d.code, d.type, d.value, d.active, !!d.deletedAt, d.startsAt ?? '', d.endsAt ?? '',
          d.maxUses ?? '', d.perCustomer, d._count.redemptions, d.createdAt,
        ])
      )
    } else {
      // enrollments — زنجیرهٔ ثبت‌نام هر کاربر از رکوردهای واقعی (کلاس‌ها، سفارش‌ها، ترجیحات)
      const users = await db.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: EXPORT_CAP,
        select: {
          id: true, email: true, firstName: true, lastName: true, createdAt: true,
          orders: { select: { status: true, expiresAt: true } },
          schedules: { select: { status: true } },
        },
      })
      const regPrefs = await db.registration.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        select: { email: true, status: true },
      })
      const prefByEmail = new Map<string, string>()
      for (const r of regPrefs) if (!prefByEmail.has(r.email)) prefByEmail.set(r.email, r.status)
      rows = users.length
      csv = toCsv(
        ['email', 'name', 'lead_status', 'purchase_status', 'enrollment_status', 'orders_count', 'paid_orders', 'confirmed_sessions', 'registered_at'],
        users.map((u) => {
          const orderRows = u.orders
          const purchase: PurchaseStatus = derivePurchaseStatus(orderRows)
          const paid = orderRows.filter((o) => o.status === 'PAID').length
          const scheduleStatuses = u.schedules.map((s) => s.status)
          const enrollment = deriveEnrollmentStatus({
            paid: paid > 0,
            scheduleStatuses,
            hasPreferences: prefByEmail.has(u.email),
          })
          return [
            u.email, `${u.firstName} ${u.lastName}`.trim(), prefByEmail.get(u.email) ?? '',
            purchase, enrollment, orderRows.length, paid,
            scheduleStatuses.filter((s) => s === 'CONFIRMED').length, u.createdAt,
          ]
        })
      )
    }

    // 🧾 فاز ۵۳ — Audit Log: خروجی داده (بند ۱۴) — چه نوعی و چند ردیف
    logAdminAction({ actor: getAdminActor(req), action: `export.${type}`, targetType: 'export', targetId: type, meta: { rows } })

    const stamp = new Date().toISOString().slice(0, 10)
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${safeFilename(`chinesetoon-${type}-${stamp}.csv`)}"`,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (e) {
    console.error('[GET /api/admin/export] error:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
