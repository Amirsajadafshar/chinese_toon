'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { ArrowRight, BookOpen, CalendarDays, Check, Clock, Globe2, Info, Loader2, Lock, TicketPercent, TriangleAlert, UserRound, Wallet, X } from 'lucide-react'
import { appNavigate } from '@/lib/nav'
import { siteContent } from '@/content/site-content'
import { useUser } from '@/lib/user-store'
import { SUPPORTED_TIMEZONES, timezoneLabel } from '@/lib/timezones'
import { WEEKDAY_KEYS, WEEKDAY_LABELS, type Weekday } from '@/lib/schedule'

// ساعت‌های مجاز انتخاب — شبکهٔ ساعتی ۰۶:۰۰ تا ۲۳:۰۰ (گذر نیمه‌شب = پایان ≤ شروع)
const TIME_OPTIONS = Array.from({ length: 18 }, (_, i) => `${String(6 + i).padStart(2, '0')}:00`)
const REGIONS = [...new Set(SUPPORTED_TIMEZONES.map((t) => t.region))]

const c = siteContent.register

// ---------------------------------------------------------------------
// 🔒 نوع کلاس از «تنظیمات خود کلاس» خوانده می‌شود — وقتی کاربر یک کلاس
// مشخص را انتخاب کرده (مثلاً از صفحهٔ کلاس‌ها یا نتیجهٔ آزمون)، دیگر اجازه
// ندارد نوع کلاس را به خصوصی/گروهی عوض کند؛ این فیلد فقط نمایشی است.
// ---------------------------------------------------------------------
const classItems = siteContent.classes.items

function normalizeTitle(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function findClassByTitle(title: string | null) {
  if (!title) return undefined
  const n = normalizeTitle(title)
  if (!n) return undefined
  return (
    classItems.find((it) => normalizeTitle(it.title) === n) ??
    classItems.find((it) => {
      const m = normalizeTitle(it.title)
      return m.startsWith(n) || n.startsWith(m)
    })
  )
}

function classTypeKeyFor(type: string): 'group' | 'private' | 'both' {
  const t = type.toLowerCase()
  if (t.includes('private') && t.includes('group')) return 'both'
  if (t.includes('private')) return 'private'
  return 'group'
}

// 🧭 مبدأ ورود به جریان پرداخت — صفحهٔ پرداخت برای دکمهٔ Back از آن استفاده می‌کند
// (Back باید به «صفحه‌ای که پرداخت از آن شروع شد» برگردد — اینجا صفحهٔ ثبت‌نام)
function rememberPayOrigin() {
  try {
    const path = window.location.pathname + window.location.search
    if (path.startsWith('/') && !path.startsWith('/pay')) {
      sessionStorage.setItem('ct-pay-origin', path)
    }
  } catch {
    // بی‌اهمیت — صفحهٔ پرداخت در نبود مبدأ، fallback امن دارد
  }
}

const inputCls =
  'w-full px-4 py-3 rounded-xl border border-sage-light/40 bg-cream/50 text-brown placeholder:text-brown-light/50 text-sm focus:outline-none focus:border-sage focus:ring-[3px] focus:ring-sage/20 transition-all'

const labelCls = 'block text-sm font-medium text-brown-dark mb-2'

// ---------------------------------------------------------------------
//  کلاس انتخاب‌شده (وقتی کاربر از دکمهٔ Register صفحهٔ کلاس‌ها/آزمون می‌آید)
//  در sessionStorage ذخیره می‌شود و اینجا با useSyncExternalStore خوانده
//  می‌شود — بدون hydration-mismatch و بدون setState در effect.
// ---------------------------------------------------------------------
// 👤 فاز ۳۱: کاربر واردشده فیلدهای نام/ایمیل/تلفن را نمی‌بیند (از حسابش ارسال می‌شود)
// و بعد از ثبت موفق، صفحهٔ پرداخت خودکار باز می‌شود؛ دکمهٔ پرداخت از جزئیات کلاس حذف شد.
// فاز ۳۴: کارت پرداخت مستقل پایین فرم Register هم به درخواست مالک حذف شد —
// ورود به صفحهٔ Register فقط فرم را نشان می‌دهد؛ پرداخت فقط بعد از ثبت موفق (صفحهٔ Thank you).
const SELECTED_CLASS_KEY = 'ct-selected-class'

const selectedClassListeners = new Set<() => void>()

function subscribeSelectedClass(callback: () => void) {
  selectedClassListeners.add(callback)
  return () => {
    selectedClassListeners.delete(callback)
  }
}

function getSelectedClassSnapshot(): string | null {
  try {
    return sessionStorage.getItem(SELECTED_CLASS_KEY)
  } catch {
    return null
  }
}

function getServerSelectedClass(): string | null {
  return null
}

function useSelectedClass(): string | null {
  return useSyncExternalStore(subscribeSelectedClass, getSelectedClassSnapshot, getServerSelectedClass)
}

function clearSelectedClass() {
  try {
    sessionStorage.removeItem(SELECTED_CLASS_KEY)
  } catch {
    // بی‌اهمیت
  }
  selectedClassListeners.forEach((l) => l())
}

interface RegisterPageProps {
  onToast: (message: string) => void
}

// ---------------------------------------------------------------------
// 🎯 کاتالوگ قیمت از سرور — ‎GET /api/payments/catalog
// منبع قیمت = سکشن payments فایل محتوا (همان منبعی که سفارش واقعی از آن
// مبلغ را می‌خواند). هیچ قیمتی اینجا هاردکد نیست و ترکیبِ ناموجود هرگز
// قیمت قلابی نمایش نمی‌دهد. ساختار فقط-خواندنیِ پاسخ API:
// ---------------------------------------------------------------------
interface CatalogComboView {
  classType: string
  level: string
  available: boolean
  reason?: 'UNAVAILABLE' | 'CHOOSE_TYPE'
  productId?: string
  productLabel?: string
  classTitle?: string
  amountUsd?: number
  amountDisplay?: string
}

interface CatalogClassView {
  title: string
  type: string
  level: string
  productId: string | null
  productLabel: string | null
  amountUsd: number | null
  amountDisplay: string | null
}

interface PaymentCatalogView {
  currency: string
  network: string
  levels: { key: string; label: string }[]
  classTypes: { key: string; label: string }[]
  combos: CatalogComboView[]
  classes: CatalogClassView[]
}

type PriceResolution =
  | { kind: 'ok'; productId: string; productLabel: string; classTitle: string; amountDisplay: string; currency: string }
  | { kind: 'choose-type' }
  | { kind: 'unavailable' }
  | { kind: 'class-unavailable' }
  | { kind: 'loading' }
  | { kind: 'idle' }

// 🎟️ فاز ۵۸ — ریزِ قیمت آگاه از کد تخفیف (همهٔ مبالغ از سرور)
// اگر کاربر در صفحهٔ کلاس‌ها کد وارد کرده باشد (sessionStorage «ct_discount_code»)،
// اینجا همان کد به API اعتبارسنجی می‌رود تا کاربر قبل از پرداخت قیمت واقعیِ
// نهایی را ببیند — نه مبلغِ بدون تخفیف کد (رفع باگ «کد اعمال نشد»).
interface CodePreview {
  code: string | null
  base: number
  tierPercent: number
  tierDiscount: number
  codeDiscount: number
  final: number
}

function CodePreviewLines({ cp }: { cp: CodePreview }) {
  return (
    <div className="mt-3 pt-3 border-t border-sage/25 space-y-1.5 text-sm" data-testid="register-code-breakdown">
      <div className="flex items-center justify-between">
        <span className="text-brown">Original price</span>
        <span className="font-semibold text-brown-dark tabular-nums">${cp.base.toFixed(2)}</span>
      </div>
      {cp.tierPercent > 0 && (
        <div className="flex items-center justify-between text-sage-dark">
          <span>Package discount ({cp.tierPercent}%)</span>
          <span className="font-semibold tabular-nums">− ${cp.tierDiscount.toFixed(2)}</span>
        </div>
      )}
      {cp.code && cp.codeDiscount > 0 && (
        <div className="flex items-center justify-between text-sage-dark">
          <span className="font-mono font-bold">{cp.code}</span>
          <span className="font-semibold tabular-nums">− ${cp.codeDiscount.toFixed(2)}</span>
        </div>
      )}
      <div className="flex items-center justify-between pt-1">
        <span className="font-bold text-brown-dark">Total</span>
        <span className="text-xl font-bold text-brown-dark tabular-nums">
          ${cp.final.toFixed(2)} <span className="text-xs font-semibold text-brown-light">USD</span>
        </span>
      </div>
      <p className="text-[11px] text-brown-light flex items-center gap-1.5 mt-1">
        <TicketPercent className="w-3 h-3 shrink-0" aria-hidden="true" />
        Discount code applied — final amount confirmed on the secure payment page.
      </p>
    </div>
  )
}

function normTitle(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

// ---------------------------------------------------------------------
// 🎨 جعبهٔ پیش‌نمایش قیمت — سه حالت: قیمت قطعی (سبز برند)، راهنمای انتخاب
// نوع (خنثی)، و ترکیب ناموجود (هشدار زرد — بدون هیچ قیمت قلابی)
// ---------------------------------------------------------------------
function PricePreviewBox({ resolution, codePreview }: { resolution: PriceResolution; codePreview?: CodePreview | null }) {
  if (resolution.kind === 'idle') return null

  if (resolution.kind === 'loading') {
    return (
      <div className="flex items-center gap-3 bg-cream/70 border border-sage-light/30 rounded-2xl px-4 py-3.5 text-sm text-brown-light" role="status" aria-live="polite">
        <Loader2 className="w-4 h-4 animate-spin text-sage-dark flex-shrink-0" aria-hidden="true" />
        {c.priceBoxLoading}
      </div>
    )
  }

  if (resolution.kind === 'ok') {
    // 🎟️ فاز ۵۸ — وقتی کد تخفیف معتبر برای همین محصول اعمال شده، ریزِ کامل
    // (اصلی − پله − کد = نهایی) نشان داده می‌شود؛ در غیر این صورت تک‌قیمتِ قبلی.
    const cp = codePreview && codePreview.code && codePreview.codeDiscount > 0 ? codePreview : null
    return (
      <div className="animate-ct-fadeInUp bg-sage-light/25 border border-sage/30 rounded-2xl p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-sage-dark font-bold mb-1">
              {c.priceBoxLabel}
            </p>
            <p className="text-sm font-semibold text-brown-dark leading-snug">{resolution.productLabel}</p>
          </div>
          {!cp && (
            <p className="text-xl font-bold text-sage-dark tabular-nums whitespace-nowrap">
              ${resolution.amountDisplay}{' '}
              <span className="text-xs font-semibold text-brown-light">{resolution.currency}</span>
            </p>
          )}
        </div>
        {cp && <CodePreviewLines cp={cp} />}
        <p className="text-xs text-brown-light mt-2.5 leading-relaxed">{c.priceBoxHint}</p>
      </div>
    )
  }

  if (resolution.kind === 'choose-type') {
    return (
      <div className="animate-ct-fadeInUp flex items-start gap-3 bg-cream/70 border border-sage-light/30 rounded-2xl px-4 py-3.5">
        <Info className="w-4.5 h-4.5 text-sage-dark flex-shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-sm text-brown leading-relaxed">{c.priceBoxChooseType}</p>
      </div>
    )
  }

  // unavailable / class-unavailable — هشدار شفاف، بدون هیچ قیمت و بدون چک‌اوت
  const message =
    resolution.kind === 'class-unavailable' ? c.priceBoxClassUnavailable : c.priceBoxUnavailable
  return (
    <div className="animate-ct-fadeInUp bg-butter/20 border border-butter/50 rounded-2xl px-4 py-3.5" role="alert">
      <div className="flex items-start gap-3">
        <TriangleAlert className="w-4.5 h-4.5 text-brown flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-brown-dark">{message}</p>
          {resolution.kind === 'unavailable' && (
            <p className="text-xs text-brown-light mt-1 leading-relaxed">{c.priceBoxUnavailableNote}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export function RegisterPage({ onToast }: RegisterPageProps) {
  const selectedClass = useSelectedClass()
  // 👤 فاز ۳۱ — کاربر واردشده اطلاعات تکراری (نام/ایمیل/تلفن) نمی‌بیند؛
  // این سه مقدار خودکار از پروفایل حساب ارسال می‌شود و فقط یک کارت «Registering as» نشان داده می‌شود.
  const { user } = useUser()
  const accountName = user
    ? [user.firstName, user.lastName]
        .map((s) => (s || '').trim())
        .filter(Boolean)
        .join(' ') || user.email.split('@')[0]
    : ''
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const payUi = siteContent.payments.ui
  // 🪙 باز شدن خودکار صفحهٔ پرداخت بعد از ثبت موفق — با شمارش معکوس و قابل لغو
  const [payTarget, setPayTarget] = useState('')
  const [payCount, setPayCount] = useState<number | null>(null)
  const [paySkipped, setPaySkipped] = useState(false)
  // 🎓 فاز ۶۱ — اسنپ‌شات «مشخصات دورهٔ انتخاب‌شده» هنگام ثبت: هر دوره‌ای که
  // کاربر انتخاب کرده باشد، همین‌جا با قیمت قطعیِ سرور (و ریزِ تخفیف کد) نشان
  // داده می‌شود — بعد از پاک‌شدن انتخاب کلاس هم مشخصات ثابت می‌ماند.
  const [paidCourse, setPaidCourse] = useState<{
    productLabel: string
    classTitle: string
    amountDisplay: string
    currency: string
    breakdown: CodePreview | null
  } | null>(null)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    level: '',
    classType: 'group',
    goal: '',
    message: '',
  })
  // 🗓️ ترجیحات ساخت‌یافتهٔ برنامه (فاز ۴۷) — منطقهٔ زمانی اول، بعد روز، بعد ساعت
  const [sched, setSched] = useState<{
    timezone: string
    days: Weekday[]
    times: { start: string; end: string }[]
    daysPerWeek: number | null
    ack: boolean
  }>({ timezone: '', days: [], times: [{ start: '18:00', end: '19:00' }], daysPerWeek: null, ack: false })

  const toggleDay = (d: Weekday) =>
    setSched((s) => {
      const has = s.days.includes(d)
      if (has) return { ...s, days: s.days.filter((x) => x !== d) }
      if (s.days.length >= 3) return s // حداکثر ۳ روز
      return { ...s, days: [...s.days, d] }
    })

  const setRange = (idx: number, part: 'start' | 'end', value: string) =>
    setSched((s) => ({
      ...s,
      times: s.times.map((t, i) => (i === idx ? { ...t, [part]: value } : t)),
    }))

  const addRange = () =>
    setSched((s) => (s.times.length >= 2 ? s : { ...s, times: [...s.times, { start: '19:00', end: '20:00' }] }))

  const removeRange = (idx: number) =>
    setSched((s) => ({ ...s, times: s.times.filter((_, i) => i !== idx) }))

  // آمادهٔ ارسال: منطقهٔ زمانی + روز + بازهٔ معتبر + تأیید صریح
  const schedulingReady =
    sched.timezone !== '' &&
    sched.days.length > 0 &&
    sched.times.length > 0 &&
    sched.times.every((t) => t.start !== t.end) &&
    sched.ack
  // 🎯 کاتالوگ قیمت سرور — یک‌بار در ورود صفحه بارگذاری می‌شود؛
  // اگر بارگذاری شکست بخورد، هیچ قیمتی نشان داده نمی‌شود و پرداخت خودکار هم
  // فعال نمی‌شود (fail-closed — به‌جای آن ثبت‌نام ساده انجام می‌شود)
  const [catalog, setCatalog] = useState<PaymentCatalogView | null>(null)
  useEffect(() => {
    let alive = true
    fetch('/api/payments/catalog')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: unknown) => {
        if (alive && d && typeof d === 'object' && Array.isArray((d as PaymentCatalogView).combos)) {
          setCatalog(d as PaymentCatalogView)
        }
      })
      .catch(() => {
        // بدون کاتالوگ: بدون پیش‌نمایش قیمت و بدون پرداخت خودکار — امن و صادقانه
      })
    return () => {
      alive = false
    }
  }, [])

  // 🔒 کلاس انتخاب‌شده → نوع کلاس قفل می‌شود.
  // فاز ۴۲: منبع اصلی = کاتالوگ سرور (کلاس‌های مدیریت‌شده از پنل ادمین)؛
  // فایل محتوا فقط fallback فوری قبل از رسیدن کاتالوگ است — با این روش
  // تغییر نام/نوع کلاس از پنل، قفل نوع را هم بدون کد به‌روز می‌کند.
  const catalogLock = (() => {
    if (!catalog || !selectedClass) return null
    const n = normTitle(selectedClass)
    return catalog.classes.find((x) => normTitle(x.title) === n) ?? null
  })()
  const fileLock = findClassByTitle(selectedClass)
  const lockedClass =
    fileLock ??
    (catalogLock ? { title: catalogLock.title, type: catalogLock.type } : undefined)

  // اگر کاربر بعد از ثبت موفق، با انتخابِ کلاسِ جدید دوباره به فرم برود،
  // فرم باید دوباره نمایش داده شود (نه صفحهٔ «Thank you!» قبلی).
  // الگوی رسمی ریکت: تنظیم state هنگام رندر هنگام تغییر props.
  const selectionKey = selectedClass ?? ''
  const [seenSelectionKey, setSeenSelectionKey] = useState('')
  // منبع همگام‌سازی نوع — «pending» یعنی کلاس در فایل نبود؛ منتظر کاتالوگ بمان
  const [typeSync, setTypeSync] = useState<{ key: string; source: 'file' | 'catalog' | 'pending' }>({ key: '', source: 'file' })
  if (selectionKey !== seenSelectionKey) {
    setSeenSelectionKey(selectionKey)
    if (selectionKey && submitted) {
      setSubmitted(false)
    }
    // 🔒 نوع کلاس هنگام تغییر کلاس انتخابی همگام می‌شود — اگر فایل نداشت،
    // حدسِ «group» ممنوع؛ تا رسیدن کاتالوگ مقدار فعلی می‌ماند (pending)
    const found = findClassByTitle(selectionKey || null)
    if (found) {
      const nextType = classTypeKeyFor(found.type)
      setForm((f) => (f.classType === nextType ? f : { ...f, classType: nextType }))
      setTypeSync({ key: selectionKey, source: 'file' })
    } else if (selectionKey) {
      setTypeSync({ key: selectionKey, source: 'pending' })
    }
  }
  // وقتی کاتالوگ رسید (یا کلاس در فایل نبود)، نوع را از منبع حقیقت قفل کن
  if (catalogLock && selectionKey && !(typeSync.key === selectionKey && typeSync.source === 'catalog')) {
    const nextType = classTypeKeyFor(catalogLock.type)
    setForm((f) => (f.classType === nextType ? f : { ...f, classType: nextType }))
    setTypeSync({ key: selectionKey, source: 'catalog' })
  }

  const set = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((f) => ({ ...f, [key]: e.target.value }))

  // ---------------------------------------------------------------------
  // 🎯 تشخیص قطعی محصول/قیمت برای انتخاب فعلی کاربر:
  //   • کلاس مشخص انتخاب‌شده → تطبیق کامل عنوان با کاتالوگ سرور (بدون حدس)
  //   • در غیر این صورت → جدول (نوع کلاس + سطح) از کاتالوگ سرور
  //   • ترکیب ناموجود → هیچ قیمت و هیچ سفارشی — فقط پیام شفاف
  // ---------------------------------------------------------------------
  const priceResolution: PriceResolution = (() => {
    if (lockedClass) {
      if (!catalog) return { kind: 'loading' }
      const cl = catalog.classes.find(
        (x) => normTitle(x.title) === normTitle(selectedClass ?? '')
      )
      if (cl && cl.productId && cl.amountDisplay) {
        return {
          kind: 'ok',
          productId: cl.productId,
          productLabel: cl.productLabel ?? cl.title,
          classTitle: cl.title,
          amountDisplay: cl.amountDisplay,
          currency: catalog.currency,
        }
      }
      return { kind: 'class-unavailable' }
    }
    if (!form.level) return { kind: 'idle' }
    if (!catalog) return { kind: 'loading' }
    const combo = catalog.combos.find(
      (x) => x.classType === form.classType && x.level === form.level
    )
    if (!combo) return { kind: 'unavailable' }
    // «Either» — نوع مشخص نشده؛ کاربر باید گروهی یا خصوصی را انتخاب کند (نه خطا)
    if (combo.reason === 'CHOOSE_TYPE') return { kind: 'choose-type' }
    if (!combo.available || !combo.productId || !combo.amountDisplay) {
      return { kind: 'unavailable' }
    }
    return {
      kind: 'ok',
      productId: combo.productId,
      productLabel: combo.productLabel ?? combo.classTitle ?? '',
      classTitle: combo.classTitle ?? '',
      amountDisplay: combo.amountDisplay,
      currency: catalog.currency,
    }
  })()

  // جعبهٔ قیمت فقط وقتی معنا دارد که کاربر چیزی انتخاب کرده باشد
  const showPriceBox = !!lockedClass || !!form.level
  // 🪙 محصولِ قطعیِ قابل پرداخت برای این انتخاب — خالی = هیچ پرداخت خودکاری
  const resolvedProductId = priceResolution.kind === 'ok' ? priceResolution.productId : ''

  // 🎟️ فاز ۵۸ — پیش‌نمایش قیمت آگاه از کد تخفیف: کد ذخیره‌شدهٔ صفحهٔ کلاس‌ها
  // (sessionStorage «ct_discount_code») همین‌جا هم به سرور می‌رود تا کاربر
  // قبل از پرداخت قیمت نهاییِ واقعی را ببیند (رفع باگ «کد اعمال نشد» —
  // قبلاً فرم ثبت‌نام مبلغِ بدون کد را «EXACT PRICE» نشان می‌داد).
  const [codePreview, setCodePreview] = useState<CodePreview | null>(null)
  const [codePreviewFor, setCodePreviewFor] = useState('')
  useEffect(() => {
    if (!resolvedProductId) {
      setCodePreview(null)
      setCodePreviewFor('')
      return
    }
    let alive = true
    let stored: string | null = null
    try {
      stored = sessionStorage.getItem('ct_discount_code')
    } catch {
      /* بدون sessionStorage */
    }
    const code = (stored || '').trim().toUpperCase().slice(0, 40)
    ;(async () => {
      try {
        const res = await fetch('/api/discounts/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: resolvedProductId, ...(code ? { code } : {}) }),
        })
        const data = (await res.json().catch(() => null)) as {
          pricing?: { base: number; tierPercent: number; tierDiscount: number; code: string | null; codeDiscount?: number; final: number }
        } | null
        if (!alive || !res.ok || !data?.pricing) return
        const pr = data.pricing
        if (code && (!pr.code || (pr.codeDiscount ?? 0) <= 0)) {
          // کد ذخیره‌شده دیگر معتبر نیست — پاک می‌شود تا کاربر فریب نخورد
          try {
            sessionStorage.removeItem('ct_discount_code')
          } catch {
            /* */
          }
        }
        setCodePreviewFor(resolvedProductId)
        setCodePreview({
          code: pr.code,
          base: pr.base,
          tierPercent: pr.tierPercent,
          tierDiscount: pr.tierDiscount,
          codeDiscount: pr.codeDiscount ?? 0,
          final: pr.final,
        })
      } catch {
        /* بی‌اهمیت — جعبهٔ قیمت بدون کد می‌ماند */
      }
    })()
    return () => {
      alive = false
    }
  }, [resolvedProductId])

  // ⏱️ شمارش معکوس ۳ ثانیه‌ای تا باز شدن خودکار صفحهٔ پرداخت — با لغو
  useEffect(() => {
    if (!submitted || !payTarget || paySkipped) return
    let left = 3
    setPayCount(left)
    const iv = setInterval(() => {
      left -= 1
      if (left <= 0) {
        clearInterval(iv)
        setPayCount(null)
        rememberPayOrigin()
        appNavigate(`/pay/new?product=${encodeURIComponent(payTarget)}`)
        return
      }
      setPayCount(left)
    }, 1000)
    return () => clearInterval(iv)
  }, [submitted, payTarget, paySkipped])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    setError('')
    // 👤 برای کاربر واردشده، نام/ایمیل/تلفن از حساب ارسال می‌شود (بدون پرسش دوباره)
    const payload = {
      ...(user
        ? { ...form, name: accountName, email: user.email, phone: user.phone ?? '' }
        : form),
      classTitle: selectedClass ?? '',
      // 🗓️ ترجیحات برنامه — سرور همه را دوباره اعتبارسنجی می‌کند
      timezone: sched.timezone,
      preferredDays: sched.days,
      preferredTimes: sched.times,
      daysPerWeek: sched.daysPerWeek,
      scheduleAck: sched.ack,
    }
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const fe = data?.details?.fieldErrors
        if (fe) {
          const first = Object.values(fe)[0]
          setError(Array.isArray(first) ? String(first[0]) : 'Please check the scheduling preferences below.')
        } else {
          setError('Something went wrong. Please try again.')
        }
        return
      }
      // 🪙 پرداخت خودکار فقط برای «همان محصولی» که کاتالوگ سرور برای این انتخاب
      // تعیین کرده — هیچ fallback به اولین بسته و هیچ تطبیق حدسی وجود ندارد؛
      // ترکیب ناموجود = بدون کارت پرداخت (فقط ثبت‌نام)
      if (priceResolution.kind === 'ok') {
        setPayTarget(priceResolution.productId)
        setPaidCourse({
          productLabel: priceResolution.productLabel,
          classTitle: priceResolution.classTitle,
          amountDisplay: priceResolution.amountDisplay,
          currency: priceResolution.currency,
          breakdown: codePreviewFor === resolvedProductId && codePreview ? codePreview : null,
        })
      } else {
        setPayTarget('')
        setPaidCourse(null)
      }
      setPaySkipped(false)
      setSubmitted(true)
      onToast('Registration details saved successfully!')
      clearSelectedClass() // انتخاب کلاس مصرف شد
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const reset = () => {
    setForm({
      name: '',
      email: '',
      phone: '',
      level: '',
      classType: lockedClass ? classTypeKeyFor(lockedClass.type) : 'group',
      goal: '',
      message: '',
    })
    setSubmitted(false)
    setPayCount(null)
    setPaySkipped(true)
    setPaidCourse(null)
  }

  return (
    <div id="page-register">
      <section className="pt-32 pb-24 md:pt-40 relative overflow-hidden">
        <div className="char-bg top-10 left-0" style={{ fontSize: '240px', opacity: 0.03 }}>
          来
        </div>
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-10">
              <span className="inline-block text-xs font-semibold uppercase tracking-widest text-sage-dark mb-3">
                {c.eyebrow}
              </span>
              <h1 className="text-3xl md:text-5xl font-bold text-brown-dark mb-4">{c.title}</h1>
              <p className="text-brown-light">{c.subtitle}</p>
            </div>

            {!submitted ? (
              <div className="bg-white rounded-3xl p-8 md:p-10 shadow-lg border border-sage-light/20">
                {/* کلاس انتخاب‌شده از صفحهٔ کلاس‌ها / نتیجهٔ آزمون */}
                {selectedClass && (
                  <div className="animate-ct-fadeInUp mb-7 flex items-center gap-3 bg-sage-light/25 border border-sage/30 rounded-2xl px-4 py-3">
                    <span className="w-9 h-9 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                      <BookOpen className="w-4.5 h-4.5 text-sage-dark" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] uppercase tracking-wider text-sage-dark font-bold">
                        {c.selectedClassLabel}
                      </p>
                      <p className="text-sm font-semibold text-brown-dark truncate">{selectedClass}</p>
                    </div>
                    <button
                      type="button"
                      onClick={clearSelectedClass}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-brown-light hover:text-brown hover:bg-white/70 transition-colors cursor-pointer flex-shrink-0"
                      aria-label={c.selectedClassRemove}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* 👤 کارت هویت کاربر واردشده — جای فیلدهای نام/ایمیل/تلفن (فاز ۳۱) */}
                  {user && (
                    <div className="animate-ct-fadeInUp flex items-center gap-3 bg-sage-light/25 border border-sage/30 rounded-2xl px-4 py-3">
                      <span className="w-9 h-9 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                        <UserRound className="w-4.5 h-4.5 text-sage-dark" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] uppercase tracking-wider text-sage-dark font-bold">Registering as</p>
                        <p className="text-sm font-semibold text-brown-dark truncate">
                          {accountName} <span className="font-normal text-brown-light">· {user.email}</span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          appNavigate('/account')
                        }}
                        className="text-xs font-semibold text-sage-dark hover:underline cursor-pointer flex-shrink-0"
                      >
                        Edit profile
                      </button>
                    </div>
                  )}

                  {!user && (
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="reg-name" className={labelCls}>
                        {c.name} *
                      </label>
                      <input
                        id="reg-name"
                        type="text"
                        required
                        value={form.name}
                        onChange={set('name')}
                        className={inputCls}
                        placeholder={c.namePlaceholder}
                      />
                    </div>
                    <div>
                      <label htmlFor="reg-email" className={labelCls}>
                        {c.email} *
                      </label>
                      <input
                        id="reg-email"
                        type="email"
                        required
                        value={form.email}
                        onChange={set('email')}
                        className={inputCls}
                        placeholder={c.emailPlaceholder}
                      />
                    </div>
                  </div>
                  )}

                  {!user && (
                  <div>
                    <label htmlFor="reg-phone" className={labelCls}>
                      {c.phone}
                    </label>
                    <input
                      id="reg-phone"
                      type="tel"
                      value={form.phone}
                      onChange={set('phone')}
                      className={inputCls}
                      placeholder={c.phonePlaceholder}
                    />
                  </div>
                  )}

                  <div>
                    <label htmlFor="reg-level" className={labelCls}>
                      {c.level}
                    </label>
                    <select
                      id="reg-level"
                      required
                      value={form.level}
                      onChange={set('level')}
                      className={`${inputCls} appearance-none ${form.level ? '' : 'text-brown-light/60'}`}
                    >
                      <option value="" disabled>
                        {c.levelPlaceholder}
                      </option>
                      {c.levels.map((l) => (
                        <option key={l.key} value={l.key}>
                          {l.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 🔒 نوع کلاس — وقتی کلاس مشخصی انتخاب شده، از تنظیمات همان کلاس خوانده
                      می‌شود و کاربر نمی‌تواند آن را عوض کند؛ بدون کلاس انتخابی، ترجیح آزاد است */}
                  {lockedClass ? (
                    <div>
                      <span className={labelCls}>{c.classTypeFromCourse}</span>
                      <div
                        className="flex flex-wrap items-center gap-2.5 bg-sage-light/25 border border-sage/30 rounded-xl px-4 py-3"
                        title={c.classTypeLockedNote}
                      >
                        <Lock className="w-4 h-4 shrink-0 text-sage-dark" aria-hidden="true" />
                        <span className="text-sm font-semibold text-brown-dark">{lockedClass.type}</span>
                        <span className="text-[11px] text-brown-light">· {c.classTypeLockedNote}</span>
                      </div>
                    </div>
                  ) : (
                  <div>
                    <span className={labelCls}>{c.classType}</span>
                    <div className="flex flex-wrap gap-3">
                      {c.classTypes.map((t) => (
                        <label
                          key={t.key}
                          className="flex items-center gap-2 bg-cream rounded-xl px-4 py-2.5 border border-sage-light/30 cursor-pointer hover:border-sage transition-all"
                        >
                          <input
                            type="radio"
                            name="classType"
                            value={t.key}
                            checked={form.classType === t.key}
                            onChange={set('classType')}
                            className="accent-[#A8C9A0]"
                          />
                          <span className="text-sm text-brown">{t.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  )}

                  {/* 🎯 پیش‌نمایش قیمت قطعی «نوع کلاس + سطح» — از کاتالوگ سرور */}
                  {showPriceBox && (
                    <PricePreviewBox resolution={priceResolution} codePreview={codePreviewFor === resolvedProductId ? codePreview : null} />
                  )}

                  {/* 🗓️ ترجیحات ساخت‌یافتهٔ برنامه — منطقهٔ زمانی → روز → بازهٔ ساعتی (فاز ۴۷) */}
                  <div className="rounded-2xl border border-sage-light/40 bg-cream/60 p-4 space-y-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-sage-dark flex items-center gap-2">
                      <CalendarDays className="w-4 h-4" aria-hidden="true" /> {c.scheduling.scheduleLabel}
                    </p>

                    {/* ۱ · منطقهٔ زمانی — قبل از هر انتخاب ساعتی */}
                    <div>
                      <label htmlFor="reg-tz" className={labelCls}>
                        <Globe2 className="w-3.5 h-3.5 inline mr-1 -mt-0.5" aria-hidden="true" />
                        {c.scheduling.stepTimezone}
                      </label>
                      <select
                        id="reg-tz"
                        value={sched.timezone}
                        onChange={(e) => setSched((s) => ({ ...s, timezone: e.target.value }))}
                        className={inputCls}
                      >
                        <option value="">{c.scheduling.chooseTz}</option>
                        {REGIONS.map((region) => (
                          <optgroup key={region} label={region}>
                            {SUPPORTED_TIMEZONES.filter((t) => t.region === region).map((t) => (
                              <option key={t.tz} value={t.tz}>
                                {timezoneLabel(t.tz)}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      <p className="text-[11px] text-brown-light mt-1">{c.scheduling.stepTimezoneHint}</p>
                    </div>

                    {sched.timezone && (
                      <p className="text-[11px] font-semibold text-sage-dark bg-sage-light/20 rounded-xl px-3 py-2">
                        {c.scheduling.yourTimesIn.replace('{tz}', sched.timezone.split('/')[1]?.replace(/_/g, ' ') ?? sched.timezone)}
                      </p>
                    )}

                    {/* ۲ · روزهای ترجیحی — حداکثر ۳ */}
                    {sched.timezone && (
                      <div>
                        <span className={labelCls}>{c.scheduling.stepDays}</span>
                        <div className="flex flex-wrap gap-2">
                          {WEEKDAY_KEYS.map((d) => {
                            const active = sched.days.includes(d)
                            const full = !active && sched.days.length >= 3
                            return (
                              <button
                                key={d}
                                type="button"
                                onClick={() => toggleDay(d)}
                                disabled={full}
                                aria-pressed={active}
                                className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed min-h-[40px] ${
                                  active
                                    ? 'bg-sage text-brown-dark border-sage'
                                    : 'bg-white text-brown border-sage-light/40 hover:border-sage'
                                }`}
                              >
                                {WEEKDAY_LABELS[d]}
                              </button>
                            )
                          })}
                        </div>
                        <p className="text-[11px] text-brown-light mt-1">{c.scheduling.stepDaysHint}</p>
                      </div>
                    )}

                    {/* ۳ · بازه‌های ساعتی — حداکثر ۲، به وقت خود کاربر */}
                    {sched.timezone && sched.days.length > 0 && (
                      <div>
                        <span className={labelCls}>
                          <Clock className="w-3.5 h-3.5 inline mr-1 -mt-0.5" aria-hidden="true" />
                          {c.scheduling.stepTimes}
                        </span>
                        <div className="space-y-2">
                          {sched.times.map((t, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <select
                                value={t.start}
                                onChange={(e) => setRange(idx, 'start', e.target.value)}
                                aria-label={`Start time ${idx + 1}`}
                                className={`${inputCls} max-w-[110px]`}
                              >
                                {TIME_OPTIONS.map((o) => (
                                  <option key={o} value={o}>{o}</option>
                                ))}
                              </select>
                              <span className="text-brown-light text-sm">–</span>
                              <select
                                value={t.end}
                                onChange={(e) => setRange(idx, 'end', e.target.value)}
                                aria-label={`End time ${idx + 1}`}
                                className={`${inputCls} max-w-[110px]`}
                              >
                                {TIME_OPTIONS.map((o) => (
                                  <option key={o} value={o}>
                                    {o}
                                    {o <= t.start ? ` ${c.scheduling.endTimeNextDay}` : ''}
                                  </option>
                                ))}
                              </select>
                              {t.end <= t.start && (
                                <span className="text-[10px] font-semibold text-sage-dark">{c.scheduling.endTimeNextDay}</span>
                              )}
                              {sched.times.length > 1 && (
                                <button type="button" onClick={() => removeRange(idx)} className="text-brown-light hover:text-red-500 text-xs cursor-pointer px-1">
                                  ✕
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        {sched.times.length < 2 && (
                          <button type="button" onClick={addRange} className="text-xs font-semibold text-sage-dark hover:text-brown-dark mt-2 cursor-pointer">
                            + {c.scheduling.addRange}
                          </button>
                        )}
                        <p className="text-[11px] text-brown-light mt-1">{c.scheduling.stepTimesHint}</p>
                      </div>
                    )}

                    {/* ۴ · روز در هفته — ≤ روزهای انتخابی */}
                    {sched.timezone && sched.days.length > 0 && (
                      <div>
                        <span className={labelCls}>{c.scheduling.stepDaysPerWeek}</span>
                        <div className="flex flex-wrap gap-3">
                          {[1, 2, 3].map((n) => (
                            <label key={n} className={`flex items-center gap-2 bg-white rounded-xl px-4 py-2.5 border cursor-pointer transition-all ${
                              sched.daysPerWeek === n ? 'border-sage ring-2 ring-sage/30' : 'border-sage-light/30 hover:border-sage'
                            } ${n > sched.days.length ? 'opacity-40' : ''}`}>
                              <input
                                type="radio"
                                name="daysPerWeek"
                                checked={sched.daysPerWeek === n}
                                disabled={n > sched.days.length}
                                onChange={() => setSched((s) => ({ ...s, daysPerWeek: n }))}
                                className="accent-[#A8C9A0]"
                              />
                              <span className="text-sm text-brown">{n}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ⚠️ اطلاع‌رسانی صریح: این‌ها ترجیح‌اند، نه برنامهٔ نهایی */}
                    <div className="bg-butter/30 border border-peach/40 rounded-xl px-4 py-3 text-xs text-brown leading-relaxed flex items-start gap-2">
                      <Info className="w-4 h-4 shrink-0 mt-0.5 text-brown" aria-hidden="true" />
                      <p>{c.scheduling.notice}</p>
                    </div>
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sched.ack}
                        onChange={(e) => setSched((s) => ({ ...s, ack: e.target.checked }))}
                        className="mt-0.5 w-4 h-4 accent-[#A8C9A0]"
                      />
                      <span className="text-xs text-brown leading-relaxed">{c.scheduling.ack}</span>
                    </label>
                  </div>

                  <div>
                    <label htmlFor="reg-goal" className={labelCls}>
                      {c.goal}
                    </label>
                    <textarea
                      id="reg-goal"
                      rows={3}
                      value={form.goal}
                      onChange={set('goal')}
                      className={`${inputCls} resize-none`}
                      placeholder={c.goalPlaceholder}
                    />
                  </div>

                  <div>
                    <label htmlFor="reg-message" className={labelCls}>
                      {c.message}
                    </label>
                    <textarea
                      id="reg-message"
                      rows={2}
                      value={form.message}
                      onChange={set('message')}
                      className={`${inputCls} resize-none`}
                      placeholder={c.messagePlaceholder}
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={sending || !schedulingReady}
                    className="bg-sage text-brown-dark w-full py-4 rounded-2xl text-base font-semibold flex items-center justify-center gap-2 hover:bg-sage-dark transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {sending ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" /> Sending...
                      </>
                    ) : (
                      <>
                        {c.submit} <ArrowRight className="w-[18px] h-[18px]" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-8 md:p-10 shadow-lg border border-sage-light/20 text-center animate-ct-fadeInUp">
                <div className="w-20 h-20 bg-sage-light/30 rounded-full mx-auto mb-6 flex items-center justify-center">
                  <Check className="w-10 h-10 text-sage-dark" />
                </div>
                <h2 className="text-2xl font-bold text-brown-dark mb-3">{c.successTitle}</h2>
                <p className="text-brown-light mb-2">{c.successText1}</p>
                {/* 📝 فاز ۶۰ (بند ۲۲) — صادقانه: اگر پرداخت هنوز در جریان است،
                    هرگز «کل فرایند کامل شد» نمی‌گوییم */}
                <p className="text-brown-light">
                  {payTarget && paidCourse ? c.successPayNote : c.successText2}
                </p>

                {/* 🪙 گام بعدی: پرداخت — مشخصات همان دورهٔ انتخاب‌شده + باز شدن خودکار */}
                {payTarget && paidCourse && (
                  <div className="mt-8 w-full bg-cream/70 border border-sage/25 rounded-2xl p-6 text-left animate-ct-fadeInUp">
                    <h3 className="text-base font-bold text-brown-dark mb-1.5 flex items-center gap-2">
                      <Wallet className="w-4.5 h-4.5 text-sage-dark flex-shrink-0" />
                      {payUi.payNextTitle}
                    </h3>
                    <p className="text-sm text-brown-light mb-3 leading-relaxed">
                      {payUi.payNextNote}{' '}
                      <span className="font-semibold text-brown-dark">
                        {paidCourse.classTitle || paidCourse.productLabel}
                      </span>
                    </p>
                    {/* 🎓 مشخصات قطعی همان دوره — از کاتالوگ سرور (نه محتوای ثابت) */}
                    <div className="bg-white rounded-xl border border-sage-light/30 px-4 py-3.5 mb-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] uppercase tracking-wider text-sage-dark font-bold">Selected course</p>
                        <p className="text-sm font-semibold text-brown-dark truncate">{paidCourse.productLabel}</p>
                      </div>
                      <p className="text-lg font-bold text-sage-dark tabular-nums whitespace-nowrap">
                        ${paidCourse.amountDisplay}{' '}
                        <span className="text-xs font-semibold text-brown-light">{paidCourse.currency}</span>
                      </p>
                    </div>
                    {paidCourse.breakdown && paidCourse.breakdown.code && paidCourse.breakdown.codeDiscount > 0 && (
                      <CodePreviewLines cp={paidCourse.breakdown} />
                    )}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={() => {
                          setPaySkipped(true)
                          rememberPayOrigin()
                          appNavigate(`/pay/new?product=${encodeURIComponent(payTarget)}`)
                        }}
                        className="bg-sage text-brown-dark px-6 py-3 rounded-xl text-sm font-bold hover:bg-sage-dark transition-colors cursor-pointer inline-flex items-center justify-center gap-2 min-h-[48px]"
                      >
                        <Wallet className="w-4 h-4" />
                        {payUi.payNextButton}
                      </button>
                      <button
                        onClick={() => setPaySkipped(true)}
                        className="px-6 py-3 rounded-xl text-sm font-medium text-brown-light hover:text-brown hover:bg-white/70 transition-colors cursor-pointer min-h-[48px]"
                      >
                        {payUi.payNextLater}
                      </button>
                    </div>
                    {payCount !== null && !paySkipped && (
                      <p className="text-xs text-brown-light mt-3" role="status" aria-live="polite">
                        {payUi.payNextOpening}{' '}
                        <span className="font-bold tabular-nums text-sage-dark">{payCount}</span> {payUi.payNextUnit}…
                      </p>
                    )}
                  </div>
                )}

                <button
                  onClick={reset}
                  className="mt-8 bg-sage-light/30 text-brown-dark px-6 py-3 rounded-full text-sm font-medium hover:bg-sage-light/40 transition-all cursor-pointer"
                >
                  {c.againButton}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
