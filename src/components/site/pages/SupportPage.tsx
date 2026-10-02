'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Mail,
  Send,
  ChevronDown,
  Search,
  HelpCircle,
  MessageSquare,
  Loader2,
  CheckCircle2,
  Clock,
  InstagramIcon,
} from 'lucide-react'
import { siteContent } from '@/content/site-content'
import { CurveDivider } from '../CurveDivider'

const s = siteContent.support

const colorMap = {
  sage: { iconBg: 'bg-sage-light/30', text: 'text-sage-dark' },
  butter: { iconBg: 'bg-butter/25', text: 'text-brown' },
  peach: { iconBg: 'bg-peach-light/30', text: 'text-peach' },
} as const

const channelIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  mail: Mail,
  send: Send,
  instagram: InstagramIcon,
}

const inputCls =
  'w-full px-4 py-3 rounded-xl border border-sage-light/40 bg-cream/50 text-brown placeholder:text-brown-light/50 text-sm focus:outline-none focus:border-sage focus:ring-[3px] focus:ring-sage/20 transition-all'

const labelCls = 'block text-sm font-medium text-brown-dark mb-2'

// ---------------------------------------------------------------------
//  ℹ️ فاز ۵۸ — ویجت رأی «آیا این پاسخ مفید بود؟» (Like/Dislike) به درخواست
//  مالک از همهٔ سؤالات FAQ حذف شد. FAQ حالا فقط سؤال ← پاسخ است؛ هیچ کنترل
//  رأی، شمارنده یا فراخوانی /api/faq/vote باقی نیست.
// ---------------------------------------------------------------------

interface SupportPageProps {
  onToast: (message: string) => void
}

// شکل سؤال FAQ — از DB می‌آید؛ آیتم‌های فایل محتوا هم قبل از رسیدن سرور با همین شکل رندر می‌شوند
interface PublicFaq {
  id: string
  category: string
  question: string
  answer: string
}

export function SupportPage({ onToast }: SupportPageProps) {
  // ---------- FAQ state ----------
  const [faqCategory, setFaqCategory] = useState('all')
  const [query, setQuery] = useState('')
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  // ❓ منبع حقیقت FAQ = دیتابیس (فاز ۴۶). رندر فوری با آیتم‌های فایل محتوا،
  // سپس جایگزینی کامل با پاسخ سرور — پس از موفقیت، هیچ محتوای هاردکدی
  // بازنویسی DB را پوشش نمی‌دهد (حتی فهرست خالی = حرف ادمین).
  // اگر سرور در دسترس نبود، فهرست فایل به‌عنوان fallback می‌ماند (همان الگوی Classes).
  const [faqs, setFaqs] = useState<PublicFaq[]>(() =>
    s.faq.items.map((it, i) => ({ id: `file-${i}`, category: it.category, question: it.question, answer: it.answer }))
  )

  useEffect(() => {
    let cancelled = false
    fetch('/api/faq')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data?.faqs)) {
          setFaqs(
            data.faqs.map(
              (f: { id: string; category: string; question: string; answer: string }) => ({
                id: f.id,
                category: f.category,
                question: f.question,
                answer: f.answer,
              })
            )
          )
        }
      })
      .catch(() => {}) // fallback فایل می‌ماند — صفحهٔ عمومی هرگز خالی نمی‌شود
    return () => {
      cancelled = true
    }
  }, [])

  // فیلتر دسته‌ها: کلیدهای ثابت + هر کلید جدیدی که ادمین در DB ساخته باشد
  const faqCategories = useMemo(() => {
    const extra = [...new Set(faqs.map((f) => f.category))]
      .filter((k) => !s.faq.categories.some((c) => c.key === k))
      .map((k) => ({ key: k, label: k.charAt(0).toUpperCase() + k.slice(1) }))
    return [...s.faq.categories, ...extra]
  }, [faqs])

  const filteredFaqs = useMemo(() => {
    const q = query.trim().toLowerCase()
    return faqs.filter((item) => {
      const inCategory = faqCategory === 'all' || item.category === faqCategory
      const inSearch =
        q === '' ||
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q)
      return inCategory && inSearch
    })
  }, [faqs, faqCategory, query])

  // ---------- Form state ----------
  const [form, setForm] = useState({ name: '', email: '', topic: 'general', message: '' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('failed')
      setSent(true)
      onToast('Your message has been sent successfully!')
    } catch {
      setError(s.form.errorText)
    } finally {
      setSending(false)
    }
  }

  const resetForm = () => {
    setForm({ name: '', email: '', topic: 'general', message: '' })
    setSent(false)
  }

  return (
    <div id="page-support">
      {/* ================= Hero ================= */}
      <section className="pt-32 pb-14 md:pt-40 relative overflow-hidden bg-cream">
        {/* 🌸 هالهٔ سیج ملایم */}
        <div
          aria-hidden="true"
          className="absolute -top-8 -right-24 w-80 h-80 bg-sage-light/30 rounded-full blur-3xl"
        ></div>
        <div className="char-bg top-16 right-5 md:right-32" style={{ fontSize: '240px', opacity: 0.03 }}>
          助
        </div>
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="animate-ct-fadeInUp max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-2 bg-sage-light/40 rounded-full px-4 py-1.5 mb-6 text-xs font-semibold uppercase tracking-widest text-sage-dark">
              <HelpCircle className="w-3.5 h-3.5" />
              {s.eyebrow}
            </span>
            <h1 className="text-3xl md:text-5xl font-bold text-brown-dark mb-4">{s.title}</h1>
            <p className="text-brown-light max-w-2xl mx-auto">{s.subtitle}</p>
            <p className="text-sm text-brown-light/80 mt-4 inline-flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-sage-dark" />
              {siteContent.contact.responseTime}
            </p>
          </div>
        </div>
      </section>

      {/* ================= تماس سریع ================= */}
      <section className="pb-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-10 scroll-animate">
            <h2 className="text-2xl md:text-3xl font-bold text-brown-dark mb-3">
              {s.quickContact.title}
            </h2>
            <p className="text-brown-light">{s.quickContact.subtitle}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {s.quickContact.channels.map((ch, i) => {
              const Icon = channelIconMap[ch.icon] ?? Mail
              const color = colorMap[ch.color as keyof typeof colorMap] ?? colorMap.sage
              const delays = ['', 'delay-100', 'delay-200']
              return (
                <a
                  key={i}
                  href={ch.link}
                  target={ch.link.startsWith('http') ? '_blank' : undefined}
                  rel={ch.link.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className={`scroll-animate ${delays[i % 3]} bg-white rounded-3xl p-7 card-hover border border-sage-light/20 flex items-center gap-5 cursor-pointer`}
                >
                  <div
                    className={`w-14 h-14 ${color.iconBg} rounded-2xl flex items-center justify-center flex-shrink-0`}
                  >
                    <Icon className={`w-7 h-7 ${color.text}`} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-brown-dark mb-0.5">{ch.title}</h3>
                    <p className="text-sm font-medium text-sage-dark truncate">{ch.value}</p>
                    <p className="text-xs text-brown-light mt-0.5">{ch.note}</p>
                  </div>
                </a>
              )
            })}
          </div>
        </div>
      </section>

      {/* ================= سؤالات متداول ================= */}
      <section className="py-20 bg-sec-sage relative overflow-hidden" id="faq">
        {/* 🌊 لبهٔ منحنی از هیروی کرم + کاراکتر محو 问 */}
        <CurveDivider fill="var(--color-cream)" />
        <div className="char-bg top-10 left-10" style={{ fontSize: '200px', opacity: 0.03 }}>
          问
        </div>
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-10 scroll-animate">
            <span className="inline-block text-xs font-semibold uppercase tracking-widest text-sage-dark mb-3">
              {s.faq.eyebrow}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-brown-dark mb-4">{s.faq.title}</h2>
            <p className="text-brown-light max-w-2xl mx-auto">{s.faq.subtitle}</p>
          </div>

          {/* جستجو */}
          <div className="relative mb-6 scroll-animate">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brown-light/60 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={s.faq.searchPlaceholder}
              aria-label="Search FAQ"
              className={`${inputCls} pl-12 py-3.5 rounded-2xl`}
            />
          </div>

          {/* دسته‌بندی‌ها */}
          <div className="flex flex-wrap justify-center gap-3 mb-8 scroll-animate">
            {faqCategories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setFaqCategory(cat.key)}
                className={`filter-btn px-5 py-2 rounded-full text-sm font-medium bg-sage-light/30 text-brown transition-all cursor-pointer ${
                  faqCategory === cat.key ? 'active' : ''
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* آکاردئون سؤالات */}
          <div className="space-y-4 scroll-animate" role="list">
            {filteredFaqs.map((item, i) => {
              const isOpen = openIndex === i
              return (
                <div
                  key={`${item.question}-${i}`}
                  className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden ${
                    isOpen
                      ? 'border-sage/50 shadow-[0_8px_30px_rgba(91,81,69,0.08)]'
                      : 'border-sage-light/20'
                  }`}
                  role="listitem"
                >
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                    className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left cursor-pointer"
                    aria-expanded={isOpen}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <span className="w-8 h-8 bg-sage-light/30 rounded-lg flex items-center justify-center flex-shrink-0 hidden sm:flex">
                        <MessageSquare className="w-4 h-4 text-sage-dark" />
                      </span>
                      <span className="text-sm md:text-base font-semibold text-brown-dark">
                        {item.question}
                      </span>
                    </span>
                    <ChevronDown
                      className={`w-5 h-5 text-sage-dark flex-shrink-0 transition-transform duration-300 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  <div
                    className={`grid transition-all duration-300 ease-in-out ${
                      isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="px-6 pb-6 sm:pl-[4.25rem] text-sm text-brown-light leading-relaxed">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* بدون نتیجه */}
          {filteredFaqs.length === 0 && (
            <div className="text-center py-14 bg-white rounded-2xl border border-dashed border-sage-light/50">
              <Search className="w-10 h-10 mx-auto mb-3 text-brown-light/50" />
              <p className="text-sm text-brown-light">{s.faq.emptyResult}</p>
            </div>
          )}
        </div>
      </section>

      {/* ================= فرم تماس ================= */}
      <section className="py-20 bg-sec-butter relative overflow-hidden">
        {/* 🌊 لبهٔ منحنی از بخش سبز سؤالات + کاراکتر محو 訊 */}
        <CurveDivider fill="var(--color-sec-sage)" />
        <div className="char-bg bottom-0 right-10" style={{ fontSize: '200px', opacity: 0.03 }}>
          訊
        </div>
        <div className="max-w-2xl mx-auto px-6">
          <div className="text-center mb-10 scroll-animate">
            <span className="inline-block text-xs font-semibold uppercase tracking-widest text-sage-dark mb-3">
              {s.form.eyebrow}
            </span>
            <h2 className="text-3xl font-bold text-brown-dark mb-3">{s.form.title}</h2>
            <p className="text-brown-light">{s.form.subtitle}</p>
          </div>

          {!sent ? (
            <div className="bg-white rounded-3xl p-8 md:p-10 shadow-lg border border-sage-light/20 scroll-animate">
              <form onSubmit={submitForm} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="sup-name" className={labelCls}>
                      {s.form.name} *
                    </label>
                    <input
                      id="sup-name"
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      className={inputCls}
                      placeholder={s.form.namePlaceholder}
                    />
                  </div>
                  <div>
                    <label htmlFor="sup-email" className={labelCls}>
                      {s.form.email} *
                    </label>
                    <input
                      id="sup-email"
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      className={inputCls}
                      placeholder={s.form.emailPlaceholder}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="sup-topic" className={labelCls}>
                    {s.form.topic}
                  </label>
                  <select
                    id="sup-topic"
                    value={form.topic}
                    onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
                    className={`${inputCls} appearance-none`}
                  >
                    {s.form.topics.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="sup-message" className={labelCls}>
                    {s.form.message} *
                  </label>
                  <textarea
                    id="sup-message"
                    rows={5}
                    required
                    value={form.message}
                    onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                    className={`${inputCls} resize-none`}
                    placeholder={s.form.messagePlaceholder}
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={sending}
                  className="bg-sage text-brown-dark w-full py-4 rounded-2xl text-base font-semibold flex items-center justify-center gap-2 hover:bg-sage-dark transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> {s.form.submitting}
                    </>
                  ) : (
                    <>
                      <Send className="w-[18px] h-[18px]" /> {s.form.submit}
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-8 md:p-10 shadow-lg border border-sage-light/20 text-center animate-ct-fadeInUp">
              <div className="w-20 h-20 bg-sage-light/30 rounded-full mx-auto mb-6 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-sage-dark" />
              </div>
              <h2 className="text-2xl font-bold text-brown-dark mb-3">{s.form.successTitle}</h2>
              <p className="text-brown-light">{s.form.successText}</p>
              <button
                onClick={resetForm}
                className="mt-8 bg-sage-light/30 text-brown-dark px-6 py-3 rounded-full text-sm font-medium hover:bg-sage-light/40 transition-all cursor-pointer"
              >
                {s.form.againButton}
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
