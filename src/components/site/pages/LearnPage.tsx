'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, Play } from 'lucide-react'
import { InstagramIcon, TelegramIcon } from '../brand-icons'
import { Flashcards } from '../Flashcards'
import { ToneTrainer } from '../ToneTrainer'
import { siteContent } from '@/content/site-content'
import { appNavigate } from '@/lib/nav'

const c = siteContent.learn

const colorMap = {
  sage: { bg: 'bg-sage-light/20', border: 'border-sage-light/20', tag: 'text-sage-dark' },
  butter: { bg: 'bg-butter/15', border: 'border-butter/20', tag: 'text-brown' },
  peach: { bg: 'bg-peach-light/15', border: 'border-peach-light/20', tag: 'text-peach' },
  cream: { bg: 'bg-cream', border: 'border-sage-light/20', tag: 'text-sage-dark' },
} as const

// 📚 شکل درس (کارت + واژه‌های مودال) — از دیتابیس یا فایل محتوا
interface LessonContent {
  title: string
  subtitle: string
  words: { chinese: string; pinyin: string; meaning: string; example?: string }[]
}

interface LessonCard {
  category: string
  color: string
  tag: string
  big: string
  small: string
  title: string
  text: string
  action: string
  lesson: string
  isVideo?: boolean
}

export function LearnPage() {
  const [filter, setFilter] = useState('all')

  // 🗄️ درس‌ها از دیتابیس (تب Lessons پنل) — تا وقتی خالی باشد کارت‌ها و
  // درس‌های پیش‌فرض فایل محتوا نمایش داده می‌شوند
  const [dbLessons, setDbLessons] = useState<
    (LessonContent & LessonCard & { slug: string })[] | null
  >(null)

  // نگاشت slug → محتوای درس — همیشه از جدیدترین منبع ساخته می‌شود
  const staticLessons = c.lessons as unknown as Record<string, LessonContent>
  const lessonsMap: Record<string, LessonContent> = dbLessons
    ? Object.fromEntries(
        dbLessons.map((l) => [l.slug, { title: l.title, subtitle: l.subtitle, words: l.words }])
      )
    : staticLessons
  // 🃏 کارت‌های بخش Learn — از دیتابیس اگر درس موجود باشد
  const items: LessonCard[] = dbLessons
    ? dbLessons.map((l) => ({
        category: l.category,
        color: l.color,
        tag: l.tag,
        big: l.big,
        small: l.small,
        title: l.title,
        text: l.text,
        action: l.action,
        lesson: l.slug,
        isVideo: l.isVideo,
      }))
    : (c.items as unknown as LessonCard[])

  // 📚 فاز ۲۲: به‌جای مودال، هر درس صفحهٔ اختصاصی دارد: /lesson/<slug>

  // 🗄️ واژه‌های فلش‌کارت از دیتابیس (پنل ادمین) — تا وقتی خالی باشد
  // نسخهٔ پیش‌فرض فایل محتوا نمایش داده می‌شود
  const [cards, setCards] = useState<
    { chinese: string; pinyin: string; meaning: string; example: string | null }[]
  | null>(null)

  // 📚 ناوبری به صفحهٔ اختصاصی درس (لینک‌پذیر و قابل اشتراک‌گذاری: /lesson/<slug>)
  const goToLesson = useCallback((slug: string) => {
    try {
      sessionStorage.removeItem('ct-lesson-return')
    } catch {
      // حافظه در دسترس نیست
    }
    appNavigate(`/lesson/${encodeURIComponent(slug)}`)
  }, [])

  useEffect(() => {
    let cancelled = false
    const loadData = () => {
      fetch('/api/learn/lessons')
        .then((res) => res.json())
        .then((data) => {
          if (cancelled) return
          if (Array.isArray(data.lessons) && data.lessons.length > 0) {
            setDbLessons(data.lessons)
          } else if (Array.isArray(data.lessons) && data.lessons.length === 0) {
            setDbLessons(null) // دیتابیس خالی شد → برگرد به محتوای پیش‌فرض
          }
        })
        .catch(() => {})
      fetch('/api/learn/cards')
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled && Array.isArray(data.cards) && data.cards.length > 0) {
            setCards(
              data.cards.map(
                (c: { chinese: string; pinyin: string; meaning: string; example: string | null }) => ({
                  chinese: c.chinese,
                  pinyin: c.pinyin,
                  meaning: c.meaning,
                  example: c.example,
                })
              )
            )
          } else if (!cancelled && Array.isArray(data.cards) && data.cards.length === 0) {
            setCards(null) // دیتابیس خالی شد → برگرد به محتوای پیش‌فرض
          }
        })
        .catch(() => {})
    }
    loadData()
    return () => {
      cancelled = true
    }
  }, [])

  const visible = items.filter(
    (item) => filter === 'all' || item.category.split(' ').includes(filter)
  )

  return (
    <div id="page-learn">
      <section className="pt-32 pb-12 md:pt-40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-6">
            <h1 className="text-3xl md:text-5xl font-bold text-brown-dark mb-4">{c.title}</h1>
            <p className="text-brown-light max-w-2xl mx-auto">{c.subtitle}</p>
          </div>
        </div>
      </section>

      <section className="pb-6">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-wrap justify-center gap-3" role="tablist" aria-label="Content filters">
            {c.filters.map((f, i) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                role="tab"
                aria-selected={filter === f.key}
                className={`learn-filter filter-btn px-5 py-2 rounded-full text-sm font-medium transition-all cursor-pointer ${
                  filter === f.key ? 'active' : ''
                } ${f.key === 'all' && filter === 'all' ? 'bg-sage text-brown-dark' : 'bg-sage-light/30 text-brown'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visible.map((item, i) => {
              const color = colorMap[item.color as keyof typeof colorMap] ?? colorMap.sage
              const delays = ['', 'delay-100', 'delay-200']
              return (
                <div
                  key={i}
                  className={`learn-card bg-white rounded-2xl overflow-hidden card-hover card-wave border ${color.border} animate-ct-fadeInUp ${delays[i % 3]}`}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className={`h-44 ${color.bg} flex items-center justify-center relative`}>
                    <div className="text-center px-4">
                      <p
                        className={`font-bold text-brown-dark ${
                          item.big.length <= 2 ? 'text-5xl' : 'text-3xl'
                        } ${item.tag === 'Characters' ? 'font-serif' : ''}`}
                      >
                        {item.big}
                      </p>
                      <p className="text-sm text-brown-light mt-1">{item.small}</p>
                    </div>
                    <span className="absolute top-3 left-3 bg-white/80 text-xs font-semibold px-3 py-1 rounded-full">
                      {item.tag}
                    </span>
                    {item.isVideo && (
                      <span className="absolute top-3 right-3 bg-sage/80 text-white text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1">
                        <Play className="w-2.5 h-2.5" /> Video
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="text-base font-semibold text-brown-dark mb-1">{item.title}</h3>
                    <p className="text-sm text-brown-light mb-4">{item.text}</p>
                    {/* 👇 باز شدن مودال همان درس — مبدأ پاک می‌شود تا «بازگشت» در همین صفحه بماند */}
                    <button
                      onClick={() => goToLesson(item.lesson)}
                      className="text-sm font-medium text-sage-dark flex items-center gap-1 hover:gap-2 transition-all cursor-pointer"
                    >
                      {item.action} <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 👂 بازی تمرین تُن‌ها — گوش بده و تُن را حدس بزن */}
          <ToneTrainer />

          {/* 🃏 فلش‌کارت واژگان — زیر بازی، قبل از بخش فوتر صفحه */}
          <Flashcards key={`cards-${cards?.length ?? 0}`} cards={cards ?? undefined} />

          <div className="text-center mt-14">
            <p className="text-sm text-brown-light mb-5">{c.moreNote}</p>
            <div className="flex justify-center gap-4">
              <a
                href={siteContent.contact.socials.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white px-5 py-2.5 rounded-full text-sm font-medium text-brown border border-sage-light/20 hover:border-sage transition-all cursor-pointer"
              >
                <InstagramIcon size={18} /> Instagram
              </a>
              <a
                href={siteContent.contact.socials.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white px-5 py-2.5 rounded-full text-sm font-medium text-brown border border-sage-light/20 hover:border-sage transition-all cursor-pointer"
              >
                <TelegramIcon size={18} /> Telegram
              </a>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
