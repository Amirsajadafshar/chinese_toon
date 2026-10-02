'use client'

// ---------------------------------------------------------------------------
// 🗓️ تب Scheduling پنل ادمین (فاز ۴۸) — برنامهٔ واقعی جلسات
//
//  • تقویم هفتگی به وقت تهران (مرجع ادمین) — بلوک‌های رنگی بر اساس وضعیت
//    + نمای فهرست با فیلتر (هر دو حفظ می‌شوند؛ تقویم اضافه شده نه جایگزین)
//  • پیشنهاد جلسهٔ جدید: دانش‌پذیر + کلاس + تاریخ/ساعت در منطقهٔ دلخواه
//    (پیش‌فرض منطقهٔ ثبت‌نام دانش‌پذیر) با پیش‌نمایش زندهٔ تهران/محلی و مدت
//    واقعی کلاس — پاسخ سرور حرف آخر است
//  • جزئیات: زنجیرهٔ جابه‌جایی + تاریخچهٔ ممیزی + تأیید/لغو/تکمیل/جابه‌جایی
//  • تنظیمات قواعد: فاصلهٔ حداقلی + مدت پیش‌فرض (SiteSetting — سرور)
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  History,
  Loader2,
  Settings2,
  Table2,
  User,
  X,
} from 'lucide-react'
import { siteContent } from '@/content/site-content'
import { SUPPORTED_TIMEZONES, timezoneCity } from '@/lib/timezones'
import { wallToUtcInstant, instantToWall, WEEKDAY_FULL } from '@/lib/scheduling'

const s = siteContent.admin.scheduleAdmin

// ---------------------------------------------------------------------------
// انواع
// ---------------------------------------------------------------------------

interface ScheduleRow {
  id: string
  status: string
  startAt: string
  endAt: string
  durationMin: number
  timezone: string
  inputDate: string | null
  inputTime: string | null
  inputDay: string | null
  note: string | null
  orderRef: string | null
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
  tehran: { day: string; date: string; time: string; endTime: string }
  local: { day: string; date: string; time: string; endTime: string }
  confirmedCount: number
}

interface AdminClass {
  id: string
  slug: string
  title: string
  sessionDurationMin: number | null
  maxStudents: number | null
  status: string
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

const STATUS_BLOCK: Record<string, string> = {
  PROPOSED: 'bg-amber-100/90 border-amber-300 text-amber-900',
  CONFIRMED: 'bg-[#dff0d8] border-[#b7d6ab] text-[#33502d]',
  RESCHEDULED: 'bg-orange-100/90 border-orange-300 text-orange-900',
  CANCELLED: 'bg-gray-100/90 border-gray-300 text-gray-500 line-through',
  COMPLETED: 'bg-sage-light/60 border-sage text-brown-dark',
}

const STATUS_BADGE: Record<string, string> = {
  PROPOSED: 'bg-amber-100 text-amber-800 border-amber-200',
  CONFIRMED: 'bg-green-100 text-green-800 border-green-200',
  RESCHEDULED: 'bg-orange-100 text-orange-800 border-orange-200',
  CANCELLED: 'bg-gray-100 text-gray-600 border-gray-200',
  COMPLETED: 'bg-[#e7efe4] text-[#3f5a3a] border-[#c9dcc2]',
}

function stLabel(st: string): string {
  return (s as unknown as Record<string, string>)[`st${st}`] ?? st
}

function fmtDate(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number)
  if (!y || !m || !d) return ymd
  return `${MONTHS[m - 1]} ${d}, ${y}`
}

const TIME_OPTIONS: string[] = (() => {
  const out: string[] = []
  for (let h = 0; h < 24; h++) {
    out.push(`${String(h).padStart(2, '0')}:00`)
    out.push(`${String(h).padStart(2, '0')}:30`)
  }
  return out
})()

/** دوشنبهٔ تقویمیِ یک تاریخ YYYY-MM-DD (خودِ رشته، بدون منطقهٔ مرورگر) */
function mondayOf(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00Z`)
  const dow = d.getUTCDay()
  d.setUTCDate(d.getUTCDate() - ((dow + 6) % 7))
  return d.toISOString().slice(0, 10)
}

function addDays(ymd: string, n: number): string {
  const d = new Date(`${ymd}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// کامپوننت اصلی
// ---------------------------------------------------------------------------

export function SchedulingAdminTab({ token, onToast }: { token: string; onToast: (m: string) => void }) {
  const [loading, setLoading] = useState(true)
  const [schedules, setSchedules] = useState<ScheduleRow[]>([])
  const [classes, setClasses] = useState<AdminClass[]>([])
  const [students, setStudents] = useState<{ email: string; name: string; tz: string }[]>([])
  const [settings, setSettings] = useState({ minSpacingMinutes: 60, defaultSessionDurationMin: 60 })
  const [view, setView] = useState<'calendar' | 'list'>('calendar')
  const [weekAnchor, setWeekAnchor] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState('ACTIVE')

  const [showProposal, setShowProposal] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  const headers = useMemo(() => ({ 'x-admin-key': token }), [token])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [sch, cls, users, st] = await Promise.all([
        fetch('/api/schedules', { headers, cache: 'no-store' }).then((r) => (r.ok ? r.json() : { schedules: [] })),
        fetch('/api/admin/classes', { headers, cache: 'no-store' }).then((r) => (r.ok ? r.json() : { classes: [] })),
        fetch('/api/register', { headers, cache: 'no-store' }).then((r) => (r.ok ? r.json() : { registrations: [] })),
        fetch('/api/schedules/settings', { headers, cache: 'no-store' }).then((r) => (r.ok ? r.json() : { settings })),
      ])
      setSchedules(sch.schedules ?? [])
      setClasses(
        (cls.classes ?? []).map((c: Partial<AdminClass> & Record<string, unknown>) => ({
          id: String(c.id ?? ''),
          slug: String(c.slug ?? ''),
          title: String(c.title ?? c.slug ?? ''),
          sessionDurationMin: (c.sessionDurationMin as number | null) ?? null,
          maxStudents: (c.maxStudents as number | null) ?? null,
          status: String(c.status ?? 'active'),
        }))
      )
      // دانش‌پذیرها: آخرین منطقهٔ ثبت‌نام هر ایمیل
      const tzByEmail = new Map<string, string>()
      for (const r of (users.registrations ?? []) as { email: string; timezone: string; createdAt: string }[]) {
        if (r.timezone && !tzByEmail.has(r.email)) tzByEmail.set(r.email, r.timezone)
      }
      const seen = new Set<string>()
      const studentList: { email: string; name: string; tz: string }[] = []
      for (const r of (users.registrations ?? []) as { email: string; name: string; timezone: string; createdAt: string }[]) {
        if (seen.has(r.email)) continue
        seen.add(r.email)
        studentList.push({ email: r.email, name: r.name, tz: r.timezone || tzByEmail.get(r.email) || 'Asia/Tehran' })
      }
      setStudents(studentList)
      if (st?.settings) setSettings(st.settings)
    } catch {
      onToast('Could not load scheduling data')
    } finally {
      setLoading(false)
    }
     
  }, [headers])

  useEffect(() => {
    void load()
    setWeekAnchor(mondayOf(instantToWall(new Date(), "Asia/Tehran").date))
  }, [])

  const visible = useMemo(() => {
    if (statusFilter === 'ACTIVE') return schedules.filter((x) => x.status === 'PROPOSED' || x.status === 'CONFIRMED')
    if (statusFilter === 'ALL') return schedules
    return schedules.filter((x) => x.status === statusFilter)
  }, [schedules, statusFilter])

  const weekSessions = useMemo(() => {
    if (!weekAnchor) return []
    const end = addDays(weekAnchor, 7)
    return visible.filter((x) => x.tehran.date >= weekAnchor && x.tehran.date < end)
  }, [visible, weekAnchor])

  if (loading && schedules.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-sage-light/20 bg-white p-8" role="status">
        <p className="text-sm text-brown-light flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading schedules…
        </p>
      </div>
    )
  }

  return (
    <div className="mt-8">
      {/* سرصفحهٔ تب */}
      <div className="rounded-2xl border border-sage-light/20 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-brown-dark flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-sage-dark" aria-hidden="true" /> {siteContent.admin.tabSchedule}
            </p>
            <p className="text-xs text-brown-light mt-1 max-w-2xl">{s.subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSettings((v) => !v)}
              className="px-4 py-2.5 rounded-xl border border-sage-light/50 bg-white text-xs font-bold text-brown hover:border-sage transition-colors cursor-pointer inline-flex items-center gap-1.5 min-h-[44px]"
              aria-expanded={showSettings}
            >
              <Settings2 className="w-3.5 h-3.5" /> {s.settingsTitle}
            </button>
            <button
              type="button"
              onClick={() => setShowProposal(true)}
              className="bg-sage text-brown-dark px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-sage-dark transition-colors cursor-pointer inline-flex items-center gap-1.5 min-h-[44px]"
            >
              <CalendarPlus className="w-3.5 h-3.5" /> {s.newProposal}
            </button>
          </div>
        </div>

        {/* تنظیمات قواعد */}
        {showSettings && (
          <SettingsCard
            token={token}
            settings={settings}
            onSaved={(next) => {
              setSettings(next)
              onToast(s.settingsSaved)
            }}
          />
        )}

        {/* نوار نما + فیلتر */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <div className="flex gap-1.5">
            {(['calendar', 'list'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 min-h-[36px] ${
                  view === v ? 'bg-sage text-brown-dark' : 'bg-cream text-brown-light hover:text-brown'
                }`}
                aria-pressed={view === v}
              >
                {v === 'calendar' ? <CalendarDays className="w-3 h-3" /> : <Table2 className="w-3 h-3" />}
                {v === 'calendar' ? s.viewCalendar : s.viewList}
              </button>
            ))}
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-sage-light/40 bg-cream/50 text-xs text-brown cursor-pointer"
            aria-label={s.statusAll}
          >
            <option value="ACTIVE">{s.stPROPOSED} + {s.stCONFIRMED}</option>
            <option value="ALL">{s.statusAll}</option>
            <option value="PROPOSED">{s.stPROPOSED}</option>
            <option value="CONFIRMED">{s.stCONFIRMED}</option>
            <option value="RESCHEDULED">{s.stRESCHEDULED}</option>
            <option value="CANCELLED">{s.stCANCELLED}</option>
            <option value="COMPLETED">{s.stCOMPLETED}</option>
          </select>
          <p className="text-[11px] text-brown-light mr-auto">{s.tzNote}</p>
        </div>
      </div>

      {/* تقویم هفتگی */}
      {view === 'calendar' && weekAnchor && (
        <div className="mt-6 rounded-2xl border border-sage-light/20 bg-white p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <p className="text-sm font-bold text-brown-dark">
              {s.weekOf} {fmtDate(weekAnchor)}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setWeekAnchor((w) => addDays(w, -7))}
                className="p-2.5 rounded-lg bg-cream text-brown hover:bg-sage-light/40 transition-colors cursor-pointer min-h-[40px] min-w-[40px] inline-flex items-center justify-center"
                aria-label={s.prevWeek}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setWeekAnchor(mondayOf(instantToWall(new Date(), 'Asia/Tehran').date))}
                className="px-3 py-2 rounded-lg bg-cream text-brown text-xs font-bold hover:bg-sage-light/40 transition-colors cursor-pointer min-h-[40px]"
              >
                {s.thisWeek}
              </button>
              <button
                type="button"
                onClick={() => setWeekAnchor((w) => addDays(w, 7))}
                className="p-2.5 rounded-lg bg-cream text-brown hover:bg-sage-light/40 transition-colors cursor-pointer min-h-[40px] min-w-[40px] inline-flex items-center justify-center"
                aria-label={s.nextWeek}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {weekSessions.length === 0 ? (
            <p className="text-xs text-brown-light bg-cream rounded-xl px-4 py-4">{s.noSessions}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
              {DAY_ORDER.map((dayKey, i) => {
                const ymd = addDays(weekAnchor, i)
                const daySessions = weekSessions
                  .filter((x) => x.tehran.date === ymd)
                  .sort((a, b) => a.tehran.time.localeCompare(b.tehran.time))
                return (
                  <div key={dayKey} className="rounded-xl bg-cream/40 border border-sage-light/20 p-2.5 min-h-[120px]">
                    <p className="text-[11px] font-bold text-brown-dark mb-2">
                      {WEEKDAY_FULL[dayKey]} <span className="text-brown-light font-medium">{fmtDate(ymd).replace(`, ${ymd.slice(0, 4)}`, '')}</span>
                    </p>
                    <div className="space-y-1.5">
                      {daySessions.map((x) => (
                        <button
                          key={x.id}
                          type="button"
                          onClick={() => setDetailId(x.id)}
                          className={`w-full text-right rounded-lg border px-2.5 py-2 text-[11px] leading-tight transition-transform hover:scale-[1.02] cursor-pointer ${STATUS_BLOCK[x.status] ?? STATUS_BLOCK.PROPOSED}`}
                          title={`${x.student.name} — ${x.class.title}`}
                        >
                          <span className="font-bold block">{x.tehran.time}–{x.tehran.endTime}</span>
                          <span className="block truncate">{x.student.name}</span>
                          <span className="block truncate opacity-75">{x.class.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* فهرست */}
      {view === 'list' && (
        <div className="mt-6 rounded-2xl border border-sage-light/20 bg-white p-5">
          {visible.length === 0 ? (
            <p className="text-xs text-brown-light bg-cream rounded-xl px-4 py-4">{s.listEmpty}</p>
          ) : (
            <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
              <table className="w-full text-xs min-w-[760px]">
                <thead>
                  <tr className="text-left text-brown-light border-b border-sage-light/30">
                    <th className="py-2 pr-3 font-semibold">Tehran time</th>
                    <th className="py-2 pr-3 font-semibold">{s.student}</th>
                    <th className="py-2 pr-3 font-semibold">{s.classLabel}</th>
                    <th className="py-2 pr-3 font-semibold">{s.seats}</th>
                    <th className="py-2 pr-3 font-semibold">Status</th>
                    <th className="py-2 pr-3 font-semibold" />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((x) => (
                    <tr key={x.id} className="border-b border-sage-light/15 hover:bg-cream/40 transition-colors">
                      <td className="py-2.5 pr-3">
                        <span className="font-bold text-brown-dark">
                          {WEEKDAY_FULL[x.tehran.day]?.slice(0, 3) ?? x.tehran.day} {fmtDate(x.tehran.date).replace(`, ${x.tehran.date.slice(0, 4)}`, '')} · {x.tehran.time}–{x.tehran.endTime}
                        </span>
                        <span className="block text-[10px] text-brown-light mt-0.5">
                          {timezoneCity(x.timezone)}: {WEEKDAY_FULL[x.local.day]?.slice(0, 3) ?? x.local.day} {x.local.time}–{x.local.endTime}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className="text-brown font-medium block">{x.student.name}</span>
                        <span className="text-[10px] text-brown-light">{x.student.email}</span>
                      </td>
                      <td className="py-2.5 pr-3 text-brown">{x.class.title}</td>
                      <td className="py-2.5 pr-3 text-brown tabular-nums">
                        {x.class.maxStudents ? `${x.confirmedCount}/${x.class.maxStudents}` : '—'}
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${STATUS_BADGE[x.status] ?? STATUS_BADGE.CANCELLED}`}>
                          {stLabel(x.status)}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3">
                        <button
                          type="button"
                          onClick={() => setDetailId(x.id)}
                          className="px-3 py-1.5 rounded-lg bg-cream text-brown font-bold hover:bg-sage-light/50 transition-colors cursor-pointer min-h-[36px]"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* مودال پیشنهاد */}
      {showProposal && (
        <ProposalModal
          token={token}
          classes={classes}
          students={students}
          defaultDuration={settings.defaultSessionDurationMin}
          onClose={() => setShowProposal(false)}
          onDone={() => {
            setShowProposal(false)
            onToast(s.proposeOk)
            void load()
          }}
        />
      )}

      {/* مودال جزئیات */}
      {detailId && (
        <DetailModal
          token={token}
          scheduleId={detailId}
          classes={classes}
          onClose={() => setDetailId(null)}
          onChanged={() => {
            void load()
          }}
          onToast={onToast}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// تنظیمات قواعد
// ---------------------------------------------------------------------------

function SettingsCard({
  token,
  settings,
  onSaved,
}: {
  token: string
  settings: { minSpacingMinutes: number; defaultSessionDurationMin: number }
  onSaved: (s: { minSpacingMinutes: number; defaultSessionDurationMin: number }) => void
}) {
  const [minSpacing, setMinSpacing] = useState(String(settings.minSpacingMinutes))
  const [duration, setDuration] = useState(String(settings.defaultSessionDurationMin))
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    setMinSpacing(String(settings.minSpacingMinutes))
    setDuration(String(settings.defaultSessionDurationMin))
  }, [settings])

  const save = async () => {
    setSaving(true)
    setErr('')
    try {
      const res = await fetch('/api/schedules/settings', {
        method: 'PUT',
        headers: { 'x-admin-key': token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ minSpacingMinutes: Number(minSpacing), defaultSessionDurationMin: Number(duration) }),
      })
      const data = await res.json().catch(() => null)
      if (res.ok && data?.settings) onSaved(data.settings)
      else setErr(data?.error ?? 'Save failed')
    } catch {
      setErr('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-4 rounded-xl bg-cream/50 border border-sage-light/30 p-4">
      <p className="text-xs font-bold text-brown-dark mb-1">{s.settingsTitle}</p>
      <p className="text-[11px] text-brown-light mb-3">{s.settingsHint}</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block text-xs text-brown">
          <span className="font-semibold block mb-1.5">{s.minSpacing}</span>
          <input
            type="number"
            min={0}
            max={1440}
            value={minSpacing}
            onChange={(e) => setMinSpacing(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-sage-light/40 bg-white text-sm text-brown focus:outline-none focus:border-sage"
          />
        </label>
        <label className="block text-xs text-brown">
          <span className="font-semibold block mb-1.5">{s.defaultDuration}</span>
          <input
            type="number"
            min={15}
            max={480}
            step={5}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-sage-light/40 bg-white text-sm text-brown focus:outline-none focus:border-sage"
          />
        </label>
      </div>
      {err && <p className="text-xs text-red-600 mt-2">{err}</p>}
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="mt-3 bg-sage text-brown-dark px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-sage-dark transition-colors cursor-pointer inline-flex items-center gap-1.5 min-h-[44px] disabled:opacity-60"
      >
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} {s.save}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// مودال پیشنهاد جلسه — با پیش‌نمایش زندهٔ تبدیل منطقه‌ای
// ---------------------------------------------------------------------------

function ProposalModal({
  token,
  classes,
  students,
  defaultDuration,
  onClose,
  onDone,
}: {
  token: string
  classes: AdminClass[]
  students: { email: string; name: string; tz: string }[]
  defaultDuration: number
  onClose: () => void
  onDone: () => void
}) {
  const [email, setEmail] = useState('')
  const [classId, setClassId] = useState('')
  const [date, setDate] = useState(addDays(instantToWall(new Date(), 'Asia/Tehran').date, 1))
  const [time, setTime] = useState('18:00')
  const [tz, setTz] = useState('Asia/Tehran')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  const selClass = classes.find((c) => c.id === classId)
  const duration = selClass?.sessionDurationMin ?? defaultDuration

  // ⌨️ پیش‌نمایش زنده — همان موتور سمت سرور (Intl)؛ هیچ آفست دستی
  const preview = useMemo(() => {
    if (!date || !time) return null
    const instant = wallToUtcInstant(date, time, tz)
    if (!instant) return { invalid: true as const }
    const te = instantToWall(instant, 'Asia/Tehran')
    const lo = instantToWall(instant, tz)
    const end = instantToWall(new Date(instant.getTime() + duration * 60000), 'Asia/Tehran')
    return {
      invalid: false as const,
      tehran: `${WEEKDAY_FULL[te.day]}, ${fmtDate(te.date)} · ${te.time}–${end.time}`,
      local: `${WEEKDAY_FULL[lo.day]}, ${fmtDate(lo.date)} · ${lo.time}`,
    }
  }, [date, time, tz, duration])

  // انتخاب دانش‌پذیر → منطقهٔ ثبت‌نامش پیش‌فرض شود
  const pickStudent = (value: string) => {
    setEmail(value)
    const st = students.find((x) => x.email.toLowerCase() === value.trim().toLowerCase())
    if (st?.tz) setTz(st.tz)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setFieldErrors({})
    try {
      const res = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'x-admin-key': token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), classId, date, time, tz, note: note || undefined }),
      })
      const data = await res.json().catch(() => null)
      if (res.ok) onDone()
      else {
        setError(data?.error ?? 'Proposal failed')
        setFieldErrors(data?.details?.fieldErrors ?? {})
      }
    } catch {
      setError('Network error')
    } finally {
      setBusy(false)
    }
  }

  const inputCls =
    'w-full px-3.5 py-2.5 rounded-xl border border-sage-light/40 bg-cream/40 text-sm text-brown focus:outline-none focus:border-sage focus:ring-[3px] focus:ring-sage/20'
  const labelCls = 'block text-xs font-semibold text-brown-dark mb-1.5'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brown-dark/40 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={s.newProposal}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6 md:p-8">
        <div className="flex items-center justify-between mb-5">
          <p className="text-base font-bold text-brown-dark flex items-center gap-2">
            <CalendarPlus className="w-4 h-4 text-sage-dark" /> {s.newProposal}
          </p>
          <button type="button" onClick={onClose} className="p-2.5 rounded-lg text-brown-light hover:bg-cream cursor-pointer min-h-[40px] min-w-[40px] inline-flex items-center justify-center" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="sch-email" className={labelCls}>{s.formStudent}</label>
              <input
                id="sch-email"
                type="email"
                list="sch-students"
                required
                value={email}
                onChange={(e) => pickStudent(e.target.value)}
                className={inputCls}
                placeholder={s.formStudentPlaceholder}
              />
              <datalist id="sch-students">
                {students.map((st) => (
                  <option key={st.email} value={st.email}>{st.name}</option>
                ))}
              </datalist>
              {fieldErrors.email && <p className="text-[11px] text-red-600 mt-1">{fieldErrors.email[0]}</p>}
            </div>
            <div>
              <label htmlFor="sch-class" className={labelCls}>{s.formClass}</label>
              <select id="sch-class" required value={classId} onChange={(e) => setClassId(e.target.value)} className={inputCls}>
                <option value="">{s.formClassPlaceholder}</option>
                {classes.filter((c) => c.status !== 'archived').map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} {c.sessionDurationMin ? `· ${c.sessionDurationMin}min` : ''} {c.maxStudents ? `· max ${c.maxStudents}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="sch-date" className={labelCls}>{s.formDate}</label>
              <input id="sch-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label htmlFor="sch-time" className={labelCls}>{s.formTime}</label>
              <select id="sch-time" value={time} onChange={(e) => setTime(e.target.value)} className={inputCls}>
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="sch-tz" className={labelCls}>{s.formTz}</label>
              <select id="sch-tz" value={tz} onChange={(e) => setTz(e.target.value)} className={inputCls}>
                {SUPPORTED_TIMEZONES.map((t) => (
                  <option key={t.tz} value={t.tz}>{timezoneCity(t.tz)}</option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-[11px] text-brown-light -mt-2">{s.formTzHint}</p>

          {/* پیش‌نمایش زنده */}
          <div className="rounded-xl bg-sage-light/20 border border-sage/30 px-4 py-3 text-xs">
            <p className="font-bold text-brown-dark mb-1">{s.preview}</p>
            {preview === null || preview.invalid ? (
              <p className="text-red-600">{s.errINVALID_TIME}</p>
            ) : (
              <div className="space-y-0.5 text-brown">
                <p>
                  {s.previewTehran} <span className="font-bold text-brown-dark">{preview.tehran}</span>
                </p>
                <p>
                  {s.previewLocal} <span className="font-semibold">{preview.local}</span>
                </p>
                <p className="text-brown-light">{(s.previewDuration as string).replace('{min}', String(duration))}</p>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="sch-note" className={labelCls}>{s.formNote}</label>
            <textarea id="sch-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} placeholder={s.formNotePlaceholder} />
          </div>

          {error && (
            <p role="alert" className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              {error}
              {fieldErrors.conflicts && <span className="block mt-1">{fieldErrors.conflicts[0]}</span>}
              {fieldErrors.spacing && <span className="block mt-1">{s.errSPACING}</span>}
              {fieldErrors.capacity && <span className="block mt-1">{s.errCAPACITY_FULL}</span>}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl border border-sage-light/50 text-xs font-bold text-brown hover:bg-cream cursor-pointer min-h-[44px]">
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !email || !classId}
              className="bg-sage text-brown-dark px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-sage-dark transition-colors cursor-pointer inline-flex items-center gap-1.5 min-h-[44px] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CalendarPlus className="w-3.5 h-3.5" />} {s.submit}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// مودال جزئیات + ممیزی + اکشن‌ها
// ---------------------------------------------------------------------------

interface AuditRow {
  id: string
  action: string
  actor: string
  detail: string
  createdAt: string
}

function DetailModal({
  token,
  scheduleId,
  classes,
  onClose,
  onChanged,
  onToast,
}: {
  token: string
  scheduleId: string
  classes: AdminClass[]
  onClose: () => void
  onChanged: () => void
  onToast: (m: string) => void
}) {
  const [row, setRow] = useState<ScheduleRow | null>(null)
  const [audits, setAudits] = useState<AuditRow[]>([])
  const [chain, setChain] = useState<{ id: string; status: string; startAt: string }[]>([])
  const [successors, setSuccessors] = useState<{ id: string; status: string; startAt: string }[]>([])
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'view' | 'cancel' | 'reschedule'>('view')
  const [reason, setReason] = useState('')
  const [rDate, setRDate] = useState('')
  const [rTime, setRTime] = useState('18:00')
  const [rTz, setRTz] = useState('Asia/Tehran')

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/schedules/${scheduleId}`, { headers: { 'x-admin-key': token }, cache: 'no-store' })
      if (!res.ok) {
        setError('Could not load details')
        return
      }
      const data = await res.json()
      setRow(data.schedule)
      setAudits(data.audits ?? [])
      setChain(data.chain ?? [])
      setSuccessors(data.successors ?? [])
      setRTz(data.schedule?.timezone ?? 'Asia/Tehran')
      setRDate(data.schedule?.inputDate ?? '')
      setRTime(data.schedule?.inputTime ?? '18:00')
    } catch {
      setError('Network error')
    }
  }, [scheduleId, token])

  useEffect(() => {
    void load()
  }, [load])

  const act = async (action: 'confirm' | 'cancel' | 'complete' | 'reschedule', extra: Record<string, unknown> = {}) => {
    setBusy(action)
    setError('')
    try {
      const res = await fetch(`/api/schedules/${scheduleId}`, {
        method: 'PATCH',
        headers: { 'x-admin-key': token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      const data = await res.json().catch(() => null)
      if (res.ok) {
        onToast(s.ok)
        setMode('view')
        await load()
        onChanged()
      } else {
        const code = data?.code as string | undefined
        setError(code && (s as unknown as Record<string, string>)[`err${code}`] ? (s as unknown as Record<string, string>)[`err${code}`] : (data?.error ?? 'Action failed'))
      }
    } catch {
      setError('Network error')
    } finally {
      setBusy('')
    }
  }

  const rPreview = useMemo(() => {
    if (!rDate || !rTime) return null
    const instant = wallToUtcInstant(rDate, rTime, rTz)
    if (!instant) return { invalid: true as const }
    const te = instantToWall(instant, 'Asia/Tehran')
    const end = instantToWall(new Date(instant.getTime() + (row?.durationMin ?? 60) * 60000), 'Asia/Tehran')
    const lo = instantToWall(instant, rTz)
    return {
      invalid: false as const,
      tehran: `${WEEKDAY_FULL[te.day]}, ${fmtDate(te.date)} · ${te.time}–${end.time}`,
      local: `${WEEKDAY_FULL[lo.day]} ${lo.time}`,
    }
  }, [rDate, rTime, rTz, row?.durationMin])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brown-dark/40 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={s.details}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6 md:p-8">
        <div className="flex items-center justify-between mb-4">
          <p className="text-base font-bold text-brown-dark">{s.details}</p>
          <button type="button" onClick={onClose} className="p-2.5 rounded-lg text-brown-light hover:bg-cream cursor-pointer min-h-[40px] min-w-[40px] inline-flex items-center justify-center" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!row ? (
          <p className="text-sm text-brown-light">{error || 'Loading…'}</p>
        ) : (
          <div className="space-y-4 text-xs">
            {/* خلاصه */}
            <div className="rounded-xl bg-sage-light/20 border border-sage/30 px-4 py-3 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-brown-dark">{row.class.title}</p>
                <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${STATUS_BADGE[row.status] ?? STATUS_BADGE.CANCELLED}`}>{stLabel(row.status)}</span>
              </div>
              <p className="text-brown flex items-center gap-1.5">
                <User className="w-3 h-3" aria-hidden="true" /> {row.student.name} · {row.student.email}
              </p>
              <p className="text-brown">
                <span className="font-bold">Tehran:</span> {WEEKDAY_FULL[row.tehran.day]}, {fmtDate(row.tehran.date)} · {row.tehran.time}–{row.tehran.endTime}
              </p>
              <p className="text-brown-light">
                {timezoneCity(row.timezone)}: {WEEKDAY_FULL[row.local.day]}, {fmtDate(row.local.date)} · {row.local.time}–{row.local.endTime} · {row.durationMin} min
              </p>
              {s.originalInput && row.inputDate && row.inputTime && (
                <p className="text-brown-light">
                  {s.originalInput}: {row.inputDate} {row.inputTime} ({timezoneCity(row.timezone)})
                </p>
              )}
              {row.class.maxStudents && (
                <p className="text-brown-light">{s.seats}: {row.confirmedCount}/{row.class.maxStudents}</p>
              )}
              {row.orderRef && <p className="text-brown-light">{s.order}: {row.orderRef}</p>}
              {row.note && <p className="text-brown-light italic">“{row.note}”</p>}
              {row.cancelReason && <p className="text-brown-light">Reason: {row.cancelReason}</p>}
            </div>

            {/* اکشن‌ها */}
            {mode === 'view' && (
              <div className="flex flex-wrap gap-2">
                {row.status === 'PROPOSED' && (
                  <button type="button" onClick={() => act('confirm')} disabled={busy !== ''} className="bg-sage text-brown-dark px-4 py-2.5 rounded-xl font-bold hover:bg-sage-dark cursor-pointer inline-flex items-center gap-1.5 min-h-[44px] disabled:opacity-60">
                    {busy === 'confirm' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} {s.confirm}
                  </button>
                )}
                {(row.status === 'PROPOSED' || row.status === 'CONFIRMED') && (
                  <>
                    <button type="button" onClick={() => setMode('reschedule')} disabled={busy !== ''} className="border border-sage-light/50 px-4 py-2.5 rounded-xl font-bold text-brown hover:bg-cream cursor-pointer min-h-[44px] disabled:opacity-60">
                      {s.reschedule}
                    </button>
                    <button type="button" onClick={() => setMode('cancel')} disabled={busy !== ''} className="border border-peach/60 text-brown px-4 py-2.5 rounded-xl font-bold hover:bg-peach/20 cursor-pointer min-h-[44px] disabled:opacity-60">
                      {s.cancel}
                    </button>
                  </>
                )}
                {row.status === 'CONFIRMED' && (
                  <button type="button" onClick={() => act('complete')} disabled={busy !== ''} className="border border-sage-light/50 px-4 py-2.5 rounded-xl font-bold text-brown hover:bg-cream cursor-pointer min-h-[44px] disabled:opacity-60">
                    {busy === 'complete' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} {s.complete}
                  </button>
                )}
              </div>
            )}

            {/* لغو با دلیل */}
            {mode === 'cancel' && (
              <div className="rounded-xl bg-peach/10 border border-peach/40 px-4 py-3 space-y-2">
                <p className="font-bold text-brown-dark">{s.cancelTitle}</p>
                <p className="text-brown-light">{s.cancelNote}</p>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={s.cancelReason}
                  className="w-full px-3 py-2.5 rounded-xl border border-sage-light/40 bg-white text-sm text-brown focus:outline-none focus:border-sage"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setMode('view')} className="px-4 py-2.5 rounded-xl border border-sage-light/50 font-bold text-brown cursor-pointer min-h-[44px]">Back</button>
                  <button type="button" onClick={() => act('cancel', { reason })} disabled={busy !== ''} className="bg-peach text-brown-dark px-4 py-2.5 rounded-xl font-bold hover:brightness-95 cursor-pointer inline-flex items-center gap-1.5 min-h-[44px] disabled:opacity-60">
                    {busy === 'cancel' && <Loader2 className="w-3.5 h-3.5 animate-spin" />} {s.cancel}
                  </button>
                </div>
              </div>
            )}

            {/* جابه‌جایی */}
            {mode === 'reschedule' && (
              <div className="rounded-xl bg-cream/60 border border-sage-light/40 px-4 py-3 space-y-3">
                <p className="font-bold text-brown-dark">{s.rescheduleTitle}</p>
                <p className="text-brown-light">{s.rescheduleNote}</p>
                <div className="grid sm:grid-cols-3 gap-2.5">
                  <input type="date" value={rDate} onChange={(e) => setRDate(e.target.value)} className="px-3 py-2.5 rounded-xl border border-sage-light/40 bg-white text-sm text-brown" aria-label={s.formDate} />
                  <select value={rTime} onChange={(e) => setRTime(e.target.value)} className="px-3 py-2.5 rounded-xl border border-sage-light/40 bg-white text-sm text-brown" aria-label={s.formTime}>
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <select value={rTz} onChange={(e) => setRTz(e.target.value)} className="px-3 py-2.5 rounded-xl border border-sage-light/40 bg-white text-sm text-brown" aria-label={s.formTz}>
                    {SUPPORTED_TIMEZONES.map((t) => (
                      <option key={t.tz} value={t.tz}>{timezoneCity(t.tz)}</option>
                    ))}
                  </select>
                </div>
                {rPreview && (rPreview.invalid ? <p className="text-red-600">{s.errINVALID_TIME}</p> : (
                  <p className="text-brown">
                    {s.previewTehran} <span className="font-bold text-brown-dark">{rPreview.tehran}</span>
                    <span className="block text-brown-light">{s.previewLocal} {rPreview.local}</span>
                  </p>
                ))}
                <div className="flex gap-2">
                  <button type="button" onClick={() => setMode('view')} className="px-4 py-2.5 rounded-xl border border-sage-light/50 font-bold text-brown cursor-pointer min-h-[44px]">Back</button>
                  <button
                    type="button"
                    onClick={() => act('reschedule', { date: rDate, time: rTime, tz: rTz })}
                    disabled={busy !== '' || !rDate || (rPreview !== null && rPreview.invalid)}
                    className="bg-sage text-brown-dark px-4 py-2.5 rounded-xl font-bold hover:bg-sage-dark cursor-pointer inline-flex items-center gap-1.5 min-h-[44px] disabled:opacity-60"
                  >
                    {busy === 'reschedule' && <Loader2 className="w-3.5 h-3.5 animate-spin" />} {s.reschedule}
                  </button>
                </div>
              </div>
            )}

            {error && mode === 'view' && (
              <p role="alert" className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
            )}

            {/* زنجیرهٔ جابه‌جایی */}
            {(chain.length > 0 || successors.length > 0) && (
              <div>
                <p className="font-bold text-brown-dark mb-1.5 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5" /> {s.chain}
                </p>
                <ul className="space-y-1">
                  {chain.map((c) => (
                    <li key={c.id} className="text-brown-light bg-cream/50 rounded-lg px-3 py-2">
                      ← {s.chainOlder}: {new Date(c.startAt).toISOString().slice(0, 16).replace('T', ' ')} UTC · {stLabel(c.status)}
                    </li>
                  ))}
                  {successors.map((c) => (
                    <li key={c.id} className="text-brown-light bg-cream/50 rounded-lg px-3 py-2">
                      → {s.chainNewer}: {new Date(c.startAt).toISOString().slice(0, 16).replace('T', ' ')} UTC · {stLabel(c.status)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* تاریخچهٔ ممیزی */}
            <div>
              <p className="font-bold text-brown-dark mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> {s.auditTrail}
              </p>
              <ul className="space-y-1 max-h-44 overflow-y-auto pr-1">
                {audits.map((a) => (
                  <li key={a.id} className="bg-cream/50 rounded-lg px-3 py-2 text-brown flex flex-wrap items-center gap-x-2">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${STATUS_BADGE[a.action] ?? STATUS_BADGE.PROPOSED}`}>{stLabel(a.action)}</span>
                    <span className="text-brown-light">{new Date(a.createdAt).toLocaleString('en-US')}</span>
                    <span className="font-semibold">{a.actor}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
