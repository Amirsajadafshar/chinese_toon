// ---------------------------------------------------------------------------
// 🗓️ موتور برنامهٔ واقعی جلسات (فاز ۴۸) — امتداد lib/schedule.ts
//
// تفاوت با ترجیحات هفتگی (فاز ۴۷): اینجا «جلسهٔ واقعی با تاریخ مشخص» داریم —
// هر رکورد یک بازهٔ مطلق UTC است (startAt/endAt) و همهٔ قواعد روی همان اجرا
// می‌شود:
//   • تبدیل دیوارِ ساعت ←→ UTC با پایگاه IANA خود Intl (DST خودکار؛ هیچ آفست
//     هاردکدی وجود ندارد) و «روز هفته» هم همراه ساعت تبدیل می‌شود.
//   • تشخیص هم‌پوشانی = اشتراک دو بازهٔ UTC (هرگز مقایسهٔ رشتهٔ «Monday 8 PM»).
//   • فاصلهٔ حداقلی بین جلسات یک دانش‌پذیر (قابل تنظیم از پنل؛ ترجیحاتِ
//     ثبت‌نام هیچ‌وقت با این قاعده رد نمی‌شوند — فقط جلسات واقعی).
//   • ظرفیت کلاس گروهی با شمارش رکوردهای CONFIRMED همان (کلاس، لحظهٔ شروع).
//   • مدت جلسه از تنظیمات خود کلاس (sessionDurationMin) می‌آید — هرگز ثابت.
// ---------------------------------------------------------------------------

import { isValidTimezone } from '@/lib/timezones'

export const TEHRAN_TZ = 'Asia/Tehran'

// نکته: این ماژول عمداً «خالص» است (بدون DB) تا سمت کلاینت هم برای نمایش
// قابل استفاده باشد؛ هر منطق مبتنی بر دیتابیس در lib/schedule-service.ts است.

/** کلیدهای وضعیت برنامه — تنها وضعیت‌های مجاز در DB */
export const SCHEDULE_STATUSES = ['PROPOSED', 'CONFIRMED', 'RESCHEDULED', 'CANCELLED', 'COMPLETED'] as const
export type ScheduleStatus = (typeof SCHEDULE_STATUSES)[number]

/** انتقال‌های مجاز وضعیت — هر چیز دیگری سمت سرور رد می‌شود */
export const ALLOWED_TRANSITIONS: Record<ScheduleStatus, ScheduleStatus[]> = {
  PROPOSED: ['CONFIRMED', 'CANCELLED', 'RESCHEDULED'],
  CONFIRMED: ['RESCHEDULED', 'CANCELLED', 'COMPLETED'],
  RESCHEDULED: [],
  CANCELLED: [],
  COMPLETED: [],
}

// ---------------------------------------------------------------------------
// تنظیمات برنامه (SiteSetting کلید scheduleSettings)
// ---------------------------------------------------------------------------

export interface SchedulingSettings {
  /** حداقل فاصلهٔ آزاد بین دو جلسهٔ واقعی یک دانش‌پذیر (دقیقه) */
  minSpacingMinutes: number
  /** مدت پیش‌فرض جلسه وقتی کلاس sessionDurationMin ندارد (دقیقه) */
  defaultSessionDurationMin: number
}

export const SCHEDULING_SETTINGS_KEY = 'scheduleSettings'

export const DEFAULT_SCHEDULING_SETTINGS: SchedulingSettings = {
  minSpacingMinutes: 60,
  defaultSessionDurationMin: 60,
}

const SETTINGS_BOUNDS = {
  minSpacingMinutes: [0, 24 * 60] as const,
  defaultSessionDurationMin: [15, 8 * 60] as const,
}

export function sanitizeSettings(raw: unknown): SchedulingSettings {
  const out = { ...DEFAULT_SCHEDULING_SETTINGS }
  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>
    for (const key of ['minSpacingMinutes', 'defaultSessionDurationMin'] as const) {
      const v = Number(r[key])
      const [min, max] = SETTINGS_BOUNDS[key]
      if (Number.isFinite(v) && v >= min && v <= max) out[key] = Math.round(v)
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// تبدیل «تقویم دیواری یک منطقه» ←→ لحظهٔ UTC — هم ساعت هم روز همراه هم می‌آیند
// ---------------------------------------------------------------------------

export interface WallClock {
  /** «2025-01-20» */
  date: string
  /** «23:30» */
  time: string
  /** کلید روز هفته در همان منطقه (mon…sun) */
  day: string
  y: number
  mo: number
  d: number
  h: number
  mi: number
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

export function isValidDateStr(s: string): boolean {
  if (!DATE_RE.test(s)) return false
  const d = new Date(`${s}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
}

export function isValidTimeStr(s: string): boolean {
  return TIME_RE.test(s)
}

/** تقویم دیواریِ یک لحظه در منطقهٔ داده‌شده */
export function instantToWall(instant: Date, tz: string): WallClock {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
  const p: Record<string, string> = {}
  for (const part of dtf.formatToParts(instant)) p[part.type] = part.value
  const asUtc = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day))
  // JS روز هفته: 0=یکشنبه → کلید ما
  const dayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date(asUtc).getUTCDay()]
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    time: `${p.hour}:${p.minute}`,
    day: dayKey,
    y: Number(p.year),
    mo: Number(p.month),
    d: Number(p.day),
    h: Number(p.hour),
    mi: Number(p.minute),
  }
}

/**
 * لحظهٔ UTCِ «تاریخ + ساعت به وقت منطقهٔ tz».
 * الگوریتم: حدس اولیه با آفست نمونه‌برداری‌شده، سپس تصحیح تکراری تا تقویم
 * دیواریِ tz دقیقاً همان (date, time) شود. اگر منطقه در آن تاریخ «ساعتِ
 * پرش‌کردهٔ DST» باشد (لحظهٔ ناموجود)، هیچ تطابقی پیدا نمی‌شود → null
 * (سرور رد می‌کند؛ هیچ آفست خامی حدس زده نمی‌شود). در ساعت‌های مبهمِ
 * پس‌رفت DST، اولین وقوع انتخاب می‌شود (رفتار قطعی و مستند).
 */
export function wallToUtcInstant(date: string, time: string, tz: string): Date | null {
  if (!isValidTimezone(tz) || !isValidDateStr(date) || !isValidTimeStr(time)) return null
  const [h, mi] = time.split(':').map(Number)
  const want = h * 60 + mi
  for (let dayShift = -1; dayShift <= 1; dayShift++) {
    // حدس اولیه: نیمه‌شب UTC همان تاریخ + ساعت هدف − آفستِ نمونه‌برداری‌شده
    const noon = Date.parse(`${date}T12:00:00Z`) + dayShift * 86400000
    let t = Date.parse(`${date}T00:00:00Z`) + want * MIN - offsetMin(tz, noon) * MIN
    for (let k = 0; k < 3; k++) {
      const w = instantToWall(new Date(t), tz)
      const have = w.h * 60 + w.mi
      if (w.date === date && have === want) return new Date(t)
      if (have === want) break // ساعت درست ولی روز دیگر — کاندید بعدی
      t += (want - have) * MIN
    }
  }
  return null
}

function offsetMin(tz: string, instant: number): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const p: Record<string, string> = {}
  for (const part of dtf.formatToParts(new Date(instant))) p[part.type] = part.value
  const asUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour),
    Number(p.minute),
    Number(p.second)
  )
  return Math.round((asUtc - instant) / 60000)
}

// ---------------------------------------------------------------------------
// بازه‌ها، هم‌پوشانی و فاصله
// ---------------------------------------------------------------------------

export interface Slot {
  start: Date
  end: Date
}

const MIN = 60000

/** آیا دو بازه هم‌پوشانی دارند؟ (حتی یک دقیقه اشتراک = بله) */
export function slotsOverlap(a: Slot, b: Slot): boolean {
  return a.start.getTime() < b.end.getTime() && b.start.getTime() < a.end.getTime()
}

/**
 * بررسی فاصلهٔ حداقلی: بین پایان هر جلسهٔ دیگر و شروع جلسهٔ جدید (و برعکس)
 * باید حداقل «spacingMin» دقیقه فاصله باشد. خروجی: نقض‌ها با جزئیات.
 */
export function spacingViolations(
  candidate: Slot,
  others: Slot[],
  spacingMin: number
): { other: Slot; gapMinutes: number }[] {
  if (spacingMin <= 0) return []
  const violations: { other: Slot; gapMinutes: number }[] = []
  for (const other of others) {
    const gap = Math.max(
      (candidate.start.getTime() - other.end.getTime()) / MIN,
      (other.start.getTime() - candidate.end.getTime()) / MIN
    )
    if (gap < spacingMin) violations.push({ other, gapMinutes: Math.round(gap) })
  }
  return violations
}

// ---------------------------------------------------------------------------
// ظرفیت کلاس
// ---------------------------------------------------------------------------

/** ظرفیت مؤثر کلاس — null یعنی نامحدود */
export function classCapacity(maxStudents: number | null): number | null {
  if (maxStudents == null) return null
  return Math.max(1, Math.round(maxStudents))
}

// ---------------------------------------------------------------------------
// نمایش
// ---------------------------------------------------------------------------

export const WEEKDAY_FULL: Record<string, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
}

/** «Monday, January 20 · 23:30–00:30» در منطقهٔ داده‌شده */
export function formatSlotIn(startAt: Date, durationMin: number, tz: string): string {
  const s = instantToWall(startAt, tz)
  const e = instantToWall(new Date(startAt.getTime() + durationMin * MIN), tz)
  const label = WEEKDAY_FULL[s.day] ?? s.day
  return `${label}, ${s.date} · ${s.time}–${e.time}`
}
