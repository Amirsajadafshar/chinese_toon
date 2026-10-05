'use client'

// ---------------------------------------------------------------------------
// 🔐 صفحهٔ بازیابی رمز عبور — جریان کدمحور
//
// یک صفحه، دو مرحله:
//   ① /forgot-password — ایمیل بده ← کد ۶ رقمی ایمیل می‌شود
//   ② همان صفحه — کد + رمز جدید + تأیید ← رمز عوض می‌شود
//
// (/reset-password?token=… قدیمی به این صفحه ریدایرکت می‌شود.)
//
// امنیت UX:
//   • پاسخ فراموشی همیشه عمومی است (وجود/عدم‌وجود حساب لو نمی‌رود).
//   • رمزها با toggle قابل دیدن‌اند؛ autocomplete درست؛ هیچ رازی در URL نمی‌رود.
//   • کد نامعتبر/منقضی/مصرف‌شده → بنر خطا + دکمهٔ «درخواست کد جدید».
//   • در توسعهٔ محلیِ بدون ارائه‌دهنده ایمیل، کد از پاسخ API (devCode) خودکار
//     پر می‌شود تا کل جریان قابل تست باشد — در production هرگز.
// ---------------------------------------------------------------------------

import { useState } from 'react'
import { ArrowLeft, ArrowRight, Eye, EyeOff, KeyRound, Loader2, MailCheck, ShieldCheck, TriangleAlert } from 'lucide-react'
import { siteContent } from '@/content/site-content'
import { appNavigate } from '@/lib/nav'

const c = siteContent.account

// هم‌خانوادهٔ استایل AccountPage
const inputCls =
  'w-full px-4 py-3 rounded-xl border border-sage-light/40 bg-cream/50 text-brown placeholder:text-brown-light/50 text-sm focus:outline-none focus:border-sage focus:ring-[3px] focus:ring-sage/20 transition-all'

const labelCls = 'block text-sm font-semibold text-brown-dark mb-2'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function PasswordResetPage() {
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
              <h1 className="text-3xl md:text-5xl font-bold text-brown-dark mb-4">{c.forgotTitle}</h1>
              <p className="text-brown-light">{c.forgotSubtitle}</p>
            </div>

            <ResetFlow />
          </div>
        </div>
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// جریان دومرحله‌ای: ① ایمیل → ② کد + رمز جدید
// ---------------------------------------------------------------------------

type FlowStep = 'email' | 'code' | 'done'

function ResetFlow() {
  const [step, setStep] = useState<FlowStep>('email')
  const [email, setEmail] = useState('')
  const [devCode, setDevCode] = useState('')

  if (step === 'email') {
    return (
      <EmailStep
        email={email}
        setEmail={setEmail}
        onSent={(sentEmail, devCode) => {
          setEmail(sentEmail)
          setDevCode(devCode ?? '')
          setStep('code')
        }}
      />
    )
  }
  if (step === 'code') {
    return (
      <CodeStep
        email={email}
        initialCode={devCode}
        devAutoFilled={Boolean(devCode)}
        onBackToEmail={() => setStep('email')}
        onDone={() => setStep('done')}
      />
    )
  }
  return <DoneView />
}

// ---------------------------------------------------------------------------
// ① فراموشی رمز — ایمیل بده (پاسخ همیشه عمومی)
// ---------------------------------------------------------------------------

function EmailStep({
  email,
  setEmail,
  onSent,
}: {
  email: string
  setEmail: (v: string) => void
  onSent: (email: string, devCode?: string) => void
}) {
  const [sending, setSending] = useState(false)
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
      const data: { error?: string; devCode?: string } | null = await res.json().catch(() => null)
      if (res.ok) {
        onSent(email.trim(), typeof data?.devCode === 'string' ? data.devCode : undefined)
        return
      }
      setError(data?.error || 'Could not send the request. Please try again.')
    } catch {
      setError('Could not send the request. Please try again.')
    } finally {
      setSending(false)
    }
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
            appNavigate('/account?tab=login')
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
// ② کد تأیید + رمز جدید — همان صفحه، بدون بازکردن ایمیل روی دستگاه دیگر
// ---------------------------------------------------------------------------

function CodeStep({
  email,
  initialCode,
  devAutoFilled,
  onBackToEmail,
  onDone,
}: {
  email: string
  initialCode: string
  devAutoFilled: boolean
  onBackToEmail: () => void
  onDone: () => void
}) {
  const [code, setCode] = useState(initialCode)
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [sending, setSending] = useState(false)
  const [invalid, setInvalid] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setInvalid(false)
    const errs: Record<string, string> = {}
    if (!/^\d{6}$/.test(code.trim())) errs.code = 'Enter the 6-digit code from your email'
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
        body: JSON.stringify({ email, code: code.trim(), password: pw, confirmPassword: confirm }),
      })
      const data: { error?: string; code?: string; errors?: Record<string, string> } | null = await res
        .json()
        .catch(() => null)
      if (res.ok) {
        onDone()
        return
      }
      if (data?.code === 'INVALID_CODE') {
        setInvalid(true)
        setError(data?.error || '')
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

  return (
    <form onSubmit={submit} noValidate className="bg-white rounded-3xl p-8 md:p-10 shadow-lg border border-sage-light/20 animate-ct-fadeInUp">
      {/* 📬 بنر «کد ارسال شد» — بدون افشای وجود/عدم‌وجود حساب */}
      <div className="flex items-start gap-3 bg-cream/60 border border-sage-light/25 rounded-xl px-4 py-3 mb-8">
        <MailCheck className="w-4 h-4 text-sage-dark flex-shrink-0 mt-0.5" />
        <div className="text-xs text-brown-light leading-relaxed">
          <p>{c.codeSentTo.replace('{email}', email)}</p>
          {devAutoFilled && (
            <p className="mt-1 text-amber-600">Dev mode: verification code auto-filled for local testing.</p>
          )}
        </div>
      </div>

      {invalid && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-8" role="alert">
          <TriangleAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 leading-relaxed">
            <p>{c.resetInvalidText}</p>
            <button
              type="button"
              onClick={onBackToEmail}
              className="mt-1 font-semibold text-amber-800 hover:underline cursor-pointer"
            >
              {c.resetRequestNew}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <label htmlFor="reset-code" className={labelCls}>
            {c.codeLabel} *
          </label>
          <input
            id="reset-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/[^\d]/g, '').slice(0, 6))
              setFieldErrors((prev) => {
                if (!prev.code) return prev
                const next = { ...prev }
                delete next.code
                return next
              })
            }}
            className={`${inputCls} text-center text-xl font-bold tracking-[0.5em] font-mono`}
            placeholder={c.codePlaceholder}
            aria-invalid={fieldErrors.code ? true : undefined}
            aria-describedby={fieldErrors.code ? 'reset-err-code' : undefined}
          />
          {fieldErrors.code && (
            <p id="reset-err-code" role="alert" className="text-xs text-red-500 mt-1.5">
              {fieldErrors.code}
            </p>
          )}
        </div>

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

      {error && !invalid && (
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
            <KeyRound className="w-[18px] h-[18px]" /> {c.resetSubmit}
          </>
        )}
      </button>

      <p className="mt-6 text-sm text-brown-light text-center">
        <button
          type="button"
          onClick={onBackToEmail}
          className="text-sage-dark font-semibold hover:underline cursor-pointer"
        >
          ← {c.resetRequestNew}
        </button>
      </p>
    </form>
  )
}

// کارت موفقیت — بعد از تغییر رمز
function DoneView() {
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
          appNavigate('/account?tab=login')
        }}
        className="mt-8 bg-sage text-brown-dark px-8 py-3.5 rounded-2xl text-sm font-semibold hover:bg-sage-dark transition-colors cursor-pointer inline-flex items-center gap-2 min-h-[44px]"
      >
        <ArrowLeft className="w-4 h-4" /> {c.resetGoToLogin}
      </button>
    </div>
  )
}
