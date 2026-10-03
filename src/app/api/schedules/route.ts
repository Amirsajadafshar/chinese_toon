// ---------------------------------------------------------------------------
// 🗓️ /api/schedules (فاز ۴۸)
//
// GET  — دو حالت:
//   • ادمین (x-admin-key): همهٔ برنامه‌ها + فیلتر status/classId/email/from/to
//   • مشتری (کوکی سشن): فقط برنامه‌های خودش + هشدارهای خوانده‌نشده
// POST — فقط ادمین: پیشنهاد برنامهٔ جدید (PROPOSED؛ خودکار تأیید نمی‌شود)
//   مدت جلسه از تنظیمات کلاس می‌آید؛ endAt سمت سرور محاسبه می‌شود؛ مرورگر
//   هرگز مبلغ/وضعیت/ظرفیت/مالکیت تعیین نمی‌کند.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { isAuthorized, getAdminActor } from '@/lib/admin-auth'
import { getUserFromRequest } from '@/lib/user-auth'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { guardResponse } from '@/lib/http-guard'
import { isValidTimezone } from '@/lib/timezones'
import { isValidDateStr, isValidTimeStr, SCHEDULE_STATUSES } from '@/lib/scheduling'
import { proposeSchedule, toDTO, ScheduleRuleError, isBusyError } from '@/lib/schedule-service'
import { logAdminAction } from '@/lib/audit'

export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  // حالت ادمین — فیلترهای کامل
  if (await isAuthorized(req)) {
    try {
      const url = new URL(req.url)
      const status = url.searchParams.get('status')
      const classId = url.searchParams.get('classId')
      const email = url.searchParams.get('email')?.trim().toLowerCase()
      const from = url.searchParams.get('from')
      const to = url.searchParams.get('to')

      const where: Record<string, unknown> = {}
      if (status && (SCHEDULE_STATUSES as readonly string[]).includes(status)) where.status = status
      if (classId) where.classId = classId
      if ((from && !Number.isNaN(Date.parse(from))) || (to && !Number.isNaN(Date.parse(to)))) {
        where.startAt = {
          ...(from && !Number.isNaN(Date.parse(from)) ? { gte: new Date(from) } : {}),
          ...(to && !Number.isNaN(Date.parse(to)) ? { lt: new Date(to) } : {}),
        }
      }

      const rows = await db.classSchedule.findMany({
        where,
        orderBy: { startAt: 'asc' },
        take: 500,
        include: {
          class: { select: { id: true, slug: true, productId: true, title: true, sessionDurationMin: true, maxStudents: true } },
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      })
      const filtered = email ? rows.filter((r) => r.user.email.toLowerCase() === email) : rows
      const dtos = await Promise.all(filtered.map(toDTO))
      return NextResponse.json({ schedules: dtos, count: dtos.length })
    } catch (err) {
      console.error('[GET /api/schedules] admin error:', err)
      return NextResponse.json({ error: 'Failed to load schedules' }, { status: 500 })
    }
  }

  // حالت مشتری — فقط رکوردهای خودش (مالکیت از سشن، نه از بدنه)
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const rows = await db.classSchedule.findMany({
      where: { userId: user.id },
      orderBy: { startAt: 'desc' },
      take: 200,
      include: {
        class: { select: { id: true, slug: true, productId: true, title: true, sessionDurationMin: true, maxStudents: true } },
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    })
    const dtos = await Promise.all(rows.map(toDTO))
    const alerts = await db.scheduleNotification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
    })
    const unread = alerts.filter((n) => !n.readAt).length
    return NextResponse.json({
      schedules: dtos,
      notifications: alerts.map((n) => ({
        id: n.id,
        kind: n.kind,
        category: n.category,
        orderRef: n.orderRef,
        title: n.title,
        body: n.body,
        read: Boolean(n.readAt),
        createdAt: n.createdAt.toISOString(),
      })),
      unread,
    })
  } catch (err) {
    console.error('[GET /api/schedules] customer error:', err)
    return NextResponse.json({ error: 'Failed to load your schedule' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// POST — پیشنهاد ادمین
// ---------------------------------------------------------------------------

const proposeSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  classId: z.string().trim().min(1).max(60).optional(),
  classSlug: z.string().trim().min(1).max(120).optional(),
  date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  tz: z.string().trim().max(60),
  note: z.string().trim().max(500).optional(),
  orderRef: z.string().trim().max(20).optional(),
})

export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const guard = guardResponse(req)
  if (guard) return guard
  const rl = await rateLimit('admin-schedule-proposal', req, 60, 10 * 60, 5 * 60)
  if (!rl.ok) return tooManyRequests(rl)

  try {
    const parsed = proposeSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
    }
    const d = parsed.data

    if (!isValidDateStr(d.date)) {
      return NextResponse.json({ error: 'Invalid input', details: { fieldErrors: { date: ['Invalid date'] } } }, { status: 400 })
    }
    if (!isValidTimeStr(d.time)) {
      return NextResponse.json({ error: 'Invalid input', details: { fieldErrors: { time: ['Invalid time'] } } }, { status: 400 })
    }
    if (!isValidTimezone(d.tz)) {
      return NextResponse.json(
        { error: 'Invalid input', details: { fieldErrors: { tz: ['Unknown timezone — pick from the list'] } } },
        { status: 400 }
      )
    }
    if (!d.classId && !d.classSlug) {
      return NextResponse.json({ error: 'Invalid input', details: { fieldErrors: { classId: ['Pick a class'] } } }, { status: 400 })
    }

    // دانش‌پذیر — با ایمیل حل می‌شود (هرگز userId از بدنهٔ مرورگر گرفته نمی‌شود)
    const user = await db.user.findUnique({ where: { email: d.email } })
    if (!user) {
      return NextResponse.json(
        {
          error: 'Student not found — ask them to create an account first',
          details: { fieldErrors: { email: ['No registered account with this email'] } },
        },
        { status: 404 }
      )
    }

    const cls = d.classId
      ? await db.courseClass.findUnique({ where: { id: d.classId } })
      : await db.courseClass.findUnique({ where: { slug: d.classSlug as string } })
    if (!cls) return NextResponse.json({ error: 'Class not found' }, { status: 404 })

    const dto = await proposeSchedule({
      userId: user.id,
      classId: cls.id,
      date: d.date,
      time: d.time,
      tz: d.tz,
      note: d.note,
      orderRef: d.orderRef || undefined,
      actor: 'admin',
    })
    // 🧾 فاز ۵۳ — Audit Log: پیشنهاد برنامهٔ جلسات (بند ۱۴) — جزئیات در ScheduleAudit
    logAdminAction({
      actor: getAdminActor(req),
      action: 'schedule.propose',
      targetType: 'schedule',
      targetId: dto.id,
      meta: { class: cls.title, date: d.date, time: d.time, tz: d.tz, student: user.email },
    })
    return NextResponse.json({ ok: true, schedule: dto }, { status: 201 })
  } catch (err) {
    if (err instanceof ScheduleRuleError) {
      const map: Record<string, number> = {
        NOT_FOUND: 404,
        CONFLICT: 409,
        SPACING: 409,
        CAPACITY_FULL: 409,
        INVALID_TIME: 400,
        INVALID_INPUT: 400,
        ORDER_MISMATCH: 400,
        CLASS_ARCHIVED: 400,
      }
      return NextResponse.json(
        { error: err.message, code: err.code, ...(err.fields ? { details: { fieldErrors: err.fields } } : {}) },
        { status: map[err.code] ?? 400 }
      )
    }
    if (isBusyError(err)) {
      return NextResponse.json({ error: 'Database busy — try again', code: 'BUSY' }, { status: 409 })
    }
    console.error('[POST /api/schedules] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
