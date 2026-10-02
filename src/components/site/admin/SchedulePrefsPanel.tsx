'use client'

// ---------------------------------------------------------------------------
// 🗓️ پنل ترجیحات برنامه (فاز ۴۷) — نمایش + تشخیص هم‌پوشانی
//
//  • هر ثبت‌نام: روز/بازه/منطقهٔ زمانیِ اصلیِ کاربر + معادل تهران
//  • گروه‌بندی بر اساس کلاس: «Potential Schedule Matches» — اشتراک واقعی
//    بازه‌ها با تبدیل منطقه‌ای (UTC مشترک) و نمایش نهایی به وقت تهران
//  • گروه‌بندی بر اساس مشتری: همهٔ کلاس‌ها/ترجیحات آن ایمیل
// تصمیم نهایی برنامه همیشه با موسسه است — سیستم فقط پیشنهاد می‌دهد.
// ---------------------------------------------------------------------------

import { useMemo, useState } from 'react'
import { CalendarDays, Globe2, Clock, Users, User } from 'lucide-react'
import { siteContent } from '@/content/site-content'
import {
  detectClassOverlaps,
  weeklySlotToUtc,
  utcMinutesToWall,
  utcWeekAnchor,
  TEHRAN_TZ,
  WEEKDAY_LABELS,
  type SchedulePref,
  type Weekday,
} from '@/lib/schedule'
import { timezoneCity } from '@/lib/timezones'

const s = siteContent.admin.scheduling

export interface RegistrationRow {
  id: string
  name: string
  email: string
  classTitle: string | null
  timezone: string
  preferredDays: string // JSON
  preferredTimes: string // JSON
  daysPerWeek: number | null
  scheduleAck: boolean
  createdAt: string
}

function parseJson<T>(v: string, fallback: T): T {
  try {
    const parsed = JSON.parse(v || JSON.stringify(fallback))
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

function toPref(r: RegistrationRow): SchedulePref | null {
  const days = parseJson<Weekday[]>(r.preferredDays, []).filter((d) => typeof d === 'string')
  const times = parseJson<{ start: string; end: string }[]>(r.preferredTimes, [])
  if (!r.timezone || days.length === 0 || times.length === 0) return null
  return {
    email: r.email,
    name: r.name,
    timezone: r.timezone,
    days,
    times,
    daysPerWeek: r.daysPerWeek ?? null,
  }
}

/** کارت یک رکورد — اصلی کاربر + معادل تهران (مرجع ادمین) */
export function RegistrationSchedulingLines({ reg }: { reg: RegistrationRow }) {
  const pref = toPref(reg)
  if (!pref) return null
  const anchor = utcWeekAnchor(new Date(reg.createdAt || Date.now()))
  return (
    <div className="mt-2 pt-2 border-t border-sage-light/15 text-xs space-y-1">
      <p className="font-semibold text-brown-dark flex items-center gap-1.5">
        <CalendarDays className="w-3.5 h-3.5 text-sage-dark" aria-hidden="true" />
        {s.title}
      </p>
      {pref.days.flatMap((day) =>
        pref.times.map((t, i) => {
          const local = `${WEEKDAY_LABELS[day]} ${t.start}–${t.end}`
          const u = weeklySlotToUtc(t, day, pref.timezone, anchor)
          const teStart = utcMinutesToWall(u.start, TEHRAN_TZ, anchor)
          const teEnd = utcMinutesToWall(u.end, TEHRAN_TZ, anchor)
          return (
            <p key={`${day}-${i}`} className="text-brown-light flex flex-wrap items-center gap-x-2">
              <span className="inline-flex items-center gap-1">
                <Globe2 className="w-3 h-3 text-sage-dark" aria-hidden="true" />
                {timezoneCity(pref.timezone)}: <span className="font-medium text-brown">{local}</span>
              </span>
              <span aria-hidden="true">→</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3 text-sage-dark" aria-hidden="true" />
                Tehran: <span className="font-semibold text-brown-dark">{WEEKDAY_LABELS[teStart.day]} {teStart.time}–{teEnd.time}</span>
              </span>
            </p>
          )
        })
      )}
      <p className="text-[11px] text-brown-light flex flex-wrap items-center gap-x-3">
        <span>{s.daysPerWeek}: <span className="font-medium text-brown">{pref.daysPerWeek ?? '—'}</span></span>
        <span>
          {s.ackStatus}:{' '}
          <span className={`font-bold ${reg.scheduleAck ? 'text-sage-dark' : 'text-peach'}`}>
            {reg.scheduleAck ? s.ackYes : s.ackNo}
          </span>
        </span>
      </p>
    </div>
  )
}

/** پنل «Potential Schedule Matches» — گروه‌بندی بر اساس کلاس و مشتری */
export function ScheduleMatchesPanel({ registrations }: { registrations: RegistrationRow[] }) {
  const [view, setView] = useState<'matches' | 'customers'>('matches')
  const withPrefs = useMemo(() => registrations.filter((r) => toPref(r) !== null), [registrations])

  const byClass = useMemo(() => {
    const map = new Map<string, RegistrationRow[]>()
    for (const r of withPrefs) {
      const key = r.classTitle || '—'
      map.set(key, [...(map.get(key) ?? []), r])
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length)
  }, [withPrefs])

  const byCustomer = useMemo(() => {
    const map = new Map<string, RegistrationRow[]>()
    for (const r of withPrefs) {
      map.set(r.email, [...(map.get(r.email) ?? []), r])
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length)
  }, [withPrefs])

  return (
    <div className="mt-8 rounded-2xl border border-sage/40 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-sm font-bold text-brown-dark flex items-center gap-2">
          <Users className="w-4 h-4 text-sage-dark" aria-hidden="true" /> {s.matchesTitle}
        </p>
        <div className="flex gap-1.5">
          {(['matches', 'customers'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-colors cursor-pointer ${
                view === v ? 'bg-sage text-brown-dark' : 'bg-cream text-brown-light hover:text-brown'
              }`}
            >
              {v === 'matches' ? s.viewByClass : s.viewByCustomer}
            </button>
          ))}
        </div>
      </div>

      {withPrefs.length === 0 && (
        <p className="text-xs text-brown-light bg-cream rounded-xl px-4 py-3">{s.empty}</p>
      )}

      {view === 'matches' &&
        byClass.map(([classTitle, rows]) => {
          const prefs = rows.map((r) => toPref(r)).filter((p): p is SchedulePref => p !== null)
          const result = detectClassOverlaps(prefs)
          return (
            <div key={classTitle} className="mb-5 last:mb-0">
              <p className="text-xs font-bold text-brown-dark mb-2">
                {classTitle} · {s.students.replace('{n}', String(rows.length))}
              </p>
              {result.windows.length > 0 ? (
                <div className="space-y-2">
                  {result.windows.map((w, i) => (
                    <div key={i} className="rounded-xl bg-sage-light/20 border border-sage/30 px-4 py-3 text-xs">
                      <p className="font-bold text-sage-dark mb-1">
                        {s.sharedWindow}: {WEEKDAY_LABELS[w.tehran.day]} {w.tehran.start}–{w.tehran.end} — {s.tehranRef}
                      </p>
                      <div className="grid sm:grid-cols-2 gap-1 text-brown-light">
                        {w.locals.map((l, j) => (
                          <p key={j} className="flex items-center gap-1.5">
                            <User className="w-3 h-3 shrink-0" aria-hidden="true" />
                            {l.name || l.email} ({timezoneCity(l.tz)}):{' '}
                            <span className="text-brown font-medium">
                              {WEEKDAY_LABELS[l.day]} {l.start}–{l.end}
                            </span>
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                  <p className="text-[11px] text-brown-light">{s.suggestionNote}</p>
                </div>
              ) : (
                <p className="text-xs text-brown-light bg-cream rounded-xl px-4 py-3">{s.noOverlap}</p>
              )}
            </div>
          )
        })}

      {view === 'customers' &&
        byCustomer.map(([email, rows]) => (
          <div key={email} className="mb-5 last:mb-0">
            <p className="text-xs font-bold text-brown-dark mb-2">
              {rows[0].name || email} <span className="font-mono text-[10px] text-brown-light">({email})</span>
            </p>
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.id} className="rounded-xl bg-cream px-4 py-3 text-xs">
                  <p className="font-semibold text-brown-dark mb-1">{r.classTitle || '—'}</p>
                  <RegistrationSchedulingLines reg={r} />
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  )
}
