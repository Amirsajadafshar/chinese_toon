'use client'

// ---------------------------------------------------------------------------
// 🗓️ بخش «برنامهٔ جلسات من» در حساب کاربری (فاز ۴۸)
//
//  • هشدارهای برنامه (پیشنهاد/تأیید/جابه‌جایی/لغو) با شمارندهٔ خوانده‌نشده
//  • جلسات پیش‌رو: پیشنهادی = دکمهٔ تأیید/لغو؛ تأییدشده = دکمهٔ لغو
//  • تاریخچه (جابه‌جاشده/لغوشده/تکمیل‌شده) با اسکرول
//  • نمایش اصلی به وقت خود دانش‌پذیر + خط معادل تهران (هر دو از سرور با
//    تبدیل DST-دار آمده — کلاینت هیچ چیزی حدس نمی‌زند)
//  • تأیید دوباره سمت سرور اعتبارسنجی می‌شود (هم‌پوشانی/فاصله/ظرفیت)
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useState } from 'react'
import { Bell, BellRing, CalendarDays, Check, Clock, Globe2, History, Loader2, X } from 'lucide-react'
import { siteContent } from '@/content/site-content'
import type { ScheduleDTO } from '@/lib/schedule-service'

const c = siteContent.account

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const WEEKDAY_FULL: Record<string, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
  fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
}

function fmtDate(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number)
  if (!y || !m || !d) return ymd
  return `${MONTHS[m - 1]} ${d}, ${y}`
}

const STATUS_STYLES: Record<string, string> = {
  PROPOSED: 'bg-amber-100 text-amber-800 border-amber-200',
  CONFIRMED: 'bg-green-100 text-green-800 border-green-200',
  RESCHEDULED: 'bg-orange-100 text-orange-800 border-orange-200',
  CANCELLED: 'bg-gray-100 text-gray-600 border-gray-200',
  COMPLETED: 'bg-[#e7efe4] text-[#3f5a3a] border-[#c9dcc2]',
}

function StatusBadge({ status }: { status: string }) {
  const label =
    (siteContent.admin.scheduleAdmin as Record<string, string>)[`st${status}`] ?? status
  return (
    <span className={`text-[11px] font-bold uppercase tracking-wide px-3 py-1 rounded-full border ${STATUS_STYLES[status] ?? STATUS_STYLES.CANCELLED}`}>
      {label}
    </span>
  )
}

interface NotificationLike {
  id: string
  kind: string
  category?: string
  title: string
  body: string
  read: boolean
  createdAt: string
}

export function AccountSchedule({ onToast }: { onToast: (m: string) => void }) {
  const [loading, setLoading] = useState(true)
  const [schedules, setSchedules] = useState<ScheduleDTO[]>([])
  const [notifications, setNotifications] = useState<NotificationLike[]>([])
  const [unread, setUnread] = useState(0)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/schedules', { cache: 'no-store' })
      if (res.status === 401) {
        setLoading(false)
        return
      }
      const data = await res.json()
      setSchedules(Array.isArray(data.schedules) ? data.schedules : [])
      setNotifications(Array.isArray(data.notifications) ? data.notifications : [])
      setUnread(Number(data.unread) || 0)
      setError('')
    } catch {
      setError('Could not load your schedule. Please refresh.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const act = async (id: string, action: 'confirm' | 'cancel') => {
    setBusyId(id)
    try {
      const res = await fetch(`/api/schedules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json().catch(() => null)
      if (res.ok) {
        onToast(action === 'confirm' ? c.confirmOk : c.cancelOk)
        await load()
      } else {
        const code = data?.code as string | undefined
        const s = siteContent.admin.scheduleAdmin as Record<string, string>
        const friendly = code && s[`err${code}`] ? s[`err${code}`] : (data?.error ?? 'Something went wrong')
        setError(friendly)
      }
    } catch {
      setError('Network error — please try again.')
    } finally {
      setBusyId(null)
    }
  }

  const markAllRead = async () => {
    try {
      await fetch('/api/schedules/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      await load()
    } catch {
      /* ساکت — دفعهٔ بعد */
    }
  }

  const upcoming = schedules
    .filter((s) => s.status === 'PROPOSED' || s.status === 'CONFIRMED')
    .sort((a, b) => a.startAt.localeCompare(b.startAt))
  const history = schedules.filter((s) => s.status === 'RESCHEDULED' || s.status === 'CANCELLED' || s.status === 'COMPLETED')
  // 🗂️ فاز ۵۲ — فقط اعلان‌های برنامهٔ جلسات این کارت؛ بقیه در AccountNotifications
  const scheduleAlerts = notifications.filter((n) => (n.category ?? 'schedule') === 'schedule')

  if (loading) {
    return (
      <div className="mt-8 bg-white rounded-3xl p-8 md:p-10 shadow-lg border border-sage-light/20" role="status" aria-label="Loading schedule">
        <div className="animate-pulse flex flex-col gap-4">
          <div className="h-5 w-48 bg-cream rounded-full" />
          <div className="h-20 w-full bg-cream/70 rounded-2xl" />
          <div className="h-20 w-full bg-cream/50 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="mt-8 bg-white rounded-3xl p-8 md:p-10 shadow-lg border border-sage-light/20">
      {/* 🔔 هشدارهای برنامه */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <h2 className="text-xl font-bold text-brown-dark flex items-center gap-2.5">
          <span className="w-10 h-10 rounded-xl bg-sage-light/30 flex items-center justify-center flex-shrink-0">
            <CalendarDays className="w-5 h-5 text-sage-dark" />
          </span>
          {c.myScheduleTitle}
        </h2>
        {unread > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-peach/20 text-brown text-xs font-bold hover:bg-peach/30 transition-colors cursor-pointer min-h-[44px]"
          >
            <BellRing className="w-3.5 h-3.5" aria-hidden="true" />
            {unread} new · {c.markAllRead}
          </button>
        )}
      </div>

      {scheduleAlerts.length > 0 && (
        <ul className="mb-6 space-y-2 max-h-56 overflow-y-auto pr-1" aria-label={c.alertsTitle}>
          {/* 🗂️ فاز ۵۲ — این کارت فقط اعلان‌های «برنامهٔ جلسات» را نشان می‌دهد؛
              اعلان‌های حساب/سفارش/پرداخت در کارت مستقل AccountNotifications بالای صفحه‌اند */}
          {scheduleAlerts.slice(0, 6).map((n) => (
            <li
              key={n.id}
              className={`rounded-2xl border px-4 py-3 text-xs ${n.read ? 'bg-cream/60 border-sage-light/20' : 'bg-sage-light/25 border-sage/40'}`}
            >
              <p className="font-bold text-brown-dark flex items-center gap-1.5">
                {!n.read && <Bell className="w-3 h-3 text-sage-dark" aria-hidden="true" />}
                {n.title}
              </p>
              <p className="text-brown-light mt-0.5">{n.body}</p>
            </li>
          ))}
          {notifications.length === 0 && <li className="text-xs text-brown-light">{c.alertsEmpty}</li>}
        </ul>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">
          {error}
        </p>
      )}

      {/* جلسات پیش‌رو */}
      {schedules.length === 0 ? (
        <p className="text-sm text-brown-light bg-cream rounded-xl px-4 py-4">{c.scheduleEmpty}</p>
      ) : (
        <>
          {upcoming.length > 0 && (
            <ul className="space-y-4">
              {upcoming.map((s) => (
                <li key={s.id} className="bg-cream/60 border border-sage-light/25 rounded-2xl p-4 md:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                    <p className="font-bold text-brown-dark text-sm">{s.class.title}</p>
                    <StatusBadge status={s.status} />
                  </div>
                  {/* زمان اصلی — منطقهٔ خود دانش‌پذیر */}
                  <p className="text-sm text-brown font-semibold flex flex-wrap items-center gap-x-2">
                    <CalendarDays className="w-4 h-4 text-sage-dark" aria-hidden="true" />
                    {WEEKDAY_FULL[s.local.day] ?? s.local.day}, {fmtDate(s.local.date)} · {s.local.time}–{s.local.endTime}
                  </p>
                  <p className="text-xs text-brown-light mt-1 flex flex-wrap items-center gap-x-3">
                    <span className="inline-flex items-center gap-1">
                      <Globe2 className="w-3 h-3" aria-hidden="true" /> {c.scheduleYourTz}: {s.timezone}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" aria-hidden="true" /> {c.scheduleDuration}: {(c.minutes as string).replace('{n}', String(s.durationMin))}
                    </span>
                  </p>
                  {/* معادل تهران — روزِ درست حتی در گذر نیمه‌شب */}
                  <p className="text-xs text-brown-light mt-1">
                    {c.scheduleTehranLine}{' '}
                    <span className="font-semibold text-brown">
                      {WEEKDAY_FULL[s.tehran.day] ?? s.tehran.day}, {fmtDate(s.tehran.date)} · {s.tehran.time}–{s.tehran.endTime}
                    </span>
                  </p>
                  {s.note && <p className="text-xs text-brown-light mt-2 italic">“{s.note}”</p>}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {s.status === 'PROPOSED' && (
                      <button
                        type="button"
                        onClick={() => act(s.id, 'confirm')}
                        disabled={busyId === s.id}
                        className="bg-sage text-brown-dark px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-sage-dark transition-colors cursor-pointer inline-flex items-center gap-1.5 min-h-[44px] disabled:opacity-60"
                      >
                        {busyId === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        {c.confirmAction}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => act(s.id, 'cancel')}
                      disabled={busyId === s.id}
                      className="border border-sage-light/50 bg-white/70 text-brown px-4 py-2.5 rounded-xl text-xs font-bold hover:border-peach transition-colors cursor-pointer inline-flex items-center gap-1.5 min-h-[44px] disabled:opacity-60"
                    >
                      <X className="w-3.5 h-3.5" /> {c.cancelAction}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* تاریخچه */}
          {history.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-bold uppercase tracking-wider text-brown-light mb-2 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" aria-hidden="true" /> {c.scheduleHistory}
              </p>
              <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {history.map((s) => (
                  <li key={s.id} className="bg-cream/40 border border-sage-light/20 rounded-xl px-4 py-3 text-xs flex flex-wrap items-center justify-between gap-2">
                    <span className="text-brown font-semibold">{s.class.title}</span>
                    <span className="text-brown-light">
                      {WEEKDAY_FULL[s.local.day] ?? s.local.day}, {fmtDate(s.local.date)} · {s.local.time}–{s.local.endTime}
                    </span>
                    <StatusBadge status={s.status} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}
