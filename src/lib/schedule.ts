// ---------------------------------------------------------------------------
// 🗓️ موتور ترجیحات برنامهٔ هفتگی + تشخیص هم‌پوشانی (فاز ۴۷)
//
// جریان یکسان و اجباری:
//   مشتری: انتخاب منطقهٔ زمانی → روز → بازهٔ ساعتی (به وقت خودش) → ثبت
//   DB:    تنظیمات زمانیِ اصلی کاربر (IANA + روز + بازه) ذخیره می‌شود
//   ادمین: همه‌چیز خودکار به وقت تهران (Asia/Tehran) تبدیل می‌شود
//   هم‌پوشانی: مقایسهٔ بازه‌های مطلق UTC — هرگز مقایسهٔ رشتهٔ ساعت خام
//
// پیاده‌سازی بدون وابستگی بیرونی: همهٔ تبدیل‌ها با Intl (پایگاه منطقهٔ زمانی
// خودِ نود/مرورگر) انجام می‌شود — یعنی DST خودکار رعایت می‌شود و هیچ آفستی
// هاردکد نیست. بازه‌های هفتگی روی «هفتهٔ مرجع مشترک» (دوشنبهٔ UTC همین هفته)
// به دقیقهٔ مطلق نگاشت می‌شوند تا مقایسهٔ کاربران با منطقه‌های مختلف معتبر باشد.
// ---------------------------------------------------------------------------

import { timezoneOffsetMinutes } from './timezones'

// ---------------------------------------------------------------------------
// انواع و ثابت‌ها
// ---------------------------------------------------------------------------

export const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
export type Weekday = (typeof WEEKDAY_KEYS)[number]

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
}

/** شمارهٔ روز JS (0=یکشنبه…6=شنبه) → کلید ما */
const JS_DAY_TO_KEY: Record<number, Weekday> = {
  0: 'sun',
  1: 'mon',
  2: 'tue',
  3: 'wed',
  4: 'thu',
  5: 'fri',
  6: 'sat',
}

export interface TimeSlot {
  start: string // «18:00»
  end: string // «19:00»
}

export const TEHRAN_TZ = 'Asia/Tehran'
export const MIN_OVERLAP_MINUTES = 15 // حداقل هم‌پوشانی معنادار
/** شبکهٔ مجاز شروع/پایان بازه — نیم‌ساعته (ساعت‌های کامل هم شامل است) */
export const SLOT_GRID_MINUTES = 30
export const MAX_PREFERRED_DAYS = 3
export const MAX_PREFERRED_TIMES = 2

// ---------------------------------------------------------------------------
// اعتبارسنجی — فقط سمت سرور داور است
// ---------------------------------------------------------------------------

export function isValidWeekday(v: string): v is Weekday {
  return (WEEKDAY_KEYS as readonly string[]).includes(v)
}

export function isValidTime(t: string): boolean {
  return /^([01]\d|2[0-3]):(00|30)$/.test(t)
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

/** آرایهٔ روزهای انتخابی معتبر — حداکثر ۳، بدون تکرار */
export function sanitizeDays(days: unknown): Weekday[] | null {
  if (!Array.isArray(days)) return null
  const cleaned = days.filter((d): d is Weekday => typeof d === 'string' && isValidWeekday(d))
  const unique = [...new Set(cleaned)]
  if (unique.length === 0 || unique.length > MAX_PREFERRED_DAYS) return null
  return unique
}

/** آرایهٔ بازه‌های معتبر — حداکثر ۲، روی شبکهٔ نیم‌ساعت، گذر از نیمه‌شب مجاز
 *  (پایان ≤ شروع یعنی ادامه در روز بعد؛ مثال سفارش: Mon 22:30–00:30) */
export function slotDurationMinutes(t: TimeSlot): number {
  let d = timeToMinutes(t.end) - timeToMinutes(t.start)
  if (d <= 0) d += 1440 // گذر از نیمه‌شب
  return d
}

export function sanitizeTimes(times: unknown): TimeSlot[] | null {
  if (!Array.isArray(times)) return null
  const cleaned: TimeSlot[] = []
  for (const t of times) {
    if (
      t &&
      typeof t === 'object' &&
      typeof (t as TimeSlot).start === 'string' &&
      typeof (t as TimeSlot).end === 'string' &&
      isValidTime((t as TimeSlot).start) &&
      isValidTime((t as TimeSlot).end)
    ) {
      const duration = slotDurationMinutes(t as TimeSlot)
      if (duration < SLOT_GRID_MINUTES || duration > 12 * 60) continue // بازهٔ خیلی کوتاه/طولانی نامعتبر
      cleaned.push({ start: (t as TimeSlot).start, end: (t as TimeSlot).end })
    }
  }
  if (cleaned.length === 0 || cleaned.length > MAX_PREFERRED_TIMES) return null
  return cleaned
}

// ---------------------------------------------------------------------------
// تبدیل «روز + ساعت به وقت منطقهٔ کاربر» → بازهٔ مطلق UTC در هفتهٔ مرجع
// ---------------------------------------------------------------------------

function jsDayToKey(d: number): Weekday {
  return JS_DAY_TO_KEY[d % 7]
}

/** تاریخ/ساعت تقویمیِ (دیوارِ) یک منطقه در یک لحظه */
function wallClockIn(tz: string, instant: Date): { y: number; mo: number; d: number; h: number; mi: number; weekday: Weekday } {
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
  const weekday = jsDayToKey(new Date(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day))).getUTCDay())
  return {
    y: Number(p.year),
    mo: Number(p.month),
    d: Number(p.day),
    h: Number(p.hour),
    mi: Number(p.minute),
    weekday,
  }
}

/**
 * دوشنبهٔ ۰۰:۰۰ UTC هفتهٔ جاری — لنگر مشترک همهٔ محاسبات هفته.
 * هر دو کاربر نسبت به همین لنگر نگاشت می‌شوند تا مقایسه معتبر باشد.
 */
export function utcWeekAnchor(now: Date = new Date()): number {
  const u = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const dow = u.getUTCDay() // 0=Sun
  const diffToMonday = (dow + 6) % 7 // دوشنبهٔ همین هفته
  u.setUTCDate(u.getUTCDate() - diffToMonday)
  return u.getTime()
}

/**
 * لحظهٔ UTCِ «روز day، ساعت startMin به وقت منطقهٔ tz» در هفتهٔ مرجع مشترک.
 * قطعی و یکتا: در بازهٔ [لنگر−۳۶ساعت … لنگر+۷روز+۳۶ساعت] تنها یک لحظه وجود
 * دارد که تقویم دیواریِ tz دقیقاً (day, startMin) باشد — همان برمی‌گردد.
 * این ساختار تضمین می‌کند «دوشنبهٔ» کاربران منطقه‌های مختلف روی همان هفتهٔ
 * مرجع بیفتد (باگ کلاسیک «دوشنبهٔ بعدیِ هر منطقه» را دور می‌زند).
 */
function weeklySlotUtcInstant(day: Weekday, startMin: number, tz: string, anchor: number): number {
  const targetIdx = WEEKDAY_KEYS.indexOf(day)
  for (let d = -2; d <= 9; d++) {
    const base = anchor + d * 86400000 // نیمه‌شب UTC روز کاندید
    // حدس اول با آفستِ نمونه‌برداری‌شده وسط همان روز UTC
    let t = base + startMin * 60000 - timezoneOffsetMinutes(tz, new Date(base + 12 * 3600000)) * 60000
    // تصحیح دقیقه‌ای (لبهٔ DST / آفست نیم‌ساعته) — حداکثر ۳ تکرار
    for (let k = 0; k < 3; k++) {
      const w = wallClockIn(tz, new Date(t))
      const err = startMin - (w.h * 60 + w.mi)
      if (err === 0) break
      t += err * 60000
    }
    const w = wallClockIn(tz, new Date(t))
    if (w.h * 60 + w.mi === startMin && WEEKDAY_KEYS.indexOf(w.weekday) === targetIdx) {
      return t
    }
  }
  // با فهرست مجاز منطقه‌ها هرگز نباید رخ دهد — لنگر به‌عنوان fail-safe
  return anchor
}

export interface UtcSlot {
  start: number // دقیقهٔ مطلق از لنگر هفته (می‌تواند کمی منفی باشد — بازهٔ پیش از لنگر)
  end: number
}

/** بازهٔ هفتگی کاربر (روزِ انتخابی + ساعت به وقت خودش؛ گذر از نیمه‌شب مجاز) → بازهٔ مطلق UTC */
export function weeklySlotToUtc(slot: TimeSlot, day: Weekday, tz: string, anchor: number, _now: Date = new Date()): UtcSlot {
  const startUtc = weeklySlotUtcInstant(day, timeToMinutes(slot.start), tz, anchor)
  const duration = slotDurationMinutes(slot)
  const s = Math.round((startUtc - anchor) / 60000)
  return { start: s, end: s + duration }
}

// ---------------------------------------------------------------------------
// نمایش در منطقهٔ دلخواه (تهران برای ادمین؛ منطقهٔ کاربر برای خودش)
// ---------------------------------------------------------------------------

/** لحظهٔ UTC → «روز + ساعت» در منطقهٔ داده‌شده */
export function utcMinutesToWall(weekMinute: number, tz: string, anchor: number): { day: Weekday; time: string } {
  const instant = new Date(anchor + weekMinute * 60000)
  const wall = wallClockIn(tz, instant)
  const h = String(wall.h).padStart(2, '0')
  const m = String(wall.mi).padStart(2, '0')
  return { day: wall.weekday, time: `${h}:${m}` }
}

// ---------------------------------------------------------------------------
// تشخیص هم‌پوشانی — قلب منطق برنامه‌ریزی
// ---------------------------------------------------------------------------

export interface SchedulePref {
  email: string
  name: string
  timezone: string
  days: Weekday[]
  times: TimeSlot[]
  daysPerWeek: number | null
}

function intersect(a: UtcSlot, b: UtcSlot): UtcSlot | null {
  const s = Math.max(a.start, b.start)
  const e = Math.min(a.end, b.end)
  return e - s >= MIN_OVERLAP_MINUTES ? { start: s, end: e } : null
}

/** اشتراک همهٔ بازه‌های یک نفر (روز × بازهٔ زمانی) — به دقیقهٔ مطلق UTC */
function personSlots(p: SchedulePref, anchor: number): UtcSlot[] {
  const out: UtcSlot[] = []
  for (const day of p.days) {
    for (const t of p.times) {
      out.push(weeklySlotToUtc(t, day, p.timezone, anchor))
    }
  }
  return out.sort((x, y) => x.start - y.start)
}

/** اشتراک تدریجی بازه‌های همهٔ افراد — گروهی */
function commonSlots(all: UtcSlot[][]): UtcSlot[] {
  if (all.length === 0) return []
  let acc = all[0]
  for (let i = 1; i < all.length; i++) {
    const next: UtcSlot[] = []
    for (const a of acc) {
      for (const b of all[i]) {
        const iv = intersect(a, b)
        if (iv) next.push(iv)
      }
    }
    acc = next
    if (acc.length === 0) return []
  }
  return acc
}

export interface OverlapWindow {
  /** وقت تهران — مرجع اصلی ادمین */
  tehran: { day: Weekday; start: string; end: string }
  /** بازهٔ دقیقهٔ خام (برای رندرهای دیگر) */
  utc: UtcSlot
  /** وقت محلی هر شرکت‌کننده برای همین پنجره */
  locals: { email: string; name: string; tz: string; day: Weekday; start: string; end: string }[]
}

export interface ClassOverlapResult {
  anchor: number
  participants: number
  windows: OverlapWindow[]
  /** نمایش محلی هر نفر از کل ترجیحاتش (برای جدول ادمین) */
  perPerson: { email: string; name: string; tz: string; daysPerWeek: number | null; entries: { day: Weekday; start: string; end: string; tehranDay: Weekday; tehranStart: string; tehranEnd: string }[] }[]
}

function fmtRange(start: string, end: string): string {
  return `${start}–${end}`
}

/**
 * هم‌پوشانی واقعی ترجیحات چند نفر برای یک کلاس.
 *  ۱) هر ترجیح با منطقهٔ زمانی خودِ کاربر به بازهٔ مطلق UTC روی هفتهٔ مرجع مشترک نگاشت می‌شود
 *  ۲) اشتراک بازه‌ها محاسبه می‌شود (گروه کامل؛ اگر گروهی نبود، جفت‌های ممکن)
 *  ۳) خروجی اصلی = وقت تهران (+ وقت محلی هر نفر برای شفافیت)
 */
export function detectClassOverlaps(prefs: SchedulePref[], now: Date = new Date()): ClassOverlapResult {
  const anchor = utcWeekAnchor(now)
  const perPerson = prefs.map((p) => {
    const entries = p.days.flatMap((day) =>
      p.times.map((t) => {
        const utc = weeklySlotToUtc(t, day, p.timezone, anchor, now)
        const teStart = utcMinutesToWall(utc.start, TEHRAN_TZ, anchor)
        const teEnd = utcMinutesToWall(utc.end, TEHRAN_TZ, anchor)
        return { day, start: t.start, end: t.end, tehranDay: teStart.day, tehranStart: `${teStart.time}`, tehranEnd: `${teEnd.time}` }
      })
    )
    return { email: p.email, name: p.name, tz: p.timezone, daysPerWeek: p.daysPerWeek, entries }
  })

  if (prefs.length === 0) {
    return { anchor, participants: 0, windows: [], perPerson }
  }

  const slotsPerPerson = prefs.map((p) => personSlots(p, anchor))
  // اول اشتراک کل گروه؛ اگر هیچ بود، بهترین جفت‌ها
  let groupSlots = commonSlots(slotsPerPerson)
  let matchedPairs: [number, number][] = []
  if (groupSlots.length === 0 && prefs.length > 1) {
    groupSlots = []
    for (let i = 0; i < prefs.length; i++) {
      for (let j = i + 1; j < prefs.length; j++) {
        const pair = commonSlots([slotsPerPerson[i], slotsPerPerson[j]])
        if (pair.length > 0) {
          matchedPairs.push([i, j])
          for (const s of pair) groupSlots.push(s)
        }
      }
    }
    groupSlots.sort((a, b) => a.start - b.start)
  }

  const windows: OverlapWindow[] = groupSlots.slice(0, 12).map((s) => {
    const teStart = utcMinutesToWall(s.start, TEHRAN_TZ, anchor)
    const teEnd = utcMinutesToWall(s.end, TEHRAN_TZ, anchor)
    return {
      tehran: { day: teStart.day, start: teStart.time, end: teEnd.time },
      utc: s,
      locals: prefs.map((p) => {
        const lStart = utcMinutesToWall(s.start, p.timezone, anchor)
        const lEnd = utcMinutesToWall(s.end, p.timezone, anchor)
        return { email: p.email, name: p.name, tz: p.timezone, day: lStart.day, start: lStart.time, end: lEnd.time }
      }),
    }
  })

  return { anchor, participants: prefs.length, windows, perPerson }
}

/** برچسب یک ترجیح برای نمایش — «Monday 18:00–19:00» */
export function prefLabel(day: Weekday, slot: TimeSlot): string {
  return `${WEEKDAY_LABELS[day]} ${fmtRange(slot.start, slot.end)}`
}
