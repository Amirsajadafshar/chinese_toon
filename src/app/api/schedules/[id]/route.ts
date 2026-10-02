// ---------------------------------------------------------------------------
// 🗓️ /api/schedules/[id] (فاز ۴۸)
//
// GET   — ادمین: جزئیات کامل + تاریخچهٔ ممیزی (ScheduleAudit)
// PATCH — انتقال وضعیت با احراز دوگانه:
//   • ادمین (x-admin-key): confirm | cancel | complete | reschedule
//   • مشتری (کوکی): فقط confirm | cancel و فقط روی رکورد خودش
//     (مالکیت از سشن سرور مشتق می‌شود؛ تغییر id در مرورگر به دیگری نمی‌رسد)
//   مشتری نمی‌تواند complete/reschedule بخواهد و هیچ وضعیتی از بدنه پذیرفته
//   نمی‌شود — «action» فقط از فهرست مجاز و با قواعد ALLOWED_TRANSITIONS.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { isAuthorized } from '@/lib/admin-auth'
import { getUserFromRequest } from '@/lib/user-auth'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { guardResponse } from '@/lib/http-guard'
import { isValidTimezone } from '@/lib/timezones'
import { transitionSchedule, ScheduleRuleError, isBusyError, toDTO } from '@/lib/schedule-service'

export const dynamic = 'force-dynamic'

const patchSchema = z.object({
  action: z.enum(['confirm', 'cancel', 'complete', 'reschedule']),
  reason: z.string().trim().max(300).optional(),
  // فقط reschedule:
  date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  time: z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  tz: z.string().trim().max(60).optional(),
})

function ruleErrorResponse(err: ScheduleRuleError): NextResponse {
  const map: Record<string, number> = {
    NOT_FOUND: 404,
    FORBIDDEN: 403,
    CONFLICT: 409,
    SPACING: 409,
    CAPACITY_FULL: 409,
    INVALID_TIME: 400,
    INVALID_INPUT: 400,
    INVALID_TRANSITION: 409,
    SAME_SLOT: 400,
  }
  return NextResponse.json(
    { error: err.message, code: err.code, ...(err.fields ? { details: { fieldErrors: err.fields } } : {}) },
    { status: map[err.code] ?? 400 }
  )
}

// ---------------------------------------------------------------------------
// GET — جزئیات + تاریخچه (ادمین)
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { id } = await params
    const row = await db.classSchedule.findUnique({
      where: { id },
      include: {
        class: { select: { id: true, slug: true, productId: true, title: true, sessionDurationMin: true, maxStudents: true } },
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    })
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const audits = await db.scheduleAudit.findMany({
      where: { scheduleId: id },
      orderBy: { createdAt: 'asc' },
      take: 100,
    })
    // تاریخچهٔ زنجیرهٔ جابه‌جایی — از رکورد فعلی به عقب و جلو
    const chain: { id: string; status: string; startAt: Date; endAt: Date }[] = []
    let cursor = row
    while (cursor.supersededById && chain.length < 20) {
      const prev = await db.classSchedule.findUnique({
        where: { id: cursor.supersededById },
        select: { id: true, status: true, startAt: true, endAt: true, supersededById: true },
      })
      if (!prev) break
      chain.unshift(prev)
      cursor = prev
    }
    const successors: { id: string; status: string; startAt: Date; endAt: Date }[] = []
    let nextId: string | null = (
      await db.classSchedule.findFirst({ where: { supersededById: id }, select: { id: true } })
    )?.id ?? null
    while (nextId && successors.length < 20) {
      const next = await db.classSchedule.findUnique({
        where: { id: nextId },
        select: { id: true, status: true, startAt: true, endAt: true },
      })
      if (!next) break
      successors.push(next)
      nextId = (await db.classSchedule.findFirst({ where: { supersededById: next.id }, select: { id: true } }))?.id ?? null
    }
    return NextResponse.json({
      schedule: await toDTO(row),
      audits: audits.map((a) => ({ id: a.id, action: a.action, actor: a.actor, detail: a.detail, createdAt: a.createdAt.toISOString() })),
      chain: chain.map((c) => ({ id: c.id, status: c.status, startAt: c.startAt.toISOString(), endAt: c.endAt.toISOString() })),
      successors: successors.map((c) => ({ id: c.id, status: c.status, startAt: c.startAt.toISOString(), endAt: c.endAt.toISOString() })),
    })
  } catch (err) {
    console.error('[GET /api/schedules/:id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// PATCH — انتقال وضعیت
// ---------------------------------------------------------------------------

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = guardResponse(req)
  if (guard) return guard

  const { id } = await params
  const admin = isAuthorized(req)

  // مشتری واردشده؟ (ادمین لازم نیست لاگین مشتری داشته باشد)
  let customer = null
  if (!admin) {
    customer = await getUserFromRequest(req)
    if (!customer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rl = rateLimit(admin ? 'admin-schedule-patch' : 'customer-schedule-patch', req, admin ? 120 : 30, 10 * 60, 5 * 60)
  if (!rl.ok) return tooManyRequests(rl)

  try {
    const parsed = patchSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
    }
    const d = parsed.data

    // ⛔ مالکیت مشتری — سمت سرور بررسی می‌شود (نه از بدنهٔ درخواست)
    if (!admin) {
      const own = await db.classSchedule.findUnique({ where: { id }, select: { userId: true } })
      if (!own) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      if (own.userId !== customer!.id) {
        return NextResponse.json({ error: 'This schedule belongs to another student' }, { status: 403 })
      }
      // مشتری فقط تأیید/لغو — complete/reschedule هرگز
      if (d.action === 'complete' || d.action === 'reschedule') {
        return NextResponse.json({ error: 'Only the school can perform this action' }, { status: 403 })
      }
    }

    if (d.tz && !isValidTimezone(d.tz)) {
      return NextResponse.json(
        { error: 'Invalid input', details: { fieldErrors: { tz: ['Unknown timezone — pick from the list'] } } },
        { status: 400 }
      )
    }

    const dto = await transitionSchedule({
      scheduleId: id,
      action: d.action,
      actor: admin ? 'admin' : customer!.email,
      actorKind: admin ? 'admin' : 'customer',
      reason: d.reason,
      date: d.date,
      time: d.time,
      tz: d.tz,
    })
    return NextResponse.json({ ok: true, schedule: dto })
  } catch (err) {
    if (err instanceof ScheduleRuleError) return ruleErrorResponse(err)
    if (isBusyError(err)) {
      return NextResponse.json({ error: 'Database busy — try again', code: 'BUSY' }, { status: 409 })
    }
    console.error('[PATCH /api/schedules/:id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
