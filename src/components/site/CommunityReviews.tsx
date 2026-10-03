'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, Heart, PenLine, Quote, RefreshCw, Star, User } from 'lucide-react'
import { CurveDivider } from './CurveDivider'
import { siteContent } from '@/content/site-content'

const cm = siteContent.testimonials.community

// ---------------------------------------------------------------------
//  ✍️ بخش نظرات ثبت‌شدهٔ کاربران — صفحهٔ اختصاصی نظرات (#/reviews)
//  چپ: فرم «تجربهٔ خود را بنویسید» (ثبت در دیتابیس با وضعیت pending)
//  راست: نظرات تأییدشده (فقط بعد از تأیید ادمین در تب Reviews دیده می‌شوند)
// ---------------------------------------------------------------------

interface CommunityReview {
  id: string
  name: string
  role: string | null
  rating: number
  text: string
  likeCount: number
  likedByMe?: boolean
  createdAt: string
}

// حرف‌های اول برای آواتار (مثل SA)
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

const avatarColors = [
  'bg-sage-light/40 text-sage-dark',
  'bg-butter/40 text-brown',
  'bg-peach-light/50 text-brown',
]

// 🎨 رنگ ثابت بر اساس نام — بین رندر سرور/کلاینت یکسان می‌ماند
function colorFor(name: string): string {
  let sum = 0
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i)
  return avatarColors[sum % avatarColors.length]
}

export function CommunityReviews() {
  const [reviews, setReviews] = useState<CommunityReview[]>([])
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  // ❤️ لایک — شمارندهٔ مرجع سرور است؛ UI فقط از پاسخ موفق API به‌روز می‌شود
  const [likeBusy, setLikeBusy] = useState<string | null>(null)
  const [likeErrorId, setLikeErrorId] = useState<string | null>(null)

  // فرم
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [rating, setRating] = useState(5)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const [sent, setSent] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  // نظرات تأییدشده از سرور خوانده می‌شود — با هر ورود به صفحهٔ نظرات هم تازه شود
  // (تا تأیید ادمین در تب Reviews بلافاصله اینجا دیده شود)
  const load = useCallback(() => {
    setFailed(false)
    fetch('/api/testimonials')
      .then((res) => res.json())
      .then((data) => {
        setReviews(data.testimonials ?? [])
      })
      .catch(() => setFailed(true))
      .finally(() => setLoaded(true))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // ❤️ تاگل لایک — شمارندهٔ جدید فقط از پاسخ سرور؛ خطا = بدون تغییر قلابی
  const toggleLike = async (id: string) => {
    if (likeBusy) return
    setLikeBusy(id)
    setLikeErrorId(null)
    try {
      const res = await fetch('/api/testimonials/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        likeCount?: number
        liked?: boolean
      }
      if (!res.ok || typeof data.likeCount !== 'number' || typeof data.liked !== 'boolean') {
        setLikeErrorId(id)
        return
      }
      setReviews((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, likeCount: data.likeCount as number, likedByMe: data.liked } : r
        )
      )
    } catch {
      setLikeErrorId(id)
    } finally {
      setLikeBusy(null)
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(false)
    try {
      const res = await fetch('/api/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, role, rating, text }),
      })
      if (!res.ok) throw new Error()
      setSent(true)
      setName('')
      setRole('')
      setRating(5)
      setText('')
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  const stars = (n: number) =>
    Array.from({ length: n }, (_, i) => (
      <Star key={i} className="w-3.5 h-3.5 fill-butter text-butter" aria-hidden="true" />
    ))

  return (
    <section id="community-reviews" className="py-20 bg-sec-peach relative overflow-hidden">
      {/* 🌊 لبهٔ منحنی از هیروی کرم — هم‌خوان با سکشن نظرات خانه */}
      <CurveDivider fill="var(--color-cream)" />
      <div className="char-bg bottom-5 right-1/4" style={{ fontSize: '190px', opacity: 0.03 }} aria-hidden="true">
        评
      </div>
      <div className="max-w-7xl mx-auto px-6">
        {/* سرتیتر بخش */}
        <div className="text-center mb-14 scroll-animate">
          <span className="inline-flex items-center gap-1.5 bg-peach-light/40 rounded-full px-4 py-1.5 mb-3 text-xs font-semibold uppercase tracking-widest text-brown">
            <PenLine className="w-3.5 h-3.5" aria-hidden="true" /> {cm.eyebrow}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-brown-dark mb-4">{cm.title}</h2>
          <p className="text-brown-light max-w-2xl mx-auto">{cm.subtitle}</p>
        </div>

        <div className="grid lg:grid-cols-5 gap-8 items-start">
          {/* ---------- فرم ثبت نظر ---------- */}
          <div className="lg:col-span-2 scroll-animate">
            <div className="bg-cream rounded-3xl p-7 border border-sage-light/20 relative overflow-hidden">
              <span
                aria-hidden="true"
                className="char-bg pointer-events-none select-none -top-4 -right-2"
                style={{ fontSize: '120px', opacity: 0.05 }}
              >
                写
              </span>
              <h3 className="text-lg font-bold text-brown-dark mb-5 relative">{cm.formTitle}</h3>

              {sent ? (
                /* حالت موفق */
                <div className="text-center py-8 animate-ct-pop">
                  <CheckCircle2 className="w-14 h-14 text-sage-dark mx-auto mb-4" aria-hidden="true" />
                  <p className="text-lg font-bold text-brown-dark mb-2">{cm.successTitle}</p>
                  <p className="text-sm text-brown-light leading-relaxed mb-6">{cm.successNote}</p>
                  <button
                    onClick={() => setSent(false)}
                    className="bg-white border border-sage/40 text-brown px-6 py-2.5 rounded-full text-sm font-semibold hover:border-sage transition-all cursor-pointer min-h-[44px]"
                  >
                    {cm.submitAnother}
                  </button>
                </div>
              ) : (
                /* فرم */
                <form ref={formRef} onSubmit={submit} className="space-y-4 relative">
                  <div>
                    <label htmlFor="cr-name" className="block text-xs font-semibold text-brown mb-1.5">
                      {cm.nameLabel} *
                    </label>
                    <input
                      id="cr-name"
                      required
                      minLength={2}
                      maxLength={80}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={cm.namePlaceholder}
                      className="w-full px-4 py-2.5 rounded-xl border border-sage-light/40 bg-white/70 text-brown text-sm focus:outline-none focus:border-sage focus:ring-[3px] focus:ring-sage/20 transition-all"
                    />
                  </div>
                  <div>
                    <label htmlFor="cr-role" className="block text-xs font-semibold text-brown mb-1.5">
                      {cm.roleLabel}
                    </label>
                    <input
                      id="cr-role"
                      maxLength={80}
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      placeholder={cm.rolePlaceholder}
                      className="w-full px-4 py-2.5 rounded-xl border border-sage-light/40 bg-white/70 text-brown text-sm focus:outline-none focus:border-sage focus:ring-[3px] focus:ring-sage/20 transition-all"
                    />
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-brown mb-1.5">{cm.ratingLabel}</span>
                    <div className="flex gap-1.5" role="radiogroup" aria-label={cm.ratingLabel}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          role="radio"
                          aria-checked={rating === n}
                          aria-label={`${n} star${n > 1 ? 's' : ''}`}
                          onClick={() => setRating(n)}
                          className="p-1.5 rounded-lg hover:bg-butter/20 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                        >
                          <Star
                            className={`w-6 h-6 transition-all ${
                              n <= rating ? 'fill-butter text-butter scale-105' : 'text-sage-light/60'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label htmlFor="cr-text" className="block text-xs font-semibold text-brown mb-1.5">
                      {cm.textLabel} *
                    </label>
                    <textarea
                      id="cr-text"
                      required
                      minLength={10}
                      maxLength={1000}
                      rows={4}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder={cm.textPlaceholder}
                      className="w-full px-4 py-2.5 rounded-xl border border-sage-light/40 bg-white/70 text-brown text-sm focus:outline-none focus:border-sage focus:ring-[3px] focus:ring-sage/20 transition-all resize-none"
                    />
                  </div>
                  {error && (
                    <p role="alert" className="text-xs font-semibold text-peach bg-peach-light/30 rounded-xl px-4 py-2.5">
                      {cm.errorNote}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full bg-sage text-brown-dark py-3.5 rounded-full text-sm font-bold hover:bg-sage-dark transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed min-h-[48px]"
                  >
                    {busy ? cm.submitting : cm.submit}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* ---------- نظرات تأییدشده ---------- */}
          <div className="lg:col-span-3">
            <h3 className="text-sm font-bold uppercase tracking-widest text-sage-dark mb-5 scroll-animate">
              {cm.approvedTitle}
              {reviews.length > 0 && (
                <span className="ml-2 text-brown-light normal-case tracking-normal font-medium">
                  · {reviews.length}
                </span>
              )}
            </h3>
            {failed ? (
              /* خطای واکشی — قابل تلاش دوباره (خطا دیگر بی‌صدا قورت داده نمی‌شود) */
              <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-peach/50">
                <AlertCircle className="w-9 h-9 mx-auto mb-3 text-peach" aria-hidden="true" />
                <p className="text-sm text-brown-light mb-4">{cm.loadFailed}</p>
                <button
                  type="button"
                  onClick={load}
                  className="inline-flex items-center gap-1.5 bg-sage-light/30 text-brown px-4 py-2 rounded-full text-xs font-bold hover:bg-sage-light/50 transition-colors cursor-pointer min-h-[36px]"
                >
                  <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> {cm.retry}
                </button>
              </div>
            ) : !loaded ? (
              /* اسکلتون لودینگ */
              <div className="space-y-4" aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="bg-white rounded-2xl border border-sage-light/20 p-5 animate-pulse">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-sage-light/30"></div>
                      <div className="flex-1">
                        <div className="h-3 bg-sage-light/30 rounded w-1/3 mb-2"></div>
                        <div className="h-2.5 bg-cream-dark rounded w-1/4"></div>
                      </div>
                    </div>
                    <div className="h-3 bg-cream-dark rounded w-full mb-2"></div>
                    <div className="h-3 bg-cream-dark rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            ) : reviews.length === 0 ? (
              /* حالت خالی */
              <div className="text-center py-14 bg-white rounded-2xl border border-dashed border-sage-light/50">
                <Quote className="w-9 h-9 mx-auto mb-3 text-brown-light/50" aria-hidden="true" />
                <p className="text-sm text-brown-light max-w-xs mx-auto">{cm.empty}</p>
              </div>
            ) : (
              /* کارت‌های نظر */
              <div className="space-y-4 max-h-[560px] overflow-y-auto pr-1 ct-scroll-area">
                {reviews.map((r) => (
                  <article
                    key={r.id}
                    className="bg-white rounded-2xl border border-sage-light/20 p-5 relative hover:border-sage/40 transition-colors"
                  >
                    <Quote
                      className="absolute top-4 right-4 w-5 h-5 text-sage-light/50"
                      aria-hidden="true"
                    />
                    <div className="flex gap-1 mb-2.5" aria-label={`${r.rating} out of 5 stars`}>
                      {stars(r.rating)}
                    </div>
                    <p className="text-sm text-brown-light leading-relaxed mb-4">“{r.text}”</p>
                    <div className="flex items-center gap-3 pt-3 border-t border-sage-light/15">
                      <div
                        className={`w-9 h-9 ${colorFor(r.name)} rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0`}
                        aria-hidden="true"
                      >
                        {initialsOf(r.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-brown-dark truncate">{r.name}</p>
                        {r.role ? (
                          <p className="text-xs text-sage-dark font-medium truncate">{r.role}</p>
                        ) : (
                          <p className="text-xs text-brown-light truncate flex items-center gap-1">
                            <User className="w-3 h-3" aria-hidden="true" /> Student
                          </p>
                        )}
                      </div>
                      {/* ❤️ لایک — دکمه + شمارندهٔ واقعی از دیتابیس */}
                      <button
                        type="button"
                        onClick={() => toggleLike(r.id)}
                        disabled={likeBusy === r.id}
                        aria-pressed={!!r.likedByMe}
                        aria-label={r.likedByMe ? cm.unlikeAria : cm.likeAria}
                        title={r.likedByMe ? cm.unlikeAria : cm.likeAria}
                        className={`ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer disabled:opacity-60 disabled:cursor-wait min-h-[36px] ${
                          r.likedByMe
                            ? 'bg-peach-light/60 text-brown'
                            : 'bg-cream text-brown-light hover:text-brown hover:bg-peach-light/30'
                        }`}
                      >
                        <Heart
                          className={`w-4 h-4 transition-all ${
                            r.likedByMe ? 'fill-peach text-peach scale-105' : ''
                          }`}
                          aria-hidden="true"
                        />
                        <span className="tabular-nums" aria-label={`${r.likeCount ?? 0} likes`}>
                          {r.likeCount ?? 0}
                        </span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {/* ❤️ خطای لایک — پیام صادقانه: شمارنده تغییر نکرده چون سرور ذخیره نکرده */}
            {likeErrorId && (
              <p role="alert" className="mt-3 text-xs font-semibold text-peach bg-peach-light/30 rounded-xl px-4 py-2.5">
                {cm.likeFailed}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
