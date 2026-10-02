// ---------------------------------------------------------------------------
// 🛠️ سرویس سمت سرورِ برنامهٔ جلسات (فاز ۴۸) — تنها جایی که قواعد اجرا می‌شوند
//
// هیچ مسیر API منطق برنامه‌ریزی را خودش پیاده نمی‌کند؛ همه از همینجا می‌گذرند:
//   • مالکیت/احراز: userId همیشه از سشن/تفاوت سمت سرور مشتق می‌شود
//   • مدت جلسه از تنظیمات خود کلاس (sessionDurationMin) یا پیش‌فرض سرور
//   • تبدیل (تاریخ+ساعت+منطقهٔ IANA) → لحظهٔ UTC — روز هفته همراه ساعت می‌آید
//   • هم‌پوشانی/فاصله/ظرفیت داخل تراکنش تعاملی — SQLite نویسندهٔ واحد دارد؛
//     دو تأیید همزمان هرگز ظرفیت را رد نمی‌کند (دومی P2034 → 409)
//   • هر انتقال وضعیت = ردیف ScheduleAudit + هشدار ScheduleNotification
// ---------------------------------------------------------------------------

import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import {
  ALLOWED_TRANSITIONS,
  spacingViolations,
  slotsOverlap,
  instantToWall,
  wallToUtcInstant,
  sanitizeSettings,
  SCHEDULING_SETTINGS_KEY,
  DEFAULT_SCHEDULING_SETTINGS,
  TEHRAN_TZ,
  type ScheduleStatus,
  type SchedulingSettings,
} from '@/lib/scheduling'

// ---------------------------------------------------------------------------
// خطاهای دامنه — مسیرها آن‌ها را به پاسخ HTTP تمیز ترجمه می‌کنند
// ---------------------------------------------------------------------------

export class ScheduleRuleError extends Error {
  code: string
  fields?: Record<string, string[]>
  constructor(code: string, message: string, fields?: Record<string, string[]>) {
    super(message)
    this.code = code
    this.fields = fields
  }
}

export const isBusyError = (e: unknown): boolean =>
  (e as { code?: string })?.code === 'P2034' ||
  ((e as { message?: string })?.message ?? '').includes('database is locked')

// ---------------------------------------------------------------------------
// تنظیمات برنامه (SiteSetting) — فقط سمت سرور
// ---------------------------------------------------------------------------

export async function loadSchedulingSettings(): Promise<SchedulingSettings> {
  try {
    const row = await db.siteSetting.findUnique({ where: { key: SCHEDULING_SETTINGS_KEY } })
    if (!row) return { ...DEFAULT_SCHEDULING_SETTINGS }
    return sanitizeSettings(JSON.parse(row.value))
  } catch {
    return { ...DEFAULT_SCHEDULING_SETTINGS }
  }
}

export async function saveSchedulingSettings(next: SchedulingSettings): Promise<void> {
  await db.siteSetting.upsert({
    where: { key: SCHEDULING_SETTINGS_KEY },
    update: { value: JSON.stringify(next) },
    create: { key: SCHEDULING_SETTINGS_KEY, value: JSON.stringify(next) },
  })
}

// ---------------------------------------------------------------------------
// نمایش آمادهٔ هر رکورد برای ادمین/مشتری — تبدیل‌ها همینجا انجام می‌شود
// ---------------------------------------------------------------------------

export interface ScheduleDTO {
  id: string
  status: ScheduleStatus
  startAt: string
  endAt: string
  durationMin: number
  timezone: string
  inputDate: string | null
  inputTime: string | null
  inputDay: string | null
  note: string | null
  orderRef: string | null
  registrationId: string | null
  supersededById: string | null
  createdBy: string
  confirmedAt: string | null
  confirmedBy: string | null
  cancelledAt: string | null
  cancelledBy: string | null
  cancelReason: string | null
  createdAt: string
  class: { id: string; slug: string; productId: string; title: string; sessionDurationMin: number | null; maxStudents: number | null }
  student: { id: string; name: string; email: string }
  /** نمایش به وقت تهران — مرجع اصلی ادمین (روز/تاریخ همراه ساعت درست است) */
  tehran: { day: string; date: string; time: string; endTime: string }
  /** نمایش به وقت منطقهٔ اصلی دانش‌پذیر */
  local: { day: string; date: string; time: string; endTime: string }
  confirmedCount: number // ظرفیت مصرف‌شدهٔ همین اسلات
}

export async function toDTO(
  row: Prisma.ClassScheduleGetPayload<{
    include: { class: { select: { id: true, slug: true, productId: true, title: true, sessionDurationMin: true, maxStudents: true } }; user: { select: { id: true, firstName: true, lastName: true, email: true } } }
  }>
): Promise<ScheduleDTO> {
  const start = row.startAt
  const end = row.endAt
  const sw = instantToWall(start, TEHRAN_TZ)
  const ew = instantToWall(end, TEHRAN_TZ)
  const lw = instantToWall(start, row.timezone)
  const le = instantToWall(end, row.timezone)
  const confirmedCount = await db.classSchedule.count({
    where: { classId: row.classId, startAt: start, status: 'CONFIRMED' },
  })
  return {
    id: row.id,
    status: row.status as ScheduleStatus,
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    durationMin: row.durationMin,
    timezone: row.timezone,
    inputDate: row.inputDate,
    inputTime: row.inputTime,
    inputDay: row.inputDay,
    note: row.note,
    orderRef: row.orderRef,
    registrationId: row.registrationId,
    supersededById: row.supersededById,
    createdBy: row.createdBy,
    confirmedAt: row.confirmedAt?.toISOString() ?? null,
    confirmedBy: row.confirmedBy ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    cancelledBy: row.cancelledBy ?? null,
    cancelReason: row.cancelReason ?? null,
    createdAt: row.createdAt.toISOString(),
    class: row.class,
    student: {
      id: row.user.id,
      name: `${row.user.firstName} ${row.user.lastName}`.trim(),
      email: row.user.email,
    },
    tehran: { day: sw.day, date: sw.date, time: sw.time, endTime: ew.time },
    local: { day: lw.day, date: lw.date, time: lw.time, endTime: le.time },
    confirmedCount,
  }
}

// ---------------------------------------------------------------------------
// اعتبارسنجی پنجرهٔ جلسه (هم‌پوشانی + فاصله + ظرفیت) — داخل تراکنش
// ---------------------------------------------------------------------------

interface ValidateWindowArgs {
  tx: Prisma.TransactionClient
  userId: string
  classId: string
  classMaxStudents: number | null
  startAt: Date
  endAt: Date
  /** رکوردی که در جابه‌جایی از بررسی مستثنا می‌شود (رکورد قبلی) */
  excludeScheduleId?: string
  settings: SchedulingSettings
  /** در پیشنهاد ادمین ظرفیت چک می‌شود ولی شمارش فقط CONFIRMED است */
}

interface WindowProblems {
  conflicts: { scheduleId: string; startAt: string; endAt: string; status: string }[]
  spacing: { scheduleId: string; gapMinutes: number }[]
  capacity: { limit: number; taken: number } | null
}

export async function validateWindowInTx(a: ValidateWindowArgs): Promise<WindowProblems> {
  const problems: WindowProblems = { conflicts: [], spacing: [], capacity: null }

  // ۱) هم‌پوشانی/فاصله با جلسات فعالِ خودِ دانش‌پذیر (پیشنهاد یا تأییدشده)
  const active = await a.tx.classSchedule.findMany({
    where: {
      userId: a.userId,
      status: { in: ['PROPOSED', 'CONFIRMED'] },
      ...(a.excludeScheduleId ? { id: { not: a.excludeScheduleId } } : {}),
    },
    select: { id: true, startAt: true, endAt: true, status: true },
  })
  const candidate = { start: a.startAt, end: a.endAt }
  for (const other of active) {
    const slot = { start: other.startAt, end: other.endAt }
    if (slotsOverlap(candidate, slot)) {
      problems.conflicts.push({ scheduleId: other.id, startAt: other.startAt.toISOString(), endAt: other.endAt.toISOString(), status: other.status })
      continue // هم‌پوشانی و فاصله همزمان معنا ندارد
    }
  }
  const spacing = spacingViolations(candidate, active.map((o) => ({ start: o.startAt, end: o.endAt })), a.settings.minSpacingMinutes)
  // نگاشت به شناسه — فقط نقض‌هایی که هم‌پوشانی نیستند
  for (const v of spacing) {
    const match = active.find((o) => o.startAt.getTime() === v.other.start.getTime())
    if (match) problems.spacing.push({ scheduleId: match.id, gapMinutes: v.gapMinutes })
  }

  // ۲) ظرفیت اسلات گروهی — تعداد تأییدشده‌های همان (کلاس، لحظهٔ شروع)
  if (a.classMaxStudents != null) {
    const taken = await a.tx.classSchedule.count({
      where: { classId: a.classId, startAt: a.startAt, status: 'CONFIRMED' },
    })
    const limit = Math.max(1, Math.round(a.classMaxStudents))
    if (taken >= limit) problems.capacity = { limit, taken }
  }

  return problems
}

export function assertNoProblems(p: WindowProblems): void {
  if (p.capacity) {
    throw new ScheduleRuleError(
      'CAPACITY_FULL',
      `This slot is full (${p.capacity.taken}/${p.capacity.limit} confirmed)`,
      { capacity: [`Slot is full — ${p.capacity.taken}/${p.capacity.limit} seats confirmed`] }
    )
  }
  if (p.conflicts.length > 0) {
    throw new ScheduleRuleError(
      'CONFLICT',
      'Overlaps an existing schedule of this student',
      { conflicts: p.conflicts.map((c) => `${c.startAt}–${c.endAt} (${c.status})`) }
    )
  }
  if (p.spacing.length > 0) {
    throw new ScheduleRuleError(
      'SPACING',
      `Minimum spacing between sessions violated`,
      { spacing: p.spacing.map((s) => `${s.gapMinutes} min gap (minimum required)`) }
    )
  }
}

// ---------------------------------------------------------------------------
// ساخت پیشنهاد (ادمین) — همهٔ پیوندها سمت سرور حل می‌شوند
// ---------------------------------------------------------------------------

export interface ProposeArgs {
  userId: string
  classId: string
  date: string // YYYY-MM-DD در منطقهٔ tz
  time: string // HH:MM در منطقهٔ tz
  tz: string
  note?: string
  orderRef?: string
  actor: string // admin
}

export async function proposeSchedule(a: ProposeArgs): Promise<ScheduleDTO> {
  const settings = await loadSchedulingSettings()
  const cls = await db.courseClass.findUnique({ where: { id: a.classId } })
  if (!cls) throw new ScheduleRuleError('NOT_FOUND', 'Class not found')
  if (cls.status === 'archived') throw new ScheduleRuleError('CLASS_ARCHIVED', 'This class is archived')

  const durationMin = cls.sessionDurationMin ?? settings.defaultSessionDurationMin
  const instant = wallToUtcInstant(a.date, a.time, a.tz)
  if (!instant) {
    throw new ScheduleRuleError('INVALID_TIME', 'The selected time does not exist in this timezone (DST gap or invalid input)', {
      time: ['This wall-clock time does not exist in the selected timezone'],
    })
  }
  const endAt = new Date(instant.getTime() + durationMin * 60000)

  // پیوند ثبت‌نام (ایمیل + عنوان کلاس؛ وگرنه آخرین ثبت‌نام همان ایمیل)
  const user = await db.user.findUnique({ where: { id: a.userId } })
  if (!user) throw new ScheduleRuleError('NOT_FOUND', 'Student not found')
  const registration =
    (await db.registration.findFirst({
      where: { email: user.email, classTitle: cls.title },
      orderBy: { createdAt: 'desc' },
    })) ??
    (await db.registration.findFirst({
      where: { email: user.email },
      orderBy: { createdAt: 'desc' },
    }))

  // پیوند سفارش — صریح از ادمین (با بررسی مالکیت) یا آخرین سفارش پرداخت‌شدهٔ همان کلاس
  let orderRef: string | null = null
  if (a.orderRef) {
    const order = await db.usdtOrder.findUnique({ where: { ref: a.orderRef } })
    if (!order || order.userId !== a.userId) {
      throw new ScheduleRuleError('ORDER_MISMATCH', 'Order does not belong to this student')
    }
    if (order.productId !== cls.productId) {
      throw new ScheduleRuleError('ORDER_MISMATCH', 'Order belongs to a different class')
    }
    orderRef = order.ref
  } else {
    const paid = await db.usdtOrder.findFirst({
      where: { userId: a.userId, productId: cls.productId, status: 'PAID' },
      orderBy: { createdAt: 'desc' },
    })
    orderRef = paid?.ref ?? null
  }

  const created = await db.$transaction(async (tx) => {
    const problems = await validateWindowInTx({
      tx,
      userId: a.userId,
      classId: a.classId,
      classMaxStudents: cls.maxStudents,
      startAt: instant,
      endAt,
      settings,
    })
    assertNoProblems(problems)

    const row = await tx.classSchedule.create({
      data: {
        userId: a.userId,
        classId: a.classId,
        registrationId: registration?.id ?? null,
        orderRef,
        startAt: instant,
        endAt,
        durationMin,
        timezone: a.tz,
        inputDate: a.date,
        inputTime: a.time,
        inputDay: instantToWall(instant, a.tz).day,
        note: a.note?.slice(0, 500) || null,
        status: 'PROPOSED',
        createdBy: 'admin',
      },
    })
    await tx.scheduleAudit.create({
      data: {
        scheduleId: row.id,
        action: 'PROPOSED',
        actor: 'admin',
        detail: JSON.stringify({
          startAt: instant.toISOString(),
          endAt: endAt.toISOString(),
          durationMin,
          timezone: a.tz,
          inputDate: a.date,
          inputTime: a.time,
          orderRef,
          registrationId: registration?.id ?? null,
        }),
      },
    })
    await tx.scheduleNotification.create({
      data: {
        userId: a.userId,
        scheduleId: row.id,
        kind: 'PROPOSED',
        title: 'New class schedule proposed',
        body: `Your teacher proposed a ${cls.title} session — please review and confirm it in your account.`,
      },
    })
    return row
  })

  const full = await db.classSchedule.findUnique({
    where: { id: created.id },
    include: {
      class: { select: { id: true, slug: true, productId: true, title: true, sessionDurationMin: true, maxStudents: true } },
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  })
  if (!full) throw new ScheduleRuleError('NOT_FOUND', 'Schedule disappeared after creation')
  return toDTO(full)
}

// ---------------------------------------------------------------------------
// انتقال وضعیت — تأیید/لغو/تکمیل/جابه‌جایی با اعتبارسنجی مجدد
// ---------------------------------------------------------------------------

export interface TransitionArgs {
  scheduleId: string
  action: 'confirm' | 'cancel' | 'complete' | 'reschedule'
  actor: 'admin' | string // customer:<email>
  actorKind: 'admin' | 'customer'
  reason?: string
  /** فقط برای reschedule */
  date?: string
  time?: string
  tz?: string
}

export async function transitionSchedule(a: TransitionArgs): Promise<ScheduleDTO> {
  const settings = await loadSchedulingSettings()
  const current = await db.classSchedule.findUnique({
    where: { id: a.scheduleId },
    include: {
      class: { select: { id: true, slug: true, productId: true, title: true, sessionDurationMin: true, maxStudents: true } },
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  })
  if (!current) throw new ScheduleRuleError('NOT_FOUND', 'Schedule not found')

  const status = current.status as ScheduleStatus
  const actorLabel = a.actorKind === 'admin' ? 'admin' : `customer:${a.actor}`

  // ---------- تأیید ----------
  if (a.action === 'confirm') {
    if (!ALLOWED_TRANSITIONS[status].includes('CONFIRMED')) {
      throw new ScheduleRuleError('INVALID_TRANSITION', `Cannot confirm a ${status} schedule`)
    }
    await db.$transaction(async (tx) => {
      const problems = await validateWindowInTx({
        tx,
        userId: current.userId,
        classId: current.classId,
        classMaxStudents: current.class.maxStudents,
        startAt: current.startAt,
        endAt: current.endAt,
        excludeScheduleId: current.id, // رکورد خودش نباید با خودش تداخل داشته باشد
        settings,
      })
      assertNoProblems(problems)
      await tx.classSchedule.update({
        where: { id: current.id },
        data: { status: 'CONFIRMED', confirmedAt: new Date(), confirmedBy: a.actorKind },
      })
      await tx.scheduleAudit.create({
        data: {
          scheduleId: current.id,
          action: 'CONFIRMED',
          actor: actorLabel,
          detail: JSON.stringify({ startAt: current.startAt.toISOString(), revalidated: true }),
        },
      })
      await tx.scheduleNotification.create({
        data: {
          userId: current.userId,
          scheduleId: current.id,
          kind: 'CONFIRMED',
          title: 'Schedule confirmed',
          body: `Your ${current.class.title} session is confirmed.`,
        },
      })
    })
  }

  // ---------- لغو ----------
  else if (a.action === 'cancel') {
    if (!ALLOWED_TRANSITIONS[status].includes('CANCELLED')) {
      throw new ScheduleRuleError('INVALID_TRANSITION', `Cannot cancel a ${status} schedule`)
    }
    await db.$transaction(async (tx) => {
      await tx.classSchedule.update({
        where: { id: current.id },
        data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledBy: a.actorKind, cancelReason: a.reason?.slice(0, 300) || null },
      })
      await tx.scheduleAudit.create({
        data: {
          scheduleId: current.id,
          action: 'CANCELLED',
          actor: actorLabel,
          detail: JSON.stringify({ reason: a.reason?.slice(0, 300) ?? null, startAt: current.startAt.toISOString() }),
        },
      })
      await tx.scheduleNotification.create({
        data: {
          userId: current.userId,
          scheduleId: current.id,
          kind: 'CANCELLED',
          title: 'Schedule cancelled',
          body: `Your ${current.class.title} session on ${current.startAt.toISOString().slice(0, 10)} was cancelled${a.actorKind === 'customer' ? ' by you' : ' by the school'}.`,
        },
      })
    })
  }

  // ---------- تکمیل (فقط ادمین) ----------
  else if (a.action === 'complete') {
    if (a.actorKind !== 'admin') throw new ScheduleRuleError('FORBIDDEN', 'Only the school can mark sessions as completed')
    if (!ALLOWED_TRANSITIONS[status].includes('COMPLETED')) {
      throw new ScheduleRuleError('INVALID_TRANSITION', `Cannot complete a ${status} schedule`)
    }
    await db.$transaction(async (tx) => {
      await tx.classSchedule.update({ where: { id: current.id }, data: { status: 'COMPLETED' } })
      await tx.scheduleAudit.create({
        data: { scheduleId: current.id, action: 'COMPLETED', actor: actorLabel, detail: JSON.stringify({ startAt: current.startAt.toISOString() }) },
      })
    })
  }

  // ---------- جابه‌جایی (فقط ادمین) ----------
  else if (a.action === 'reschedule') {
    if (a.actorKind !== 'admin') throw new ScheduleRuleError('FORBIDDEN', 'Only the school can reschedule sessions')
    if (!ALLOWED_TRANSITIONS[status].includes('RESCHEDULED')) {
      throw new ScheduleRuleError('INVALID_TRANSITION', `Cannot reschedule a ${status} schedule`)
    }
    if (!a.date || !a.time || !a.tz) {
      throw new ScheduleRuleError('INVALID_INPUT', 'Reschedule needs date, time and timezone', { time: ['date, time and timezone are required'] })
    }
    const durationMin = current.durationMin // مدت ثابت می‌ماند (از کلاس مشتق شده بود)
    const instant = wallToUtcInstant(a.date!, a.time!, a.tz!)
    if (!instant) {
      throw new ScheduleRuleError('INVALID_TIME', 'The selected time does not exist in this timezone', { time: ['Invalid wall-clock time'] })
    }
    const endAt = new Date(instant.getTime() + durationMin * 60000)
    if (instant.getTime() === current.startAt.getTime()) {
      throw new ScheduleRuleError('SAME_SLOT', 'The new time is identical to the current one', { time: ['Pick a different time'] })
    }

    const successorId = await db.$transaction(async (tx) => {
      const problems = await validateWindowInTx({
        tx,
        userId: current.userId,
        classId: current.classId,
        classMaxStudents: current.class.maxStudents,
        startAt: instant,
        endAt,
        excludeScheduleId: current.id,
        settings,
      })
      assertNoProblems(problems)

      const successor = await tx.classSchedule.create({
        data: {
          userId: current.userId,
          classId: current.classId,
          registrationId: current.registrationId,
          orderRef: current.orderRef,
          startAt: instant,
          endAt,
          durationMin,
          timezone: a.tz!,
          inputDate: a.date!,
          inputTime: a.time!,
          inputDay: instantToWall(instant, a.tz!).day,
          note: current.note,
          status: 'PROPOSED', // جایگزین تأیید مشتری می‌شود — خودکار CONFIRMED نمی‌شود
          createdBy: 'admin',
          supersededById: current.id,
        },
      })
      await tx.classSchedule.update({
        where: { id: current.id },
        data: { status: 'RESCHEDULED' },
      })
      await tx.scheduleAudit.create({
        data: {
          scheduleId: current.id,
          action: 'RESCHEDULED',
          actor: actorLabel,
          detail: JSON.stringify({
            from: current.startAt.toISOString(),
            to: instant.toISOString(),
            successorId: successor.id,
          }),
        },
      })
      await tx.scheduleAudit.create({
        data: {
          scheduleId: successor.id,
          action: 'PROPOSED',
          actor: actorLabel,
          detail: JSON.stringify({
            rescheduledFrom: current.id,
            startAt: instant.toISOString(),
            endAt: endAt.toISOString(),
            timezone: a.tz,
            inputDate: a.date,
            inputTime: a.time,
          }),
        },
      })
      await tx.scheduleNotification.create({
        data: {
          userId: current.userId,
          scheduleId: successor.id,
          kind: 'RESCHEDULED',
          title: 'Schedule rescheduled — confirmation needed',
          body: `Your ${current.class.title} session was moved to a new time. Please review and confirm the new schedule in your account.`,
        },
      })
      return successor.id
    })
    void successorId
  }

  const full = await db.classSchedule.findUnique({
    where: { id: current.id },
    include: {
      class: { select: { id: true, slug: true, productId: true, title: true, sessionDurationMin: true, maxStudents: true } },
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  })
  if (!full) throw new ScheduleRuleError('NOT_FOUND', 'Schedule not found')
  return toDTO(full)
}
