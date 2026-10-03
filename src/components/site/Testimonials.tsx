'use client'

import { useEffect, useState } from 'react'
import { Star, Quote } from 'lucide-react'
import { CurveDivider } from './CurveDivider'
import { siteContent } from '@/content/site-content'

const t = siteContent.testimonials

// ---------------------------------------------------------------------
//  ⭐ نظرات منتخب مالک (featured) — بخش «What Our Students Say» صفحهٔ نظرات
//  داده از دیتابیس می‌آید (تب Reviews پنل → دکمهٔ Import default reviews
//  پیش‌فرض‌ها را وارد می‌کند؛ بعدش همه قابل ویرایش/حذف‌اند).
//  تا وقتی دیتابیس منتخبی ندارد، نظرات ثابت فایل محتوا نمایش داده می‌شود.
// ---------------------------------------------------------------------

interface TestimonialItem {
  id: string
  name: string
  role: string
  rating: number
  text: string
  initials: string
  color: string
}

const colorMap = {
  sage: { bg: 'bg-sage-light/30', text: 'text-sage-dark' },
  butter: { bg: 'bg-butter/25', text: 'text-brown' },
  peach: { bg: 'bg-peach-light/30', text: 'text-peach' },
} as const

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

export function Testimonials() {
  const [items, setItems] = useState<TestimonialItem[] | null>(null) // null = لودینگ

  // پیش‌فرض فایل محتوا (fallback) — همین حالا آماده است
  const staticItems: TestimonialItem[] = t.items.map((item, i) => ({
    id: `static-${i}`,
    name: item.name,
    role: item.role,
    rating: item.rating,
    text: item.text,
    initials: item.initials,
    color: item.color,
  }))

  useEffect(() => {
    let cancelled = false
    const load = () => {
      fetch('/api/testimonials?featured=1')
        .then((res) => res.json())
        .then((data) => {
          if (cancelled) return
          const list: TestimonialItem[] = (data.testimonials ?? []).map(
            (r: { id: string; name: string; role: string | null; rating: number; text: string }) => ({
              id: r.id,
              name: r.name,
              role: r.role || 'Student',
              rating: r.rating,
              text: r.text,
              initials: initialsOf(r.name),
              color: 'sage',
            })
          )
          setItems(list.length > 0 ? list : staticItems)
        })
        .catch(() => {
          if (!cancelled) setItems(staticItems)
        })
    }
    load()
    // صفحه در هر ناوبری از نو mount می‌شود — داده تازه می‌آید
    return () => {
      cancelled = true
    }
  }, [])

  const list = items ?? staticItems

  return (
    <section className="py-20 bg-sec-sand relative overflow-hidden">
      {/* 🌊 لبهٔ منحنی از بخش هلویی نظرات کاربران */}
      <CurveDivider fill="var(--color-sec-peach)" />
      <div
        className="char-bg top-5 left-1/3"
        style={{ fontSize: '200px', opacity: 0.03 }}
      >
        心
      </div>
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14 scroll-animate">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-sage-dark mb-3">
            {t.eyebrow}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-brown-dark mb-4">{t.title}</h2>
          <p className="text-brown-light max-w-2xl mx-auto">{t.subtitle}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {list.map((item, i) => {
            const color = colorMap[item.color as keyof typeof colorMap] ?? colorMap.sage
            const delays = ['', 'delay-100', 'delay-200']
            return (
              <div
                key={item.id}
                className={`scroll-animate ${delays[i % 3]} bg-white rounded-3xl p-7 card-hover border border-sage-light/20 relative ${
                  items === null ? 'animate-pulse' : ''
                }`}
              >
                <Quote
                  className="absolute top-6 right-6 w-8 h-8 text-sage-light/60"
                  aria-hidden="true"
                />
                {/* ستاره‌ها */}
                <div className="flex gap-1 mb-4" aria-label={`${item.rating} out of 5 stars`}>
                  {Array.from({ length: item.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-butter text-butter" />
                  ))}
                </div>
                <p className="text-sm text-brown-light leading-relaxed mb-6">“{item.text}”</p>
                <div className="flex items-center gap-3 pt-4 border-t border-sage-light/20">
                  <div
                    className={`w-11 h-11 ${color.bg} rounded-full flex items-center justify-center text-sm font-bold text-brown-dark flex-shrink-0`}
                  >
                    {item.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-brown-dark">{item.name}</p>
                    <p className={`text-xs ${color.text} font-medium`}>{item.role}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
