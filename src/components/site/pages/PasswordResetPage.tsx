'use client'

// ---------------------------------------------------------------------------
// 🔐 صفحهٔ بازیابی رمز عبور — فاز ۴۰
//
// دو نمای اختصاصی (hash-based، هم‌خانوادهٔ #/pay):
//   • #/forgot-password            → فرم «ایمیل بده، لینک امن بفرست»
//   • #/reset-password?token=…     → فرم «رمز جدید + تأیید» با توکن یک‌بارمصرف
//
// امنیت UX:
//   • پاسخ فراموشی همیشه عمومی است (وجود/عدم‌وجود حساب لو نمی‌رود).
//   • رمزها با toggle قابل دیدن‌اند؛ autocomplete درست؛ هیچ رازی در URL نمی‌رود
//     (فقط توکن یک‌بارمصرف ۶۰ دقیقه‌ای که خودش بخشی از لینک ایمیلی است).
//   • توکن نامعتبر/منقضی/مصرف‌شده → کارت «درخواست لینک تازه».
// ---------------------------------------------------------------------------

import { useState } from 'react'
import { ArrowLeft, ArrowRight, Eye, EyeOff, KeyRound, Loader2, MailCheck, ShieldCheck, TriangleAlert } from 'lucide-react'
import { siteContent } from '@/content/site-content'

const c = siteContent.account

// هم‌خانوادهٔ استایل AccountPage
const inputCls =
  'w-full px-4 py-3 rounded-xl border border-sage-light/40 bg-cream/50 text-brown placeholder:text-brown-light/50 text-sm focus:outline-none focus:border-sage focus:ring-[3px] focus:ring-sage/20 transition-all'

const labelCls = 'block text-sm font-semibold text-brown-dark mb-2'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function PasswordResetPage({ mode, token }: { mode: 'forgot' | 'reset'; token: string }) {
  return (
    <div id="page-account-reset">
      <section className="pt-32 pb-24 md:pt-40 relative overflow-hidden">
        <div className="char-bg top-10 left-0" style={{ fontSize: '240px', opacity: 0.03 }}>
          安
        </div>
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-xl mx-auto">
            {/* هیرو */}
            <div className="text-center mb-10">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-sage-dark mb-3">
                <ShieldCheck className="w-3.5 h-3.5" /> Account Security
              </span>
              <h1 className="text-3xl md:text-5xl font-bold text-brown-dark mb-4">
                {mode === 'forgot' ? c.forgotTitle : c.resetTitle}
              </h1>
              <p className="text-brown-light">{mode === 'forgot' ? c.forgotSubtitle : c.resetSubtitle}</p>
            </div>

            {mode === 'forgot' ? <ForgotForm /> : <ResetForm token={token} />}
          </div>
        </div>
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ① فراموشی رمز — ایمیل بده (پاسخ همیشه عمومی)
// ---------------------------------------------------------------------------

function ForgotForm() {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email.trim() || !EMAIL_RE.test(email.trim())) {
      setError('Please enter a valid email address')
      return
    }
    setSending(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data: { error?: string } | null = await res.json().catch(() => null)
      if (res.ok) {
        setSent(true)
        return
      }
      setError(data?.error || 'Could not send the request. Please try again.')
    } catch {
      setError('Could not send the request. Please try again.')
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="bg-white rounded-3xl p-8 md:p-10 shadow-lg border border-sage-light/20 text-center animate-ct-fadeInUp">
        <div className="w-20 h-20 rounded-full bg-sage-light/40 mx-auto mb-6 flex items-center justify-center">
          <MailCheck className="w-9 h-9 text-sage-dark" />
        </div>
        <p className="text-brown leading-relaxed">{c.forgotSuccess}</p>
        <button
          type="button"
          onClick={() => {
            window.location.hash = '/account?tab=login'
          }}
          className="mt-8 bg-sage text-brown-dark px-8 py-3.5 rounded-2xl text-sm font-semibold hover:bg-sage-dark transition-colors cursor-pointer inline-flex items-center gap-2 min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" /> {c.forgotBackToLogin}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} noValidate className="bg-white rounded-3xl p-8 md:p-10 shadow-lg border border-sage-light/20 animate-ct-fadeInUp">
      <div>
        <label htmlFor="forgot-email" className={labelCls}>
          {c.email} *
        </label>
        <input
          id="forgot-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputCls}
          placeholder={c.emailPlaceholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'forgot-err' : undefined}
        />
        {error && (
          <p id="forgot-err" role="alert" className="text-xs text-red-500 mt-1.5">
            {error}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={sending}
        className="mt-8 bg-sage text-brown-dark w-full py-4 rounded-2xl text-base font-semibold flex items-center justify-center gap-2 hover:bg-sage-dark transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {sending ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" /> {c.forgotSending}
          </>
        ) : (
          <>
            {c.forgotSubmit} <ArrowRight className="w-[18px] h-[18px]" />
          </>
        )}
      </button>

      <p className="mt-6 text-sm text-brown-light text-center">
        <button
          type="button"
          onClick={() => {
            window.location.hash = '/account?tab=login'
          }}
          className="text-sage-dark font-semibold hover:underline cursor-pointer"
        >
          ← {c.forgotBackToLogin}
        </button>
      </p>
    </form>
  )
}

// ---------------------------------------------------------------------------
// ② رمز جدید با توکن — توکن از hash query می‌آید؛ یک‌بارمصرف
// ---------------------------------------------------------------------------

function ResetForm({ token }: { token: string }) {
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [invalid, setInvalid] = useState(false)
  const [error, setError] = useState('')

  // توکن نبود → همان نمای «لینک نامعتبر» (بدون فرم)
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return <InvalidView />

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const errs: Record<string, string> = {}
    if (pw.length < 8) errs.password = 'Password must be at least 8 characters'
    if (pw.length > 128) errs.password = 'Password is too long'
    if (confirm !== pw) errs.confirmPassword = 'Passwords do not match'
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      return
    }
    setFieldErrors({})
    setSending(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: pw, confirmPassword: confirm }),
      })
      const data: { error?: string; code?: string; errors?: Record<string, string> } | null = await res
        .json()
        .catch(() => null)
      if (res.ok) {
        setDone(true)
        return
      }
      if (data?.code === 'INVALID_TOKEN') {
        setInvalid(true)
        return
      }
      if (data?.errors && typeof data.errors === 'object') {
        setFieldErrors((prev) => ({ ...prev, ...data.errors }))
      }
      if (Object.keys(data?.errors ?? {}).length === 0) {
        setError(data?.error || 'Could not reset the password. Please try again.')
      }
    } catch {
      setError('Could not reset the password. Please try again.')
    } finally {
      setSending(false)
    }
  }

  if (invalid) return <InvalidView />
  if (done) {
    return (
      <div className="bg-white rounded-3xl p-8 md:p-10 shadow-lg border border-sage-light/20 text-center animate-ct-fadeInUp">
        <div className="w-20 h-20 rounded-full bg-sage-light/40 mx-auto mb-6 flex items-center justify-center text-3xl">
          🎉
        </div>
        <h2 className="text-xl font-bold text-brown-dark mb-3">{c.resetSuccessTitle}</h2>
        <p className="text-brown leading-relaxed">{c.resetSuccessText}</p>
        <button
          type="button"
          onClick={() => {
            window.location.hash = '/account?tab=login'
          }}
          className="mt-8 bg-sage text-brown-dark px-8 py-3.5 rounded-2xl text-sm font-semibold hover:bg-sage-dark transition-colors cursor-pointer inline-flex items-center gap-2 min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" /> {c.resetGoToLogin}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} noValidate className="bg-white rounded-3xl p-8 md:p-10 shadow-lg border border-sage-light/20 animate-ct-fadeInUp">
      {/* 🔑 نشان توکن — فقط ۶ کاراکتر اول برای اطمینان بصری کاربر (توکن کامل حساس نیست ولی محتاط می‌مانیم) */}
      <p className="flex items-center gap-2 text-xs text-brown-light bg-cream/60 border border-sage-light/25 rounded-xl px-4 py-3 mb-8">
        <KeyRound className="w-4 h-4 text-sage-dark flex-shrink-0" />
        Secure one-time reset link verified — valid for 60 minutes from the email.
      </p>

      <div className="space-y-6">
        <div>
          <label htmlFor="reset-password" className={labelCls}>
            {c.newPassword} *
          </label>
          <div className="relative">
            <input
              id="reset-password"
              type={showPw ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={pw}
              onChange={(e) => {
                setPw(e.target.value)
                setFieldErrors((prev) => {
                  if (!prev.password) return prev
                  const next = { ...prev }
                  delete next.password
                  return next
                })
              }}
              className={`${inputCls} pr-12`}
              placeholder={c.newPasswordPlaceholder}
              aria-invalid={fieldErrors.password ? true : undefined}
              aria-describedby={fieldErrors.password ? 'reset-err-password' : 'reset-hint'}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? c.hidePassword : c.showPassword}
              aria-pressed={showPw}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2.5 rounded-lg text-brown-light hover:text-brown hover:bg-cream/80 transition-colors cursor-pointer inline-flex items-center justify-center min-h-[40px] min-w-[40px]"
            >
              {showPw ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
            </button>
          </div>
          <p id="reset-hint" className="text-xs text-brown-light mt-1.5">
            {c.passwordHint}
          </p>
          {fieldErrors.password && (
            <p id="reset-err-password" role="alert" className="text-xs text-red-500 mt-1.5">
              {fieldErrors.password}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="reset-confirm" className={labelCls}>
            {c.confirmNewPassword} *
          </label>
          <div className="relative">
            <input
              id="reset-confirm"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value)
                setFieldErrors((prev) => {
                  if (!prev.confirmPassword) return prev
                  const next = { ...prev }
                  delete next.confirmPassword
                  return next
                })
              }}
              className={`${inputCls} pr-12`}
              placeholder={c.newPasswordPlaceholder}
              aria-invalid={fieldErrors.confirmPassword ? true : undefined}
              aria-describedby={fieldErrors.confirmPassword ? 'reset-err-confirm' : undefined}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              aria-label={showConfirm ? c.hidePassword : c.showPassword}
              aria-pressed={showConfirm}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2.5 rounded-lg text-brown-light hover:text-brown hover:bg-cream/80 transition-colors cursor-pointer inline-flex items-center justify-center min-h-[40px] min-w-[40px]"
            >
              {showConfirm ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
            </button>
          </div>
          {fieldErrors.confirmPassword && (
            <p id="reset-err-confirm" role="alert" className="text-xs text-red-500 mt-1.5">
              {fieldErrors.confirmPassword}
            </p>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-6 text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={sending}
        className="mt-8 bg-sage text-brown-dark w-full py-4 rounded-2xl text-base font-semibold flex items-center justify-center gap-2 hover:bg-sage-dark transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {sending ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" /> {c.resetSending}
          </>
        ) : (
          <>
            {c.resetSubmit} <ArrowRight className="w-[18px] h-[18px]" />
          </>
        )}
      </button>
    </form>
  )
}

// کارت «لینک نامعتبر/منقضی/مصرف‌شده» — با مسیر رفع
function InvalidView() {
  return (
    <div className="bg-white rounded-3xl p-8 md:p-10 shadow-lg border border-sage-light/20 text-center animate-ct-fadeInUp">
      <div className="w-20 h-20 rounded-full bg-amber-100/70 mx-auto mb-6 flex items-center justify-center">
        <TriangleAlert className="w-9 h-9 text-amber-600" />
      </div>
      <h2 className="text-xl font-bold text-brown-dark mb-3">{c.resetInvalidTitle}</h2>
      <p className="text-brown leading-relaxed">{c.resetInvalidText}</p>
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => {
            window.location.hash = '/forgot-password'
          }}
          className="bg-sage text-brown-dark px-8 py-3.5 rounded-2xl text-sm font-semibold hover:bg-sage-dark transition-colors cursor-pointer inline-flex items-center gap-2 min-h-[44px]"
        >
          <KeyRound className="w-4 h-4" /> {c.resetRequestNew}
        </button>
        <button
          type="button"
          onClick={() => {
            window.location.hash = '/account?tab=login'
          }}
          className="px-8 py-3.5 rounded-2xl text-sm font-semibold border border-sage-light/50 bg-white/70 text-brown hover:border-sage transition-colors cursor-pointer inline-flex items-center gap-2 min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" /> {c.forgotBackToLogin}
        </button>
      </div>
    </div>
  )
}
