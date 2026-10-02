'use client'

// ---------------------------------------------------------------------------
// 📊 تب Dashboard پنل ادمین (فاز ۵۲ — بند ۷)
//
// همهٔ اعداد از GET /api/admin/dashboard می‌آیند — COUNT/aggregate واقعی دیتابیس
// سمت سرور (هیچ آمار مهمی در مرورگر حساب نمی‌شود). شامل: کاربران و کاربران جدید،
// سفارش‌ها به تفکیک وضعیت، درآمد پرداخت‌شده، کلاس‌های فعال، کدهای تخفیف،
// آخرین سفارش‌ها و آخرین ثبت‌نام‌ها. هیچ رز/هش/کلیدی در پاسخ نیست.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  GraduationCap,
  Hourglass,
  Loader2,
  ReceiptText,
  RefreshCw,
  TicketPercent,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react'
import { siteContent } from '@/content/site-content'

const a = siteContent.admin

interface DashData {
  users: { total: number; new7d: number; new30d: number }
  orders: {
    total: number
    PENDING: number
    DETECTED: number
    PAID: number
    UNDERPAID: number
    EXPIRED: number
    CANCELLED: number
    unpaid: number
    paidRevenueUsd: string
    paidCount: number
    // 💳 فاز ۵۹ — خلاصهٔ پرداخت‌های دستی (RECEIPT_SUBMITTED = در انتظار بررسی، PAID = تأییدشده)
    pendingReview?: number
    approved?: number
    rejected?: number
  }
  courses: { total: number; active: number }
  discounts: { total: number; active: number }
  registrations: { total: number; new: number }
  schedules: { upcoming: number }
  recentOrders: Array<{
    ref: string
    productTitle: string
    contactEmail: string
    amountUsd: string
    status: string
    createdAt: string
  }>
  recentRegistrations: Array<{ id: string; name: string; email: string; country: string; createdAt: string }>
  generatedAt: string
}

// 🏷️ بَج وضعیت سفارش — رنگ + برچسب (فاز ۵۹: RECEIPT_SUBMITTED سِیج، REJECTED هلویی)
const ORDER_STATUS_BADGES: Record<string, { cls: string; label: string }> = {
  PENDING: { cls: 'bg-amber-100 text-amber-800 border-amber-200', label: a.statusPending },
  DETECTED: { cls: 'bg-butter text-brown border-peach/40', label: a.ordersM.payDetected },
  RECEIPT_SUBMITTED: { cls: 'bg-sage-light/40 text-sage-dark border-sage/40', label: a.statusReceiptSubmitted },
  PAID: { cls: 'bg-green-100 text-green-800 border-green-200', label: a.statusPaid },
  REJECTED: { cls: 'bg-peach-light/70 text-brown-dark border-peach/50', label: a.statusRejected },
  UNDERPAID: { cls: 'bg-orange-100 text-orange-800 border-orange-200', label: a.statusUnderpaid },
  EXPIRED: { cls: 'bg-red-100/70 text-red-700/90 border-red-200/70', label: a.statusExpired },
  CANCELLED: { cls: 'bg-gray-100 text-gray-600 border-gray-200', label: a.statusCancelled },
}

function orderStatusBadge(s: string): { cls: string; label: string } {
  return ORDER_STATUS_BADGES[s] ?? { cls: 'bg-gray-100 text-gray-600 border-gray-200', label: s }
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}

function StatCard({
  icon,
  label,
  value,
  sub,
  tone = 'sage',
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
  tone?: 'sage' | 'butter' | 'peach' | 'red' | 'green'
}) {
  const toneCls =
    tone === 'butter'
      ? 'bg-butter/40 text-brown'
      : tone === 'peach'
        ? 'bg-peach-light/60 text-brown'
        : tone === 'red'
          ? 'bg-red-100 text-red-700'
          : tone === 'green'
            ? 'bg-green-100 text-green-700'
            : 'bg-sage-light/40 text-sage-dark'
  return (
    <div className="bg-white rounded-2xl border border-sage-light/20 p-4 flex items-center gap-3">
      <span className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${toneCls}`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-xl font-bold text-brown-dark leading-none tabular-nums">{value}</p>
        <p className="text-[11px] font-semibold text-brown-light mt-1 truncate">{label}</p>
        {sub && <p className="text-[10px] text-brown-light/80 truncate">{sub}</p>}
      </div>
    </div>
  )
}

// 💳 کارت آمار کلیک‌پذیر پرداخت‌ها (فاز ۵۹) — کلیک = فیلتر تب Payments
function PaymentStatCard({
  icon,
  label,
  value,
  tone = 'sage',
  clickable,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  tone?: 'sage' | 'butter' | 'peach' | 'green'
  clickable: boolean
  onClick?: () => void
}) {
  const toneCls =
    tone === 'butter'
      ? 'bg-butter/40 text-brown'
      : tone === 'peach'
        ? 'bg-peach-light/60 text-brown'
        : tone === 'green'
          ? 'bg-green-100 text-green-700'
          : 'bg-sage-light/40 text-sage-dark'
  const inner = (
    <>
      <span className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${toneCls}`}>{icon}</span>
      <span className="min-w-0">
        <span className="block text-xl font-bold text-brown-dark leading-none tabular-nums">{value}</span>
        <span className="block text-[11px] font-semibold text-brown-light mt-1 truncate">{label}</span>
      </span>
    </>
  )
  if (!clickable) {
    return (
      <div className="bg-white rounded-2xl border border-sage-light/20 p-4 flex items-center gap-3">
        {inner}
      </div>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-white rounded-2xl border border-sage-light/20 p-4 flex items-center gap-3 text-left hover:border-sage hover:bg-sage-light/10 transition-colors cursor-pointer min-h-[44px]"
    >
      {inner}
    </button>
  )
}

export function DashboardAdminTab({
  token,
  onOpenPayments,
}: {
  token: string
  // 💳 فاز ۵۹ — کلیک روی کارت‌های خلاصهٔ پرداخت = باز شدن تب Payments با فیلتر مقصد
  onOpenPayments?: (filter: string) => void
}) {
  const [data, setData] = useState<DashData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/dashboard', { headers: { 'x-admin-key': token }, cache: 'no-store' })
      if (!res.ok) {
        setError('Could not load dashboard statistics.')
        setData(null)
        return
      }
      setData((await res.json()) as DashData)
    } catch {
      setError('Could not load dashboard statistics.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void load()
  }, [load])

  if (loading && !data) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading dashboard">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-white/70 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-48 bg-white/50 rounded-2xl animate-pulse" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-sage-light/50">
        <AlertTriangle className="w-9 h-9 mx-auto mb-2 text-brown-light/50" />
        <p className="text-sm text-brown-light mb-4">{error}</p>
        <button
          type="button"
          onClick={load}
          className="bg-sage text-brown-dark px-4 py-2 rounded-xl text-xs font-bold hover:bg-sage-dark cursor-pointer inline-flex items-center gap-1.5 min-h-[36px]"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    )
  }

  const o = data.orders
  return (
    <div className="animate-ct-fadeInUp">
      {/* ردیف کاربران — 📊 فاز ۶۰ (بند ۱۶): تفکیک شفاف «حساب دانش‌پذیر» از
          «رکورد ثبت‌نام کلاس». هیچ‌کدام بر حسب وضعیت پرداخت فیلتر نمی‌شوند
          (بند ۱۷: دانش‌پذیرِ پرداخت‌نکرده هم شمرده می‌شود) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard icon={<Users className="w-5 h-5" />} label={a.statStudentAccounts} value={data.users.total} sub={`${data.users.new30d} in 30 days`} />
        <StatCard icon={<UserPlus className="w-5 h-5" />} label="New students (7 days)" value={data.users.new7d} tone="green" />
        <StatCard
          icon={<GraduationCap className="w-5 h-5" />}
          label={a.statRegistrationRequests}
          value={data.registrations.total}
          sub={`${data.registrations.new} awaiting contact · ${a.statRegistrationSub}`}
          tone="butter"
        />
        <StatCard icon={<CalendarDays className="w-5 h-5" />} label="Upcoming sessions" value={data.schedules.upcoming} tone="peach" />
      </div>

      {/* ردیف سفارش‌ها */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard icon={<Wallet className="w-5 h-5" />} label="Total orders" value={o.total} sub={`${o.paidCount} approved · $${o.paidRevenueUsd} revenue`} />
        <StatCard icon={<Hourglass className="w-5 h-5" />} label="Unpaid / in progress" value={o.unpaid} sub={`${o.PENDING} pending · ${o.DETECTED} detected`} tone="butter" />
        <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="Paid orders" value={o.PAID} sub={`${o.UNDERPAID} underpaid`} tone="green" />
        <StatCard icon={<XCircle className="w-5 h-5" />} label="Expired orders" value={o.EXPIRED} sub={`${o.CANCELLED} cancelled`} tone="red" />
      </div>

      {/* 💳 ردیف خلاصهٔ پرداخت‌های دستی (فاز ۵۹) — کلیک = باز شدن تب Payments با فیلتر مقصد */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <PaymentStatCard
          icon={<ReceiptText className="w-5 h-5" />}
          label={a.statPendingReviews}
          value={o.pendingReview ?? 0}
          tone="sage"
          clickable={!!onOpenPayments}
          onClick={() => onOpenPayments?.('receipt_submitted')}
        />
        <PaymentStatCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          label={a.statApprovedPayments}
          value={o.approved ?? 0}
          tone="green"
          clickable={!!onOpenPayments}
          onClick={() => onOpenPayments?.('approved')}
        />
        <PaymentStatCard
          icon={<XCircle className="w-5 h-5" />}
          label={a.statRejectedPayments}
          value={o.rejected ?? 0}
          tone="peach"
          clickable={!!onOpenPayments}
          onClick={() => onOpenPayments?.('rejected')}
        />
        <PaymentStatCard
          icon={<Hourglass className="w-5 h-5" />}
          label={a.statUnpaidOrders}
          value={o.unpaid}
          tone="butter"
          clickable={!!onOpenPayments}
          onClick={() => onOpenPayments?.('unpaid')}
        />
      </div>

      {/* ردیف محتوا */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Active classes" value={`${data.courses.active}/${data.courses.total}`} />
        <StatCard icon={<TicketPercent className="w-5 h-5" />} label="Discount codes" value={`${data.discounts.active}/${data.discounts.total}`} sub="active / total" tone="butter" />
        <StatCard icon={<Clock className="w-5 h-5" />} label="Stats generated" value={fmtDateTime(data.generatedAt)} tone="peach" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* آخرین سفارش‌ها */}
        <section className="bg-white rounded-2xl border border-sage-light/20 p-4" aria-label="Recent orders">
          <h3 className="text-sm font-bold text-brown-dark mb-3 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-sage-dark" /> Recent orders
          </h3>
          {data.recentOrders.length === 0 ? (
            <p className="text-xs text-brown-light py-6 text-center">No orders yet.</p>
          ) : (
            <ul className="space-y-2 max-h-80 overflow-y-auto pr-1 ct-scroll-area">
              {data.recentOrders.map((r) => (
                <li key={r.ref} className="bg-cream/50 border border-sage-light/20 rounded-xl px-3 py-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono font-bold text-brown-dark">{r.ref}</span>
                    {(() => {
                      const ob = orderStatusBadge(r.status)
                      return (
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${ob.cls}`}>{ob.label}</span>
                      )
                    })()}
                    <span className="ml-auto text-xs font-bold text-brown-dark tabular-nums">${r.amountUsd} USD</span>
                  </div>
                  <p className="text-[11px] text-brown-light mt-1 truncate">
                    {r.productTitle} · {r.contactEmail}
                  </p>
                  <p className="text-[10px] text-brown-light/70">{fmtDateTime(r.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* آخرین ثبت‌نام‌ها */}
        <section className="bg-white rounded-2xl border border-sage-light/20 p-4" aria-label="Recent registrations">
          <h3 className="text-sm font-bold text-brown-dark mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-sage-dark" /> Recent registrations
          </h3>
          {data.recentRegistrations.length === 0 ? (
            <p className="text-xs text-brown-light py-6 text-center">No registered users yet.</p>
          ) : (
            <ul className="space-y-2 max-h-80 overflow-y-auto pr-1 ct-scroll-area">
              {data.recentRegistrations.map((u) => (
                <li key={u.id} className="bg-cream/50 border border-sage-light/20 rounded-xl px-3 py-2.5 flex flex-wrap items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-brown-dark truncate">{u.name}</p>
                    <p className="text-[11px] text-brown-light truncate">{u.email}</p>
                  </div>
                  <span className="text-[11px] text-brown-light">{u.country}</span>
                  <span className="text-[10px] text-brown-light/70">{fmtDateTime(u.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <p className="text-[11px] text-brown-light/70 mt-4 flex items-center gap-1.5">
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3 cursor-pointer" onClick={load} />}
        All numbers are computed live from the database on every view.
      </p>
    </div>
  )
}
