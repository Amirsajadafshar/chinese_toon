// ---------------------------------------------------------------------------
// 🎟️ Admin Discount API — PATCH/DELETE /api/discounts/[id] (فاز ۴۷)
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isAuthorized, getAdminActor } from '@/lib/admin-auth'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { guardResponse } from '@/lib/http-guard'
import { discountSchema } from '../route'
import { round2 } from '@/lib/money'
import { logAdminAction } from '@/lib/audit'

export const dynamic = 'force-dynamic'

const CUID_RE = /^[a-z0-9]{20,36}$/i
const patchSchema = discountSchema.partial()

function isNotFound(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: unknown }).code === 'P2025'
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const guard = guardResponse(req)
  if (guard) return guard
  const rl = await rateLimit('discounts-write', req, 30, 600, 300)
  if (!rl.ok) return tooManyRequests(rl)

  const { id } = await params
  if (!CUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }
  try {
    const body = await req.json().catch(() => ({}))
    // 🗄️ فاز ۵۲ — بازگرداندن کد از بایگانی (حذف نرم): deletedAt پاک و کد
    // به‌صورت «غیرفعال» برمی‌گردد تا ادمین آگاهانه فعالش کند
    if ((body as { restore?: unknown }).restore === true) {
      const restored = await db.discount.update({
        where: { id },
        data: { deletedAt: null, active: false },
      })
      console.info(`[discounts] RESTORED from archive: ${restored.code}`)
      // 🧾 فاز ۵۳ — Audit Log (بند ۱۴)
      logAdminAction({ actor: getAdminActor(req), action: 'discount.restore', targetType: 'discount', targetId: restored.code })
      return NextResponse.json({ ok: true, discount: restored })
    }
    // 🛡️ رکورد فعلی برای اعتبارسنجی ترکیبی (existing + patch) خوانده می‌شود
    const existing = await db.discount.findUniqueOrThrow({
      where: { id },
      select: { type: true, value: true },
    })
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const d = parsed.data
    // 🛡️ سخت‌سازی امنیتی (فاز ۴۹) — اعتبارسنجی بازهٔ value روی «رکورد ترکیبی»
    // (مقدار فعلی دیتابیس + وصلهٔ درخواست): PATCH تک‌فیلدی مثل { value: 100000 }
    // بدون type هم دیگر نمی‌تواند مقدار بی‌معنی روی درصد/مبلغ ثابت بنشاند.
    if (d.value !== undefined) {
      const effectiveType = d.type ?? existing.type
      if (effectiveType === 'percent' && (d.value <= 0 || d.value > 100)) {
        return NextResponse.json({ error: 'Percent value must be between 0 and 100' }, { status: 400 })
      }
      if (effectiveType === 'fixed' && (d.value <= 0 || d.value > 2000)) {
        return NextResponse.json({ error: 'Fixed discount must be between 0 and 2000 USDT' }, { status: 400 })
      }
    } else if (d.type && d.type !== existing.type) {
      // فقط نوع عوض شد و value نیامده — value فعلی باید در بازهٔ نوع جدید جا شود
      if (d.type === 'percent' && (existing.value <= 0 || existing.value > 100)) {
        return NextResponse.json({ error: 'Existing value is not valid for a percent discount (0-100)' }, { status: 400 })
      }
      if (d.type === 'fixed' && (existing.value <= 0 || existing.value > 2000)) {
        return NextResponse.json({ error: 'Existing value is not valid for a fixed discount (0-2000 USDT)' }, { status: 400 })
      }
    }
    const updated = await db.discount.update({
      where: { id },
      data: {
        ...(d.code !== undefined ? { code: d.code } : {}),
        ...(d.type !== undefined ? { type: d.type } : {}),
        ...(d.value !== undefined ? { value: round2(d.value) } : {}),
        ...(d.active !== undefined ? { active: d.active } : {}),
        ...(d.startsAt !== undefined ? { startsAt: d.startsAt ? new Date(d.startsAt) : null } : {}),
        ...(d.endsAt !== undefined ? { endsAt: d.endsAt ? new Date(d.endsAt) : null } : {}),
        ...(d.classIds !== undefined ? { classIds: JSON.stringify(d.classIds) } : {}),
        ...(d.classTypes !== undefined ? { classTypes: JSON.stringify(d.classTypes) } : {}),
        ...(d.levels !== undefined ? { levels: JSON.stringify(d.levels) } : {}),
        ...(d.minSessions !== undefined ? { minSessions: d.minSessions } : {}),
        ...(d.maxUses !== undefined ? { maxUses: d.maxUses ?? null } : {}),
        ...(d.perCustomer !== undefined ? { perCustomer: d.perCustomer } : {}),
        ...(d.note !== undefined ? { note: d.note } : {}),
      },
    })
    console.info(`[discounts] UPDATED ${updated.code}`)
    // 🧾 فاز ۵۳ — Audit Log (بند ۱۴)
    logAdminAction({
      actor: getAdminActor(req),
      action: 'discount.update',
      targetType: 'discount',
      targetId: updated.code,
      meta: { fields: Object.keys(d).join(','), active: updated.active, value: updated.value, type: updated.type },
    })
    return NextResponse.json({ ok: true, discount: updated })
  } catch (err) {
    if (isNotFound(err)) return NextResponse.json({ error: 'Discount not found' }, { status: 404 })
    if (typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'This code already exists', code: 'DUPLICATE_CODE' }, { status: 409 })
    }
    console.error('[PATCH /api/discounts/[id]] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const guard = guardResponse(req)
  if (guard) return guard
  const rl = await rateLimit('discounts-write', req, 30, 600, 300)
  if (!rl.ok) return tooManyRequests(rl)

  try {
    // 🗄️ فاز ۵۲ (بند ۹) — «حذف» همیشه حذف نرم/بایگانی است: رکورد کد + تمام
    // رکوردهای Redemption (و سفارش‌های تاریخی متصل) دست‌نخورده می‌مانند تا
    // تاریخچهٔ گزارش‌ها دقیق بماند. کد بایگانی‌شده در قیمت‌گذاری «وجود ندارد»
    // (deletedAt guard در pricing.ts) و در فهرست پیش‌فرض ادمین هم نمی‌آید.
    const { id } = await params
    if (!CUID_RE.test(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }
    const archived = await db.discount.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    })
    const usedCount = await db.discountRedemption.count({ where: { discountId: id } })
    console.info(`[discounts] ARCHIVED ${archived.code} (soft-delete — used by ${usedCount} order(s))`)
    // 🧾 فاز ۵۳ — Audit Log (بند ۱۴)
    logAdminAction({ actor: getAdminActor(req), action: 'discount.archive', targetType: 'discount', targetId: archived.code, meta: { usedCount } })
    return NextResponse.json({ ok: true, archived: true, usedCount })
  } catch (err) {
    if (isNotFound(err)) return NextResponse.json({ error: 'Discount not found' }, { status: 404 })
    console.error('[DELETE /api/discounts/[id]] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
