'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, PenLine, Quote, Star, User } from 'lucide-react'
import { siteContent } from '@/content/site-content'
import { CurveDivider } from './CurveDivider'

const rc = siteContent.home.reviewsCarousel
const t = siteContent.testimonials

// ---------------------------------------------------------------------
//  ⭐ کاروسل نظرات دانشجویان — بخش مستقل صفحهٔ خانه (#reviews)
//  دسکتاپ: هر صفحه ۳ کارت کامل + لبهٔ کارت بعدی کمی دیده می‌شود (peek)
//  موبایل: هر صفحه ۱ کارت — ناوبری چپ/راست + نقطه‌های صفحه — درخواست مالک
//  داده‌ها: نظرات تأییدشدهٔ کاربران (دیتابیس) + نظرات ثابت فایل محتوا
// ---------------------------------------------------------------------

interface ReviewItem {
  id: string
  name: string
  role: string
  rating: number
  text: string
}

// حرف‌های اول برای آواتار (مثل SA)
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

// 🎨 رنگ ثابت بر اساس نام — بین رندر سرور/کلاینت یکسان می‌ماند
const avatarColors = ['bg-sage-light/40 text-sage-dark', 'bg-butter/40 text-brown', 'bg-peach-light/50 text-brown']
function colorFor(name: string): string {
  let sum = 0
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i)
  return avatarColors[sum % avatarColors.length]
}

const stars = (n: number) =>
  Array.from({ length: n }, (_, i) => (
    <Star key={i} className="w-3.5 h-3.5 fill-butter text-butter" aria-hidden="true" />
  ))

export function HomeReviewsCarousel({ onNavigate }: { onNavigate: (page: 'reviews') => void }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [items, setItems] = useState<ReviewItem[] | null>(null) // null = لودینگ
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)
  const [pageCount, setPageCount] = useState(1)
  const [activePage, setActivePage] = useState(0)

  // نظرات از دیتابیس: منتخب‌های مالک (featured) اول + بقیهٔ تأییدشده‌ها
  // فاز ۵۵ (رفع رگرسیون): با پارامتر scope=home همهٔ تأییدشده‌ها با منتخب‌های اول
  // برمی‌گردند — قبلاً بعد از رفع تکرار صفحهٔ نظرات، منتخب‌ها ناخواسته از خانه حذف شده بودند
  // فقط اگر دیتابیس خالی بود یا خطا داد، نظرات ثابت فایل محتوا نمایش داده می‌شود
  // (نظرات منتخب از پنل ادمین قابل ویرایش‌اند — تب Reviews)
  // با هر ورود به صفحهٔ خانه هم تازه می‌شود تا تأیید ادمین فوراً دیده شود
  useEffect(() => {
    let cancelled = false
    const staticItems: ReviewItem[] = t.items.map((item, i) => ({
      id: `static-${i}`,
      name: item.name,
      role: item.role,
      rating: item.rating,
      text: item.text,
    }))
    const load = () => {
      fetch('/api/testimonials?scope=home')
        .then((res) => res.json())
        .then((data) => {
          if (cancelled) return
          const dbItems: ReviewItem[] = (data.testimonials ?? []).map(
            (r: { id: string; name: string; role: string | null; rating: number; text: string }) => ({
              id: r.id,
              name: r.name,
              role: r.role || 'Student',
              rating: r.rating,
              text: r.text,
            })
          )
          // دیتابیس خالی → پیش‌فرض فایل محتوا؛ وگرنه همان دیتابیس (منتخب‌ها اول)
          setItems(dbItems.length > 0 ? dbItems : staticItems)
        })
        .catch(() => {
          if (!cancelled) setItems(staticItems)
        })
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  // 🧮 چند کارت در هر صفحه جا می‌شود؟ (دسکتاپ ۳ + peek، موبایل ۱)
  const visibleCount = useCallback(() => {
    const el = trackRef.current
    if (!el) return 1
    const card = el.querySelector<HTMLElement>('[data-card]')
    if (!card) return 1
    const step = card.offsetWidth + 20 // 20 = فاصلهٔ gap کارت‌ها
    return Math.max(1, Math.round(el.clientWidth / step))
  }, [])

  // عرض یک «صفحه» برای اسکرول صفحه‌ای
  const pageStep = useCallback(() => {
    const el = trackRef.current
    if (!el) return 320
    const card = el.querySelector<HTMLElement>('[data-card]')
    if (!card) return el.clientWidth
    const count = visibleCount()
    return count * (card.offsetWidth + 20) - 20 + 8 // کارت‌ها + فاصله‌ها (+۸ هم‌ترازی)
  }, [visibleCount])

  // وضعیت دکمه‌ها و نقطه‌ها — بر اساس موقعیت اسکرول
  const updateArrows = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    setCanPrev(el.scrollLeft > 8)
    setCanNext(el.scrollLeft < el.scrollWidth - el.clientWidth - 8)
    const step = pageStep()
    if (step > 0) {
      const total = Math.max(1, Math.ceil(el.scrollWidth / step))
      setPageCount(total)
      setActivePage(Math.min(total - 1, Math.round(el.scrollLeft / step)))
    }
  }, [pageStep])

  useEffect(() => {
    updateArrows()
    window.addEventListener('resize', updateArrows)
    return () => window.removeEventListener('resize', updateArrows)
  }, [updateArrows, items])

  // حرکت صفحه‌ای قبلی/بعدی — دسکتاپ ۳ کارت، موبایل ۱ کارت
  const scrollByPage = (dir: 1 | -1) => {
    const el = trackRef.current
    if (!el) return
    el.scrollBy({ left: dir * pageStep(), behavior: 'smooth' })
  }

  // پرش به صفحهٔ مشخص (کلیک روی نقطه‌ها)
  const goToPage = (index: number) => {
    const el = trackRef.current
    if (!el) return
    el.scrollTo({ left: index * pageStep(), behavior: 'smooth' })
  }

  // اسکلت لودینگ — ۴ کارت خالی
  const skeleton = (
    <div className="flex gap-5 overflow-hidden" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="w-[280px] flex-shrink-0 bg-white rounded-3xl border border-sage-light/20 p-6 animate-pulse">
          <div className="flex gap-1 mb-4">
            {[0, 1, 2, 3, 4].map((j) => (
              <div key={j} className="w-4 h-4 rounded bg-sage-light/40" />
            ))}
          </div>
          <div className="h-3 bg-cream-dark rounded w-full mb-2" />
          <div className="h-3 bg-cream-dark rounded w-5/6 mb-2" />
          <div className="h-3 bg-cream-dark rounded w-2/3 mb-6" />
          <div className="flex items-center gap-3 pt-4 border-t border-sage-light/15">
            <div className="w-10 h-10 rounded-full bg-sage-light/30" />
            <div>
              <div className="h-3 bg-sage-light/30 rounded w-24 mb-1.5" />
              <div className="h-2.5 bg-cream-dark rounded w-32" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <div id="reviews" className="scroll-mt-44">
      <section className="py-20 bg-sec-peach relative overflow-hidden">
      {/* 🌊 لبهٔ منحنی از بخش قبلی + نقل‌قول تزئینی بزرگ */}
      <CurveDivider fill="var(--color-sec-foam)" />
      <div aria-hidden="true" className="absolute top-16 left-[3%] text-[7rem] leading-none font-bold text-peach/45 select-none pointer-events-none hidden md:block">
        {'\u201C'}
      </div>
      <div aria-hidden="true" className="absolute bottom-24 right-[4%] w-40 h-40 ct-dots-warm opacity-50 [mask-image:radial-gradient(circle,black,transparent_70%)] hidden md:block"></div>
        <div className="char-bg top-5 left-1/3" style={{ fontSize: '200px', opacity: 0.03 }} aria-hidden="true">
          心
        </div>
        <div className="max-w-7xl mx-auto px-6">
          {/* سرتیتر بخش */}
          <div className="text-center mb-12 scroll-animate">
            <span className="inline-flex items-center gap-1.5 bg-white/70 rounded-full px-4 py-1.5 mb-3 text-xs font-semibold uppercase tracking-widest text-sage-dark">
              <Quote className="w-3.5 h-3.5" aria-hidden="true" /> {rc.eyebrow}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-brown-dark mb-4">{rc.title}</h2>
            <p className="text-brown-light max-w-2xl mx-auto">{rc.subtitle}</p>
          </div>

          {/* نوار کاروسل — کارت‌ها با عرض ثابت تا کارت بعدی کمی دیده شود (peek) */}
          {items === null ? (
            skeleton
          ) : (
            <div className="relative scroll-animate">
              <div
                ref={trackRef}
                onScroll={updateArrows}
                className="ct-scroll-x flex gap-5 overflow-x-auto snap-x snap-mandatory pb-2 -mx-6 px-6"
                role="region"
                aria-label={rc.title}
              >
                {items.map((r) => (
                  <article
                    key={r.id}
                    data-card
                    className="snap-start flex-shrink-0 w-[85vw] sm:w-[340px] lg:w-[calc((100%-2.5rem)/3.25)] bg-white rounded-3xl border border-sage-light/20 p-6 relative hover:border-sage/40 transition-colors"
                  >
                    <Quote className="absolute top-5 right-5 w-6 h-6 text-sage-light/60" aria-hidden="true" />
                    <div className="flex gap-1 mb-3" aria-label={`${r.rating} out of 5 stars`}>
                      {stars(r.rating)}
                    </div>
                    <p className="text-sm text-brown-light leading-relaxed mb-5 min-h-[84px]">“{r.text}”</p>
                    <div className="flex items-center gap-3 pt-4 border-t border-sage-light/15">
                      <div
                        className={`w-10 h-10 ${colorFor(r.name)} rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0`}
                        aria-hidden="true"
                      >
                        {initialsOf(r.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-brown-dark truncate">{r.name}</p>
                        <p className="text-xs text-sage-dark font-medium truncate flex items-center gap-1">
                          <User className="w-3 h-3" aria-hidden="true" /> {r.role}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {/* دکمه‌های قبلی/بعدی + نقطه‌های صفحه */}
              <div className="flex items-center justify-center gap-3 mt-7">
                <button
                  type="button"
                  onClick={() => scrollByPage(-1)}
                  disabled={!canPrev}
                  aria-label={rc.prev}
                  className="w-11 h-11 rounded-full bg-white border border-sage-light/40 text-brown flex items-center justify-center hover:border-sage hover:text-sage-dark transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" aria-hidden="true" />
                </button>

                {/* 🎯 نقطه‌های صفحه — دسکتاپ ۳ نظر در هر صفحه، موبایل ۱ نظر */}
                {pageCount > 1 && (
                  <div className="flex items-center gap-2" role="tablist" aria-label="Review pages">
                    {Array.from({ length: pageCount }, (_, i) => (
                      <button
                        key={i}
                        type="button"
                        role="tab"
                        aria-selected={activePage === i}
                        aria-label={`Go to reviews page ${i + 1}`}
                        onClick={() => goToPage(i)}
                        className={`h-2.5 rounded-full transition-all cursor-pointer ${
                          activePage === i ? 'w-6 bg-sage-dark' : 'w-2.5 bg-sage-light/60 hover:bg-sage'
                        }`}
                      />
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => onNavigate('reviews')}
                  className="bg-sage text-brown-dark px-6 py-2.5 rounded-full text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap hover:bg-sage-dark hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(168,201,160,0.4)] transition-all cursor-pointer min-h-[44px]"
                >
                  <PenLine className="w-4 h-4" aria-hidden="true" /> {rc.writeButton}
                </button>
                <button
                  type="button"
                  onClick={() => scrollByPage(1)}
                  disabled={!canNext}
                  aria-label={rc.next}
                  className="w-11 h-11 rounded-full bg-white border border-sage-light/40 text-brown flex items-center justify-center hover:border-sage hover:text-sage-dark transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
