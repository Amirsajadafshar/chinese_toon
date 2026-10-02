'use client'

// ❓ فاز ۶۹ — سکشن فشردهٔ FAQ برای صفحهٔ کلاس‌ها
// منبع حقیقت = دیتابیس (/api/faq — فقط منتشرشده‌ها). فهرست کامل + فرم تماس
// در صفحهٔ Support (#/support) می‌ماند؛ این‌جا نسخهٔ خلاصه با آکاردئون است.

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, HelpCircle, LifeBuoy, Search, X } from 'lucide-react'
import { siteContent } from '@/content/site-content'

interface PublicFaq {
  id: string
  category: string
  question: string
  answer: string
}

interface FaqSectionProps {
  /** حداکثر تعداد سؤال در حالت جمع‌شده (پیش‌فرض ۶) */
  previewCount?: number
}

export function FaqSection({ previewCount = 6 }: FaqSectionProps) {
  const s = siteContent.support
  const fs = s.faqSection

  const [faqs, setFaqs] = useState<PublicFaq[]>([])
  const [category, setCategory] = useState('all')
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(true)
  // 🔍 فاز ۷۰ — جست‌وجوی زندهٔ سؤال/پاسخ (بدون رفتن به صفحهٔ Support)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch('/api/faq', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data?.faqs)) setFaqs(data.faqs)
      })
      .catch(() => {}) // خطا = سکشن خالی نمی‌شود، فقط لینک Support می‌ماند
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // دسته‌ها: کلیدهای ثابت + هر کلید تازه‌ای که ادمین ساخته باشد
  const categories = useMemo(() => {
    const extra = [...new Set(faqs.map((f) => f.category))]
      .filter((k) => !s.faq.categories.some((c) => c.key === k))
      .map((k) => ({ key: k, label: k.charAt(0).toUpperCase() + k.slice(1) }))
    return [...s.faq.categories, ...extra]
  }, [faqs, s.faq.categories])

  const inCategory = useMemo(
    () => faqs.filter((f) => category === 'all' || f.category === category),
    [faqs, category]
  )

  // 🔍 جست‌وجو روی سؤال + پاسخ؛ هنگام جست‌وجو همهٔ نتایج نشان داده می‌شود
  const searching = query.trim().length > 0
  const matched = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return inCategory
    return inCategory.filter(
      (f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
    )
  }, [inCategory, query])

  const visible = searching ? matched : expanded ? matched : matched.slice(0, previewCount)
  const hiddenCount = searching ? 0 : matched.length - visible.length

  return (
    <section
      className="mt-16 bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-sage-light/20"
      aria-labelledby="classes-faq-title"
    >
      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-2 bg-sage-light/25 text-sage-dark text-xs font-bold px-3 py-1.5 rounded-full mb-3">
          <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
          FAQ
        </span>
        <h2 id="classes-faq-title" className="text-2xl font-bold text-brown-dark mb-2">
          {fs.title}
        </h2>
        <p className="text-sm text-brown-light max-w-xl mx-auto">{fs.subtitle}</p>
      </div>

      {/* چیپ‌های دسته‌بندی */}
      <div className="flex flex-wrap justify-center gap-2 mb-4" role="tablist" aria-label="FAQ categories">
        {categories.map((c) => (
          <button
            key={c.key}
            onClick={() => {
              setCategory(c.key)
              setOpenIndex(0)
            }}
            role="tab"
            aria-selected={category === c.key}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
              category === c.key
                ? 'bg-sage text-brown-dark shadow-sm'
                : 'bg-cream/70 text-brown-light border border-sage-light/30 hover:border-sage hover:text-brown'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* 🔍 جست‌وجوی زنده — هم‌قالب جست‌وجوی Support، جمع‌وجورتر */}
      <div className="relative max-w-md mx-auto mb-6">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brown-light/60 pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpenIndex(0)
          }}
          placeholder="Search questions…"
          aria-label="Search FAQ questions"
          className="w-full bg-cream/50 border border-sage-light/40 rounded-full pl-11 pr-10 py-2.5 text-sm text-brown-dark placeholder:text-brown-light/60 focus:outline-none focus:ring-2 focus:ring-sage/50 focus:border-sage transition-colors"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setOpenIndex(0)
            }}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-sage-light/40 hover:bg-sage-light/70 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5 text-brown" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* آکاردئون سؤالات */}
      {visible.length === 0 ? (
        <p className="text-center text-sm text-brown-light py-8">
          {loading
            ? 'Loading questions…'
            : searching
              ? 'No questions match your search — try another word or ask us via the Support Center.'
              : 'No questions in this category yet.'}
        </p>
      ) : (
        <div className="max-w-3xl mx-auto space-y-3">
          {visible.map((item, i) => {
            const open = openIndex === i
            return (
              <div
                key={item.id}
                className={`rounded-2xl border transition-colors ${
                  open ? 'border-sage/50 bg-cream/40' : 'border-sage-light/25 bg-cream/30'
                }`}
              >
                <button
                  onClick={() => setOpenIndex(open ? null : i)}
                  aria-expanded={open}
                  aria-controls={`classes-faq-panel-${item.id}`}
                  className="w-full flex items-center justify-between gap-4 text-left px-5 py-4 cursor-pointer"
                >
                  <span className="text-sm md:text-[15px] font-semibold text-brown-dark">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 flex-shrink-0 text-sage-dark transition-transform duration-300 ${
                      open ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>
                <div
                  id={`classes-faq-panel-${item.id}`}
                  className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                    open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-5 text-sm leading-relaxed text-brown-light">{item.answer}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* نمایش بقیهٔ سؤال‌ها / لینک Support */}
      <div className="text-center mt-6 space-y-3">
        {hiddenCount > 0 && (
          <button
            onClick={() => setExpanded(true)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-sage-dark hover:text-brown-dark transition-colors cursor-pointer"
          >
            Show {hiddenCount} more question{hiddenCount === 1 ? '' : 's'}
            <ChevronDown className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
        <div>
          <button
            onClick={() => {
              window.location.hash = '/support'
            }}
            className="inline-flex items-center gap-2 text-sm font-semibold text-brown hover:text-sage-dark transition-colors cursor-pointer"
          >
            <LifeBuoy className="w-4 h-4" aria-hidden="true" />
            {fs.viewAll}
          </button>
        </div>
      </div>
    </section>
  )
}
