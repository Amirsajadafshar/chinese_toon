// ---------------------------------------------------------------------------
// 🎟️ Admin Discounts API — /api/discounts (فاز ۴۷)
//
//  GET    فقط مدیریت: همهٔ کدها + شمارندهٔ استفادهٔ واقعی هرکدام
//  POST   فقط مدیریت: ایجاد کد (code/type/value/dates/scope/limits)
// امنیت: isAuthorized + guardResponse + rate-limit + zod سمت سرور
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { isAuthorized, getAdminActor } from '@/lib/admin-auth'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { guardResponse } from '@/lib/http-guard'
import { round2 } from '@/lib/money'
import { logAdminAction } from '@/lib/audit'

export const dynamic = 'force-dynamic'

const CODE_RE = /^[A-Z0-9]{3,24}$/

export const discountSchema = z.object({
  code: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .pipe(z.string().regex(CODE_RE, 'Code: 3–24 uppercase letters/numbers')),
  type: z.enum(['percent', 'fixed']),
  value: z
    .number()
    .refine((n) => Number.isFinite(n) && n > 0, 'Value must be positive')
    .refine((n) => n <= 100000, 'Value too large'),
  active: z.boolean().default(true),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  classIds: z.array(z.string().trim().max(40)).max(50).default([]),
  classTypes: z.array(z.enum(['group', 'private', 'both'])).max(3).default([]),
  levels: z.array(z.string().trim().max(30)).max(10).default([]),
  minSessions: z.number().int().min(1).max(500).default(1),
  maxUses: z.number().int().min(1).max(100000).nullable().optional(),
  perCustomer: z.number().int().min(1).max(100).default(1),
  note: z.string().trim().max(300).default(''),
})

function refineValue(data: { type: string; value: number }): string | null {
  if (data.type === 'percent' && (data.value <= 0 || data.value > 100)) {
    return 'Percent value must be between 0 and 100'
  }
  if (data.type === 'fixed' && (data.value <= 0 || data.value > 2000)) {
    return 'Fixed discount must be between 0 and 2000 USDT'
  }
  return null
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    // 🗄️ فاز ۵۲ — پیش‌فرض فقط کدهای زنده؛ ?archived=1 = فقط بایگانی‌شده‌ها
    // (حذف نرم — هر دو نما ادمین‌محورند و مشتری هرگز بایگانی را نمی‌بیند)
    const archivedOnly = new URL(req.url).searchParams.get('archived') === '1'
    const rows = await db.discount.findMany({
      where: archivedOnly ? { NOT: { deletedAt: null } } : { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    })
    const counts = await db.discountRedemption.groupBy({
      by: ['discountId'],
      _count: { discountId: true },
      _sum: { amount: true },
    })
    const byId = new Map(counts.map((c) => [c.discountId, c]))
    const discounts = rows.map((d) => ({
      ...d,
      usedCount: byId.get(d.id)?._count.discountId ?? 0,
      usedAmount: round2(byId.get(d.id)?._sum.amount ?? 0),
    }))
    return NextResponse.json({ discounts })
  } catch (err) {
    console.error('[GET /api/discounts] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const guard = guardResponse(req)
  if (guard) return guard
  const rl = rateLimit('discounts-write', req, 30, 600, 300)
  if (!rl.ok) return tooManyRequests(rl)

  try {
    const body = await req.json()
    const parsed = discountSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const valueErr = refineValue(parsed.data)
    if (valueErr) {
      return NextResponse.json({ error: valueErr }, { status: 400 })
    }
    const d = parsed.data
    const created = await db.discount.create({
      data: {
        code: d.code,
        type: d.type,
        value: round2(d.value),
        active: d.active,
        startsAt: d.startsAt ? new Date(d.startsAt) : null,
        endsAt: d.endsAt ? new Date(d.endsAt) : null,
        classIds: JSON.stringify(d.classIds),
        classTypes: JSON.stringify(d.classTypes),
        levels: JSON.stringify(d.levels),
        minSessions: d.minSessions,
        maxUses: d.maxUses ?? null,
        perCustomer: d.perCustomer,
        note: d.note,
      },
    })
    console.info(`[discounts] CREATED ${created.code} (${created.type}=${created.value})`)
    // 🧾 فاز ۵۳ — Audit Log (بند ۱۴)
    logAdminAction({ actor: getAdminActor(req), action: 'discount.create', targetType: 'discount', targetId: created.code, meta: { type: created.type, value: created.value, active: created.active } })
    return NextResponse.json({ ok: true, discount: created }, { status: 201 })
  } catch (err) {
    if (typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'This code already exists', code: 'DUPLICATE_CODE' }, { status: 409 })
    }
    console.error('[POST /api/discounts] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
