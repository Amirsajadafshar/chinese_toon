'use client'

// ---------------------------------------------------------------------------
// 💳 صفحهٔ پرداخت دستی کارت بانکی — /pay/<ref> (یا /pay/new?product=<id>)
// (فاز ۵۹ — جایگزین کامل صفحهٔ USDT؛ جریان: سفارش → کارت بانکی → واریز دقیق
//  مبلغ نهایی → آپلود رسید → بررسی ادمین → تأیید/ردّ)
//
// طراحی هم‌زبان بقیهٔ سایت: باند کرم + کاراکتر محو 币 + کارت سفید + لهجهٔ سیج.
// مبلغ هرگز از مرورگر محاسبه نمی‌شود — ریزِ قیمت از پیش‌نمایش سرور و اسنپ‌شات
// سفارش می‌آید. وضعیت هر ۱۵ ثانیه از سرور پرسیده می‌شود (پاسخ انسانی ادمین).
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  BadgeCheck,
  Banknote,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  FileText,
  Loader2,
  Lock,
  RefreshCw,
  ShieldCheck,
  TicketPercent,
  TriangleAlert,
  UserRound,
  XCircle,
  ArrowLeft,
} from 'lucide-react'
import { siteContent, PageKey } from '@/content/site-content'
import { useUser } from '@/lib/user-store'
import { ReceiptUploader } from '@/components/site/ReceiptUploader'
import { useSite } from '@/components/site/site-shell'

const p = siteContent.payments.ui
const a = siteContent.account // 🔒 متن‌های دروازهٔ حساب

/** وضعیت‌های در جریان — polling تا خروج از این‌ها ادامه دارد */
const OPEN_STATUSES: readonly string[] = ['PENDING', 'RECEIPT_SUBMITTED']

interface OrderView {
  ref: string
  status: string
  productTitle: string
  productLabel: string
  amountUsd: string
  baseAmount?: string | null
  tierPercent?: number | null
  discountCode?: string | null
  discountAmount?: string | null
  discountType?: string | null
  discountValue?: string | null
  currency: string
  network: string
  expiresAt: string
  createdAt: string
  paidAt: string | null
  paymentMethod?: string
  receiptStatus?: string | null
  receiptSubmittedAt?: string | null
  rejectionReason?: string | null
  receiptUrl?: string | null
  reviewedAt?: string | null
}

interface BankCardView {
  enabled: boolean
  cardNumber: string
  cardHolder: string
  bankName: string
  instructions: string
}

interface CheckoutPageProps {
  orderRef: string // خالی = حالت سفارش جدید
  initialProductId?: string
  onNavigate: (page: PageKey) => void
  /** ناوبری روت واقعی — back و گیت حساب (فاز SEO) */
  go: (path: string) => void
  replace: (path: string) => void
}

/** نمایش شمارهٔ کارت در گروه‌های ۴تایی فقط برای خوانایی — مقدار واقعی عوض نمی‌شود */
function formatCardNumber(raw: string): string {
  const digits = (raw || '').replace(/[^\d]/g, '')
  if (!digits) return ''
  return digits.replace(/(.{4})/g, '$1 ').trim()
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return iso
  }
}

// 🔁 تعویض بی‌صدای مسیر بدون افزودن ورودی جدید به history مرورگر.
// قبلاً ساخت سفارش با push انجام می‌شد و «/pay/new» در history می‌ماند؛ نتیجه:
// دکمهٔ Back مرورگر به pay/new برمی‌گشت و component دوباره mount و یک سفارش
// تکراری می‌ساخت. با replace مسیر pay/new خودش به pay/<ref> تبدیل می‌شود.

// ---------------------------------------------------------------------------
// بلوک‌های نمایشی کوچک
// ---------------------------------------------------------------------------

function CheckoutShell({ children }: { children: React.ReactNode }) {
  return (
    // 📐 فاز ۶۲ — هدر «fixed» است و بقیهٔ صفحات (Home/Classes) با pt-32/md:pt-40
    // زیرش جا باز می‌کنند؛ چک‌اوت فقط py-10 داشت → کارت زیر هدر می‌رفت
    // («صفحه‌بندی داخل هم می‌رود»). هم‌تراز با بقیهٔ سایت + بستهٔ محتوایی روی
    // واترمارک 币 (چون absolute بدون z-index روی پس‌زمینهٔ کارت‌ها نقاشی می‌شد).
    <div className="min-h-[70vh] bg-cream pt-32 pb-16 px-4 md:pt-40 md:pb-20">
      <div className="max-w-2xl mx-auto relative">
        {/* کاراکتر محو 币 — هم‌زبان بقیهٔ سایت (زیرِ محتوا، دکوراتیو) */}
        <div aria-hidden className="pointer-events-none select-none absolute -top-6 -right-2 text-[9rem] leading-none text-brown-dark/5 font-bold">
          币
        </div>
        <div className="relative z-10">{children}</div>
      </div>
    </div>
  )
}

function EmptyState({ icon, title, action }: { icon: React.ReactNode; title: string; action?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-3xl border border-sage-light/20 shadow-lg p-10 text-center animate-ct-fadeInUp">
      <div className="flex justify-center mb-4">{icon}</div>
      <p className="text-brown-light text-sm mb-6">{title}</p>
      {action}
    </div>
  )
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mb-4 inline-flex items-center gap-2 text-sm text-brown-light hover:text-brown-dark transition-colors cursor-pointer"
    >
      <ArrowLeft className="w-4 h-4" /> {p.backButton}
    </button>
  )
}

/**
 * خلاصهٔ سفارش — 💰 فاز ۶۰: مبلغِ اصلی و برجسته همیشه «مبلغ نهایی» است
 * (order.amountUsd = اسنپ‌شات سرور expectedMicro). مبلغ اصلی/تخفیف‌ها فقط
 * به‌عنوان ریزِ اطلاعاتی زیر آن می‌آیند — هیچ صفحه‌ای مبلغِ اولیه را به‌عنوان
 * «مبلغ قابل‌پرداخت» نشان نمی‌دهد (بند ۲ و ۲۴ تسک).
 */
function SummaryCard({ order }: { order: OrderView }) {
  const hasBreakdown = order.baseAmount != null
  const hasTier = hasBreakdown && !!order.tierPercent && order.tierPercent > 0
  const tierAmount = hasTier ? Number(order.baseAmount) * (order.tierPercent! / 100) : 0
  const hasCode = !!order.discountCode && !!order.discountAmount && Number(order.discountAmount) > 0
  const rows: Array<{ label: string; value: React.ReactNode }> = [
    { label: p.orderIdLabel, value: <span className="font-mono font-bold text-brown-dark">{order.ref}</span> },
    { label: p.productLabel, value: order.productLabel || order.productTitle },
  ]
  if (hasBreakdown) {
    rows.push({
      label: p.originalPrice,
      value: <span className="text-brown">${Number(order.baseAmount).toFixed(2)} USD</span>,
    })
  }
  if (hasTier) {
    rows.push({
      label: `${p.packageDiscount} (${order.tierPercent}%)`,
      value: <span className="text-sage-dark">−${tierAmount.toFixed(2)} USD</span>,
    })
  }
  if (hasCode) {
    rows.push({
      label: `${p.codeDiscountLabel} (${order.discountCode})`,
      value: <span className="text-sage-dark">−${Number(order.discountAmount).toFixed(2)} USD</span>,
    })
  }
  return (
    <div className="bg-white rounded-3xl border border-sage-light/20 shadow-lg p-6 md:p-8">
      <h3 className="font-bold text-brown-dark mb-4">{p.summaryTitle}</h3>
      <dl className="space-y-2.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-4 text-sm">
            <dt className="text-brown-light">{r.label}</dt>
            <dd className="text-brown text-right">{r.value}</dd>
          </div>
        ))}
        {/* 💰 مبلغ نهایی — تنها مبلغی که مشتری باید بپردازد؛ همیشه از سرور */}
        <div className="flex items-center justify-between gap-4 border-t border-sage-light/50 pt-3 mt-1">
          <dt className="font-bold text-brown-dark">{p.finalAmountLabel}</dt>
          <dd className="text-xl font-extrabold text-sage-dark tabular-nums">${order.amountUsd} USD</dd>
        </div>
        <div className="flex items-center justify-between gap-4 text-sm">
          <dt className="text-brown-light">{p.methodLabel}</dt>
          <dd className="text-brown text-right">
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <CreditCard className="w-3.5 h-3.5 text-sage-dark" /> {p.methodManual}
            </span>
          </dd>
        </div>
      </dl>
    </div>
  )
}

/** ریزِ مبلغ سفارش — فقط از اسنپ‌شاتِ سرور (سفارش‌های قدیمی بدون اسنپ‌شات فقط مبلغ نهایی دارند) */
function AmountBreakdown({ order }: { order: OrderView }) {
  const hasBreakdown = order.baseAmount != null
  const hasCode = !!order.discountCode && !!order.discountAmount && Number(order.discountAmount) > 0
  return (
    <div className="bg-sage-light/20 border border-sage-light/40 rounded-2xl p-5">
      <h3 className="text-xs font-bold uppercase tracking-wider text-brown-light mb-3">{p.amountBreakdownTitle}</h3>
      <div className="space-y-2 text-sm">
        {hasBreakdown && (
          <>
            <div className="flex justify-between">
              <span className="text-brown-light">{p.originalPrice}</span>
              <span className="text-brown">{Number(order.baseAmount).toFixed(2)} USD</span>
            </div>
            {!!order.tierPercent && order.tierPercent > 0 && (
              <div className="flex justify-between">
                <span className="text-brown-light">{p.packageDiscount}</span>
                <span className="text-sage-dark">
                  {order.tierPercent}% (−${(Number(order.baseAmount) * (order.tierPercent / 100)).toFixed(2)} USD)
                </span>
              </div>
            )}
          </>
        )}
        {hasCode && (
          <div className="flex justify-between">
            <span className="text-brown-light">
              {p.codeDiscountLabel} ({order.discountCode})
            </span>
            <span className="text-sage-dark font-semibold">−${Number(order.discountAmount).toFixed(2)} USD</span>
          </div>
        )}
        <div className="flex justify-between items-center border-t border-sage-light/50 pt-2.5 mt-1">
          <span className="font-bold text-brown-dark">{p.finalAmountLabel}</span>
          <span className="text-xl font-extrabold text-sage-dark">${order.amountUsd} USD</span>
        </div>
      </div>
    </div>
  )
}

/** کارت اطلاعات بانکی — از تنظیمات ادمین (DB)؛ شمارهٔ کارت + دکمهٔ کپی */
function BankCardPanel({ bank }: { bank: BankCardView }) {
  const [copied, setCopied] = useState(false)
  const display = formatCardNumber(bank.cardNumber)

  const copyCard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText((bank.cardNumber || '').replace(/[^\d]/g, ''))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // بدون clipboard — کاربر می‌تواند دستی بخواند
    }
  }, [bank.cardNumber])

  return (
    <div className="bg-white rounded-3xl border border-sage-light/20 shadow-lg p-6 md:p-8 animate-ct-fadeInUp">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-sage-light/30 flex items-center justify-center shrink-0">
          <CreditCard className="w-5 h-5 text-sage-dark" />
        </div>
        <h3 className="font-bold text-brown-dark">{p.cardSectionTitle}</h3>
      </div>

      <p className="text-sm text-brown-light leading-relaxed mb-5">{p.paySubtitle}</p>

      {/* شمارهٔ کارت — بزرگ و قابل‌کپی */}
      <div className="rounded-2xl border-2 border-sage-light/50 bg-gradient-to-br from-cream to-white p-5 mb-4">
        <p className="text-[11px] uppercase tracking-wider text-brown-light mb-1.5">{p.cardNumberLabel}</p>
        <p className="font-mono text-2xl md:text-3xl font-bold tracking-wider text-brown-dark break-all" dir="ltr">
          {display}
        </p>
        <button
          type="button"
          onClick={copyCard}
          className="mt-3 inline-flex items-center gap-2 bg-sage text-brown-dark px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-sage-dark transition-colors cursor-pointer min-h-[44px]"
        >
          {copied ? <BadgeCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? p.copied : p.copyCard}
        </button>
      </div>

      {/* صاحب کارت / بانک */}
      <div className="grid sm:grid-cols-2 gap-3">
        {bank.cardHolder && (
          <div className="rounded-xl border border-sage-light/30 bg-cream/40 p-3.5">
            <p className="text-[11px] uppercase tracking-wider text-brown-light mb-1">{p.cardHolderLabel}</p>
            <p className="font-semibold text-brown-dark" dir="auto">{bank.cardHolder}</p>
          </div>
        )}
        {bank.bankName && (
          <div className="rounded-xl border border-sage-light/30 bg-cream/40 p-3.5">
            <p className="text-[11px] uppercase tracking-wider text-brown-light mb-1">{p.bankLabel}</p>
            <p className="font-semibold text-brown-dark" dir="auto">{bank.bankName}</p>
          </div>
        )}
      </div>

      {bank.instructions && (
        <div className="mt-3 rounded-xl border border-sage-light/30 bg-sage-light/10 p-3.5 text-sm text-brown leading-relaxed" dir="auto">
          <span className="font-bold text-brown-dark">{p.instructionsLabel}: </span>
          {bank.instructions}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// صفحهٔ اصلی
// ---------------------------------------------------------------------------

export function CheckoutPage({ orderRef, initialProductId, onNavigate, go, replace }: CheckoutPageProps) {
  const [order, setOrder] = useState<OrderView | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [configError, setConfigError] = useState('')
  const [checking, setChecking] = useState(false)
  const [bank, setBank] = useState<BankCardView | null>(null)

  // 🎟️ مرحلهٔ چک‌اوت: پیش‌نمایش قیمت سمت سرور + کد تخفیف، قبل از پرداخت
  interface PricingBreakdown {
    pricePerSession: number
    sessions: number
    base: number
    tierPercent: number
    tierDiscount: number
    code: string | null
    codeType: string | null
    codeValue: number | null
    codeDiscount: number
    final: number
  }
  const [pricing, setPricing] = useState<PricingBreakdown | null>(null)
  const [codeInput, setCodeInput] = useState('')
  const [appliedCode, setAppliedCode] = useState<string | null>(null)
  const [pricingBusy, setPricingBusy] = useState(false) // ضد Apply سریع پشت‌سرهم
  const [codeError, setCodeError] = useState('')
  const [creating, setCreating] = useState(false)

  // 🎓 فاز ۶۲ — مشخصات دورهٔ انتخاب‌شده (درخواست مالک: «هر دوره‌ای که انتخاب کرد
  // مشخصات همان دوره را نشان بده») — از کاتالوگ عمومی سرور، best-effort
  interface CourseBrief {
    title: string
    type: string
    level: string
    schedule: string
    status: string
  }
  const [course, setCourse] = useState<CourseBrief | null>(null)

  // 🔒 دروازهٔ حساب — فقط حالت سفارشِ جدید گیت می‌شود؛ سفارشِ موجود هرگز گیت
  // نمی‌شود تا صفحهٔ وضعیت پرداخت قبلی همیشه باز بماند
  const { loading: userLoading, user } = useUser()
  const gated = !orderRef && !userLoading && !user

  /** تازه‌سازی وضعیت سفارش — بعد از آپلود موفق رسید و دکمهٔ Refresh هم صدا زده می‌شود */
  const refreshOrder = useCallback(async () => {
    if (!orderRef) return
    setChecking(true)
    try {
      const res = await fetch(`/api/payments/orders/${encodeURIComponent(orderRef)}`, { cache: 'no-store' })
      if (res.status === 404) {
        setNotFound(true)
        return
      }
      const data = await res.json().catch(() => null)
      if (data?.order) {
        setOrder(data.order as OrderView)
        setNotFound(false)
      }
    } catch {
      // خطای شبکهٔ زودگذر — دور بعدی دوباره تلاش می‌کند
    } finally {
      setChecking(false)
    }
  }, [orderRef])

  const validatePricing = useCallback(
    async (code: string | null): Promise<{ pricing: PricingBreakdown; rejected?: string | null } | null> => {
      if (!initialProductId) return null
      try {
        const res = await fetch('/api/discounts/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: initialProductId, ...(code ? { code } : {}) }),
        })
        const data = await res.json().catch(() => null)
        if (!res.ok || !data?.pricing) return null
        return { pricing: data.pricing as PricingBreakdown, rejected: data.codeRejected ?? null }
      } catch {
        return null
      }
    },
    [initialProductId]
  )

  // پیش‌نمایش اولیه چک‌اوت — کدِ ذخیره‌شده از صفحهٔ کلاس‌ها هم اعتبارسنجی و اعمال می‌شود
  useEffect(() => {
    if (orderRef || !initialProductId) return
    if (userLoading || gated) return
    let cancelled = false
    ;(async () => {
      let storedCode: string | null = null
      try {
        storedCode = sessionStorage.getItem('ct_discount_code')
      } catch {
        /* */
      }
      // 🎓 مشخصات دوره — هم‌زمان با اعتبارسنجی قیمت (best-effort، مسدودکننده نیست)
      try {
        const cres = await fetch('/api/classes', { cache: 'no-store' })
        const cdata = await cres.json().catch(() => null)
        const found = Array.isArray(cdata?.classes)
          ? (cdata.classes as Array<{ productId?: string | null; title?: string; type?: string; level?: string; schedule?: string; status?: string }>).find(
              (c) => c.productId === initialProductId
            )
          : null
        if (!cancelled && found?.title) {
          setCourse({
            title: found.title,
            type: found.type || '',
            level: found.level || '',
            schedule: found.schedule || '',
            status: found.status || '',
          })
        }
      } catch {
        /* بدون مشخصات هم جریان ادامه دارد */
      }
      const price = await validatePricing(storedCode)
      if (cancelled) return
      setLoading(false)
      if (!price) {
        setConfigError(p.badProduct)
        return
      }
      setPricing(price.pricing)
      if (storedCode && price.pricing.code && price.pricing.codeDiscount > 0) {
        setAppliedCode(price.pricing.code)
        setCodeInput(price.pricing.code)
      } else if (storedCode) {
        // کد ذخیره‌شده دیگر معتبر نیست — پاک می‌شود تا کاربر بداند
        try {
          sessionStorage.removeItem('ct_discount_code')
        } catch {
          /* */
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [orderRef, initialProductId, userLoading, gated, validatePricing])

  /** Apply — اعتبارسنجی کامل سمت سرور؛ مبلغ هرگز از مرورگر نمی‌آید */
  const applyCode = async () => {
    const trimmed = codeInput.trim().toUpperCase()
    if (!trimmed || pricingBusy || creating) return
    setPricingBusy(true)
    setCodeError('')
    const price = await validatePricing(trimmed)
    setPricingBusy(false)
    if (!price) {
      setCodeError(p.codeInvalid)
      return
    }
    if (price.pricing.code && price.pricing.codeDiscount > 0 && price.pricing.code === trimmed) {
      setPricing(price.pricing)
      setAppliedCode(price.pricing.code)
      setCodeInput(price.pricing.code)
      try {
        sessionStorage.setItem('ct_discount_code', price.pricing.code)
      } catch {
        /* */
      }
    } else {
      // ⛔ نامعتبر — پیام شفاف بر اساس دلیل رد سمت سرور
      setCodeError((price.rejected && p.codeRejected[price.rejected]) || p.codeInvalid)
    }
  }

  /** Remove — حذف کد و محاسبهٔ دوبارهٔ مبلغ سمت سرور */
  const removeCode = async () => {
    if (pricingBusy || creating) return
    setPricingBusy(true)
    setCodeError('')
    const price = await validatePricing(null)
    setPricingBusy(false)
    setAppliedCode(null)
    setCodeInput('')
    try {
      sessionStorage.removeItem('ct_discount_code')
    } catch {
      /* */
    }
    if (price) setPricing(price.pricing)
  }

  /** Continue to Payment — ساخت سفارش با مبلغ نهاییِ تأییدشدهٔ سرور */
  const continueToPayment = async () => {
    if (!initialProductId || creating || pricingBusy) return
    setCreating(true)
    setConfigError('')
    try {
      const res = await fetch('/api/payments/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: initialProductId, discountCode: appliedCode }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.order) {
        setOrder(data.order as OrderView)
        setConfigError('')
        // 🎟️ کد مصرف شد — از حافظهٔ نشست پاک می‌شود تا سفارش بعدی بدون کد ساخته شود
        try {
          sessionStorage.removeItem('ct_discount_code')
        } catch {
          /* */
        }
        // 🔁 ورودی pay/new در history با ‎#/pay/<ref> جایگزین می‌شود (ضد Back-سفارش تکراری)
        replace(`/pay/${data.order.ref}`)
      } else if (res.status === 503) {
        setConfigError(p.notConfigured)
      } else if (data?.code === 'BAD_PRODUCT') {
        setConfigError(p.badProduct)
      } else if (data?.code === 'CODE_EXHAUSTED') {
        // کد بین Apply و Continue تمام/منقضی شد — شفاف اعلام و ریزِ قیمت تازه می‌شود
        try {
          sessionStorage.removeItem('ct_discount_code')
        } catch {
          /* */
        }
        setAppliedCode(null)
        setCodeInput('')
        setCodeError(data?.error || p.codeInvalid)
        const price = await validatePricing(null)
        if (price) setPricing(price.pricing)
      } else {
        setConfigError(data?.error || p.notFound)
      }
    } catch {
      setConfigError(p.notFound)
    } finally {
      setCreating(false)
    }
  }

  // 🔄 بارگذاری اولیهٔ سفارش موجود + polling سبک (۱۵ ثانیه) فقط تا وقتی سفارش «باز» است
  useEffect(() => {
    if (!orderRef) return
    let alive = true
    let iv: ReturnType<typeof setInterval> | null = null
    const stop = () => {
      if (iv) {
        clearInterval(iv)
        iv = null
      }
    }
    const poll = async () => {
      setChecking(true)
      try {
        const res = await fetch(`/api/payments/orders/${encodeURIComponent(orderRef)}`, { cache: 'no-store' })
        if (!alive) return
        if (res.status === 404) {
          setNotFound(true)
          stop()
          return
        }
        const data = await res.json().catch(() => null)
        if (alive && data?.order) {
          setOrder(data.order as OrderView)
          setNotFound(false)
          // وضعیت بسته (تأیید/ردّ/لغو/انقضا) دیگر تغییر نمی‌کند — توقف polling
          if (!OPEN_STATUSES.includes((data.order as OrderView).status)) stop()
        }
      } catch {
        // خطای شبکهٔ زودگذر
      } finally {
        if (alive) setChecking(false)
      }
    }
    poll()
    iv = setInterval(poll, 15_000)
    return () => {
      alive = false
      stop()
    }
  }, [orderRef])

  // 💳 تنظیمات کارت — فقط وقتی سفارشِ دستی در جریان پرداخت/ارسال دوباره است
  useEffect(() => {
    const status = order?.status
    const isManual = order?.paymentMethod !== 'USDT_TRON' // سفارش‌های جدید همیشه دستی‌اند
    if (!order || !isManual || (status !== 'PENDING' && status !== 'REJECTED')) {
      setBank(null)
      return
    }
    let alive = true
    ;(async () => {
      try {
        const res = await fetch('/api/payment-settings', { cache: 'no-store' })
        const data = await res.json().catch(() => null)
        if (alive && data?.settings) setBank(data.settings as BankCardView)
      } catch {
        /* تنظیمات نارسید — کارت بی‌بخش می‌ماند */
      }
    })()
    return () => {
      alive = false
    }
  }, [order])

  // 🔙 بازگشت از صفحهٔ پرداخت — منطق واقعی ناوبری (نه فقط مخفی‌کردن دکمه)
  const goBack = useCallback(() => {
    let origin = ''
    try {
      origin = sessionStorage.getItem('ct-pay-origin') || ''
    } catch {
      origin = ''
    }
    const current = window.location.pathname + window.location.search
    if (origin.startsWith('/') && !origin.startsWith('/pay') && origin !== current) {
      go(origin)
      return
    }
    go('/classes')
  }, [go])

  const status = order?.status ?? 'PENDING'
  const isLegacyUsdt = order?.paymentMethod === 'USDT_TRON'

  // ---------------------------------------------------------------
  //  حالت‌های خاص
  // ---------------------------------------------------------------

  // ⏳ تا مشخص شدن وضعیت کاربر، در حالت سفارشِ جدید چیزی اضافه نشان نمی‌دهیم (بدون فلش)
  if (!orderRef && userLoading) {
    return (
      <CheckoutShell>
        <div className="bg-white rounded-3xl border border-sage-light/20 shadow-lg p-10 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-sage-dark" />
          <p className="text-sm text-brown-light">{p.loading}</p>
        </div>
      </CheckoutShell>
    )
  }

  // 🔒 دروازهٔ حساب — خرید فقط با حساب کاربری؛ دکمه‌ها مقصد را ذخیره می‌کنند تا بعد از
  // ورود/ثبت‌نام به همین صفحه برگردیم (هماهنگ با AccountPage)
  if (gated) {
    const continueToAccount = () => {
      try {
        sessionStorage.setItem('ct-pay-redirect', window.location.pathname + window.location.search)
      } catch {
        // بدون حافظه فقط به صفحهٔ حساب می‌رویم
      }
      replace('/account')
    }
    return (
      <CheckoutShell>
        <BackButton onClick={goBack} />
        <div className="bg-white rounded-3xl border border-sage-light/20 shadow-lg p-8 md:p-10 text-center animate-ct-fadeInUp">
          <div className="w-20 h-20 rounded-full bg-sage-light/30 mx-auto mb-6 flex items-center justify-center">
            <Lock className="w-9 h-9 text-sage-dark" />
          </div>
          <h2 className="text-2xl font-bold text-brown-dark mb-3">{a.gateTitle}</h2>
          <p className="text-brown-light text-sm max-w-md mx-auto mb-8 leading-relaxed">{a.gateText}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={continueToAccount}
              className="bg-sage text-brown-dark px-8 py-3.5 rounded-2xl text-sm font-bold hover:bg-sage-dark transition-colors cursor-pointer inline-flex items-center justify-center gap-2 min-h-[48px]"
            >
              <UserRound className="w-4 h-4" /> {a.gateRegister}
            </button>
            <button
              onClick={continueToAccount}
              className="px-8 py-3.5 rounded-2xl text-sm font-semibold text-brown border border-sage-light/50 bg-white/70 hover:border-sage transition-colors cursor-pointer inline-flex items-center justify-center min-h-[48px]"
            >
              {a.gateLogin}
            </button>
          </div>
        </div>
      </CheckoutShell>
    )
  }

  if (!orderRef && !initialProductId) {
    return (
      <CheckoutShell>
        <EmptyState icon={<Banknote className="w-10 h-10 text-sage-dark" />} title={p.notFound} />
      </CheckoutShell>
    )
  }

  if (notFound) {
    return (
      <CheckoutShell>
        <EmptyState
          icon={<XCircle className="w-10 h-10 text-brown-light" />}
          title={p.notFound}
          action={
            <button
              onClick={() => onNavigate('classes')}
              className="bg-sage text-brown-dark px-6 py-3 rounded-full text-sm font-semibold hover:bg-sage-dark transition-colors cursor-pointer inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> {p.newOrderButton}
            </button>
          }
        />
      </CheckoutShell>
    )
  }

  // ---------------------------------------------------------------
  //  حالت ۱ — سفارش جدید: بازبینی + کد تخفیف (قبل از ساخت سفارش)
  // ---------------------------------------------------------------
  if (!orderRef) {
    return (
      <CheckoutShell>
        <BackButton onClick={goBack} />
        <div className="bg-white rounded-3xl border border-sage-light/20 shadow-lg p-6 md:p-8 animate-ct-fadeInUp mb-5">
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="w-7 h-7 rounded-full bg-sage-dark text-white text-xs font-bold flex items-center justify-center">۱</span>
            <span className="text-sm font-bold text-brown-dark">{p.stageReview}</span>
            <span className="w-8 h-px bg-sage-light" />
            <span className="w-7 h-7 rounded-full border-2 border-sage-light text-brown-light text-xs font-bold flex items-center justify-center">۲</span>
            <span className="text-sm text-brown-light">Payment</span>
          </div>

          {configError && (
            <div role="alert" className="mb-5 rounded-2xl border border-peach/50 bg-peach/10 px-4 py-3 text-sm font-semibold text-peach-dark flex items-start gap-2">
              <TriangleAlert className="w-4 h-4 mt-0.5 shrink-0" /> {configError}
            </div>
          )}

          {!pricing ? (
            <div className="py-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3 text-sage-dark" />
              <p className="text-sm text-brown-light">{p.loading}</p>
            </div>
          ) : (
            <>
              {/* 🎓 مشخصات دورهٔ انتخاب‌شده — عنوان/نوع/سطح/برنامه از سرور */}
              {course && (
                <div className="mb-5 rounded-2xl border border-sage-light/40 bg-white/70 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-brown-light mb-1.5">Selected course</p>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="font-bold text-brown-dark truncate">{course.title}</h4>
                      <p className="text-xs text-brown mt-0.5">
                        {course.type}
                        {course.level ? ` · ${course.level}` : ''}
                      </p>
                    </div>
                    {course.status === 'full' && (
                      <span className="shrink-0 text-[10px] font-bold uppercase text-peach-dark bg-peach/15 border border-peach/40 rounded-full px-2.5 py-1">
                        Full
                      </span>
                    )}
                  </div>
                  {course.schedule && (
                    <p className="text-[11px] text-brown-light mt-1.5" dir="auto">
                      {course.schedule}
                    </p>
                  )}
                </div>
              )}
              {/* ریزِ قیمت — همهٔ اعداد از سرور */}
              <div className="bg-sage-light/20 border border-sage-light/40 rounded-2xl p-5 mb-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brown-light mb-3">{p.productLabel}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-brown-light">{p.originalPrice}</span>
                    <span className="text-brown">{pricing.base.toFixed(2)} USD</span>
                  </div>
                  <div className="flex justify-between text-[13px] text-brown-light">
                    <span>
                      {pricing.sessions} {pricing.sessions === 1 ? 'session' : 'sessions'} × ${pricing.pricePerSession.toFixed(2)}
                    </span>
                    <span />
                  </div>
                  {pricing.tierPercent > 0 && (
                    <div className="flex justify-between">
                      <span className="text-brown-light">{p.packageDiscount}</span>
                      <span className="text-sage-dark">
                        {pricing.tierPercent}% (−${pricing.tierDiscount.toFixed(2)} USD)
                      </span>
                    </div>
                  )}
                  {pricing.codeDiscount > 0 && pricing.code && (
                    <div className="flex justify-between">
                      <span className="text-brown-light">
                        {p.codeDiscountLabel} ({pricing.code})
                      </span>
                      <span className="text-sage-dark font-semibold">−${pricing.codeDiscount.toFixed(2)} USD</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center border-t border-sage-light/50 pt-2.5 mt-1">
                    <span className="font-bold text-brown-dark">{p.finalAmountLabel}</span>
                    <span className="text-xl font-extrabold text-sage-dark">${pricing.final.toFixed(2)} USD</span>
                  </div>
                </div>
                {/* 💰 فاز ۶۰ (بند ۱) — اعلام صریح مبلغ دقیق همان‌جا: مشتری از همین
                    صفحه می‌داند باید دقیقاً چقدر بپردازد (همان عددِ سرور) */}
                <div
                  className="mt-3 rounded-xl bg-sage-dark px-4 py-3 text-center text-sm font-bold text-white"
                  role="note"
                  aria-live="polite"
                >
                  {p.reviewPayExact.replace('{amount}', `$${pricing.final.toFixed(2)}`)}
                </div>
              </div>

              {/* کد تخفیف */}
              <div className="border border-dashed border-sage-light/70 rounded-2xl p-4 mb-5">
                <p className="text-sm font-semibold text-brown-dark mb-2 flex items-center gap-1.5">
                  <TicketPercent className="w-4 h-4 text-sage-dark" /> {p.codeHave}
                </p>
                {appliedCode ? (
                  <div className="flex items-center justify-between gap-3 bg-sage-light/20 rounded-xl px-4 py-2.5">
                    <span className="font-mono font-bold text-sage-dark">{appliedCode}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-brown-light hidden sm:inline">{p.codeApplied}</span>
                      <button
                        onClick={removeCode}
                        disabled={pricingBusy || creating}
                        className="text-xs font-semibold px-3 py-1.5 rounded-full border border-sage-light/60 hover:border-sage transition-colors cursor-pointer disabled:opacity-50 min-h-[32px]"
                      >
                        {p.codeRemove}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={codeInput}
                      onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') applyCode()
                      }}
                      placeholder={p.codePlaceholder}
                      maxLength={24}
                      dir="ltr"
                      aria-label={p.codeDiscountLabel}
                      className="flex-1 min-w-0 border border-sage-light/60 rounded-xl px-4 py-2.5 text-sm font-mono uppercase focus:outline-none focus:border-sage bg-white disabled:opacity-50"
                      disabled={pricingBusy || creating}
                    />
                    <button
                      onClick={applyCode}
                      disabled={pricingBusy || creating || !codeInput.trim()}
                      className="bg-sage-dark text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-sage-dark/90 transition-colors disabled:opacity-50 cursor-pointer min-h-[44px]"
                    >
                      {pricingBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : p.codeApply}
                    </button>
                  </div>
                )}
                {codeError && (
                  <p role="alert" className="mt-2 text-xs font-semibold text-peach-dark">
                    {codeError}
                  </p>
                )}
                <p className="mt-2 text-[11px] text-brown-light">{p.checkoutSecureNote}</p>
              </div>

              <button
                onClick={continueToPayment}
                disabled={creating || pricingBusy}
                className="w-full bg-sage text-brown-dark py-4 rounded-2xl text-sm font-bold hover:bg-sage-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer inline-flex items-center justify-center gap-2 min-h-[52px]"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                {creating ? p.creatingOrder : p.continuePayment}
              </button>
            </>
          )}
        </div>
      </CheckoutShell>
    )
  }

  // ---------------------------------------------------------------
  //  حالت ۲ — سفارشِ موجود: نمایش وضعیت واقعی
  // ---------------------------------------------------------------

  if (!order) {
    return (
      <CheckoutShell>
        <div className="bg-white rounded-3xl border border-sage-light/20 shadow-lg p-10 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-sage-dark" />
          <p className="text-sm text-brown-light">{p.loading}</p>
        </div>
      </CheckoutShell>
    )
  }

  // 🧊 سفارش‌های قدیمی جریان USDT — هیچ UI پرداختِ آنلاینی دیگر نشان داده نمی‌شود
  if (isLegacyUsdt && (status === 'PENDING' || status === 'DETECTED' || status === 'UNDERPAID')) {
    return (
      <CheckoutShell>
        <BackButton onClick={goBack} />
        <div className="bg-peach/10 border border-peach/40 rounded-3xl p-6 md:p-8 text-center animate-ct-fadeInUp mb-5">
          <TriangleAlert className="w-8 h-8 text-peach-dark mx-auto mb-3" />
          <p className="text-sm text-brown leading-relaxed">{p.legacyNote}</p>
        </div>
        <SummaryCard order={order} />
      </CheckoutShell>
    )
  }

  // ✅ تأییدشده توسط ادمین
  if (status === 'PAID') {
    return (
      <CheckoutShell>
        <BackButton onClick={goBack} />
        <div className="bg-white rounded-3xl border border-sage-light/20 shadow-lg p-8 md:p-10 text-center animate-ct-fadeInUp mb-5">
          <div className="w-20 h-20 rounded-full bg-sage-light/40 mx-auto mb-6 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-sage-dark" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-brown-dark mb-3">{p.approvedTitle}</h2>
          <p className="text-brown-light text-sm max-w-md mx-auto mb-4 leading-relaxed">{p.approvedNote}</p>
          <p className="font-mono font-bold text-brown-dark bg-cream/70 rounded-xl px-4 py-2 inline-block">{order.ref}</p>
        </div>
        <SummaryCard order={order} />
      </CheckoutShell>
    )
  }

  // ⏳ در انتظار بررسی ادمین
  if (status === 'RECEIPT_SUBMITTED') {
    return (
      <CheckoutShell>
        <BackButton onClick={goBack} />
        <div className="bg-white rounded-3xl border border-sage-light/20 shadow-lg p-8 md:p-10 text-center animate-ct-fadeInUp mb-5">
          <div className="w-20 h-20 rounded-full bg-sage-light/40 mx-auto mb-6 flex items-center justify-center">
            <Clock className="w-10 h-10 text-sage-dark" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-brown-dark mb-3">{p.underReviewTitle}</h2>
          <p className="text-brown-light text-sm max-w-md mx-auto mb-5 leading-relaxed">{p.underReviewNote}</p>
          <p className="inline-flex items-center gap-2 text-sm font-bold text-brown-dark bg-sage-light/25 border border-sage-light/50 rounded-full px-5 py-2">
            <span className="w-2 h-2 rounded-full bg-sage-dark animate-pulse" />
            {p.statusLabels.RECEIPT_SUBMITTED}
          </p>
          {order.receiptSubmittedAt && (
            <p className="text-[11px] text-brown-light mt-3">
              {p.submittedOn}: {formatDateTime(order.receiptSubmittedAt)}
            </p>
          )}
          {order.receiptUrl && (
            <a
              href={order.receiptUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-sage-dark hover:underline"
            >
              <FileText className="w-3.5 h-3.5" /> {p.viewReceipt}
            </a>
          )}
          <button
            onClick={refreshOrder}
            disabled={checking}
            className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-brown-light hover:text-brown-dark transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} /> Refresh status
          </button>
        </div>
        <SummaryCard order={order} />
      </CheckoutShell>
    )
  }

  // ⛔ ردّ شده — دلیل + ارسال دوبارهٔ رسید روی همان سفارش
  if (status === 'REJECTED') {
    return (
      <CheckoutShell>
        <BackButton onClick={goBack} />
        <div className="bg-white rounded-3xl border border-peach/40 shadow-lg p-6 md:p-8 animate-ct-fadeInUp mb-5">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-peach/20 flex items-center justify-center shrink-0">
              <XCircle className="w-5 h-5 text-peach-dark" />
            </div>
            <div>
              <h3 className="font-bold text-brown-dark">{p.rejectedTitle}</h3>
              {order.reviewedAt && (
                <p className="text-[11px] text-brown-light">{p.reviewedOn}: {formatDateTime(order.reviewedAt)}</p>
              )}
            </div>
          </div>
          {order.rejectionReason && (
            <div className="rounded-xl border border-peach/40 bg-peach/10 px-4 py-3 text-sm mb-3">
              <span className="font-bold text-peach-dark">{p.rejectedReasonLabel}: </span>
              <span className="text-brown" dir="auto">{order.rejectionReason}</span>
            </div>
          )}
          <p className="text-xs text-brown-light leading-relaxed">{p.rejectedNote}</p>
        </div>
        <div className="space-y-5">
          <AmountBreakdown order={order} />
          {bank?.enabled && <BankCardPanel bank={bank} />}
          <ReceiptUploader orderRef={order.ref} onSubmitted={refreshOrder} />
        </div>
      </CheckoutShell>
    )
  }

  // 🧊 منقضی/لغوشده
  if (status === 'EXPIRED' || status === 'CANCELLED') {
    return (
      <CheckoutShell>
        <BackButton onClick={goBack} />
        <EmptyState
          icon={<XCircle className="w-10 h-10 text-brown-light" />}
          title={status === 'EXPIRED' ? p.expiredNote : p.cancelledNote}
          action={
            <button
              onClick={() => onNavigate('classes')}
              className="bg-sage text-brown-dark px-6 py-3 rounded-full text-sm font-semibold hover:bg-sage-dark transition-colors cursor-pointer inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> {p.newOrderButton}
            </button>
          }
        />
      </CheckoutShell>
    )
  }

  // 💳 وضعیت PENDING — صفحهٔ اصلی پرداخت: مبلغ + کارت بانکی + آپلود رسید
  return (
    <CheckoutShell>
      <BackButton onClick={goBack} />
      <div className="bg-white rounded-3xl border border-sage-light/20 shadow-lg p-6 md:p-8 animate-ct-fadeInUp mb-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-sage-light/30 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-sage-dark" />
          </div>
          <div>
            <h2 className="font-bold text-brown-dark">{p.payTitle}</h2>
            <p className="font-mono text-[11px] text-brown-light">{order.ref}</p>
          </div>
        </div>
        <AmountBreakdown order={order} />
        <p className="mt-4 text-sm font-semibold text-brown-dark bg-cream/70 border border-sage-light/30 rounded-xl px-4 py-3 text-center">
          {p.transferExact.replace('{amount}', `$${order.amountUsd}`)}
        </p>
        <p className="mt-3 text-[11px] text-brown-light text-center flex items-center justify-center gap-1.5">
          <Clock className="w-3 h-3" />
          {p.payExpiryNote.replace('{date}', formatDateTime(order.expiresAt))}
        </p>
      </div>

      {bank === null ? (
        <div className="bg-white rounded-3xl border border-sage-light/20 shadow-lg p-8 text-center mb-5">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3 text-sage-dark" />
          <p className="text-sm text-brown-light">{p.loading}</p>
        </div>
      ) : bank.enabled ? (
        <div className="space-y-5">
          <BankCardPanel bank={bank} />
          <ReceiptUploader orderRef={order.ref} onSubmitted={refreshOrder} />
        </div>
      ) : (
        <div className="bg-peach/10 border border-peach/40 rounded-3xl p-6 text-center">
          <TriangleAlert className="w-6 h-6 text-peach-dark mx-auto mb-2" />
          <p className="text-sm text-brown leading-relaxed">{p.notConfigured}</p>
        </div>
      )}
    </CheckoutShell>
  )
}
