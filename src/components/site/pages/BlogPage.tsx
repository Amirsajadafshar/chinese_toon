'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  Newspaper,
  SearchX,
  Search,
  CalendarDays,
  Clock3,
  Eye,
  ArrowLeft,
  Link2,
  Send,
  Check,
  MessageCircle,
  BookOpen,
  X,
  Flame,
  Printer,
  Type,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { siteContent } from '@/content/site-content'
import { CurveDivider } from '../CurveDivider'
import { Leaflet } from '../ToonBranch'
import {
  usePosts,
  goToPost,
  PostCard,
  PostContent,
  CoverImage,
  tagBadge,
  tagLabel,
  fmtPostDate,
  readingTime,
  formatViews,
  BlogPost,
} from '../blog-parts'
import { appNavigate } from '@/lib/nav'

const b = siteContent.blog

// 🔤 سه گام اندازهٔ فونت بدنهٔ مقاله (px) — با دکمه‌های A−/A/A+ انتخاب می‌شود
const ARTICLE_FONT_PX = { s: 14, m: 16, l: 18.5 } as const
type ArticleFontStep = keyof typeof ARTICLE_FONT_PX
const ARTICLE_FONT_KEY = 'ct-article-font'

// ---------------------------------------------------------------------
//  نوار پیشرفت مطالعه (زیر هدر، فقط در صفحهٔ مقاله)
// ---------------------------------------------------------------------
function ReadingProgress() {
  const [pct, setPct] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement
      const total = el.scrollHeight - el.clientHeight
      setPct(total > 0 ? Math.min(100, Math.max(0, (el.scrollTop / total) * 100)) : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div
      className="fixed top-[72px] md:top-20 left-0 right-0 h-1 z-[55] bg-sage-light/15 pointer-events-none no-print"
      aria-hidden="true"
    >
      <div
        className="h-full bg-gradient-to-r from-sage via-butter to-peach transition-[width] duration-150 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------
//  🔖 نوار «ادامهٔ مطالعه» — آخرین مقالهٔ خوانده‌شدهٔ همین نشست (sessionStorage)
//     فقط در نمای لیست نشان داده می‌شود و با × قابل رد شدن است.
// ---------------------------------------------------------------------
const LAST_READ_KEY = 'ct-last-read'
const LAST_READ_HIDE_KEY = 'ct-last-read-hide'

interface LastRead {
  slug: string
  title: string
}

function readLastRead(): LastRead | null {
  try {
    const raw = sessionStorage.getItem(LAST_READ_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as LastRead
    return parsed?.slug && parsed?.title ? parsed : null
  } catch {
    return null
  }
}

function ContinueReading() {
  const [last, setLast] = useState<LastRead | null>(null)
  const [hidden, setHidden] = useState(true)

  // با ورود به نمای لیست (تغییر مسیر) وضعیت ذخیره‌شده خوانده می‌شود
  const pathname = usePathname()
  useEffect(() => {
    const sync = () => {
      setLast(readLastRead())
      let dismissed = false
      try {
        dismissed = sessionStorage.getItem(LAST_READ_HIDE_KEY) === '1'
      } catch {
        dismissed = false
      }
      setHidden(dismissed)
    }
    sync()
  }, [pathname])

  // در نمای مقاله فعال نیست — فقط لیست (slug از روت فعلی: /blog/<slug>)
  const slug = pathname.startsWith('/blog/') ? decodeURIComponent(pathname.split('/')[2] || '') : ''
  if (!siteContent.blog.continueEnabled || hidden || !last || slug) return null

  return (
    <div className="max-w-3xl mx-auto px-6 animate-ct-fadeInUp">
      <div className="relative overflow-hidden flex items-center gap-3 bg-gradient-to-r from-sage-light/40 via-butter/25 to-peach-light/30 border border-sage/25 rounded-2xl pl-4 pr-3 py-3 shadow-sm">
        <span className="w-9 h-9 rounded-xl bg-white/85 flex items-center justify-center flex-shrink-0 shadow-sm" aria-hidden="true">
          <BookOpen className="w-4 h-4 text-sage-dark" />
        </span>
        <button
          onClick={() => goToPost(last.slug)}
          className="group flex-1 min-w-0 text-left cursor-pointer"
          aria-label={`${siteContent.blog.continueLabel}: ${last.title}`}
        >
          <span className="block text-[10px] font-bold uppercase tracking-wider text-sage-dark">
            {siteContent.blog.continueLabel}
          </span>
          <span className="block text-sm font-semibold text-brown-dark truncate group-hover:text-sage-dark transition-colors">
            {last.title}
          </span>
        </button>
        <button
          onClick={() => {
            try {
              sessionStorage.setItem(LAST_READ_HIDE_KEY, '1')
            } catch {
              // بی‌اهمیت — فقط تا ری‌استارت بعدی پنهان می‌ماند
            }
            setHidden(true)
          }}
          aria-label="Dismiss"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-brown-light hover:text-brown hover:bg-white/70 transition-colors cursor-pointer flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------
//  ردیف اشتراک‌گذاری مقاله
// ---------------------------------------------------------------------
function ShareBar({ post }: { post: BlogPost }) {
  const [copied, setCopied] = useState(false)
  const url =
    typeof window !== 'undefined'
      ? `${window.location.origin}/#/blog/${encodeURIComponent(post.slug)}`
      : ''
  const enc = encodeURIComponent
  const links = [
    {
      key: 'telegram',
      label: b.share.telegram,
      href: `https://t.me/share/url?url=${enc(url)}&text=${enc(post.title)}`,
    },
    {
      key: 'x',
      label: b.share.x,
      href: `https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(post.title)}`,
    },
    {
      key: 'whatsapp',
      label: b.share.whatsapp,
      href: `https://wa.me/?text=${enc(`${post.title} — ${url}`)}`,
    },
  ]

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // راه جایگزین برای مرورگرهایی که Clipboard API ندارند
      try {
        const ta = document.createElement('textarea')
        ta.value = url
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        ta.remove()
      } catch {
        return // کپی نشد — بدون تغییر حالت
      }
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-brown-light mr-1">
        <MessageCircle className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
        {b.share.label}
      </span>
      <button
        onClick={copy}
        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-full border transition-all cursor-pointer ${
          copied
            ? 'bg-sage text-brown-dark border-sage'
            : 'bg-white text-brown border-sage-light/50 hover:border-sage hover:text-sage-dark'
        }`}
        aria-label={b.share.copy}
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
        {copied ? b.share.copied : b.share.copy}
      </button>
      {links.map((l) => (
        <a
          key={l.key}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-full bg-white text-brown border border-sage-light/50 hover:border-sage hover:text-sage-dark transition-all"
          aria-label={l.label}
        >
          {l.key === 'telegram' && <Send className="w-3.5 h-3.5" />}
          {l.key === 'x' && <span className="font-bold text-[11px]">𝕏</span>}
          {l.key === 'whatsapp' && <span className="text-[13px] leading-none">✆</span>}
          {l.label.replace('Share on ', '')}
        </a>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------
//  دعوت به خبرنامه در انتهای مقاله (اسکرول به فرم فوتر)
// ---------------------------------------------------------------------
function NewsletterCta() {
  const go = () => {
    document.getElementById('newsletter-email')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    window.setTimeout(() => {
      document.getElementById('newsletter-email')?.focus({ preventScroll: true })
    }, 700)
  }
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-sage-light/40 via-butter/25 to-peach-light/30 rounded-3xl p-8 md:p-10 text-center">
      <div className="char-bg top-0 right-6" style={{ fontSize: '150px', opacity: 0.06 }}>
        书
      </div>
      <div className="relative">
        <span className="text-3xl" aria-hidden="true">
          📬
        </span>
        <h3 className="text-xl md:text-2xl font-bold text-brown-dark mt-2 mb-2">{b.cta.title}</h3>
        <p className="text-sm text-brown-light mb-5 max-w-md mx-auto leading-relaxed">{b.cta.text}</p>
        <button
          onClick={go}
          className="bg-sage text-brown-dark px-7 py-3 rounded-full text-sm font-semibold hover:bg-sage-dark hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(168,201,160,0.4)] transition-all cursor-pointer inline-flex items-center gap-2"
        >
          {b.cta.button}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------
// 🔥 پربازدیدترین مقاله‌ها — نوار بالای فهرست بلاگ (فقط بدون فیلتر/جست‌وجو)
// ---------------------------------------------------------------------
function TrendingStrip({ posts }: { posts: BlogPost[] }) {
  const top = useMemo(
    () =>
      [...posts]
        .filter((p) => p.views > 0)
        .sort((a, b) => b.views - a.views)
        .slice(0, 3),
    [posts]
  )
  if (top.length === 0) return null
  const medals = ['🥇', '🥈', '🥉']
  return (
    <div className="mb-10 animate-ct-fadeInUp no-print">
      <h2 className="flex items-center flex-wrap gap-2 text-xs font-bold uppercase tracking-widest text-sage-dark mb-4">
        <Flame className="w-4 h-4" aria-hidden="true" />
        {b.trending.label}
        <span className="hidden sm:inline font-medium normal-case tracking-normal text-brown-light/70">
          · {b.trending.subtitle}
        </span>
      </h2>
      <ol className="grid sm:grid-cols-3 gap-4">
        {top.map((p, i) => (
          <li key={p.id} className="min-w-0">
            <button
              onClick={() => goToPost(p.slug)}
              className="group w-full text-left bg-white/85 hover:bg-white rounded-2xl border border-white/70 hover:border-sage/50 px-4 py-3.5 flex items-center gap-3 transition-all cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-0.5"
              aria-label={`${p.title} — ${formatViews(p.views)} ${b.viewsLabel}`}
            >
              <span className="text-xl flex-shrink-0" aria-hidden="true">
                {medals[i]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-brown-dark truncate group-hover:text-sage-dark transition-colors">
                  {p.title}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-brown-light/80 mt-0.5">
                  <Eye className="w-3 h-3 text-sage-dark" aria-hidden="true" />
                  {formatViews(p.views)} {b.viewsLabel}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}

// ---------------------------------------------------------------------
// 🧭 فهرست «در این صفحه» — کنار مقاله‌های بلند (فقط دسکتاپ بزرگ)
//    با اسکرول، بخش فعال هایلایت می‌شود؛ کلیک = اسکرول نرم به تیتر
// ---------------------------------------------------------------------
function TableOfContents({ headings }: { headings: { id: string; text: string }[] }) {
  const [active, setActive] = useState('')

  useEffect(() => {
    if (headings.length === 0) return
    const onScroll = () => {
      let current = ''
      for (const h of headings) {
        const el = document.getElementById(h.id)
        if (el && el.getBoundingClientRect().top <= 230) current = h.id
      }
      setActive(current)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [headings])

  if (headings.length === 0) return null

  const jump = (id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY - 190
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  }

  return (
    <aside className="hidden xl:block no-print" aria-label={b.toc.label}>
      <div className="sticky top-36 bg-white/80 backdrop-blur-sm rounded-2xl border border-sage-light/30 px-4 py-4 shadow-sm">
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-brown-light mb-3">
          <BookOpen className="w-3.5 h-3.5 text-sage-dark" aria-hidden="true" />
          {b.toc.label}
        </p>
        <ul className="space-y-1.5 max-h-72 overflow-y-auto">
          {headings.map((h) => (
            <li key={h.id}>
              <button
                onClick={() => jump(h.id)}
                aria-current={active === h.id ? 'true' : undefined}
                className={`text-left text-[13px] leading-snug rounded-lg px-2.5 py-1.5 w-full transition-colors cursor-pointer ${
                  active === h.id
                    ? 'bg-sage-light/40 text-sage-dark font-semibold'
                    : 'text-brown-light hover:text-brown-dark hover:bg-sage-light/20'
                }`}
              >
                {h.text}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}

// ---------------------------------------------------------------------
// 🔤🖨️ نوار ابزار مقاله — اندازهٔ فونت (A−/A/A+) و دکمهٔ چاپ/PDF
// ---------------------------------------------------------------------
function ArticleToolbar({
  step,
  onStep,
}: {
  step: ArticleFontStep
  onStep: (s: ArticleFontStep) => void
}) {
  const btn =
    'flex-1 min-w-9 h-8 flex items-center justify-center text-brown hover:bg-sage-light/30 transition-colors cursor-pointer'
  return (
    <div className="no-print flex items-center justify-between gap-3 flex-wrap mb-6 pb-4 border-b border-sage-light/20">
      <div className="flex items-center gap-2">
        <Type className="w-4 h-4 text-brown-light" aria-hidden="true" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-brown-light">
          {b.fontSize.label}
        </span>
        <div
          className="flex items-center rounded-full border border-sage-light/50 bg-white overflow-hidden"
          role="group"
          aria-label={b.fontSize.label}
        >
          <button
            onClick={() => onStep('s')}
            aria-label={b.fontSize.decrease}
            aria-pressed={step === 's'}
            className={`${btn} text-xs font-bold`}
          >
            A−
          </button>
          <button
            onClick={() => onStep('m')}
            aria-label={b.fontSize.reset}
            aria-pressed={step === 'm'}
            className={`${btn} text-[13px] font-semibold border-x border-sage-light/40`}
          >
            A
          </button>
          <button
            onClick={() => onStep('l')}
            aria-label={b.fontSize.increase}
            aria-pressed={step === 'l'}
            className={`${btn} text-sm font-bold`}
          >
            A+
          </button>
        </div>
      </div>
      <button
        onClick={() => window.print()}
        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-full bg-white text-brown border border-sage-light/50 hover:border-sage hover:text-sage-dark transition-all cursor-pointer"
      >
        <Printer className="w-3.5 h-3.5" aria-hidden="true" />
        {b.print}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------
//  صفحهٔ مقاله (جزئیات)
// ---------------------------------------------------------------------
function PostDetail({ post, all }: { post: BlogPost; all: BlogPost[] }) {
  // مقاله‌های پیشنهادی: اول هم‌دسته‌ها، بعد جدیدترین بقیه
  const related = [
    ...all.filter((p) => p.id !== post.id && p.tag === post.tag),
    ...all.filter((p) => p.id !== post.id && p.tag !== post.tag),
  ].slice(0, 3)

  // 🧭 تیترهای مقاله برای فهرست «در این صفحه» — از بلوک‌های ##
  const headings = useMemo(
    () =>
      post.content
        .split(/\n{2,}/)
        .filter((block) => block.startsWith('## '))
        .map((block, i) => ({ id: `sec-${i}`, text: block.slice(3).trim() })),
    [post.content]
  )

  // 🔤 اندازهٔ فونت مقاله — انتخاب کاربر در localStorage می‌ماند
  const [fontStep, setFontStep] = useState<ArticleFontStep>('m')
  useEffect(() => {
    const sync = () => {
      try {
        const v = localStorage.getItem(ARTICLE_FONT_KEY)
        if (v === 's' || v === 'm' || v === 'l') setFontStep(v)
      } catch {
        // حافظه در دسترس نیست — اندازهٔ پیش‌فرض
      }
    }
    sync()
  }, [])
  const changeFont = (s: ArticleFontStep) => {
    setFontStep(s)
    try {
      localStorage.setItem(ARTICLE_FONT_KEY, s)
    } catch {
      // بی‌اهمیت — فقط همین بازدید اعمال می‌شود
    }
  }

  return (
    <article id="page-blog" className="animate-ct-fadeInUp">
      <ReadingProgress />

      {/* کاور تصویری یا گرادیان برند */}
      <div className="relative h-52 md:h-80 mt-20 overflow-hidden group">
        <CoverImage post={post} zoomOnHover={false} emojiSize="text-8xl md:text-9xl" />
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-10 pb-14 relative xl:grid xl:grid-cols-[minmax(0,768px)_220px] xl:gap-10 xl:justify-center">
        <div className="min-w-0">
        {/* بدنهٔ مقاله */}
        <div className="ct-article-card bg-white rounded-3xl border border-sage-light/20 shadow-sm p-6 md:p-10">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className={`${tagBadge[post.tag] ?? tagBadge.news} text-xs font-semibold px-3 py-1 rounded-full`}>
              {tagLabel(post.tag)}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-brown-light/80">
              <CalendarDays className="w-3.5 h-3.5 text-sage-dark" />
              {b.detail.publishedOn} {fmtPostDate(post.createdAt)}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-brown-light/80">
              <Clock3 className="w-3.5 h-3.5 text-sage-dark" />
              {readingTime(post.content)} {b.readingTime}
            </span>
            {post.views > 0 && (
              <span className="flex items-center gap-1.5 text-xs text-brown-light/80">
                <Eye className="w-3.5 h-3.5 text-sage-dark" />
                {formatViews(post.views)} {b.viewsLabel}
              </span>
            )}
          </div>

          <h1 className="text-2xl md:text-4xl font-bold text-brown-dark leading-tight mb-5">
            {post.title}
          </h1>

          <p className="text-[15px] md:text-base text-brown font-medium leading-relaxed mb-7 border-l-4 border-sage pl-4">
            {post.excerpt}
          </p>

          <div className="mb-7">
            <ArticleToolbar step={fontStep} onStep={changeFont} />
            <PostContent text={post.content} fontSize={ARTICLE_FONT_PX[fontStep]} sectionIds={headings.map((h) => h.id)} />
          </div>

          <div className="pt-6 border-t border-sage-light/25 no-print">
            <ShareBar post={post} />
          </div>
        </div>

        </div>

        {/* 🧭 فهرست «در این صفحه» — فقط دسکتاپ بزرگ */}
        <TableOfContents headings={headings} />
      </div>

      {/* 🌗 باند کره‌ای — دعوت به خبرنامه (لبهٔ موجی از زمینهٔ کرم مقاله) */}
      <section className="relative bg-sec-butter overflow-hidden no-print" aria-label="Newsletter">
        <CurveDivider fill="var(--color-cream)" />
        <div className="max-w-3xl mx-auto px-6 pt-8 pb-16 relative">
          <NewsletterCta />
        </div>
      </section>

      {/* 🌿 باند سبز — مقاله‌های بعدی و بازگشت به فهرست (لبهٔ موجی از کره‌ای) */}
      <section className="relative bg-sec-sage overflow-hidden no-print" aria-label={b.readNext}>
        <CurveDivider fill="var(--color-sec-butter)" />
        <div className="max-w-6xl mx-auto px-6 pt-8 pb-20 relative">
          {related.length > 0 && (
            <div>
              <h2 className="flex items-center gap-2 text-xl font-bold text-brown-dark mb-6">
                <BookOpen className="w-5 h-5 text-sage-dark" />
                {b.readNext}
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {related.map((p, i) => (
                  <PostCard key={p.id} post={p} index={i} compact />
                ))}
              </div>
            </div>
          )}

          {/* بازگشت به لیست */}
          <div className="mt-10 text-center">
            <button
              onClick={() => {
                appNavigate('/blog')
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="bg-white border border-sage-light/50 text-brown px-6 py-3 rounded-full text-sm font-semibold hover:border-sage hover:text-sage-dark transition-colors cursor-pointer inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              {b.detail.back}
            </button>
          </div>
        </div>
      </section>
    </article>
  )
}

// ---------------------------------------------------------------------
//  صفحهٔ وبلاگ: لیست (/blog) و مقالهٔ تکی (/blog/slug)
// ---------------------------------------------------------------------
export function BlogPage({ slug: routeSlug = '' }: { slug?: string }) {
  const { posts, loading, failed, reload } = usePosts()
  const slug = routeSlug || null
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')

  // 🔖 ذخیرهٔ آخرین مقالهٔ خوانده‌شده برای نوار «ادامهٔ مطالعه» (نوشتن در
  //    sessionStorage داخل effect مجاز است — setState نیست)
  useEffect(() => {
    if (!slug || loading) return
    const post = posts.find((p) => p.slug === slug)
    if (!post) return
    try {
      sessionStorage.setItem(LAST_READ_KEY, JSON.stringify({ slug: post.slug, title: post.title }))
    } catch {
      // حافظهٔ نشست در دسترس نیست — قابلیت فقط غیرفعال می‌شود
    }
  }, [slug, loading, posts])

  // شمارش بازدید: برای هر مقاله در هر نشست فقط یک‌بار (با کمی تأخیر
  // تا کاربرانی که فقط رد می‌شوند شمرده نشوند)
  useEffect(() => {
    if (!slug) return
    const key = `ct-viewed-${slug}`
    try {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, '1')
    } catch {
      return // حافظهٔ نشست در دسترس نیست — شمارش انجام نشود
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/posts/view', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug }),
        })
        if (res.ok) reload() // نمایش شمارندهٔ به‌روز روی کارت‌ها و مقاله
      } catch {
        // خطای شبکه بی‌اهمیت است — بازدید دفعهٔ بعد شمرده می‌شود
      }
    }, 800)
    return () => clearTimeout(timer)
  }, [slug, reload])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return posts.filter((p) => {
      const byTag = filter === 'all' || p.tag === filter
      const bySearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.excerpt.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q)
      return byTag && bySearch
    })
  }, [posts, filter, query])

  // ---------- نمای مقالهٔ تکی ----------
  if (slug) {
    const post = posts.find((p) => p.slug === slug)
    if (loading) {
      return (
        <div id="page-blog" className="pt-32 md:pt-40 pb-24">
          <div className="max-w-3xl mx-auto px-6" aria-busy="true">
            <div className="h-52 md:h-80 rounded-3xl bg-sage-light/20 animate-pulse mb-6" />
            <div className="bg-white rounded-3xl border border-sage-light/20 p-8 space-y-4">
              <div className="h-3 w-40 bg-sage-light/20 rounded animate-pulse" />
              <div className="h-8 w-3/4 bg-sage-light/20 rounded animate-pulse" />
              <div className="h-3 w-full bg-sage-light/10 rounded animate-pulse" />
              <div className="h-3 w-11/12 bg-sage-light/10 rounded animate-pulse" />
              <div className="h-3 w-2/3 bg-sage-light/10 rounded animate-pulse" />
            </div>
          </div>
        </div>
      )
    }
    // ⚠️ خطای واقعی واکشی — قبل از فال‌بک «یافت نشد» چک می‌شود تا خطا به «پیدا نشد» فریب داده نشود
    if (!post && failed) {
      return (
        <div id="page-blog" className="pt-40 pb-32 text-center px-6">
          <AlertCircle className="w-10 h-10 mx-auto mb-4 text-peach" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-brown-dark mb-2">{b.loadFailed}</h1>
          <button
            onClick={reload}
            className="bg-sage-light/30 text-brown-dark px-6 py-3 rounded-full text-sm font-semibold hover:bg-sage-light/50 transition-colors cursor-pointer inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            {b.retry}
          </button>
        </div>
      )
    }
    if (!post) {
      return (
        <div id="page-blog" className="pt-40 pb-32 text-center px-6">
          <span className="text-5xl block mb-4" aria-hidden="true">
            🔍
          </span>
          <h1 className="text-2xl font-bold text-brown-dark mb-2">{b.notFoundTitle}</h1>
          <p className="text-sm text-brown-light mb-8">{b.notFoundText}</p>
          <button
            onClick={() => {
              appNavigate('/blog')
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            className="bg-sage text-brown-dark px-6 py-3 rounded-full text-sm font-semibold hover:bg-sage-dark transition-colors cursor-pointer inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {b.detail.back}
          </button>
        </div>
      )
    }
    return <PostDetail post={post} all={posts} />
  }

  // ---------- نمای لیست ----------
  const [featured, ...rest] = visible

  return (
    <div id="page-blog">
      {/* Hero */}
      <section className="pt-32 pb-10 md:pt-40 relative overflow-hidden bg-cream">
        {/* 🌸 تزئینات ملایم — کاراکتر محو + هالهٔ کره‌ای + برگ */}
        <div
          aria-hidden="true"
          className="absolute -top-8 -left-20 w-72 h-72 bg-butter/25 rounded-full blur-3xl"
        ></div>
        <div
          aria-hidden="true"
          className="absolute top-32 right-0 w-1/2 h-56 ct-dots opacity-40 [mask-image:linear-gradient(to_left,black,transparent)]"
        ></div>
        <div className="char-bg top-12 right-[8%]" style={{ fontSize: '220px', opacity: 0.04 }} aria-hidden="true">
          文
        </div>
        <svg
          aria-hidden="true"
          className="absolute bottom-6 left-[7%] w-11 opacity-60 animate-ct-floatSlow hidden md:block"
          viewBox="0 0 56 40"
        >
          <g transform="translate(3 20)"><Leaflet w={46} mode="rust" /></g>
        </svg>
        <div className="max-w-7xl mx-auto px-6 text-center relative">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-sage-dark mb-3">
            <Newspaper className="w-4 h-4" />
            {b.eyebrow}
          </span>
          <h1 className="text-3xl md:text-5xl font-bold text-brown-dark mb-4">{b.title}</h1>
          <p className="text-brown-light max-w-2xl mx-auto">{b.subtitle}</p>
        </div>
      </section>

      {/* 🔖 ادامهٔ مطالعه — آخرین مقالهٔ نیمه‌کارهٔ همین نشست */}
      <div className="pb-6">
        <ContinueReading />
      </div>

      {/* فیلتر دسته‌بندی + جستجو */}
      <section className="pb-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-wrap justify-center gap-3 mb-5" role="tablist" aria-label="Blog filters">
            {b.tags.map((t) => (
              <button
                key={t.key}
                onClick={() => setFilter(t.key)}
                role="tab"
                aria-selected={filter === t.key}
                className={`filter-btn px-5 py-2 rounded-full text-sm font-medium bg-sage-light/30 text-brown transition-all cursor-pointer ${
                  filter === t.key ? 'active' : ''
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="relative max-w-md mx-auto">
            <Search className="w-4 h-4 text-brown-light absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <label htmlFor="blog-search" className="sr-only">
              {b.searchPlaceholder}
            </label>
            <input
              id="blog-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={b.searchPlaceholder}
              className="w-full pl-11 pr-4 py-3 rounded-full bg-white border border-sage-light/40 text-sm text-brown placeholder:text-brown-light/60 focus:outline-none focus:border-sage focus:ring-[3px] focus:ring-sage/20 transition-all"
            />
          </div>
        </div>
      </section>

      {/* مقاله‌ها */}
      <section className="pb-24 bg-sec-sage relative overflow-hidden">
        {/* 🌊 لبهٔ منحنی از هیروی کرم + کاراکتر محو 书 و نقاط */}
        <CurveDivider fill="var(--color-cream)" />
        <div className="char-bg top-14 left-[4%]" style={{ fontSize: '200px', opacity: 0.05 }} aria-hidden="true">
          书
        </div>
        <div
          aria-hidden="true"
          className="absolute bottom-28 right-[3%] w-48 h-48 ct-dots opacity-40 [mask-image:radial-gradient(circle,black,transparent_70%)] hidden md:block"
        ></div>
        <div className="max-w-7xl mx-auto px-6 relative">
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[0, 1, 2].map((i) => (
                <div key={i} className="bg-white rounded-3xl border border-sage-light/20 overflow-hidden">
                  <div className="h-44 bg-sage-light/20 animate-pulse" />
                  <div className="p-6 space-y-3">
                    <div className="h-3 w-24 bg-sage-light/20 rounded animate-pulse" />
                    <div className="h-5 w-3/4 bg-sage-light/20 rounded animate-pulse" />
                    <div className="h-3 w-full bg-sage-light/10 rounded animate-pulse" />
                    <div className="h-3 w-2/3 bg-sage-light/10 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : failed ? (
            // ⚠️ خطای واقعی شبکه/سرور — صادقانه با دکمهٔ Retry (نه «مقاله‌ای نیست»)
            <div className="text-center py-20 text-brown-light">
              <AlertCircle className="w-10 h-10 mx-auto mb-3 text-peach" aria-hidden="true" />
              <p className="font-semibold text-brown-dark mb-4">{b.loadFailed}</p>
              <button
                onClick={reload}
                className="bg-sage-light/30 text-brown-dark px-6 py-3 rounded-full text-sm font-semibold hover:bg-sage-light/50 transition-colors cursor-pointer inline-flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                {b.retry}
              </button>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20 text-brown-light">
              <Newspaper className="w-10 h-10 mx-auto mb-3 text-sage-dark" />
              <p className="font-semibold text-brown-dark mb-1">{b.emptyTitle}</p>
              <p className="text-sm">{b.emptyText}</p>
            </div>
          ) : visible.length === 0 ? (
            <div className="text-center py-16 text-brown-light">
              <SearchX className="w-10 h-10 mx-auto mb-3 text-sage-dark" />
              <p>{query ? b.noResults : 'No articles in this category yet.'}</p>
            </div>
          ) : (
            <>
              {/* 🔥 پربازدیدترین‌ها — فقط نمای پیش‌فرض (بدون جست‌وجو/فیلتر) */}
              {!query && filter === 'all' && <TrendingStrip posts={posts} />}

              {/* مقالهٔ شاخص (اولین مقاله) — فقط بدون جستجو */}
              {featured && !query && (
                <article
                  className="group bg-white rounded-3xl overflow-hidden border border-sage-light/20 card-hover animate-ct-fadeInUp grid md:grid-cols-2 mb-10"
                  style={{ animationDelay: '0ms' }}
                >
                  <button
                    onClick={() => goToPost(featured.slug)}
                    className="relative block min-h-56 md:min-h-72 cursor-pointer overflow-hidden"
                    aria-label={`${b.readMore} — ${featured.title}`}
                  >
                    <CoverImage post={featured} emojiSize="text-8xl" />
                    <span className="absolute top-5 left-5 bg-white/85 backdrop-blur-sm text-sage-dark text-xs font-bold px-3 py-1.5 rounded-full">
                      ★ {b.featuredLabel}
                    </span>
                    {featured.views > 0 && (
                      <span className="absolute bottom-4 right-4 inline-flex items-center gap-1 bg-white/80 backdrop-blur-sm text-brown text-[11px] font-semibold px-2 py-0.5 rounded-full">
                        <Eye className="w-3 h-3 text-sage-dark" />
                        {formatViews(featured.views)}
                      </span>
                    )}
                  </button>
                  <div className="p-8 md:p-10 flex flex-col justify-center">
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <span
                        className={`${tagBadge[featured.tag] ?? tagBadge.news} text-xs font-semibold px-3 py-1 rounded-full`}
                      >
                        {tagLabel(featured.tag)}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-brown-light/80">
                        <CalendarDays className="w-3.5 h-3.5 text-sage-dark" />
                        <time dateTime={featured.createdAt}>{fmtPostDate(featured.createdAt)}</time>
                      </span>
                      <span className="flex items-center gap-1 text-xs text-brown-light/80">
                        <Clock3 className="w-3.5 h-3.5 text-sage-dark" />
                        {readingTime(featured.content)} {b.readingTime}
                      </span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-brown-dark mb-3 leading-snug group-hover:text-sage-dark transition-colors">
                      {featured.title}
                    </h2>
                    <p className="text-sm md:text-base text-brown-light leading-relaxed mb-6">
                      {featured.excerpt}
                    </p>
                    <button
                      onClick={() => goToPost(featured.slug)}
                      className="self-start bg-sage text-brown-dark px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-sage-dark hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(168,201,160,0.4)] transition-all cursor-pointer"
                    >
                      {b.readMore}
                    </button>
                  </div>
                </article>
              )}

              {/* بقیهٔ مقاله‌ها — در حالت جستجو همهٔ نتایج اینجا نمایش داده می‌شوند */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {(query ? visible : rest).map((post, i) => (
                  <PostCard key={post.id} post={post} index={i + 1} />
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  )
}
