'use client'

// ---------------------------------------------------------------------------
// 🧾 تب Orders پنل ادمین — مدیریت کامل سفارش‌ها (بند ۱–۵)
//
// منابع داده (همه سمت سرور مشتق می‌شوند — مرورگر هیچ وضعیتی نمی‌سازد):
//  • فهرست:    GET /api/admin/orders (q/status/enrollment/page)
//  • جزئیات:   GET /api/admin/orders/[ref] — زنجیرهٔ
//              User → Order → Course → Payment → Enrollment/Schedule
//  • لغو:      PATCH /api/payments/orders/[ref] (مسیر موجود — سیستم موازی نیست)
//
// مبلغ‌های تاریخی فقط از اسنپ‌شات خودِ سفارش نمایش داده می‌شوند؛ تغییر قیمت
// کلاس یا تخفیف در آینده سفارش‌های قبلی را تغییر نمی‌دهد.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Wallet,
  Inbox,
  RefreshCw,
  X,
  Copy,
  Check,
  ExternalLink,
  Ban,
  Loader2,
  ChevronLeft,
  ChevronRight,
  UserRound,
  BookOpen,
  CreditCard,
  CalendarDays,
  Search,
} from 'lucide-react'
import { siteContent } from '@/content/site-content'

const a = siteContent.admin.ordersM

type PayStatus = 'PENDING' | 'DETECTED' | 'PAID' | 'UNDERPAID' | 'EXPIRED' | 'CANCELLED'
type EnrollStatus = 'REGISTERED' | 'ORDERED' | 'PAID' | 'PREFERENCES_SUBMITTED' | 'SCHEDULE_PROPOSED' | 'ENROLLED' | 'COMPLETED'

interface OrderRow {
  ref: string
  createdAt: string
  updatedAt: string
  productTitle: string
  productId: string
  classSlug: string | null
  classLevel: string | null
  sessions: number | null
  amountUsd: string
  baseAmount: string | null
  tierPercent: number | null
  discountCode: string | null
  discountType: string | null
  discountValue: string | null
  discountAmount: string | null
  payment: {
    method: string
    network: string
    mode: string
    address: string
    txHash: string | null
    txAmountUsd: string | null
    txFrom: string | null
    paidAt: string | null
  }
  rawStatus: string
  paymentStatus: PayStatus
  enrollmentStatus: EnrollStatus
  nextSessionAt: string | null
  scheduleCount: number
  customer: {
    hasAccount: boolean
    userId: string | null
    name: string
    email: string
    accountCreatedAt: string | null
  }
}

interface DetailData {
  order: OrderRow
  class: { slug: string; title: string; level: string; classType: string; packageSessions: number; packagePrice: number; status: string } | null
  schedules: Array<{
    id: string; orderRef: string | null; startAt: string; endAt: string; durationMin: number
    status: string; timezone: string; inputDate: string | null; inputTime: string | null; note: string | null
  }>
  registrations: Array<{
    id: string; name: string; email: string; level: string; classType: string; classTitle: string | null
    timezone: string; preferredDays: string; preferredTimes: string; daysPerWeek: number | null
    scheduleAck: boolean; status: string; createdAt: string
  }>
  events: Array<{ id: string; kind: string; orderRef: string | null; txHash: string | null; detail: string; createdAt: string }>
  expiresAt: string
  nextSessionAt?: string | null
  addressIndex: number | null
  currency: string
}

const PAY_LABELS: Record<PayStatus, string> = {
  PENDING: a.payUnpaid,
  DETECTED: a.payDetected,
  PAID: a.payConfirmed,
  UNDERPAID: a.payUnderpaid,
  EXPIRED: a.payExpired,
  CANCELLED: a.payCancelled,
}

const ENROLL_LABELS: Record<EnrollStatus, string> = {
  REGISTERED: a.enrollRegistered,
  ORDERED: a.enrollOrdered,
  PAID: a.enrollPaid,
  PREFERENCES_SUBMITTED: a.enrollPrefs,
  SCHEDULE_PROPOSED: a.enrollProposed,
  ENROLLED: a.enrollEnrolled,
  COMPLETED: a.enrollCompleted,
}

const PAY_STYLES: Record<PayStatus, string> = {
  PENDING: 'bg-cream text-brown border border-sage-light/40',
  DETECTED: 'bg-butter text-brown border border-peach/40',
  PAID: 'bg-sage text-brown-dark',
  UNDERPAID: 'bg-peach-light/70 text-brown border border-peach/40',
  EXPIRED: 'bg-neutral-100 text-brown-light',
  CANCELLED: 'bg-neutral-100 text-brown-light/70',
}

const ENROLL_STYLES: Record<EnrollStatus, string> = {
  REGISTERED: 'bg-neutral-100 text-brown-light',
  ORDERED: 'bg-neutral-100 text-brown-light',
  PAID: 'bg-butter/40 text-brown',
  PREFERENCES_SUBMITTED: 'bg-butter/40 text-brown',
  SCHEDULE_PROPOSED: 'bg-sage-light/30 text-sage-dark',
  ENROLLED: 'bg-sage-light/60 text-sage-dark',
  COMPLETED: 'bg-brown/10 text-brown',
}

const STATUS_CHIPS: Array<{ key: string; label: string }> = [
  { key: 'all', label: a.filterAll },
  { key: 'PENDING', label: a.payUnpaid },
  { key: 'DETECTED', label: a.payDetected },
  { key: 'PAID', label: a.payConfirmed },
  { key: 'UNDERPAID', label: a.payUnderpaid },
  { key: 'EXPIRED', label: a.payExpired },
  { key: 'CANCELLED', label: a.payCancelled },
]

const ENROLL_CHIPS: Array<{ key: string; label: string }> = [
  { key: 'all', label: a.filterAll },
  { key: 'ORDERED', label: a.enrollOrdered },
  { key: 'PAID', label: a.enrollPaid },
  { key: 'PREFERENCES_SUBMITTED', label: a.enrollPrefs },
  { key: 'SCHEDULE_PROPOSED', label: a.enrollProposed },
  { key: 'ENROLLED', label: a.enrollEnrolled },
  { key: 'COMPLETED', label: a.enrollCompleted },
]

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

function parseDays(s: string): string[] {
  try {
    const v = JSON.parse(s || '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

function parseTimes(s: string): Array<{ start: string; end: string }> {
  try {
    const v = JSON.parse(s || '[]')
    return Array.isArray(v) ? v.filter((x) => x && typeof x.start === 'string') : []
  } catch {
    return []
  }
}

const scrollCls =
  '[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-sage-light/60 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent'

export function OrdersAdminTab({ token, onToast }: { token: string; onToast?: (m: string) => void }) {
  const [rows, setRows] = useState<OrderRow[]>([])
  const [meta, setMeta] = useState<{ total: number; page: number; pageSize: number; pages: number; counts: Record<string, number> } | null>(null)
  const [qInput, setQInput] = useState('')
  const [qApplied, setQApplied] = useState('')
  const [status, setStatus] = useState('all')
  const [enrollment, setEnrollment] = useState('all')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [detailRef, setDetailRef] = useState<string | null>(null)
  const [detail, setDetail] = useState<DetailData | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // جست‌وجو با debounce — هر کلید درخواست نمی‌زند
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setQApplied(qInput.trim())
      setPage(1)
    }, 350)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [qInput])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ q: qApplied, status, enrollment, page: String(page), pageSize: '25' })
      const res = await fetch(`/api/admin/orders?${params.toString()}`, { headers: { 'x-admin-key': token } })
      if (!res.ok) throw new Error('load failed')
      const data = await res.json()
      setRows(Array.isArray(data.rows) ? data.rows : [])
      setMeta(data.meta ?? null)
    } catch {
      setRows([])
      setMeta(null)
    } finally {
      setLoading(false)
    }
  }, [token, qApplied, status, enrollment, page])

  useEffect(() => {
    load()
  }, [load])

  const openDetail = useCallback(
    async (ref: string) => {
      setDetailRef(ref)
      setDetail(null)
      setDetailLoading(true)
      try {
        const res = await fetch(`/api/admin/orders/${encodeURIComponent(ref)}`, { headers: { 'x-admin-key': token } })
        if (!res.ok) throw new Error('detail failed')
        setDetail(await res.json())
      } catch {
        onToast?.(a.loadFailed)
        setDetailRef(null)
      } finally {
        setDetailLoading(false)
      }
    },
    [token, onToast]
  )

  const closeDetail = () => {
    setDetailRef(null)
    setDetail(null)
  }

  const copyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1500)
    } catch {
      /* کلیپ‌بورد در دسترس نیست */
    }
  }

  const cancelOrder = async (ref: string) => {
    if (!window.confirm(siteContent.admin.cancelConfirm)) return
    try {
      const res = await fetch(`/api/payments/orders/${encodeURIComponent(ref)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': token },
        body: JSON.stringify({ action: 'cancel' }),
      })
      if (res.ok) {
        onToast?.(siteContent.admin.orderCancelled)
        load()
        if (detailRef === ref) openDetail(ref)
      } else {
        const data = await res.json().catch(() => ({}))
        onToast?.(data?.error || 'Could not cancel order. Please try again.')
      }
    } catch {
      onToast?.('Could not cancel order. Please try again.')
    }
  }

  const counts = meta?.counts ?? {}
  const chain = detail
    ? [
        { done: detail.order.customer.hasAccount, label: a.chainAccount, icon: UserRound },
        { done: true, label: a.chainOrder, icon: Wallet },
        { done: detail.order.paymentStatus === 'PAID', label: a.chainPaid, icon: CreditCard },
        {
          done:
            detail.order.enrollmentStatus === 'PREFERENCES_SUBMITTED' ||
            detail.order.enrollmentStatus === 'SCHEDULE_PROPOSED' ||
            detail.order.enrollmentStatus === 'ENROLLED' ||
            detail.order.enrollmentStatus === 'COMPLETED',
          label: a.chainPrefs,
          icon: CalendarDays,
        },
        {
          done:
            detail.order.enrollmentStatus === 'SCHEDULE_PROPOSED' ||
            detail.order.enrollmentStatus === 'ENROLLED' ||
            detail.order.enrollmentStatus === 'COMPLETED',
          label: a.chainProposed,
          icon: CalendarDays,
        },
        { done: detail.order.enrollmentStatus === 'ENROLLED' || detail.order.enrollmentStatus === 'COMPLETED', label: a.chainEnrolled, icon: BookOpen },
        { done: detail.order.enrollmentStatus === 'COMPLETED', label: a.chainCompleted, icon: Check },
      ]
    : []

  return (
    <div>
      <p className="text-sm text-brown-light mb-4">{a.subtitle}</p>

      {/* 🔍 جست‌وجو + بازخوانی */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-52">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brown-light/60" aria-hidden="true" />
          <input
            type="text"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder={a.searchPlaceholder}
            aria-label={a.searchPlaceholder}
            className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-sage-light/40 bg-white text-brown text-sm placeholder:text-brown-light/50 focus:outline-none focus:border-sage focus:ring-[3px] focus:ring-sage/20 transition-all"
          />
        </div>
        <button
          onClick={load}
          className="bg-white border border-sage-light/40 text-brown px-4 py-2.5 rounded-xl text-sm font-medium hover:border-sage transition-all cursor-pointer inline-flex items-center gap-2 min-h-[44px]"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {siteContent.admin.refresh}
        </button>
      </div>

      {/* 🏷️ چیپ‌های وضعیت پرداخت */}
      <div className="flex flex-wrap items-center gap-1.5 mb-2" role="group" aria-label={a.colPayStatus}>
        {STATUS_CHIPS.map((c) => {
          const active = status === c.key
          const n = c.key === 'all' ? counts.all : counts[c.key]
          return (
            <button
              key={c.key}
              onClick={() => {
                setStatus(c.key)
                setPage(1)
              }}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all cursor-pointer min-h-[32px] ${
                active ? 'bg-sage text-brown-dark border-sage' : 'bg-white border-sage-light/40 text-brown hover:border-sage/60'
              }`}
            >
              {c.label}
              {typeof n === 'number' && <span className={`ml-1.5 tabular-nums ${active ? 'text-brown-dark/70' : 'text-brown-light'}`}>{n}</span>}
            </button>
          )
        })}
      </div>

      {/* 🎓 چیپ‌های وضعیت ثبت‌نام */}
      <div className="flex flex-wrap items-center gap-1.5 mb-4" role="group" aria-label={a.enrollLabel}>
        <span className="text-[11px] font-bold text-brown-light uppercase tracking-wide mr-1">{a.enrollLabel}:</span>
        {ENROLL_CHIPS.map((c) => {
          const active = enrollment === c.key
          return (
            <button
              key={c.key}
              onClick={() => {
                setEnrollment(c.key)
                setPage(1)
              }}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all cursor-pointer min-h-[32px] ${
                active ? 'bg-brown text-cream border-brown' : 'bg-white border-sage-light/40 text-brown hover:border-sage/60'
              }`}
            >
              {c.label}
            </button>
          )
        })}
      </div>

      {/* 📋 فهرست سفارش‌ها */}
      {loading && rows.length === 0 ? (
        <div className="py-16 text-center">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-sage-dark" />
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-sage-light/50">
          <Inbox className="w-10 h-10 mx-auto mb-3 text-brown-light/50" />
          <p className="text-sm text-brown-light">{a.empty}</p>
        </div>
      ) : (
        <div className={`bg-white rounded-2xl border border-sage-light/20 overflow-hidden mb-4 max-h-[62vh] overflow-y-auto ${scrollCls}`}>
          {/* سرستون — فقط دسکتاپ */}
          <div className="hidden lg:grid grid-cols-[110px_1.4fr_1.2fr_70px_90px_110px_120px_130px_90px] gap-2 px-4 py-2.5 bg-cream/70 text-[10px] font-bold uppercase tracking-wide text-brown-light sticky top-0 z-10">
            <span>{a.colOrder}</span>
            <span>{a.colCustomer}</span>
            <span>{a.colCourse}</span>
            <span className="text-right">{a.colSessions}</span>
            <span className="text-right">{a.colFinal}</span>
            <span>{a.colMethod}</span>
            <span>{a.colPayStatus}</span>
            <span>{a.colEnrollment}</span>
            <span>{a.colCreated}</span>
          </div>
          {rows.map((o, i) => (
            <button
              key={o.ref}
              onClick={() => openDetail(o.ref)}
              className={`w-full text-left px-4 py-3.5 hover:bg-sage-light/15 transition-colors cursor-pointer ${
                i !== rows.length - 1 ? 'border-b border-sage-light/15' : ''
              }`}
            >
              {/* دسکتاپ */}
              <div className="hidden lg:grid grid-cols-[110px_1.4fr_1.2fr_70px_90px_110px_120px_130px_90px] gap-2 items-center">
                <span className="font-mono text-xs font-bold text-brown-dark">{o.ref}</span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-brown-dark truncate">{o.customer.name}</span>
                  <span className="block text-[10px] text-brown-light truncate">{o.customer.email}</span>
                </span>
                <span className="min-w-0">
                  <span className="block text-xs text-brown truncate">{o.productTitle}</span>
                  {o.discountCode && (
                    <span className="block text-[10px] text-sage-dark font-bold truncate">
                      🎟️ {o.discountCode} · −{o.discountAmount}
                    </span>
                  )}
                </span>
                <span className="text-right text-xs text-brown tabular-nums">{o.sessions ?? '—'}</span>
                <span className="text-right text-xs font-bold text-sage-dark tabular-nums">{o.amountUsd}</span>
                <span className="text-[10px] text-brown-light font-mono truncate" title={`${o.payment.method} · ${o.payment.network} · ${o.payment.mode}`}>
                  USDT·{o.payment.mode === 'hd' ? 'HD' : 'SH'}
                </span>
                <span>
                  <Badge cls={PAY_STYLES[o.paymentStatus]}>{PAY_LABELS[o.paymentStatus]}</Badge>
                </span>
                <span>
                  <Badge cls={ENROLL_STYLES[o.enrollmentStatus]}>{ENROLL_LABELS[o.enrollmentStatus]}</Badge>
                </span>
                <span className="text-[10px] text-brown-light">{fmtDate(o.createdAt)}</span>
              </div>
              {/* موبایل */}
              <div className="lg:hidden">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-bold text-brown-dark">{o.ref}</span>
                  <Badge cls={PAY_STYLES[o.paymentStatus]}>{PAY_LABELS[o.paymentStatus]}</Badge>
                  <Badge cls={ENROLL_STYLES[o.enrollmentStatus]}>{ENROLL_LABELS[o.enrollmentStatus]}</Badge>
                  <span className="text-sm font-bold text-sage-dark tabular-nums ms-auto">{o.amountUsd} USDT</span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-brown-light">
                  <span className="font-semibold text-brown">{o.customer.name}</span>
                  <span className="truncate max-w-48">{o.customer.email}</span>
                  <span>{o.productTitle}</span>
                  {o.discountCode && <span className="text-sage-dark font-bold">🎟️ {o.discountCode} −{o.discountAmount}</span>}
                  <span>{fmtDate(o.createdAt)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* 📄 صفحه‌بندی */}
      {meta && meta.pages > 1 && (
        <div className="flex items-center justify-center gap-3 mb-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={meta.page <= 1 || loading}
            className="bg-white border border-sage-light/40 text-brown px-3.5 py-2 rounded-xl text-xs font-semibold hover:border-sage transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> {a.prev}
          </button>
          <span className="text-xs font-semibold text-brown tabular-nums">{a.pageOf(meta.page, meta.pages)}</span>
          <button
            onClick={() => setPage((p) => Math.min(meta.pages, p + 1))}
            disabled={meta.page >= meta.pages || loading}
            className="bg-white border border-sage-light/40 text-brown px-3.5 py-2 rounded-xl text-xs font-semibold hover:border-sage transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1"
          >
            {a.next} <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 🗔 جزئیات سفارش */}
      {detailRef && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brown/40 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={a.detailTitle}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeDetail()
          }}
        >
          <div className={`bg-cream rounded-3xl border border-sage-light/30 shadow-2xl w-full max-w-3xl max-h-[88vh] overflow-y-auto ${scrollCls}`}>
            <div className="sticky top-0 bg-cream/95 backdrop-blur px-6 py-4 border-b border-sage-light/25 flex items-center justify-between gap-3 z-10">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-9 h-9 rounded-xl bg-sage-light/30 flex items-center justify-center flex-shrink-0">
                  <Wallet className="w-4.5 h-4.5 text-sage-dark" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-brown-dark">{a.detailTitle}</h3>
                  <p className="font-mono text-xs text-brown-light">{detailRef}</p>
                </div>
                {detail && (
                  <>
                    <Badge cls={PAY_STYLES[detail.order.paymentStatus]}>{PAY_LABELS[detail.order.paymentStatus]}</Badge>
                    <Badge cls={ENROLL_STYLES[detail.order.enrollmentStatus]}>{ENROLL_LABELS[detail.order.enrollmentStatus]}</Badge>
                  </>
                )}
              </div>
              <button
                onClick={closeDetail}
                aria-label={a.close}
                className="w-9 h-9 rounded-xl bg-white border border-sage-light/40 text-brown hover:border-red-200 hover:text-red-500 transition-all cursor-pointer flex items-center justify-center flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {detailLoading || !detail ? (
              <div className="py-16 text-center">
                <Loader2 className="w-8 h-8 mx-auto animate-spin text-sage-dark" />
                <p className="text-xs text-brown-light mt-3">{a.loading}</p>
              </div>
            ) : (
              <div className="px-6 py-5 space-y-5">
                {/* 🔗 زنجیرهٔ پیشرفت */}
                <section aria-label={a.chainTitle}>
                  <p className="text-xs font-bold text-brown-dark uppercase tracking-wide mb-2.5">{a.chainTitle}</p>
                  <ol className="flex flex-wrap gap-1.5">
                    {chain.map((s) => (
                      <li
                        key={s.label}
                        className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-full ${
                          s.done ? 'bg-sage text-brown-dark' : 'bg-white text-brown-light border border-sage-light/30'
                        }`}
                      >
                        {s.done ? <Check className="w-3 h-3" /> : s.icon && <s.icon className="w-3 h-3" />}
                        {s.label}
                      </li>
                    ))}
                  </ol>
                </section>

                {/* 💰 سفارش + مبلغ‌ها */}
                <Section title={a.blockOrder} icon={<Wallet className="w-4 h-4 text-sage-dark" />}>
                  <KV k={a.orderRef} v={detail.order.ref} mono />
                  <KV k={a.colCreated} v={fmtDate(detail.order.createdAt)} />
                  <KV k={a.colUpdated} v={fmtDate(detail.order.updatedAt)} />
                  <KV k={a.ttl} v={fmtDate(detail.expiresAt)} />
                  <div className="sm:col-span-2 bg-white/70 border border-sage-light/25 rounded-xl px-3.5 py-3 space-y-1.5">
                    <Row left={a.colBase} right={detail.order.baseAmount ? `${detail.order.baseAmount} USDT` : a.discountNone} />
                    {detail.order.tierPercent != null && detail.order.tierPercent > 0 && (
                      <Row left={a.tierDiscount} right={`−${detail.order.tierPercent}%`} />
                    )}
                    <Row
                      left={a.codeDiscount}
                      right={
                        detail.order.discountCode
                          ? `${detail.order.discountCode} (${detail.order.discountType === 'fixed' ? 'fixed' : '%'} ${detail.order.discountValue}) · −${detail.order.discountAmount}`
                          : a.discountNone
                      }
                    />
                    <Row left={a.finalAmount} right={`${detail.order.amountUsd} USDT`} bold />
                    <p className="text-[10px] text-brown-light/80 pt-1 border-t border-sage-light/20">{a.snapshotNote}</p>
                  </div>
                </Section>

                {/* 👤 مشتری */}
                <Section title={a.blockCustomer} icon={<UserRound className="w-4 h-4 text-sage-dark" />}>
                  <KV k={siteContent.admin.fromLabel} v={detail.order.customer.name} />
                  <KV k={siteContent.admin.emailLabel} v={detail.order.customer.email} mono />
                  <KV
                    k="Account"
                    v={
                      detail.order.customer.hasAccount
                        ? `✓ ${fmtDate(detail.order.customer.accountCreatedAt)}`
                        : a.guest
                    }
                  />
                </Section>

                {/* 🎓 کلاس */}
                <Section title={a.blockCourse} icon={<BookOpen className="w-4 h-4 text-sage-dark" />}>
                  <KV k={a.colCourse} v={detail.order.productTitle} />
                  {detail.class && (
                    <>
                      <KV k={siteContent.admin.levelLabel} v={detail.class.level || '—'} />
                      <KV k={a.colSessions} v={String(detail.order.sessions ?? detail.class.packageSessions)} />
                      <KV
                        k="Link"
                        v={
                          <a
                            href={`#/classes/${detail.class.slug}`}
                            className="text-sage-dark font-semibold inline-flex items-center gap-1 hover:underline"
                          >
                            {a.openClassPage} <ExternalLink className="w-3 h-3" />
                          </a>
                        }
                      />
                    </>
                  )}
                </Section>

                {/* 💳 پرداخت */}
                <Section title={a.blockPayment} icon={<CreditCard className="w-4 h-4 text-sage-dark" />}>
                  <KV k={a.method} v={`${detail.order.payment.method} · ${detail.order.payment.mode === 'hd' ? 'HD (unique address)' : 'shared address + unique amount'}`} />
                  <KV k={a.network} v={detail.order.payment.network} mono />
                  <KV
                    k={a.address}
                    v={
                      <span className="inline-flex items-center gap-1.5">
                        <span className="font-mono break-all">{detail.order.payment.address}</span>
                        <CopyBtn
                          copied={copiedKey === 'addr'}
                          onClick={() => copyText('addr', detail.order.payment.address)}
                          label={a.copy}
                        />
                      </span>
                    }
                  />
                  {detail.addressIndex != null && <KV k={a.addressIndex} v={`#${detail.addressIndex}`} />}
                  {detail.order.payment.txHash ? (
                    <>
                      <KV
                        k={a.txHash}
                        v={
                          <span className="inline-flex items-center gap-1.5">
                            <span className="font-mono break-all">{detail.order.payment.txHash}</span>
                            <CopyBtn copied={copiedKey === 'tx'} onClick={() => copyText('tx', detail.order.payment.txHash || '')} label={a.copy} />
                          </span>
                        }
                      />
                      <KV k={a.txAmount} v={detail.order.payment.txAmountUsd ? `${detail.order.payment.txAmountUsd} USDT` : '—'} />
                      {detail.order.payment.txFrom && <KV k={a.txFrom} v={detail.order.payment.txFrom} mono />}
                    </>
                  ) : (
                    <KV k={a.txHash} v="—" />
                  )}
                  <KV k={a.paidAt} v={fmtDate(detail.order.payment.paidAt)} />
                </Section>

                {/* 🗓️ ثبت‌نام و برنامه */}
                <Section title={a.blockSchedule} icon={<CalendarDays className="w-4 h-4 text-sage-dark" />}>
                  {detail.schedules.length === 0 ? (
                    <p className="text-xs text-brown-light">{a.scheduleNone}</p>
                  ) : (
                    <div className="space-y-1.5">
                      {detail.nextSessionAt && (
                        <p className="text-[11px] font-bold text-sage-dark bg-sage-light/25 rounded-lg px-3 py-1.5 inline-block">
                          {a.nextSession}: {fmtDate(detail.nextSessionAt)}
                        </p>
                      )}
                      {detail.schedules.map((s) => (
                        <div key={s.id} className="flex flex-wrap items-center gap-2 bg-white/70 border border-sage-light/25 rounded-xl px-3.5 py-2.5">
                          <span className="text-xs font-semibold text-brown-dark tabular-nums">
                            {fmtDate(s.startAt)} → {new Date(s.endAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              s.status === 'CONFIRMED'
                                ? 'bg-sage text-brown-dark'
                                : s.status === 'PROPOSED'
                                  ? 'bg-butter/50 text-brown'
                                  : s.status === 'COMPLETED'
                                    ? 'bg-brown/10 text-brown'
                                    : 'bg-neutral-100 text-brown-light'
                            }`}
                          >
                            {s.status}
                          </span>
                          {s.timezone && <span className="text-[10px] text-brown-light">{s.timezone}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="pt-2">
                    {detail.registrations.length === 0 ? (
                      <p className="text-xs text-brown-light/70">{a.regNone}</p>
                    ) : (
                      detail.registrations.map((r) => (
                        <div key={r.id} className="bg-white/70 border border-sage-light/25 rounded-xl px-3.5 py-3 space-y-1">
                          <p className="text-[11px] font-bold text-brown-dark">
                            {a.regPrefs} · {fmtDate(r.createdAt)}
                          </p>
                          <p className="text-[11px] text-brown-light">
                            {a.regTimezone}: <span className="font-semibold text-brown">{r.timezone || '—'}</span>
                            {r.daysPerWeek ? <> · {a.regPerWeek}: {r.daysPerWeek}</> : null}
                          </p>
                          <p className="text-[11px] text-brown-light">
                            {a.regDays}: <span className="font-semibold text-brown">{parseDays(r.preferredDays).join(', ') || '—'}</span>
                          </p>
                          <p className="text-[11px] text-brown-light">
                            {a.regTimes}: <span className="font-semibold text-brown">
                              {parseTimes(r.preferredTimes).map((t) => `${t.start}–${t.end}`).join(' · ') || '—'}
                            </span>
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </Section>

                {/* 🧾 رویدادهای راستی‌آزمایی */}
                <Section title={a.blockEvents} icon={<CreditCard className="w-4 h-4 text-sage-dark" />}>
                  {detail.events.length === 0 ? (
                    <p className="text-xs text-brown-light/70">{a.eventsEmpty}</p>
                  ) : (
                    <div className={`space-y-1 max-h-60 overflow-y-auto ${scrollCls}`}>
                      {detail.events.map((e) => (
                        <div key={e.id} className="flex flex-wrap items-center gap-2 text-[11px] bg-white/70 border border-sage-light/20 rounded-lg px-3 py-2">
                          <span
                            className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                              e.kind === 'PAID' || e.kind === 'VERIFIED'
                                ? 'bg-sage text-brown-dark'
                                : e.kind === 'UNMATCHED' || e.kind === 'UNDERPAID' || e.kind === 'API_ERROR' || e.kind === 'LATE_PAYMENT'
                                  ? 'bg-peach-light/60 text-brown'
                                  : 'bg-cream text-brown-light'
                            }`}
                          >
                            {e.kind}
                          </span>
                          {e.txHash && <span className="font-mono text-brown-light">{e.txHash.slice(0, 14)}…</span>}
                          <span className="text-brown-light/80 truncate flex-1 min-w-24" title={e.detail}>{e.detail}</span>
                          <span className="text-brown-light/60">{fmtDate(e.createdAt)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>

                {/* ⚙️ عملیات — لغو فقط از مسیر موجود و فقط PENDING */}
                {detail.order.paymentStatus === 'PENDING' && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => cancelOrder(detail.order.ref)}
                      className="text-xs font-semibold text-brown-light hover:text-red-500 border border-sage-light/40 hover:border-red-200 rounded-xl px-4 py-2.5 transition-colors cursor-pointer inline-flex items-center gap-2 min-h-[44px]"
                    >
                      <Ban className="w-3.5 h-3.5" /> {a.cancelAction}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Badge({ cls, children }: { cls: string; children: React.ReactNode }) {
  return <span className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${cls}`}>{children}</span>
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-white/60 border border-sage-light/20 rounded-2xl p-4">
      <p className="text-xs font-bold text-brown-dark uppercase tracking-wide mb-3 flex items-center gap-2">
        {icon}
        {title}
      </p>
      <div className="grid sm:grid-cols-2 gap-x-4 gap-y-2">{children}</div>
    </section>
  )
}

function KV({ k, v, mono }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold text-brown-light uppercase tracking-wide">{k}</p>
      <p className={`text-xs text-brown-dark break-all ${mono ? 'font-mono' : ''}`}>{v}</p>
    </div>
  )
}

function Row({ left, right, bold }: { left: string; right: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-brown-light">{left}</span>
      <span className={bold ? 'font-bold text-sage-dark tabular-nums' : 'font-semibold text-brown-dark tabular-nums'}>{right}</span>
    </div>
  )
}

function CopyBtn({ copied, onClick, label }: { copied: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className="w-6 h-6 rounded-lg bg-cream border border-sage-light/40 text-brown-light hover:text-brown hover:border-sage transition-all cursor-pointer inline-flex items-center justify-center flex-shrink-0"
    >
      {copied ? <Check className="w-3 h-3 text-sage-dark" /> : <Copy className="w-3 h-3" />}
    </button>
  )
}
