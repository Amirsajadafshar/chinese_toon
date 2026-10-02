'use client'

// ---------------------------------------------------------------------------
// 🔔 کارت اعلان‌های درون‌حسابی مشتری (فاز ۵۲ — بند ۶)
//
// همهٔ اعلان‌های حساب/سفارش/پرداخت/برنامه از همان سیستم واحد (ScheduleNotification
// + /api/schedules/notifications) می‌آیند — سیستم دوم نیست. هر اعلان نشان
// می‌دهد: چه اتفاقی افتاده، سفارش مرتبط، زمان، و وضعیت خوانده/نخوانده.
// اعلان‌ها فقط از رویدادهای واقعی backend ساخته می‌شوند؛ کلاینت نمی‌تواند
// وضعیت پرداخت را «ادعا» کند.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useState } from 'react'
import {
  Bell,
  BellRing,
  CalendarDays,
  CheckCheck,
  CreditCard,
  Loader2,
  ShoppingBag,
  UserRound,
} from 'lucide-react'
import { siteContent } from '@/content/site-content'

const c = siteContent.account

interface AccountNotification {
  id: string
  kind: string
  category?: string
  orderRef?: string | null
  title: string
  body: string
  read: boolean
  createdAt: string
}

const CATEGORY_META: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  schedule: { label: c.notifCatSchedule, icon: <CalendarDays className="w-3.5 h-3.5" />, cls: 'bg-butter/50 text-brown' },
  order: { label: c.notifCatOrder, icon: <ShoppingBag className="w-3.5 h-3.5" />, cls: 'bg-sage-light/40 text-sage-dark' },
  payment: { label: c.notifCatPayment, icon: <CreditCard className="w-3.5 h-3.5" />, cls: 'bg-peach-light/60 text-brown' },
  account: { label: c.notifCatAccount, icon: <UserRound className="w-3.5 h-3.5" />, cls: 'bg-sage-light/40 text-sage-dark' },
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  return `${d.toLocaleDateString()} · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}

export function AccountNotifications() {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<AccountNotification[]>([])
  const [unread, setUnread] = useState(0)
  const [marking, setMarking] = useState(false)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/schedules/notifications', { cache: 'no-store' })
      if (res.status === 401) {
        setLoading(false)
        return
      }
      if (!res.ok) {
        setError(true)
        return
      }
      const data = (await res.json()) as { notifications?: AccountNotification[]; unread?: number }
      setItems(Array.isArray(data.notifications) ? data.notifications : [])
      setUnread(Number(data.unread) || 0)
      setError(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const markAllRead = async () => {
    setMarking(true)
    try {
      await fetch('/api/schedules/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      await load()
    } catch {
      /* silent — retry on next visit */
    } finally {
      setMarking(false)
    }
  }

  if (loading) {
    return (
      <div className="mt-8 bg-white rounded-3xl p-8 md:p-10 shadow-lg border border-sage-light/20" role="status" aria-label="Loading notifications">
        <div className="animate-pulse flex flex-col gap-4">
          <div className="h-5 w-44 bg-cream rounded-full" />
          <div className="h-16 w-full bg-cream/70 rounded-2xl" />
          <div className="h-16 w-full bg-cream/50 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="mt-8 bg-white rounded-3xl p-8 md:p-10 shadow-lg border border-sage-light/20">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <h2 className="text-xl font-bold text-brown-dark flex items-center gap-2.5">
          <span className="w-10 h-10 rounded-xl bg-sage-light/30 flex items-center justify-center flex-shrink-0">
            <Bell className="w-5 h-5 text-sage-dark" />
          </span>
          {c.notifTitle}
          {unread > 0 && (
            <span className="text-[11px] font-bold bg-peach/30 text-brown px-2.5 py-1 rounded-full tabular-nums">
              {unread} {c.notifNew}
            </span>
          )}
        </h2>
        {unread > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            disabled={marking}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-peach/20 text-brown text-xs font-bold hover:bg-peach/30 transition-colors cursor-pointer min-h-[44px] disabled:opacity-60"
          >
            {marking ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <CheckCheck className="w-3.5 h-3.5" aria-hidden="true" />}
            {c.notifMarkAll}
          </button>
        )}
      </div>
      <p className="text-xs text-brown-light mb-6">{c.notifSubtitle}</p>

      {error && (
        <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">
          Could not load notifications — please refresh.
        </p>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-brown-light bg-cream rounded-xl px-4 py-4">{c.notifEmpty}</p>
      ) : (
        <ul className="space-y-3 max-h-96 overflow-y-auto pr-1 ct-scroll-area" aria-label={c.notifTitle}>
          {items.map((n) => {
            const meta = CATEGORY_META[n.category ?? 'account'] ?? CATEGORY_META.account
            return (
              <li
                key={n.id}
                className={`rounded-2xl border p-4 ${n.read ? 'bg-cream/50 border-sage-light/20' : 'bg-sage-light/20 border-sage/40'}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${meta.cls}`}>
                    {meta.icon}
                    {meta.label}
                  </span>
                  {!n.read && <BellRing className="w-3 h-3 text-sage-dark" aria-label="Unread" />}
                  <span className="text-[10px] text-brown-light/80 ml-auto">{fmtDateTime(n.createdAt)}</span>
                </div>
                <p className="text-sm font-bold text-brown-dark mt-2">{n.title}</p>
                <p className="text-xs text-brown mt-1 leading-relaxed">{n.body}</p>
                {n.orderRef && (
                  <p className="text-[11px] font-mono text-brown-light mt-2">
                    Order: <span className="font-bold text-brown">{n.orderRef}</span>
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
