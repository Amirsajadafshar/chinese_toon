'use client'

// ---------------------------------------------------------------------------
// 👤 صفحهٔ حساب کاربری (/account) — فاز ۳۰
//
// سه نما: ① کارت تب‌دار ثبت‌نام/ورود (کاربر مهمان) ② پروفایل + کلاس‌ها و
// پرداخت‌ها (کاربر واردشده) ③ اسکلتون ظریف تا رسیدن پاسخ /api/auth/me.
// اعتبارسنجی سمت کلاینت + ادغام خطاهای فیلد-محور سرور (errors: field→msg).
// استایل هم‌خانوادهٔ RegisterPage: کارت سفید rounded-3xl + لهجهٔ سیج.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Clock,
  Copy,
  Eye,
  EyeOff,
  Globe,
  GraduationCap,
  Loader2,
  LogOut,
  Phone,
  Send,
  Wallet,
} from 'lucide-react'
import { siteContent, PageKey } from '@/content/site-content'
import { AccountSchedule } from '@/components/site/AccountSchedule'
import { AccountNotifications } from '@/components/site/AccountNotifications'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { COUNTRIES, flagFromCode } from '@/lib/countries'
import { refreshUser, logoutUser, useUser, OrderLike } from '@/lib/user-store'
import { resilientJsonFetch } from '@/lib/client-fetch'
import { appNavigate } from '@/lib/nav'

const c = siteContent.account

// هم‌خانوادهٔ استایل RegisterPage
const inputCls =
  'w-full px-4 py-3 rounded-xl border border-sage-light/40 bg-cream/50 text-brown placeholder:text-brown-light/50 text-sm focus:outline-none focus:border-sage focus:ring-[3px] focus:ring-sage/20 transition-all'

const labelCls = 'block text-sm font-medium text-brown-dark mb-2'

// اعتبارسنجی ایمیل سمت کلاینت — جدا از نسخهٔ سرور (user-auth برای کلاینت قابل ایمپورت نیست)
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// 🔁 مقصد ذخیره‌شدهٔ پرداخت — اگر کاربر از صفحهٔ پرداخت گیت‌شده بیاید، بعد از
// ورود/ثبت‌نام موفق به همان مسیر برمی‌گردد (با CheckoutPage هماهنگ است)
const PAY_REDIRECT_KEY = 'ct-pay-redirect'

function consumePayRedirect(go: (path: string) => void): boolean {
  try {
    const target = sessionStorage.getItem(PAY_REDIRECT_KEY)
    // 🛡️ فاز ۳۶ — فقط مسیرهای درون‌برنامه‌ای معتبر (شروع با /) پذیرفته می‌شوند
    // تا هیچ مقدار خراب/دستکاری‌شده‌ای به ناوبری تزریق نشود
    if (target && target.startsWith('/')) {
      sessionStorage.removeItem(PAY_REDIRECT_KEY)
      go(target)
      return true
    }
    if (target) sessionStorage.removeItem(PAY_REDIRECT_KEY)
  } catch {
    // بی‌اهمیت — بدون حافظه فقط در نمای پروفایل می‌مانیم
  }
  return false
}

/** تاریخ انسانی برای نمایش — سایت انگلیسی است */
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return iso
  }
}

interface AccountPageProps {
  onNavigate: (page: PageKey) => void
  onToast: (message: string) => void
  /** ناوبری به مسیر دلخواه (/forgot-password، /pay/<ref> و…) — روت‌های واقعی */
  go: (path: string) => void
}

export function AccountPage({ onNavigate, onToast, go }: AccountPageProps) {
  const { loading, user, orders } = useUser()
  const [tab, setTab] = useState<'register' | 'login'>('register')

  // 🔁 /account?tab=login — بعد از تغییر رمز، لینک «Go to Sign In» اینجا می‌آید.
  // صفحه در هر ناوبری از نو mount می‌شود، پس خواندن پارامتر در mount کافی است.
  const searchParams = useSearchParams()
  useEffect(() => {
    if (searchParams.get('tab') === 'login') setTab('login')
  }, [searchParams])

  // 👁️ نشان‌دهندهٔ گذرواژه (فرم ثبت‌نام و ورود)
  const [showRegPw, setShowRegPw] = useState(false)
  const [showRegConfirmPw, setShowRegConfirmPw] = useState(false)
  const [showLoginPw, setShowLoginPw] = useState(false)
  // 🔁 Remember me — پیش‌فرض فعال (مثل رفتار قبلی؛ کوکی ۳۰روزه)
  const [remember, setRemember] = useState(true)

  // 📝 فرم ثبت‌نام + خطاهای فیلد-محور (کلاینت + ادغام پاسخ سرور)
  const [regForm, setRegForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    dob: '',
    telegram: '',
    country: '',
    phone: '',
  })
  const [regErrors, setRegErrors] = useState<Record<string, string>>({})
  const [regError, setRegError] = useState('')
  const [regSending, setRegSending] = useState(false)

  // 🎂 سقف تاریخ تولد = ۵ سال پیش (حداقل سن ۵ سال) — بعد از mount ست می‌شود
  // تا hydration-mismatch نداشته باشیم
  const [maxDob, setMaxDob] = useState('')
  useEffect(() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() - 5)
    setMaxDob(d.toISOString().slice(0, 10))
  }, [])

  // 🔑 فرم ورود
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [loginError, setLoginError] = useState('')
  const [loginSending, setLoginSending] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  // 🗣️ فاز ۶۱ — بعد از ورود از بخشی غیر از جریان کلاس‌ها: اگر کاربر هنوز هیچ
  // ثبت‌نام/سفارشی ندارد، از او می‌پرسیم که آیا می‌خواهد ثبت‌نام کلاس را کامل
  // کند (اطلاعات پایهٔ حساب — نام و ایمیل — خودکار در فرم استفاده می‌شود).
  const [askRegister, setAskRegister] = useState(false)

  // 🌍 سلکتور کشور — جست‌وجوی زنده + فهرست مرتب‌شدهٔ الفبایی
  const [countryQuery, setCountryQuery] = useState('')
  const sortedCountries = useMemo(() => [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name)), [])
  const filteredCountries = useMemo(() => {
    const q = countryQuery.trim().toLowerCase()
    if (!q) return sortedCountries
    return sortedCountries.filter((co) => co.name.toLowerCase().includes(q))
  }, [countryQuery, sortedCountries])

  const setReg = (key: keyof typeof regForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.value
    setRegForm((f) => ({ ...f, [key]: value }))
    // با ویرایش فیلد، خطای همان فیلد پاک می‌شود
    setRegErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  // خواص دسترس‌پذیری خطای هر فیلد
  const errProps = (field: string) => ({
    'aria-invalid': regErrors[field] ? true : undefined,
    'aria-describedby': regErrors[field] ? `acc-err-${field}` : undefined,
  })

  // -----------------------------------------------------------------
  // 📝 ثبت‌نام
  // -----------------------------------------------------------------
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    // بررسی‌های سمت کلاینت — خطاهای فیلد-محور
    const errs: Record<string, string> = {}
    if (!regForm.firstName.trim()) errs.firstName = 'First name is required'
    if (!regForm.lastName.trim()) errs.lastName = 'Last name is required'
    if (!regForm.email.trim()) errs.email = 'Email is required'
    else if (!EMAIL_RE.test(regForm.email.trim())) errs.email = 'Please enter a valid email address'
    if (regForm.password.length < 8) errs.password = 'Password must be at least 8 characters'
    if (regForm.confirmPassword !== regForm.password) errs.confirmPassword = 'Passwords do not match'
    // 🎂 تاریخ تولد اجباری — همان قواعد سرور (YYYY-MM-DD، حداقل ۵ سال، نه قبل از ۱۹۰۰)
    if (!regForm.dob) errs.dob = 'Date of birth is required'
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(regForm.dob)) errs.dob = 'Please enter a valid date of birth'
    else if ((maxDob && regForm.dob > maxDob) || regForm.dob < '1900-01-01')
      errs.dob = 'You must be at least 5 years old to create an account'
    if (!regForm.country) errs.country = 'Please select your country'

    if (Object.keys(errs).length > 0) {
      setRegErrors(errs)
      setRegError('')
      return
    }

    setRegSending(true)
    setRegError('')
    setRegErrors({})
    try {
      // 🌐 فاز ۶۲ — fetch تاب‌آور: روی خطای شبکه/502 خودش دوباره تلاش می‌کند
      // و پیام صادقانه و قابل‌اقدام می‌دهد (ریشهٔ «Could not create the account»)
      const result = await resilientJsonFetch<{
        error?: string
        errors?: Record<string, string>
        ref?: string
      }>('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: regForm.firstName,
          lastName: regForm.lastName,
          email: regForm.email,
          password: regForm.password,
          confirmPassword: regForm.confirmPassword,
          telegram: regForm.telegram,
          countryCode: regForm.country, // سرور نام کشور را از روی کد ISO تعیین می‌کند
          dateOfBirth: regForm.dob, // 🎂 اجباری
          phone: regForm.phone,
        }),
      })

      if (result.ok) {
        onToast(c.welcomeToast)
        await refreshUser()
        // اگر از دروازهٔ پرداخت آمده بودیم، به همان‌جا برمی‌گردیم
        consumePayRedirect(go)
        return
      }

      // ۴۰۰/۴۰۹: خطاهای فیلد-محور سرور زیر فیلدها ادغام می‌شوند
      if (result.kind === 'http' && result.data && typeof result.data === 'object') {
        const data = result.data as { error?: string; errors?: Record<string, string>; ref?: string }
        if (data.errors && typeof data.errors === 'object' && Object.keys(data.errors).length > 0) {
          setRegErrors((prev) => ({ ...prev, ...data.errors }))
          // بنر عمومیِ «فیلدها را درست کنید» با خطاهای زیر فیلدها تکرار می‌شود —
          // فقط پیام‌های خاص (مثل ایمیل تکراری) در کادر پایین نشان داده می‌شود.
          setRegError(
            data.error && data.error !== 'Please fix the highlighted fields' ? data.error : ''
          )
        } else {
          // 🆔 فاز ۶۳ — کد رهگیری خطا در پیام نمایش داده می‌شود تا قابل گزارش باشد
          const base = data.error || result.message
          setRegError(data.ref ? `${base} (Ref: ${data.ref})` : base)
        }
      } else {
        // unreachable / badjson — پیام صادقانهٔ تلاش‌مجدد
        setRegError(result.message)
      }
    } catch {
      setRegError('Could not create the account. Please try again.')
    } finally {
      setRegSending(false)
    }
  }

  // -----------------------------------------------------------------
  // 🔑 ورود
  // -----------------------------------------------------------------
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    if (!loginForm.email.trim() || !loginForm.password) {
      setLoginError('Email and password are required')
      return
    }
    setLoginSending(true)
    try {
      // 🌐 فاز ۶۲ — fetch تاب‌آور (ریشهٔ «Could not sign in» هنگام ری‌استارت لحظه‌ای سرور)
      const result = await resilientJsonFetch<{ error?: string; ref?: string }>('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginForm.email, password: loginForm.password, remember }),
      })
      if (result.ok) {
        onToast(c.welcomeBackToast)
        await refreshUser()
        // اگر از دروازهٔ پرداخت آمده بودیم، به همان‌جا برمی‌گردیم
        const returnedToPay = consumePayRedirect(go)
        // 🗣️ فاز ۶۱ — ورود از خارج از جریان کلاس‌ها + بدون هیچ ثبت‌نامی →
        // می‌پرسیم: «ثبت‌نام کلاس را کامل می‌کنی؟» (اطلاعات پایهٔ حساب
        // حتماً لازم است و به‌طور خودکار در فرم ثبت‌نام استفاده می‌شود)
        if (!returnedToPay) {
          try {
            const meRes = await fetch('/api/auth/me', { cache: 'no-store' })
            const me = (await meRes.json().catch(() => null)) as { orders?: unknown } | null
            const hasOrders = Array.isArray(me?.orders) && (me?.orders as unknown[]).length > 0
            if (!hasOrders) setAskRegister(true)
          } catch {
            /* خطای شبکه — پرسش فرصتی است، اجباری نیست */
          }
        }
        return
      }
      // پیام صادقانه: خطای واقعی سرور (مثل «Incorrect email or password») یا
      // پیام تلاش‌مجدد برای unreachable — هر دو بدون افشای اطلاعات حساس
      // 🆔 فاز ۶۳ — کد رهگیری خطا در پیام نمایش داده می‌شود
      const loginBase = result.message
      const loginRef =
        result.kind === 'http' && result.data && typeof result.data === 'object'
          ? (result.data as { ref?: string }).ref
          : undefined
      setLoginError(loginRef ? `${loginBase} (Ref: ${loginRef})` : loginBase)
    } catch {
      setLoginError('Could not sign in. Please try again.')
    } finally {
      setLoginSending(false)
    }
  }

  // -----------------------------------------------------------------
  // 👋 خروج
  // -----------------------------------------------------------------
  const handleLogout = async () => {
    setSigningOut(true)
    try {
      await logoutUser()
      onToast(c.signedOutToast)
    } finally {
      setSigningOut(false)
    }
  }

  // سربرگ هیرو بسته به نما عوض می‌شود
  const hero = user
    ? { title: c.profileTitle, subtitle: '' }
    : tab === 'register'
      ? { title: c.regTitle, subtitle: c.regSubtitle }
      : { title: c.loginTitle, subtitle: c.loginSubtitle }

  return (
    <div id="page-account">
      <section className="pt-32 pb-24 md:pt-40 relative overflow-hidden">
        <div className="char-bg top-10 left-0" style={{ fontSize: '240px', opacity: 0.03 }}>
          人
        </div>
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mx-auto">
            {/* هیرو — هم‌خانوادهٔ RegisterPage */}
            <div className="text-center mb-10">
              <span className="inline-block text-xs font-semibold uppercase tracking-widest text-sage-dark mb-3">
                {c.eyebrow}
              </span>
              <h1 className="text-3xl md:text-5xl font-bold text-brown-dark mb-4">{hero.title}</h1>
              {hero.subtitle && <p className="text-brown-light">{hero.subtitle}</p>}
            </div>

            {/* ⏳ اسکلتون ظریف تا پاسخ /api/auth/me — بدون پرش ناگهانی چیدمان */}
            {loading ? (
              <div
                className="bg-white rounded-3xl p-8 md:p-10 shadow-lg border border-sage-light/20"
                role="status"
                aria-label="Loading account"
              >
                <div className="animate-pulse flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-cream mb-6"></div>
                  <div className="h-4 w-40 bg-cream rounded-full mb-3"></div>
                  <div className="h-3 w-56 bg-cream/70 rounded-full mb-8"></div>
                  <div className="h-12 w-full bg-cream/70 rounded-2xl"></div>
                  <div className="h-12 w-full bg-cream/50 rounded-2xl mt-3"></div>
                  <div className="h-14 w-full bg-sage-light/40 rounded-2xl mt-6"></div>
                </div>
              </div>
            ) : user ? (
              <ProfileView
                orders={orders ?? []}
                signingOut={signingOut}
                onLogout={handleLogout}
                onNavigate={onNavigate}
                onToast={onToast}
              />
            ) : (
              <div className="bg-white rounded-3xl p-8 md:p-10 shadow-lg border border-sage-light/20">
                {/* 🎟️ تب‌های ثبت‌نام / ورود */}
                <div className="flex bg-cream rounded-2xl p-1.5 border border-sage-light/25 mb-8" role="tablist" aria-label="Account">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === 'register'}
                    onClick={() => setTab('register')}
                    className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer min-h-[44px] ${
                      tab === 'register' ? 'bg-white text-brown-dark shadow-sm' : 'text-brown-light hover:text-brown'
                    }`}
                  >
                    {c.tabRegister}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === 'login'}
                    onClick={() => setTab('login')}
                    className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer min-h-[44px] ${
                      tab === 'login' ? 'bg-white text-brown-dark shadow-sm' : 'text-brown-light hover:text-brown'
                    }`}
                  >
                    {c.tabLogin}
                  </button>
                </div>

                {tab === 'register' ? (
                  /* ---------------- 📝 فرم ثبت‌نام ---------------- */
                  <form onSubmit={handleRegister} noValidate className="space-y-6 animate-ct-fadeInUp">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="acc-firstName" className={labelCls}>
                          {c.firstName} *
                        </label>
                        <input
                          id="acc-firstName"
                          type="text"
                          autoComplete="given-name"
                          required
                          value={regForm.firstName}
                          onChange={setReg('firstName')}
                          className={inputCls}
                          placeholder={c.firstNamePlaceholder}
                          {...errProps('firstName')}
                        />
                        <FieldError id="acc-err-firstName" msg={regErrors.firstName} />
                      </div>
                      <div>
                        <label htmlFor="acc-lastName" className={labelCls}>
                          {c.lastName} *
                        </label>
                        <input
                          id="acc-lastName"
                          type="text"
                          autoComplete="family-name"
                          required
                          value={regForm.lastName}
                          onChange={setReg('lastName')}
                          className={inputCls}
                          placeholder={c.lastNamePlaceholder}
                          {...errProps('lastName')}
                        />
                        <FieldError id="acc-err-lastName" msg={regErrors.lastName} />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="acc-email" className={labelCls}>
                        {c.email} *
                      </label>
                      <input
                        id="acc-email"
                        type="email"
                        autoComplete="email"
                        required
                        value={regForm.email}
                        onChange={setReg('email')}
                        className={inputCls}
                        placeholder={c.emailPlaceholder}
                        {...errProps('email')}
                      />
                      <FieldError id="acc-err-email" msg={regErrors.email} />
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="acc-password" className={labelCls}>
                          {c.password} *
                        </label>
                        <div className="relative">
                          <input
                            id="acc-password"
                            type={showRegPw ? 'text' : 'password'}
                            autoComplete="new-password"
                            required
                            value={regForm.password}
                            onChange={setReg('password')}
                            className={`${inputCls} pr-12`}
                            placeholder={c.passwordPlaceholder}
                            {...errProps('password')}
                            aria-describedby={regErrors.password ? 'acc-err-password' : 'acc-password-hint'}
                          />
                          <PasswordToggle
                            shown={showRegPw}
                            onToggle={() => setShowRegPw((v) => !v)}
                            showLabel={c.showPassword}
                            hideLabel={c.hidePassword}
                          />
                        </div>
                        <p id="acc-password-hint" className="text-xs text-brown-light mt-1.5">{c.passwordHint}</p>
                        <FieldError id="acc-err-password" msg={regErrors.password} />
                      </div>
                      <div>
                        <label htmlFor="acc-confirmPassword" className={labelCls}>
                          {c.confirmPassword} *
                        </label>
                        <div className="relative">
                          <input
                            id="acc-confirmPassword"
                            type={showRegConfirmPw ? 'text' : 'password'}
                            autoComplete="new-password"
                            required
                            value={regForm.confirmPassword}
                            onChange={setReg('confirmPassword')}
                            className={`${inputCls} pr-12`}
                            placeholder={c.confirmPasswordPlaceholder}
                            {...errProps('confirmPassword')}
                          />
                          <PasswordToggle
                            shown={showRegConfirmPw}
                            onToggle={() => setShowRegConfirmPw((v) => !v)}
                            showLabel={c.showPassword}
                            hideLabel={c.hidePassword}
                          />
                        </div>
                        <FieldError id="acc-err-confirmPassword" msg={regErrors.confirmPassword} />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="acc-telegram" className={labelCls}>
                        {c.telegram}
                      </label>
                      <input
                        id="acc-telegram"
                        type="text"
                        autoComplete="off"
                        value={regForm.telegram}
                        onChange={setReg('telegram')}
                        className={inputCls}
                        placeholder={c.telegramPlaceholder}
                        {...errProps('telegram')}
                      />
                      <p className="text-xs text-brown-light mt-1.5">{c.telegramHint}</p>
                      <FieldError id="acc-err-telegram" msg={regErrors.telegram} />
                    </div>

                    {/* 🌍 سلکتور کشور — الزامی، با جست‌وجوی زندهٔ نام کشور */}
                    <div>
                      <label htmlFor="acc-country" className={labelCls}>
                        {c.country} *
                      </label>
                      <input
                        type="text"
                        value={countryQuery}
                        onChange={(e) => setCountryQuery(e.target.value)}
                        className={`${inputCls} mb-2`}
                        placeholder={c.countrySearch}
                        aria-label={c.countrySearch}
                        autoComplete="off"
                      />
                      <select
                        id="acc-country"
                        required
                        value={regForm.country}
                        onChange={setReg('country')}
                        className={`${inputCls} appearance-none ${regForm.country ? '' : 'text-brown-light/60'}`}
                        {...errProps('country')}
                      >
                        <option value="" disabled>
                          {c.countryPlaceholder}
                        </option>
                        {filteredCountries.map((co) => (
                          <option key={co.code} value={co.code}>
                            {flagFromCode(co.code)} {co.name}
                          </option>
                        ))}
                      </select>
                      <FieldError id="acc-err-country" msg={regErrors.country} />
                    </div>

                    {/* 📞🎂 تلفن (اختیاری) + تاریخ تولد (اجباری) کنار هم */}
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="acc-phone" className={labelCls}>
                          {c.phone}
                        </label>
                        <input
                          id="acc-phone"
                          type="tel"
                          autoComplete="tel"
                          value={regForm.phone}
                          onChange={setReg('phone')}
                          className={inputCls}
                          placeholder={c.phonePlaceholder}
                          {...errProps('phone')}
                        />
                        <p className="text-xs text-brown-light mt-1.5">{c.phoneHint}</p>
                        <FieldError id="acc-err-phone" msg={regErrors.phone} />
                      </div>
                      <div>
                        <label htmlFor="acc-dob" className={labelCls}>
                          {c.dob} *
                        </label>
                        <input
                          id="acc-dob"
                          type="date"
                          autoComplete="bday"
                          required
                          min="1900-01-01"
                          max={maxDob || undefined}
                          value={regForm.dob}
                          onChange={setReg('dob')}
                          className={inputCls}
                          {...errProps('dob')}
                        />
                        <FieldError id="acc-err-dob" msg={regErrors.dob} />
                      </div>
                    </div>

                    {regError && (
                      <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                        {regError}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={regSending}
                      className="bg-sage text-brown-dark w-full py-4 rounded-2xl text-base font-semibold flex items-center justify-center gap-2 hover:bg-sage-dark transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {regSending ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" /> {c.creatingAccount}
                        </>
                      ) : (
                        <>
                          {c.createAccount} <ArrowRight className="w-[18px] h-[18px]" />
                        </>
                      )}
                    </button>

                    <p className="text-sm text-brown-light text-center">
                      {c.haveAccount}{' '}
                      <button
                        type="button"
                        onClick={() => setTab('login')}
                        className="text-sage-dark font-semibold hover:underline cursor-pointer"
                      >
                        {c.haveAccountLink}
                      </button>
                    </p>
                  </form>
                ) : (
                  /* ---------------- 🔑 فرم ورود ---------------- */
                  <form onSubmit={handleLogin} noValidate className="space-y-6 animate-ct-fadeInUp">
                    <div>
                      <label htmlFor="acc-login-email" className={labelCls}>
                        {c.email} *
                      </label>
                      <input
                        id="acc-login-email"
                        type="email"
                        autoComplete="email"
                        required
                        value={loginForm.email}
                        onChange={(e) => setLoginForm((f) => ({ ...f, email: e.target.value }))}
                        className={inputCls}
                        placeholder={c.emailPlaceholder}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <label htmlFor="acc-login-password" className={`${labelCls} mb-0`}>
                          {c.password} *
                        </label>
                        {/* 🔁 فراموشی رمز — به روت اختصاصی /forgot-password می‌رود */}
                        <button
                          type="button"
                          onClick={() => {
                            go('/forgot-password')
                          }}
                          className="text-xs font-semibold text-sage-dark hover:underline cursor-pointer min-h-[44px] inline-flex items-center"
                        >
                          {c.forgotPasswordLink}
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          id="acc-login-password"
                          type={showLoginPw ? 'text' : 'password'}
                          autoComplete="current-password"
                          required
                          value={loginForm.password}
                          onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
                          className={`${inputCls} pr-12`}
                          placeholder={c.passwordPlaceholder}
                        />
                        <PasswordToggle
                          shown={showLoginPw}
                          onToggle={() => setShowLoginPw((v) => !v)}
                          showLabel={c.showPassword}
                          hideLabel={c.hidePassword}
                        />
                      </div>
                    </div>

                    {/* 🔁 Remember me — چک‌باکس سفارشی با لهجهٔ سیج */}
                    <label
                      htmlFor="acc-login-remember"
                      className="flex items-center gap-3 cursor-pointer select-none w-fit min-h-[44px]"
                    >
                      <input
                        id="acc-login-remember"
                        type="checkbox"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                        className="w-5 h-5 rounded border-sage-light/50 text-sage focus:ring-sage/30 accent-[#b8cf9f] cursor-pointer"
                      />
                      <span className="text-sm text-brown">{c.rememberMe}</span>
                    </label>

                    {loginError && (
                      <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3" role="alert">
                        {loginError}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={loginSending}
                      className="bg-sage text-brown-dark w-full py-4 rounded-2xl text-base font-semibold flex items-center justify-center gap-2 hover:bg-sage-dark transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {loginSending ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" /> {c.signingIn}
                        </>
                      ) : (
                        <>
                          {c.signIn} <ArrowRight className="w-[18px] h-[18px]" />
                        </>
                      )}
                    </button>

                    <p className="text-xs text-brown-light text-center leading-relaxed">{c.forgotHint}</p>

                    <p className="text-sm text-brown-light text-center">
                      {c.noAccount}{' '}
                      <button
                        type="button"
                        onClick={() => setTab('register')}
                        className="text-sage-dark font-semibold hover:underline cursor-pointer"
                      >
                        {c.noAccountLink}
                      </button>
                    </p>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 🗣️ فاز ۶۱ — پرسشِ بعد از ورود: تکمیل ثبت‌نام کلاس (وقتی ثبت‌نامی وجود ندارد) */}
      <Dialog open={askRegister && !!user} onOpenChange={(open) => !open && setAskRegister(false)}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-brown-dark flex items-center gap-2">
              <span className="w-9 h-9 rounded-xl bg-sage-light/30 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-4.5 h-4.5 text-sage-dark" />
              </span>
              {user?.firstName && user?.lastName
                ? 'Ready to join a class?'
                : 'Complete your basic info'}
            </DialogTitle>
            <DialogDescription className="text-brown-light text-left leading-relaxed">
              {user?.firstName && user?.lastName ? (
                <>
                  Welcome back, {user.firstName}! You don&apos;t have a class registration yet.
                  Your basic profile info ({user.firstName} {user.lastName} · {user.email}) will be
                  used automatically — would you like to pick your course and continue to payment now?
                </>
              ) : (
                <>
                  Your account is missing basic details (first/last name) required for class
                  registration. Please contact support so we can complete your profile.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {user?.firstName && user?.lastName && (
            <div className="flex flex-col sm:flex-row gap-3 mt-1">
              <button
                type="button"
                onClick={() => {
                  setAskRegister(false)
                  go('/register')
                }}
                className="bg-sage text-brown-dark flex-1 px-5 py-3 rounded-xl text-sm font-bold hover:bg-sage-dark transition-colors cursor-pointer inline-flex items-center justify-center gap-2 min-h-[48px]"
              >
                <BookOpen className="w-4 h-4" />
                Choose your course <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setAskRegister(false)}
                className="px-5 py-3 rounded-xl text-sm font-medium text-brown-light hover:text-brown hover:bg-cream/70 transition-colors cursor-pointer min-h-[48px]"
              >
                Later
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 👋 نمای پروفایل + کلاس‌ها و پرداخت‌ها
// ---------------------------------------------------------------------------

function ProfileView({
  orders,
  signingOut,
  onLogout,
  onNavigate,
  onToast,
}: {
  orders: OrderLike[]
  signingOut: boolean
  onLogout: () => void
  onNavigate: (page: PageKey) => void
  onToast: (message: string) => void
}) {
  const { user } = useUser()
  if (!user) return null
  // حروف اول نام برای آواتار — با گارد نام خالی
  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase() || 'CT'

  return (
    <div className="animate-ct-fadeInUp">
      {/* کارت پروفایل */}
      <div className="bg-white rounded-3xl p-8 md:p-10 shadow-lg border border-sage-light/20">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 mb-8">
          {/* آواتار حرف‌اول — پس‌زمینهٔ سیج */}
          <span
            className="w-20 h-20 rounded-full bg-sage text-brown-dark flex items-center justify-center text-2xl font-bold flex-shrink-0 shadow-sm"
            aria-hidden="true"
          >
            {initials}
          </span>
          <div className="text-center sm:text-left min-w-0 flex-1">
            <h2 className="text-2xl font-bold text-brown-dark">
              {user.firstName} {user.lastName}
            </h2>
            <p className="text-sm text-brown-light mt-1 break-all">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            disabled={signingOut}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-sage-light/50 bg-white/70 text-sm font-semibold text-brown hover:border-sage hover:text-brown-dark transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px] flex-shrink-0"
          >
            {signingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            {c.logout}
          </button>
        </div>

        {/* 🆔 فاز ۶۰ — کد یکتای پایدار دانش‌پذیر: از DB می‌آید و هرگز عوض نمی‌شود */}
        {user.uniqueCode && (
          <div className="mb-8 rounded-2xl border border-sage/30 bg-sage-light/20 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-sage-dark mb-1">{c.uniqueCode}</p>
              <p className="font-mono text-2xl font-extrabold text-brown-dark tracking-wider" dir="ltr">
                {user.uniqueCode}
              </p>
              <p className="text-[11px] text-brown-light mt-1.5 leading-relaxed">{c.uniqueCodeNote}</p>
            </div>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(user.uniqueCode ?? '')
                  onToast(c.uniqueCodeCopied)
                } catch {
                  // بدون clipboard — کد قابل خواندن است
                }
              }}
              className="inline-flex items-center justify-center gap-2 bg-white border border-sage-light/60 text-brown-dark px-5 py-2.5 rounded-xl text-sm font-bold hover:border-sage transition-colors cursor-pointer min-h-[44px] flex-shrink-0"
            >
              <Copy className="w-4 h-4" aria-hidden="true" /> {c.copyCode}
              <span className="sr-only">{c.uniqueCodeCopied}</span>
            </button>
          </div>
        )}

        {/* مشخصات حساب */}
        <dl className="grid sm:grid-cols-2 gap-4">
          <InfoBox label={c.memberSince} value={formatDate(user.createdAt)} icon={<CalendarDays className="w-4 h-4" />} />
          <InfoBox
            label={c.lastLogin}
            value={user.lastLoginAt ? formatDate(user.lastLoginAt) : '—'}
            icon={<Clock className="w-4 h-4" />}
          />
          <InfoBox
            label={c.country}
            value={`${flagFromCode(user.countryCode)} ${user.country}`}
            icon={<Globe className="w-4 h-4" />}
          />
          <InfoBox
            label={c.telegram}
            value={user.telegramUsername ? `@${user.telegramUsername}` : '—'}
            icon={<Send className="w-4 h-4" />}
          />
          <InfoBox label={c.phone} value={user.phone || '—'} icon={<Phone className="w-4 h-4" />} />
        </dl>
      </div>

      {/* کارت کلاس‌ها و پرداخت‌ها */}
      <div className="mt-8 bg-white rounded-3xl p-8 md:p-10 shadow-lg border border-sage-light/20">
        <h2 className="text-xl font-bold text-brown-dark mb-6 flex items-center gap-2.5">
          <span className="w-10 h-10 rounded-xl bg-sage-light/30 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-5 h-5 text-sage-dark" />
          </span>
          {c.myOrdersTitle}
        </h2>

        {orders.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-brown-light mb-6">{c.ordersEmpty}</p>
            <button
              type="button"
              onClick={() => onNavigate('classes')}
              className="bg-sage text-brown-dark px-6 py-3 rounded-full text-sm font-semibold hover:bg-sage-dark transition-colors cursor-pointer inline-flex items-center gap-2 min-h-[44px]"
            >
              <BookOpen className="w-4 h-4" /> {c.ordersEmptyCta}
            </button>
          </div>
        ) : (
          <ul className="space-y-4 max-h-96 overflow-y-auto pr-1">
            {orders.map((o) => (
              <OrderRow key={o.ref} order={o} />
            ))}
          </ul>
        )}
      </div>

      {/* 🔔 اعلان‌های حساب/سفارش/پرداخت — سیستم واحد درون‌حسابی (فاز ۵۲) */}
      <AccountNotifications />

      {/* 🗓️ برنامهٔ جلسات من — پیشنهادها/تأییدشده‌ها + هشدارها (فاز ۴۸) */}
      <AccountSchedule onToast={onToast} />
    </div>
  )
}

function OrderRow({ order }: { order: OrderLike }) {
  // 🎓 وضعیت ثبت‌نام جدا از پرداخت — فقط وقتی پرداخت تأیید شده معنا دارد
  const enrollText: Record<string, string> = {
    ORDERED: c.enrollOrdered,
    PAID: c.enrollPaid,
    PREFERENCES_SUBMITTED: c.enrollPrefs,
    SCHEDULE_PROPOSED: c.enrollProposed,
    ENROLLED: c.enrollEnrolled,
    COMPLETED: c.enrollCompleted,
  }
  const enroll = order.enrollmentStatus ? enrollText[order.enrollmentStatus] : null
  return (
    <li className="bg-cream/60 border border-sage-light/25 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-brown-dark text-sm truncate">{order.productTitle}</p>
        <p className="text-xs text-brown-light font-mono mt-1">{order.ref}</p>
        <p className="text-xs text-brown-light mt-1">
          {formatDate(order.createdAt)}
          {order.status === 'PAID' && order.paidAt ? ` · ${c.orderPaidOn} ${formatDate(order.paidAt)}` : ''}
        </p>
        {/* 🎓 خط وضعیت ثبت‌نام — از رکوردهای واقعی دیتابیس، نه متن تزئینی */}
        {enroll && (
          <p className="text-[11px] font-semibold text-sage-dark mt-1.5 flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
            {enroll}
          </p>
        )}
        {/* 💳 فاز ۵۹ — روش پرداخت + دلیل ردّ (برای سفارش‌های ردشده) */}
        {order.paymentMethod !== 'USDT_TRON' && (
          <p className="text-[11px] text-brown-light mt-0.5">{siteContent.payments.ui.methodManual}</p>
        )}
        {order.status === 'REJECTED' && order.rejectionReason && (
          <p className="text-[11px] font-semibold text-peach-dark mt-1.5 bg-peach/10 border border-peach/40 rounded-lg px-2.5 py-1.5" dir="auto">
            {siteContent.payments.ui.rejectedReasonLabel}: {order.rejectionReason}
          </p>
        )}
        {order.nextSessionAt && (
          <p className="text-[11px] text-brown-light mt-0.5">
            {c.nextSessionLabel}: {formatDate(order.nextSessionAt)}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3 flex-wrap md:justify-end">
        <span className="font-bold text-brown-dark tabular-nums text-sm">${order.amountUsd} USD</span>
        <StatusBadge status={order.status} />
        {(order.status === 'PENDING' || order.status === 'RECEIPT_SUBMITTED' || order.status === 'REJECTED') && (
          <button
            type="button"
            onClick={() => {
              appNavigate(`/pay/${order.ref}`)
            }}
            className="bg-sage text-brown-dark px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-sage-dark transition-colors cursor-pointer inline-flex items-center gap-1.5 min-h-[44px]"
          >
            <Wallet className="w-3.5 h-3.5" /> {c.orderViewPayment}
          </button>
        )}
      </div>
    </li>
  )
}

// 🏷️ نشان وضعیت سفارش — رنگ‌بندی ثابت + برچسب خوانا از payments.ui.statusLabels
// فاز ۵۹ — RECEIPT_SUBMITTED (زیرِ بررسی) و REJECTED (ردّ ادمین) هم اضافه شدند
const STATUS_STYLES: Record<OrderLike['status'], string> = {
  PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
  DETECTED: 'bg-butter text-brown border-peach/40',
  PAID: 'bg-green-100 text-green-800 border-green-200',
  UNDERPAID: 'bg-orange-100 text-orange-800 border-orange-200',
  EXPIRED: 'bg-red-100/70 text-red-700/90 border-red-200/70',
  CANCELLED: 'bg-gray-100 text-gray-600 border-gray-200',
  RECEIPT_SUBMITTED: 'bg-sage-light/40 text-brown-dark border-sage-light/60',
  REJECTED: 'bg-peach/20 text-peach-dark border-peach/50',
}

function StatusBadge({ status }: { status: OrderLike['status'] }) {
  const label = siteContent.payments.ui.statusLabels[status] ?? status
  return (
    <span
      className={`text-[11px] font-bold uppercase tracking-wide px-3 py-1 rounded-full border ${STATUS_STYLES[status] ?? STATUS_STYLES.CANCELLED}`}
    >
      {label}
    </span>
  )
}

function InfoBox({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-cream/60 border border-sage-light/25 rounded-2xl px-4 py-3.5">
      <dt className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-brown-light mb-1">
        <span className="text-sage-dark">{icon}</span>
        {label}
      </dt>
      <dd className="text-sm font-semibold text-brown-dark break-words">{value}</dd>
    </div>
  )
}

function FieldError({ id, msg }: { id: string; msg?: string }) {
  if (!msg) return null
  return (
    <p id={id} role="alert" className="text-xs text-red-500 mt-1.5">
      {msg}
    </p>
  )
}

// 👁️ دکمهٔ نشان‌دادن/پنهان‌کردن گذرواژه — دسترس‌پذیر (aria-label + aria-pressed)
function PasswordToggle({
  shown,
  onToggle,
  showLabel,
  hideLabel,
}: {
  shown: boolean
  onToggle: () => void
  showLabel: string
  hideLabel: string
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? hideLabel : showLabel}
      aria-pressed={shown}
      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2.5 rounded-lg text-brown-light hover:text-brown hover:bg-cream/80 transition-colors cursor-pointer inline-flex items-center justify-center min-h-[40px] min-w-[40px]"
    >
      {shown ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
    </button>
  )
}
