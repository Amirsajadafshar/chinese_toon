'use client'

// ---------------------------------------------------------------------------
// 📋 تب مدیریت پرداخت‌ها (فاز ۵۹) — رسیدهای آپلودشده + تأیید/ردّ دستی
//
// • فهرست صفحه‌بندی‌شده: GET /api/admin/payments?status=…&q=…&page=…
// • جزئیات کامل: GET /api/admin/payments/[ref] (+ رویدادهای ممیزی)
// • تأیید: POST /api/admin/payments/[ref]/approve  (فقط از RECEIPT_SUBMITTED)
// • ردّ:   POST /api/admin/payments/[ref]/reject   (دلیل ۳–۵۰۰ نویسه اجباری)
// • لغو سفارش PENDING: PATCH /api/payments/orders/[ref] { action:'cancel' }
// • رسیدها با هدر x-admin-key واکشی و به Object URL تبدیل می‌شوند — توکن ادمین
//   کوکی نیست، پس <img src=…> مستقیم کار نمی‌کند؛ Object URL با بستن دیالوگ
//   revoke می‌شود.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Hourglass,
  Landmark,
  Loader2,
  ReceiptText,
  SearchX,
  User,
  XCircle,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { siteContent } from '@/content/site-content'

const a = siteContent.admin
const pa = a.payAdmin

const PAGE_SIZE = 25

const inputCls =
  'w-full bg-white border border-sage-light/40 rounded-xl px-3.5 py-2.5 text-sm text-brown-dark placeholder:text-brown-light/60 focus:outline-none focus:ring-2 focus:ring-sage/40 focus:border-sage transition-colors'

export interface PayCounts {
  pendingReview: number
  approved: number
  rejected: number
  unpaid: number
  cancelled: number
}

interface PayCustomer {
  id: string | null
  name: string
  email: string
  phone: string | null
  country: string | null
}

interface PayOrderRow {
  ref: string
  status: string
  rawStatus: string
  paymentMethod: string
  productTitle: string
  productId: string
  amountUsd: string
  currency: string
  baseAmount: number | null
  tierPercent: number | null
  discountCode: string | null
  discountAmount: number | null
  discountType: string | null
  discountValue: number | null
  receiptStatus: string | null
  receiptSubmittedAt: string | null
  receiptResubmits: number
  rejectionReason: string | null
  reviewedAt: string | null
  reviewedBy: string | null
  paidAt: string | null
  createdAt: string
  updatedAt: string
  expiresAt: string
  customer: PayCustomer
}

interface PayListData {
  total: number
  page: number
  pageSize: number
  counts: PayCounts
  orders: PayOrderRow[]
}

interface PayDetailClass {
  id: string
  slug: string
  title: string
  level: string
  classType: string
  format: string | null
  schedule: string | null
  packageSessions: number | null
  sessionDurationMin: number | null
  pricePerSession: number | null
  packagePrice: number | null
}

interface PayDetailData {
  order: PayOrderRow & {
    receiptUrl: string | null
    receiptFileName: string | null
    receiptMime: string | null
    receiptSize: number | null
    legacy: { network: string; paymentMode: string; paymentAddress: string; txHash: string | null } | null
  }
  customer: PayCustomer & {
    countryCode?: string | null
    telegramUsername?: string | null
    memberSince?: string | null
    lastLoginAt?: string | null
  }
  class: PayDetailClass | null
  events: { id: string; kind: string; txHash: string | null; detail: string; createdAt: string }[]
}

// 🏷️ بَج وضعیت — هماهنگ با پالت برند (sage/peach/butter)
function statusBadge(s: string): { label: string; cls: string } {
  switch (s) {
    case 'PAID':
      return { label: a.statusPaid, cls: 'bg-green-100 text-green-800 border border-green-200' }
    case 'RECEIPT_SUBMITTED':
      return { label: a.statusReceiptSubmitted, cls: 'bg-sage-light/40 text-sage-dark border border-sage/40' }
    case 'REJECTED':
      return { label: a.statusRejected, cls: 'bg-peach-light/70 text-brown-dark border border-peach/50' }
    case 'PENDING':
      return { label: a.statusPending, cls: 'bg-amber-100 text-amber-800 border border-amber-200' }
    case 'UNDERPAID':
      return { label: a.statusUnderpaid, cls: 'bg-orange-100 text-orange-800 border border-orange-200' }
    case 'DETECTED':
      return { label: a.ordersM.payDetected, cls: 'bg-butter text-brown border border-peach/40' }
    case 'EXPIRED':
      return { label: a.statusExpired, cls: 'bg-red-100/70 text-red-700/90 border border-red-200/70' }
    case 'CANCELLED':
      return { label: a.statusCancelled, cls: 'bg-gray-100 text-gray-600 border border-gray-200' }
    default:
      return { label: s, cls: 'bg-neutral-100 text-brown-light border border-neutral-200' }
  }
}

function methodLabel(paymentMethod: string): string {
  return paymentMethod === 'MANUAL_BANK_CARD' ? 'Manual Bank Card' : 'Legacy USDT'
}

// 💰 نمایش مبلغ — همیشه «$X.XX USD»؛ مقدار ناموجود = —
function fmtUsd(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === '') return '—'
  const n = Number(v)
  return Number.isFinite(n) ? `$${n.toFixed(2)} USD` : '—'
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString()
}

// 🔎 خط یک‌سطره برای جزئیات رویداد ممیزی (JSON زیبا/فشرده — حداکثر ~۱۴۰ نویسه)
function eventDetailLine(raw: string): string {
  let s = raw
  try {
    const v = JSON.parse(raw)
    s = typeof v === 'string' ? v : JSON.stringify(v)
  } catch {
    /* خام نگه داشته می‌شود */
  }
  return s.length > 140 ? `${s.slice(0, 140)}…` : s
}

const FILTERS: { key: string; label: string; countKey?: keyof PayCounts }[] = [
  { key: 'all', label: pa.filterAll },
  { key: 'unpaid', label: pa.filterUnpaid, countKey: 'unpaid' },
  { key: 'receipt_submitted', label: pa.filterReceipt, countKey: 'pendingReview' },
  { key: 'approved', label: pa.filterApproved, countKey: 'approved' },
  { key: 'rejected', label: pa.filterRejected, countKey: 'rejected' },
  { key: 'cancelled', label: pa.filterCancelled, countKey: 'cancelled' },
  { key: 'expired', label: pa.filterExpired },
  { key: 'legacy', label: pa.filterLegacy },
]

export function PaymentsAdminTab({
  token,
  onToast,
  initialFilter,
  onCounts,
  onChanged,
}: {
  token: string
  onToast?: (msg: string) => void
  initialFilter?: string
  onCounts?: (c: PayCounts) => void
  onChanged?: () => void
}) {
  // ----- فهرست -----
  const [filter, setFilter] = useState(initialFilter && initialFilter.trim() !== '' ? initialFilter : 'receipt_submitted')
  const [query, setQuery] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<PayListData | null>(null)
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState(false)

  // کال‌بک‌های والد در ref نگه داشته می‌شوند تا شناسه‌شان حلقهٔ واکشی نسازد
  const cbRef = useRef({ onCounts, onChanged })
  useEffect(() => {
    cbRef.current = { onCounts, onChanged }
  })

  // debounce جست‌وجو (۳۰۰ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])

  // الگوی رسمی ریکت: بازگشت به صفحهٔ ۱ با تغییر فیلتر/جست‌وجو (بدون setState داخل effect)
  const [prevListKey, setPrevListKey] = useState('')
  const listKey = `${filter}|${debouncedQ}`
  if (prevListKey !== listKey) {
    setPrevListKey(listKey)
    setPage(1)
  }

  // سینک فیلتر با پراپ (باز شدن تب از داشبورد با فیلتر مقصد)
  useEffect(() => {
    if (typeof initialFilter === 'string' && initialFilter !== '') {
      setFilter(initialFilter)
    }
  }, [initialFilter])

  const loadList = useCallback(async () => {
    setListLoading(true)
    setListError(false)
    try {
      const params = new URLSearchParams({ status: filter, page: String(page), pageSize: String(PAGE_SIZE) })
      if (debouncedQ) params.set('q', debouncedQ)
      const res = await fetch(`/api/admin/payments?${params.toString()}`, {
        headers: { 'x-admin-key': token },
        cache: 'no-store',
      })
      if (!res.ok) {
        setListError(true)
        setData(null)
        return
      }
      const d = (await res.json()) as PayListData
      setData(d)
      if (d.counts) cbRef.current.onCounts?.(d.counts)
    } catch {
      setListError(true)
      setData(null)
    } finally {
      setListLoading(false)
    }
  }, [token, filter, page, debouncedQ])

  useEffect(() => {
    void loadList()
  }, [loadList])

  // ----- دیالوگ جزئیات -----
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailRef, setDetailRef] = useState<string | null>(null)
  const [detail, setDetail] = useState<PayDetailData | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState(false)
  const [actionBusy, setActionBusy] = useState(false)
  const [approveStage, setApproveStage] = useState(false)
  const [rejectStage, setRejectStage] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const loadDetail = useCallback(
    async (ref: string) => {
      setDetailLoading(true)
      setDetailError(false)
      try {
        const res = await fetch(`/api/admin/payments/${encodeURIComponent(ref)}`, {
          headers: { 'x-admin-key': token },
          cache: 'no-store',
        })
        if (!res.ok) {
          setDetailError(true)
          setDetail(null)
          return
        }
        setDetail((await res.json()) as PayDetailData)
      } catch {
        setDetailError(true)
        setDetail(null)
      } finally {
        setDetailLoading(false)
      }
    },
    [token]
  )

  const openDetail = (ref: string) => {
    setDetailRef(ref)
    setDetail(null)
    setDetailError(false)
    setApproveStage(false)
    setRejectStage(false)
    setRejectReason('')
    setDetailOpen(true)
    void loadDetail(ref)
  }

  const closeDetail = () => {
    setDetailOpen(false)
    setDetailRef(null)
    setDetail(null)
    setApproveStage(false)
    setRejectStage(false)
    setRejectReason('')
    setLightbox(false)
  }

  // 🧾 واکشی رسید با هدر ادمین → Object URL (با بستن/تعویض رسید revoke می‌شود)
  const receiptSrc = detailOpen ? (detail?.order.receiptUrl ?? null) : null
  const [receiptObjUrl, setReceiptObjUrl] = useState<string | null>(null)
  const [receiptState, setReceiptState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [lightbox, setLightbox] = useState(false)
  useEffect(() => {
    let cancelled = false
    let created: string | null = null
    setReceiptObjUrl(null)
    setLightbox(false)
    if (!receiptSrc) {
      setReceiptState('idle')
      return
    }
    setReceiptState('loading')
    fetch(receiptSrc, { headers: { 'x-admin-key': token }, cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error('receipt fetch failed')
        return res.blob()
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob)
        if (cancelled) {
          URL.revokeObjectURL(url)
          return
        }
        created = url
        setReceiptObjUrl(url)
        setReceiptState('ready')
      })
      .catch(() => {
        if (!cancelled) setReceiptState('error')
      })
    return () => {
      cancelled = true
      if (created) URL.revokeObjectURL(created)
    }
  }, [receiptSrc, token])

  const refreshAll = useCallback(
    async (ref: string) => {
      await Promise.all([loadDetail(ref), loadList()])
      cbRef.current.onChanged?.()
    },
    [loadDetail, loadList]
  )

  // ----- اقدامات -----
  const doApprove = async () => {
    if (!detailRef || actionBusy) return
    setActionBusy(true)
    try {
      const res = await fetch(`/api/admin/payments/${encodeURIComponent(detailRef)}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': token },
        body: JSON.stringify({}),
      })
      const d = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        onToast?.(d.error || pa.approveFailed)
        return
      }
      onToast?.(pa.approvedToast)
      setApproveStage(false)
      await refreshAll(detailRef)
    } catch {
      onToast?.(pa.approveFailed)
    } finally {
      setActionBusy(false)
    }
  }

  const doReject = async () => {
    const reason = rejectReason.trim()
    if (!detailRef || actionBusy || reason.length < 3) return
    setActionBusy(true)
    try {
      const res = await fetch(`/api/admin/payments/${encodeURIComponent(detailRef)}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': token },
        body: JSON.stringify({ reason }),
      })
      const d = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        onToast?.(d.error || pa.rejectFailed)
        return
      }
      onToast?.(pa.rejectedToast)
      setRejectStage(false)
      setRejectReason('')
      await refreshAll(detailRef)
    } catch {
      onToast?.(pa.rejectFailed)
    } finally {
      setActionBusy(false)
    }
  }

  const doCancel = async () => {
    if (!detailRef || actionBusy) return
    if (!window.confirm(a.cancelConfirm)) return
    setActionBusy(true)
    try {
      const res = await fetch(`/api/payments/orders/${encodeURIComponent(detailRef)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': token },
        body: JSON.stringify({ action: 'cancel' }),
      })
      const d = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        onToast?.(d.error || pa.loadFailed)
        return
      }
      onToast?.(a.orderCancelled)
      await refreshAll(detailRef)
    } catch {
      onToast?.(pa.loadFailed)
    } finally {
      setActionBusy(false)
    }
  }

  const counts = data?.counts ?? null
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const orders = data?.orders ?? []

  // کارت‌های خلاصه — کلیک = فیلتر همان وضعیت
  const summaryCards: { key: string; label: string; value: number; icon: React.ReactNode; tone: string }[] = [
    {
      key: 'receipt_submitted',
      label: pa.summaryPendingReview,
      value: counts?.pendingReview ?? 0,
      icon: <ReceiptText className="w-5 h-5" aria-hidden="true" />,
      tone: 'bg-sage-light/40 text-sage-dark',
    },
    {
      key: 'approved',
      label: pa.summaryApproved,
      value: counts?.approved ?? 0,
      icon: <CheckCircle2 className="w-5 h-5" aria-hidden="true" />,
      tone: 'bg-green-100 text-green-700',
    },
    {
      key: 'rejected',
      label: pa.summaryRejected,
      value: counts?.rejected ?? 0,
      icon: <XCircle className="w-5 h-5" aria-hidden="true" />,
      tone: 'bg-peach-light/60 text-brown',
    },
    {
      key: 'unpaid',
      label: pa.summaryUnpaid,
      value: counts?.unpaid ?? 0,
      icon: <Hourglass className="w-5 h-5" aria-hidden="true" />,
      tone: 'bg-butter/40 text-brown',
    },
  ]

  const isReviewable = detail?.order.status === 'RECEIPT_SUBMITTED'
  const isImageReceipt = (detail?.order.receiptMime ?? '').startsWith('image/')

  return (
    <div>
      {/* ---------- کارت‌های خلاصه ---------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {summaryCards.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setFilter(c.key)}
            aria-pressed={filter === c.key}
            className={`bg-white rounded-2xl border p-4 flex items-center gap-3 text-left transition-colors cursor-pointer min-h-[44px] ${
              filter === c.key ? 'border-sage bg-sage-light/10' : 'border-sage-light/20 hover:border-sage/40'
            }`}
          >
            <span className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${c.tone}`}>{c.icon}</span>
            <span className="min-w-0">
              <span className="block text-xl font-bold text-brown-dark leading-none tabular-nums">{c.value}</span>
              <span className="block text-[11px] font-semibold text-brown-light mt-1 truncate">{c.label}</span>
            </span>
          </button>
        ))}
      </div>

      {/* ---------- زیرعنوان + جست‌وجو + فیلترها ---------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-xs text-brown-light bg-butter/20 rounded-xl px-4 py-2.5 flex-1 min-w-[240px]">{pa.subtitle}</p>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={pa.searchPlaceholder}
          aria-label={pa.searchPlaceholder}
          className={`${inputCls} max-w-xs`}
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label="Payment status filters">
        {FILTERS.map((f) => {
          const active = filter === f.key
          const count = f.countKey && counts ? counts[f.countKey] : null
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={active}
              className={`text-xs font-semibold px-3.5 py-2 rounded-full transition-colors cursor-pointer inline-flex items-center gap-1.5 min-h-[36px] ${
                active ? 'bg-sage text-brown-dark' : 'bg-white border border-sage-light/40 text-brown hover:border-sage'
              }`}
            >
              {f.label}
              {count !== null && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums ${
                    active ? 'bg-white/70 text-brown-dark' : 'bg-cream text-brown-light'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ---------- جدول ---------- */}
      <div className="bg-white rounded-2xl border border-sage-light/20 overflow-hidden">
        {listError ? (
          <div className="text-center py-14">
            <SearchX className="w-9 h-9 mx-auto mb-2 text-brown-light/50" aria-hidden="true" />
            <p className="text-sm text-brown-light mb-3">{pa.loadFailed}</p>
            <button
              type="button"
              onClick={() => void loadList()}
              className="bg-sage text-brown-dark px-4 py-2 rounded-xl text-xs font-bold hover:bg-sage-dark cursor-pointer inline-flex items-center gap-1.5 min-h-[36px]"
            >
              {a.refresh}
            </button>
          </div>
        ) : !listLoading && orders.length === 0 ? (
          <div className="text-center py-16">
            <ReceiptText className="w-10 h-10 mx-auto mb-3 text-brown-light/50" aria-hidden="true" />
            <p className="text-sm text-brown-light">{pa.empty}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-sm">
              <thead>
                <tr className="bg-cream/60 text-left">
                  {[
                    pa.colOrder,
                    pa.colCustomer,
                    pa.colClass,
                    pa.colAmount,
                    pa.colDiscount,
                    pa.colFinal,
                    pa.colMethod,
                    pa.colStatus,
                    pa.colReceipt,
                    pa.colUpdated,
                    pa.colAction,
                  ].map((h) => (
                    <th key={h} scope="col" className="px-3.5 py-3 text-[10px] font-bold uppercase tracking-wider text-brown-light whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {listLoading &&
                  [0, 1, 2].map((i) => (
                    <tr key={`sk-${i}`} className="border-t border-sage-light/15">
                      <td colSpan={11} className="px-3.5 py-4">
                        <div className="h-5 bg-cream/80 rounded-lg animate-pulse" />
                      </td>
                    </tr>
                  ))}
                {!listLoading &&
                  orders.map((o) => {
                    const sb = statusBadge(o.status)
                    const reviewable = o.status === 'RECEIPT_SUBMITTED'
                    return (
                      <tr key={o.ref} className="border-t border-sage-light/15 hover:bg-cream/40 transition-colors align-top">
                        {/* سفارش */}
                        <td className="px-3.5 py-3">
                          <span className="font-mono text-xs font-bold text-brown-dark">{o.ref}</span>
                          <p className="text-[10px] text-brown-light/80 mt-0.5">{fmtDate(o.createdAt)}</p>
                        </td>
                        {/* مشتری */}
                        <td className="px-3.5 py-3 max-w-[180px]">
                          <p className="text-xs font-bold text-brown-dark truncate">{o.customer.name || '—'}</p>
                          <p className="text-[11px] text-brown-light truncate">{o.customer.email}</p>
                        </td>
                        {/* کلاس */}
                        <td className="px-3.5 py-3 max-w-[170px]">
                          <p className="text-xs text-brown truncate">{o.productTitle || '—'}</p>
                        </td>
                        {/* مبلغ */}
                        <td className="px-3.5 py-3 text-xs text-brown tabular-nums whitespace-nowrap">{fmtUsd(o.amountUsd)}</td>
                        {/* تخفیف */}
                        <td className="px-3.5 py-3 text-xs whitespace-nowrap">
                          {o.discountCode ? (
                            <span className="text-brown-dark font-semibold">
                              {o.discountCode}
                              {o.discountAmount !== null && <span className="text-green-700"> −{fmtUsd(o.discountAmount)}</span>}
                            </span>
                          ) : (
                            <span className="text-brown-light/70">{pa.receiptNone}</span>
                          )}
                        </td>
                        {/* نهایی */}
                        <td className="px-3.5 py-3 text-xs font-bold text-brown-dark tabular-nums whitespace-nowrap">{fmtUsd(o.amountUsd)}</td>
                        {/* روش پرداخت */}
                        <td className="px-3.5 py-3">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                              o.paymentMethod === 'MANUAL_BANK_CARD' ? 'bg-sage-light/30 text-sage-dark' : 'bg-neutral-200 text-neutral-600'
                            }`}
                          >
                            {methodLabel(o.paymentMethod)}
                          </span>
                        </td>
                        {/* وضعیت */}
                        <td className="px-3.5 py-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${sb.cls}`}>{sb.label}</span>
                        </td>
                        {/* رسید */}
                        <td className="px-3.5 py-3 text-[11px] text-brown-light whitespace-nowrap">
                          {o.receiptSubmittedAt ? fmtDateTime(o.receiptSubmittedAt) : <span className="text-brown-light/70">{pa.receiptNone}</span>}
                          {o.receiptResubmits > 0 && (
                            <span className="block text-[10px] text-brown-light/80 mt-0.5">+{o.receiptResubmits}</span>
                          )}
                        </td>
                        {/* به‌روزرسانی */}
                        <td className="px-3.5 py-3 text-[11px] text-brown-light whitespace-nowrap">{fmtDateTime(o.updatedAt)}</td>
                        {/* اقدام */}
                        <td className="px-3.5 py-3">
                          <button
                            type="button"
                            onClick={() => openDetail(o.ref)}
                            className={`text-xs font-bold px-3.5 py-2 rounded-xl transition-colors cursor-pointer min-h-[36px] ${
                              reviewable
                                ? 'bg-sage text-brown-dark hover:bg-sage-dark'
                                : 'bg-white border border-sage-light/40 text-brown hover:border-sage'
                            }`}
                          >
                            {pa.review}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* صفحه‌بندی */}
      {total > 0 && (
        <nav className="flex items-center justify-between gap-3 mt-3" aria-label="Payments pagination">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="bg-white border border-sage-light/40 text-brown px-4 py-2 rounded-xl text-xs font-semibold hover:border-sage disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer min-h-[36px]"
          >
            {pa.prev}
          </button>
          <span className="text-xs text-brown-light tabular-nums">{pa.pageOf(page, totalPages)}</span>
          <button
            type="button"
            onClick={() => setPage((p) => (p >= totalPages ? p : p + 1))}
            disabled={page >= totalPages}
            className="bg-white border border-sage-light/40 text-brown px-4 py-2 rounded-xl text-xs font-semibold hover:border-sage disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer min-h-[36px]"
          >
            {pa.next}
          </button>
        </nav>
      )}

      {/* ---------- دیالوگ جزئیات ---------- */}
      <Dialog open={detailOpen} onOpenChange={(v) => !v && closeDetail()}>
        <DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto ct-scroll-area">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2.5 pr-8">
              <span>{pa.detailTitle}</span>
              {detail && (
                <>
                  <span className="font-mono text-sm font-bold text-brown-dark bg-cream px-2.5 py-1 rounded-lg">{detail.order.ref}</span>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${statusBadge(detail.order.status).cls}`}>
                    {statusBadge(detail.order.status).label}
                  </span>
                  {detail.order.paymentMethod === 'USDT_TRON' && (
                    <span className="text-[10px] font-bold bg-neutral-200 text-neutral-600 px-2.5 py-1 rounded-full">{pa.legacyBadge}</span>
                  )}
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {detailLoading && !detail && (
            <p className="text-xs text-brown-light flex items-center gap-2 py-10 justify-center" role="status">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> {pa.loading}
            </p>
          )}

          {detailError && !detail && (
            <div className="text-center py-10">
              <SearchX className="w-9 h-9 mx-auto mb-2 text-brown-light/50" aria-hidden="true" />
              <p className="text-sm text-brown-light">{pa.loadFailed}</p>
            </div>
          )}

          {detail && (
            <div className="space-y-5">
              {/* 👤 مشتری */}
              <section>
                <h4 className="text-xs font-bold uppercase tracking-wider text-brown-light mb-2 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" aria-hidden="true" /> {pa.blockCustomer}
                </h4>
                <div className="grid sm:grid-cols-3 gap-2.5">
                  <InfoCell label={pa.cName} value={detail.customer.name || '—'} />
                  <InfoCell label={pa.cEmail} value={detail.customer.email || '—'} />
                  <InfoCell label={pa.cPhone} value={detail.customer.phone || '—'} />
                  <InfoCell label={pa.cCountry} value={detail.customer.country || '—'} />
                  <InfoCell label={pa.cTelegram} value={detail.customer.telegramUsername ? `@${detail.customer.telegramUsername}` : '—'} />
                  <InfoCell label={pa.cMemberSince} value={detail.customer.memberSince ? fmtDate(detail.customer.memberSince) : '—'} />
                </div>
              </section>

              {/* 🎓 کلاس */}
              <section>
                <h4 className="text-xs font-bold uppercase tracking-wider text-brown-light mb-2 flex items-center gap-1.5">
                  <Landmark className="w-3.5 h-3.5" aria-hidden="true" /> {pa.blockClass}
                </h4>
                {detail.class ? (
                  <div className="grid sm:grid-cols-3 gap-2.5">
                    <InfoCell label={pa.colClass} value={detail.class.title} accent />
                    <InfoCell label={pa.clLevel} value={detail.class.level || '—'} />
                    <InfoCell label={pa.clType} value={detail.class.classType || '—'} />
                    <InfoCell label={pa.clFormat} value={detail.class.format || '—'} />
                    <InfoCell label={pa.clSchedule} value={detail.class.schedule || '—'} />
                    <InfoCell
                      label={pa.clSessions}
                      value={detail.class.packageSessions ? `${detail.class.packageSessions} × ${detail.class.sessionDurationMin ?? '—'} min` : '—'}
                    />
                  </div>
                ) : (
                  <p className="text-xs text-brown-light bg-cream/50 border border-sage-light/20 rounded-xl px-4 py-3">—</p>
                )}
              </section>

              {/* 💰 مالی */}
              <section>
                <h4 className="text-xs font-bold uppercase tracking-wider text-brown-light mb-2 flex items-center gap-1.5">
                  <ReceiptText className="w-3.5 h-3.5" aria-hidden="true" /> {pa.blockFinancial}
                </h4>
                <div className="grid sm:grid-cols-4 gap-2.5">
                  <InfoCell label={pa.fOriginal} value={fmtUsd(detail.order.baseAmount)} />
                  <InfoCell label={pa.fTier} value={detail.order.tierPercent !== null ? `${detail.order.tierPercent}%` : '—'} />
                  <InfoCell
                    label={pa.fCode}
                    value={
                      detail.order.discountCode
                        ? `${detail.order.discountCode}${detail.order.discountAmount !== null ? ` (−${fmtUsd(detail.order.discountAmount)})` : ''}`
                        : '—'
                    }
                  />
                  <InfoCell label={pa.fFinal} value={fmtUsd(detail.order.amountUsd)} accent />
                </div>
              </section>

              {/* 💳 پرداخت */}
              <section>
                <h4 className="text-xs font-bold uppercase tracking-wider text-brown-light mb-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" aria-hidden="true" /> {pa.blockPayment}
                </h4>
                <div className="grid sm:grid-cols-3 gap-2.5">
                  <InfoCell label={pa.pMethod} value={methodLabel(detail.order.paymentMethod)} />
                  <InfoCell label={pa.pStatus} value={statusBadge(detail.order.status).label} />
                  <InfoCell label={pa.pSubmitted} value={detail.order.receiptSubmittedAt ? fmtDateTime(detail.order.receiptSubmittedAt) : '—'} />
                  <InfoCell label={pa.pReviewed} value={detail.order.reviewedAt ? fmtDateTime(detail.order.reviewedAt) : '—'} />
                  <InfoCell label={pa.pReviewedBy} value={detail.order.reviewedBy || '—'} />
                  <InfoCell label={pa.pPaid} value={detail.order.paidAt ? fmtDateTime(detail.order.paidAt) : '—'} />
                  <InfoCell label={pa.pResubmits} value={String(detail.order.receiptResubmits ?? 0)} />
                </div>
                {/* جریان قدیمی USDT — شبکه/آدرس/تراکنش سفارش‌های تاریخی */}
                {detail.order.legacy && (
                  <div className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 mt-2.5 space-y-1 text-[11px] text-brown-light">
                    <p className="font-bold text-brown-dark text-[10px] uppercase tracking-wider mb-1">{pa.legacyBadge}</p>
                    <p>
                      Network: <span className="font-semibold text-brown-dark">{detail.order.legacy.network}</span> · Mode:{' '}
                      <span className="font-semibold text-brown-dark">{detail.order.legacy.paymentMode}</span>
                    </p>
                    <p className="break-all font-mono">{detail.order.legacy.paymentAddress}</p>
                    {detail.order.legacy.txHash && <p className="break-all font-mono">tx: {detail.order.legacy.txHash}</p>}
                  </div>
                )}
              </section>

              {/* 🧾 رسید */}
              <section>
                <h4 className="text-xs font-bold uppercase tracking-wider text-brown-light mb-2 flex items-center gap-1.5">
                  <ReceiptText className="w-3.5 h-3.5" aria-hidden="true" /> {pa.blockReceipt}
                </h4>

                {!detail.order.receiptUrl ? (
                  <p className="text-xs text-brown-light bg-cream/50 border border-dashed border-sage-light/40 rounded-xl px-4 py-6 text-center">
                    {pa.receiptEmpty}
                  </p>
                ) : (
                  <div className="bg-cream/50 border border-sage-light/25 rounded-xl p-4">
                    {receiptState === 'loading' && (
                      <p className="text-xs text-brown-light flex items-center gap-2 justify-center py-6" role="status">
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> {pa.loading}
                      </p>
                    )}
                    {receiptState === 'error' && <p className="text-xs text-brown-light text-center py-6">{pa.loadFailed}</p>}
                    {receiptState === 'ready' && receiptObjUrl && isImageReceipt && (
                      <div className="text-center">
                        <img
                          src={receiptObjUrl}
                          alt={detail.order.receiptFileName || pa.receiptView}
                          onClick={() => setLightbox(true)}
                          className="max-h-80 rounded-xl border border-sage-light/40 cursor-zoom-in mx-auto"
                        />
                        <p className="text-[10px] text-brown-light/80 mt-2">{pa.zoomHint}</p>
                      </div>
                    )}
                    {receiptState === 'ready' && receiptObjUrl && !isImageReceipt && (
                      <div className="flex flex-wrap items-center gap-3 bg-white border border-sage-light/30 rounded-xl px-4 py-3.5">
                        <FileText className="w-8 h-8 text-sage-dark flex-shrink-0" aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-brown-dark truncate">{detail.order.receiptFileName || 'receipt.pdf'}</p>
                          <p className="text-[10px] text-brown-light">
                            PDF · {detail.order.receiptSize ? `${Math.max(1, Math.round(detail.order.receiptSize / 1024))} KB` : '—'}
                          </p>
                        </div>
                        <a
                          href={receiptObjUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-sage text-brown-dark text-xs font-bold px-3.5 py-2 rounded-xl hover:bg-sage-dark transition-colors inline-flex items-center gap-1.5 min-h-[36px]"
                        >
                          {pa.receiptView} <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                        </a>
                      </div>
                    )}
                    <p className="text-[10px] text-brown-light/80 mt-2.5 break-all">
                      {pa.pFileName}: {detail.order.receiptFileName || '—'}
                      {detail.order.receiptSize ? ` · ${Math.max(1, Math.round(detail.order.receiptSize / 1024))} KB` : ''}
                    </p>
                  </div>
                )}

                {/* دلیل ردّ قبلی — برای بررسی ارسالِ مجدد */}
                {detail.order.status === 'REJECTED' && detail.order.rejectionReason && (
                  <p className="text-xs text-brown-dark bg-peach-light/60 border border-peach/40 rounded-xl px-4 py-3 mt-2.5 leading-relaxed">
                    <span className="font-bold">{a.statusRejected}:</span> {detail.order.rejectionReason}
                  </p>
                )}

                {/* ---------- نوار اقدام تأیید/ردّ ---------- */}
                {isReviewable && (
                  <div className="mt-3">
                    {!approveStage && !rejectStage && (
                      <div className="flex flex-wrap items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => setApproveStage(true)}
                          disabled={actionBusy}
                          className="bg-green-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-green-700 transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5 min-h-[44px]"
                        >
                          <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> {pa.approve}
                        </button>
                        <button
                          type="button"
                          onClick={() => setRejectStage(true)}
                          disabled={actionBusy}
                          className="bg-red-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-red-600 transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5 min-h-[44px]"
                        >
                          <XCircle className="w-4 h-4" aria-hidden="true" /> {pa.reject}
                        </button>
                      </div>
                    )}

                    {/* گام تأیید تأییدیهٔ داخلی */}
                    {approveStage && (
                      <div className="bg-sage-light/25 border border-sage/40 rounded-xl px-4 py-3.5" role="alertdialog" aria-label={pa.approveConfirmTitle}>
                        <p className="text-sm font-bold text-brown-dark mb-1">{pa.approveConfirmTitle}</p>
                        <p className="text-xs text-brown-light leading-relaxed mb-3">
                          {pa.approveConfirmText(detail.order.ref, `$${Number(detail.order.amountUsd).toFixed(2)}`)}
                        </p>
                        <div className="flex flex-wrap items-center gap-2.5">
                          <button
                            type="button"
                            onClick={doApprove}
                            disabled={actionBusy}
                            className="bg-green-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-green-700 transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5 min-h-[44px]"
                          >
                            {actionBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
                            {pa.approveYes}
                          </button>
                          <button
                            type="button"
                            onClick={() => setApproveStage(false)}
                            disabled={actionBusy}
                            className="bg-white border border-sage-light/40 text-brown px-4 py-2.5 rounded-xl text-xs font-semibold hover:border-sage transition-colors cursor-pointer disabled:opacity-60 min-h-[44px]"
                          >
                            {pa.close}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* گام ردّ + دلیل */}
                    {rejectStage && (
                      <div className="bg-peach-light/50 border border-peach/50 rounded-xl px-4 py-3.5" role="alertdialog" aria-label={pa.rejectTitle}>
                        <p className="text-sm font-bold text-brown-dark mb-1">{pa.rejectTitle}</p>
                        <p className="text-xs font-semibold text-brown mb-2">{pa.rejectReasonLabel}</p>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {pa.rejectPresets.map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setRejectReason(preset)}
                              className={`text-[11px] font-semibold px-3 py-1.5 rounded-full transition-colors cursor-pointer min-h-[32px] ${
                                rejectReason === preset
                                  ? 'bg-brown-dark text-white'
                                  : 'bg-white border border-sage-light/40 text-brown hover:border-peach'
                              }`}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                        <textarea
                          rows={3}
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder={pa.rejectCustom}
                          maxLength={500}
                          aria-label={pa.rejectReasonLabel}
                          className={`${inputCls} resize-none`}
                        />
                        <div className="flex flex-wrap items-center gap-2.5 mt-3">
                          <button
                            type="button"
                            onClick={doReject}
                            disabled={actionBusy || rejectReason.trim().length < 3}
                            className="bg-red-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-red-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5 min-h-[44px]"
                          >
                            {actionBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
                            {pa.rejectSubmit}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRejectStage(false)
                              setRejectReason('')
                            }}
                            disabled={actionBusy}
                            className="bg-white border border-sage-light/40 text-brown px-4 py-2.5 rounded-xl text-xs font-semibold hover:border-sage transition-colors cursor-pointer disabled:opacity-60 min-h-[44px]"
                          >
                            {pa.close}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* لغو سفارش — فقط PENDING */}
                {detail.order.status === 'PENDING' && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={doCancel}
                      disabled={actionBusy}
                      className="text-xs font-semibold text-brown-light hover:text-red-500 border border-sage-light/40 hover:border-red-200 rounded-xl px-4 py-2.5 transition-colors cursor-pointer disabled:opacity-60 min-h-[44px]"
                    >
                      {pa.cancelAction}
                    </button>
                  </div>
                )}
              </section>

              {/* 🧵 زنجیرهٔ ممیزی */}
              <section>
                <h4 className="text-xs font-bold uppercase tracking-wider text-brown-light mb-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" aria-hidden="true" /> {pa.blockEvents}
                </h4>
                {detail.events.length === 0 ? (
                  <p className="text-xs text-brown-light bg-cream/50 border border-dashed border-sage-light/40 rounded-xl px-4 py-5 text-center">
                    {pa.eventsEmpty}
                  </p>
                ) : (
                  <ul className="bg-white border border-sage-light/20 rounded-xl overflow-hidden max-h-64 overflow-y-auto ct-scroll-area">
                    {detail.events.map((e, i) => (
                      <li
                        key={e.id}
                        className={`px-4 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs ${
                          i !== detail.events.length - 1 ? 'border-b border-sage-light/15' : ''
                        }`}
                      >
                        <span
                          className={`font-bold px-2 py-0.5 rounded-full text-[10px] whitespace-nowrap ${
                            e.kind === 'PAID' || e.kind === 'APPROVED'
                              ? 'bg-green-100 text-green-800'
                              : e.kind === 'REJECTED'
                                ? 'bg-peach-light/60 text-brown'
                                : 'bg-cream text-brown-light'
                          }`}
                        >
                          {e.kind}
                        </span>
                        <span className="flex-1 min-w-32 truncate text-brown-light" title={e.detail}>
                          {eventDetailLine(e.detail)}
                        </span>
                        <span className="text-brown-light/70 whitespace-nowrap">{fmtDateTime(e.createdAt)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 🔍 لایت‌باکس تمام‌صفحهٔ رسید */}
      {lightbox && receiptObjUrl && isImageReceipt && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={pa.receiptView}
          className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-6 cursor-zoom-out"
          onClick={() => setLightbox(false)}
        >
          <img src={receiptObjUrl} alt={detail?.order.receiptFileName || 'receipt'} className="max-h-[90vh] max-w-[90vw] rounded-xl shadow-2xl" />
          <button
            type="button"
            onClick={() => setLightbox(false)}
            aria-label={pa.close}
            className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/90 text-brown-dark flex items-center justify-center hover:bg-white transition-colors cursor-pointer text-lg font-bold"
          >
            ✕
          </button>
          <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/70 text-xs">{pa.zoomHint}</p>
        </div>
      )}
    </div>
  )
}

// سلول اطلاعات با برچسب — هماهنگ با ProfileCell پنل
function InfoCell({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className="bg-cream/50 rounded-xl border border-sage-light/20 px-3.5 py-2.5 min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wider text-brown-light mb-0.5">{label}</p>
      <p className={`text-sm text-brown-dark break-words ${accent ? 'font-bold' : 'font-semibold'}`}>{value}</p>
    </div>
  )
}
