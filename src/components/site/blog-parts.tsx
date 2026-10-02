'use client'

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { CalendarDays, ArrowRight, Clock3, Eye } from 'lucide-react'
import { siteContent } from '@/content/site-content'
import { resilientJsonFetch } from '@/lib/client-fetch'

// ---------------------------------------------------------------------
//  بخش‌های مشترک وبلاگ: هوک دریافت مقاله‌ها + کاور + کارت + رندر متن
// ---------------------------------------------------------------------

export interface BlogPost {
  id: string
  title: string
  slug: string
  tag: string
  emoji: string
  color: string
  image: string | null
  views: number
  excerpt: string
  content: string
  published: boolean
  createdAt: string
  updatedAt: string
}

function subscribeToHash(callback: () => void) {
  window.addEventListener('hashchange', callback)
  return () => window.removeEventListener('hashchange', callback)
}

// خواندن slug از آدرس (#/blog/my-post → my-post) — null یعنی لیست وبلاگ
export function usePostSlug(): string | null {
  return useSyncExternalStore(
    subscribeToHash,
    () => {
      const raw = window.location.hash.replace(/^#\/?/, '').split('?')[0]
      if (raw.startsWith('blog/')) return decodeURIComponent(raw.slice(5)) || null
      return null
    },
    () => null
  )
}

// ناوبری به صفحهٔ مقاله
export function goToPost(slug: string) {
  window.location.hash = `/blog/${encodeURIComponent(slug)}`
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// دریافت مقاله‌های منتشرشده از API
// 🛡️ سه‌حالته و صادقانه: loading / failed (خطای واقعی شبکه/سرور) / خالیِ واقعی.
// خطا هرگز به «خالی» فریب داده نمی‌شود — کاربر دکمهٔ Retry می‌بیند نه «مقاله‌ای نیست».
export function usePosts() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const load = useCallback(() => {
    resilientJsonFetch<{ posts?: BlogPost[] }>('/api/posts', { cache: 'no-store' })
      .then((res) => {
        if (res.ok) {
          setPosts(res.data.posts ?? [])
          setFailed(false)
        } else {
          // خطای HTTP — لیست قبلی (در reloadها) دست‌نخورده می‌ماند
          setFailed(true)
        }
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
    // با هر ناوبری (تغییر hash) مقاله‌ها دوباره واکشی شوند تا مقاله‌های
    // جدیدِ اضافه‌شده از پنل مدیریت بلافاصله دیده شوند
    window.addEventListener('hashchange', load)
    return () => window.removeEventListener('hashchange', load)
  }, [load])

  return { posts, loading, failed, reload: load }
}

// زمان تقریبی مطالعه (حدود ۲۰۰ واژه در دقیقه)
export function readingTime(content: string): number {
  const words = content.trim().split(/\s+/).length
  return Math.max(1, Math.round(words / 200))
}

// نمایش خوانا تعداد بازدید (۱۲۳۴ → «1.2k»)
export function formatViews(views: number): string {
  if (views >= 1000) return `${(views / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return String(views)
}

// ---------------------------------------------------------------------
//  کاور مقاله: اگر تصویر داشته باشد عکس، وگرنه گرادیان برند + ایموجی.
//  تصویر با fade-in نرم لود می‌شود و روی کارت‌ها با هاور کمی بزرگ می‌شود.
//  (حالت لود از state مشتق می‌شود — بدون effect)
// ---------------------------------------------------------------------
export function CoverImage({
  post,
  emojiSize = 'text-6xl',
  zoomOnHover = true,
}: {
  post: BlogPost
  emojiSize?: string
  zoomOnHover?: boolean
}) {
  const gradient = coverGradient[post.color] ?? coverGradient.sage
  const src = post.image ?? ''
  // آدرس تصویری که تاکنون با موفقیت لود شده — با تغییر مقاله به‌طور خودکار ریست می‌شود
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null)
  const loaded = loadedSrc !== null && loadedSrc === src

  // تصاویر کش‌شده ممکن است قبل از اتصال هندلر onLoad لود شده باشند
  const imgRef = useCallback(
    (el: HTMLImageElement | null) => {
      if (el && el.complete && el.naturalWidth > 0) {
        setLoadedSrc((prev) => (prev === src ? prev : src))
      }
    },
    [src]
  )

  return (
    <span className={`absolute inset-0 overflow-hidden bg-gradient-to-br ${gradient}`} aria-hidden="true">
      {src ? (
        <img
          ref={imgRef}
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          onLoad={() => setLoadedSrc((prev) => (prev === src ? prev : src))}
          onError={() => setLoadedSrc(null)}
          className={`h-full w-full object-cover transition-[opacity,transform] duration-700 ease-out ${
            loaded ? 'opacity-100' : 'opacity-0'
          } ${zoomOnHover ? 'group-hover:scale-[1.06]' : ''}`}
        />
      ) : (
        <span
          className={`absolute inset-0 flex items-center justify-center select-none ${
            emojiSize
          } ${zoomOnHover ? 'group-hover:scale-110 transition-transform duration-500' : ''}`}
        >
          {post.emoji}
        </span>
      )}
      {/* لایهٔ سایهٔ نرم پایین کاور برای خوانایی بَج‌ها */}
      <span className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/15 to-transparent" />
    </span>
  )
}

// گرادیان کاور بر اساس رنگ انتخابی (هماهنگ با پالت برند)
export const coverGradient: Record<string, string> = {
  sage: 'from-sage-light/80 via-sage/35 to-sage-dark/25',
  butter: 'from-butter/80 via-butter/40 to-peach-light/50',
  peach: 'from-peach-light/90 via-peach/40 to-butter/50',
}

export const tagBadge: Record<string, string> = {
  news: 'bg-sage/20 text-sage-dark',
  culture: 'bg-butter/40 text-brown',
  tips: 'bg-peach-light/60 text-brown',
  hsk: 'bg-sage-light/50 text-sage-dark',
}

export function tagLabel(tag: string): string {
  const found = siteContent.blog.tags.find((t) => t.key === tag)
  return found ? found.label : tag
}

export function fmtPostDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

// رندر متن مقاله: پاراگراف‌ها با خط خالی جدا می‌شوند؛ **متن** بولد
// و خط‌هایی که با ## شروع شوند زیرعنوان می‌شوند
// • fontSize = اندازهٔ فونت بدنه (کنترل A−/A/A+ در صفحهٔ مقاله)
// • sectionIds = شناسهٔ لنگر برای تیترهای ## (فهرست «در این صفحه»)
export function PostContent({
  text,
  fontSize,
  sectionIds,
}: {
  text: string
  fontSize?: number
  sectionIds?: string[]
}) {
  const blocks = text.split(/\n{2,}/).filter(Boolean)
  // ⚠️ sectionIds به ترتیبِ «تیترها» است نه همهٔ بلوک‌ها — ایندکس تیترِ هر بلوک
  //    یک‌جا و به‌صورت خالص محاسبه می‌شود (بدون reassign در حین رندر)
  const headingIdxOfBlock = blocks.reduce<Map<number, number>>((acc, block, i) => {
    if (block.startsWith('## ')) acc.set(i, acc.size)
    return acc
  }, new Map())
  return (
    <div className="space-y-4">
      {blocks.map((block, i) => {
        if (block.startsWith('## ')) {
          const headingIdx = headingIdxOfBlock.get(i)
          return (
            <h3
              key={i}
              id={headingIdx !== undefined ? sectionIds?.[headingIdx] : undefined}
              className="ct-article-heading flex items-center gap-2.5 text-lg font-bold text-brown-dark pt-3 scroll-mt-40"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-sage flex-shrink-0" aria-hidden="true" />
              {block.slice(3)}
            </h3>
          )
        }
        return (
          <p
            key={i}
            className="ct-article-paragraph text-[15px] leading-relaxed text-brown-light"
            style={fontSize ? { fontSize } : undefined}
          >
            {block.split(/(\*\*[^*]+\*\*)/g).map((chunk, j) =>
              chunk.startsWith('**') && chunk.endsWith('**') ? (
                <strong key={j} className="text-brown-dark font-semibold">
                  {chunk.slice(2, -2)}
                </strong>
              ) : (
                <span key={j}>{chunk}</span>
              )
            )}
          </p>
        )
      })}
    </div>
  )
}

interface PostCardProps {
  post: BlogPost
  index: number
  compact?: boolean
}

// کارت مقاله — با کلیک به صفحهٔ خود مقاله (#/blog/slug) می‌رود
export function PostCard({ post, index, compact = false }: PostCardProps) {
  const badge = tagBadge[post.tag] ?? tagBadge.news

  return (
    <article
      className={`group bg-white rounded-3xl overflow-hidden border border-sage-light/20 card-hover card-wave animate-ct-fadeInUp flex flex-col ${
        compact ? '' : 'h-full'
      }`}
      style={{ animationDelay: `${index * 70}ms` }}
    >
      {/* کاور تصویری یا گرادیان برند */}
      <button
        onClick={() => goToPost(post.slug)}
        className={`relative block w-full ${
          compact ? 'h-36' : 'h-44'
        } cursor-pointer overflow-hidden`}
        aria-label={`${siteContent.blog.readMore} — ${post.title}`}
      >
        <CoverImage post={post} />
        <span
          className={`absolute top-4 left-4 ${badge} text-xs font-semibold px-3 py-1 rounded-full backdrop-blur-sm`}
        >
          {tagLabel(post.tag)}
        </span>
        {post.views > 0 && (
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 bg-white/80 backdrop-blur-sm text-brown text-[11px] font-semibold px-2 py-0.5 rounded-full">
            <Eye className="w-3 h-3 text-sage-dark" />
            {formatViews(post.views)}
          </span>
        )}
      </button>

      <div className={`flex flex-col flex-1 ${compact ? 'p-5' : 'p-6'}`}>
        <div className="flex items-center gap-3 text-xs text-brown-light/80 mb-3">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-sage-dark" />
            <time dateTime={post.createdAt}>{fmtPostDate(post.createdAt)}</time>
          </span>
          <span className="flex items-center gap-1">
            <Clock3 className="w-3.5 h-3.5 text-sage-dark" />
            {readingTime(post.content)} {siteContent.blog.readingTime}
          </span>
        </div>
        <h3
          className={`font-bold text-brown-dark mb-2 leading-snug group-hover:text-sage-dark transition-colors ${
            compact ? 'text-base' : 'text-lg'
          }`}
        >
          {post.title}
        </h3>
        <p className={`text-sm text-brown-light leading-relaxed mb-4 ${compact ? 'line-clamp-2' : 'line-clamp-3'}`}>
          {post.excerpt}
        </p>
        <button
          onClick={() => goToPost(post.slug)}
          className="mt-auto self-start inline-flex items-center gap-1.5 text-sm font-semibold text-sage-dark hover:gap-2.5 transition-all cursor-pointer"
          aria-label={`${siteContent.blog.readMore} — ${post.title}`}
        >
          {siteContent.blog.readMore}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </article>
  )
}
