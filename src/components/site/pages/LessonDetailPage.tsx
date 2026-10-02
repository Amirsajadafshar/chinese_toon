'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, BookOpenText, GraduationCap, Volume2 } from 'lucide-react'
import { CurveDivider } from '../CurveDivider'
import { Leaflet } from '../ToonBranch'
import { siteContent, PageKey } from '@/content/site-content'
import { speakChinese, stopSpeak as stopCtSpeak } from '@/lib/ct-speak'

const lm = siteContent.learn.lessons.modal
const ld = siteContent.learn.lessons.detail

// ---------------------------------------------------------------------
//  📚 صفحهٔ اختصاصی هر درس — ‎#/lesson/<slug> (فاز ۲۲)
//  جایگزین مستقل مودال: لینک‌پذیر، قابل اشتراک‌گذاری و با همان زبان بصری
//  سایت (هیرو کرم → واژه‌ها روی سبز پاستلی → دعوت ثبت‌نام روی کره‌ای).
//  واژه‌ها با تلفظ هوش مصنوعی (/api/tts) — جایگزین: صدای دستگاه؛ داده از دیتابیس (پنل ادمین).
// ---------------------------------------------------------------------

interface LessonWord {
  chinese: string
  pinyin: string
  meaning: string
  example?: string | null
}

// 🔈 دکمهٔ کوچک پخش جملهٔ نمونهٔ هر واژه (کارت واژه در صفحهٔ درس)
function ExampleAudio({
  text,
  meaning,
  active,
  label,
  onPlay,
}: {
  text: string
  meaning: string
  active: boolean
  label: string
  onPlay: (text: string) => void
}) {
  return (
    <button
      onClick={() => onPlay(text)}
      aria-label={`${label}: ${meaning}`}
      aria-pressed={active}
      className={`w-7 h-7 flex-shrink-0 rounded-full flex items-center justify-center transition-all cursor-pointer ${
        active
          ? 'bg-sage text-brown-dark scale-105'
          : 'bg-cream text-brown-light hover:text-sage-dark hover:bg-sage-light/25'
      }`}
    >
      <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
    </button>
  )
}

interface DbLesson {
  slug: string
  title: string
  text: string
  subtitle: string
  big: string
  small: string
  tag: string
  words: LessonWord[]
}

export function LessonDetailPage({
  slug,
  onNavigate,
}: {
  slug: string
  onNavigate: (page: PageKey) => void
}) {
  // داده برای هر slug جدا نگه داشته می‌شود؛ نمایش فقط وقتی با slug فعلی می‌خواند
  // (به‌جای ریستِ همگام داخل effect — سازگار با قواعد React)
  const [loaded, setLoaded] = useState<{
    slug: string
    lesson: DbLesson | null
    state: 'ready' | 'notfound'
  } | null>(null)
  const [speaking, setSpeaking] = useState<string | null>(null)

  // 📦 دادهٔ معتبرِ درسِ فعلی (یا null هنگام لود)
  const current = loaded && loaded.slug === slug ? loaded : null
  const state: 'loading' | 'ready' | 'notfound' = current ? current.state : 'loading'
  const lesson = current?.lesson ?? null

  // 🔊 تلفظ واژه — اول صدای هوش مصنوعی سرور، جایگزین: صدای چینی دستگاه
  const speak = (text: string) => {
    setSpeaking(text)
    void speakChinese(text, { speed: 0.85, onEnd: () => setSpeaking(null) })
  }

  // 🔈 پخش جملهٔ نمونهٔ هر واژه — کلید جدا (ex:) تا با تلفظ خود واژه تداخل نکند
  const speakExample = (text: string) => {
    const key = `ex:${text}`
    setSpeaking(key)
    void speakChinese(text, {
      speed: 0.75,
      onEnd: () => setSpeaking((cur) => (cur === key ? null : cur)),
    })
  }

  // بارگیری درس — با هر تغییر slug دوباره خوانده می‌شود
  useEffect(() => {
    let cancelled = false
    if (!slug) return
    fetch('/api/learn/lessons')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        const found = (data.lessons ?? []).find((l: DbLesson) => l.slug === slug)
        setLoaded(
          found
            ? { slug, lesson: found, state: 'ready' }
            : { slug, lesson: null, state: 'notfound' }
        )
      })
      .catch(() => {
        if (!cancelled) setLoaded({ slug, lesson: null, state: 'notfound' })
      })
    return () => {
      cancelled = true
      // قطع تلفظ هنگام خروج/تعویض درس
      stopCtSpeak()
      setSpeaking(null)
    }
  }, [slug])

  return (
    <div id="page-lesson">
      {/* ================= هیروی درس (کرم) ================= */}
      <section className="pt-32 pb-14 md:pt-40 md:pb-16 relative overflow-hidden bg-cream">
        {/* 🌸 تزئینات: هالهٔ کره‌ای، کاراکتر محو، برگ شناور، نقطه‌ها */}
        <div
          aria-hidden="true"
          className="absolute -top-10 -left-20 w-72 h-72 bg-butter/25 rounded-full blur-3xl"
        ></div>
        <div
          aria-hidden="true"
          className="absolute top-40 right-0 w-1/2 h-56 ct-dots opacity-40 [mask-image:linear-gradient(to_left,black,transparent)]"
        ></div>
        <div className="char-bg top-12 right-[5%]" style={{ fontSize: '220px', opacity: 0.05 }} aria-hidden="true">
          课
        </div>
        <svg
          aria-hidden="true"
          className="absolute bottom-8 left-[7%] w-11 opacity-60 animate-ct-floatSlow hidden md:block"
          viewBox="0 0 56 40"
        >
          <g transform="translate(3 20)">
            <Leaflet w={46} mode="sage" />
          </g>
        </svg>

        <div className="max-w-4xl mx-auto px-6 relative">
          {/* 🔙 بازگشت به فهرست درس‌ها */}
          <button
            onClick={() => onNavigate('learn')}
            className="inline-flex items-center gap-2 text-sm font-medium text-brown-light hover:text-sage-dark transition-colors cursor-pointer mb-8 no-print"
          >
            <span className="w-9 h-9 rounded-full bg-white border border-sage-light/40 flex items-center justify-center">
              <ArrowRight className="w-4 h-4 rotate-180" aria-hidden="true" />
            </span>
            {ld.backToLessons}
          </button>

          {state === 'loading' && (
            /* اسکلتون لودینگ */
            <div className="animate-pulse" aria-hidden="true">
              <div className="h-7 w-32 bg-sage-light/30 rounded-full mb-6"></div>
              <div className="h-12 w-3/4 bg-sage-light/30 rounded-2xl mb-4"></div>
              <div className="h-4 w-1/2 bg-cream-dark rounded mb-3"></div>
              <div className="h-4 w-2/3 bg-cream-dark rounded"></div>
            </div>
          )}

          {state === 'notfound' && (
            /* حالت «درس پیدا نشد» */
            <div className="text-center py-10">
              <div className="char-bg -top-6 left-1/2 -translate-x-1/2" style={{ fontSize: '200px', opacity: 0.05 }} aria-hidden="true">
                无
              </div>
              <span className="inline-flex items-center gap-2 bg-sage-light/30 rounded-full px-4 py-1.5 mb-5 text-xs font-semibold uppercase tracking-widest text-sage-dark">
                <BookOpenText className="w-3.5 h-3.5" aria-hidden="true" /> {ld.lessonBadge}
              </span>
              <h1 className="text-3xl md:text-4xl font-bold text-brown-dark mb-4">{ld.notFoundTitle}</h1>
              <p className="text-brown-light max-w-md mx-auto mb-8">{ld.notFoundText}</p>
              <button
                onClick={() => onNavigate('learn')}
                className="bg-sage text-brown-dark px-7 py-3 rounded-full text-sm font-bold inline-flex items-center gap-2 hover:bg-sage-dark transition-all cursor-pointer min-h-[44px]"
              >
                {ld.backToLessons} <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          )}

          {state === 'ready' && lesson && (
            <div className="animate-ct-fadeInUp">
              {lesson.tag && (
                <span className="inline-flex items-center gap-1.5 bg-sage-light/30 rounded-full px-4 py-1.5 mb-5 text-xs font-semibold uppercase tracking-widest text-sage-dark">
                  <BookOpenText className="w-3.5 h-3.5" aria-hidden="true" /> {lesson.tag}
                </span>
              )}
              <h1 className="text-4xl md:text-5xl font-bold text-brown-dark leading-tight mb-4 flex flex-wrap items-center gap-4">
                {lesson.big && (
                  <span
                    className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-gradient-to-br from-sage-light/60 to-peach-light/40 font-serif text-4xl md:text-5xl text-brown-dark select-none flex-shrink-0"
                    aria-hidden="true"
                  >
                    {lesson.big.slice(0, 2)}
                  </span>
                )}
                <span>{lesson.title}</span>
              </h1>
              {lesson.subtitle && (
                <p className="text-lg text-brown-light leading-relaxed max-w-2xl">{lesson.subtitle}</p>
              )}
              {lesson.text && lesson.text !== lesson.subtitle && (
                <p className="text-brown-light/90 leading-relaxed max-w-2xl mt-3">{lesson.text}</p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ================= واژه‌های درس (سبز پاستلی) ================= */}
      {state === 'ready' && lesson && (
        <section className="py-20 bg-sec-sage relative overflow-hidden">
          {/* 🌊 لبهٔ منحنی از هیروی کرم */}
          <CurveDivider fill="var(--color-cream)" />
          <div className="char-bg bottom-8 left-[6%]" style={{ fontSize: '190px', opacity: 0.04 }} aria-hidden="true">
            词
          </div>

          <div className="max-w-4xl mx-auto px-6 relative">
            <h2 className="text-xs font-bold uppercase tracking-widest text-sage-dark mb-6 scroll-animate">
              {lm.wordsTitle}
              {lesson.words.length > 0 && (
                <span className="ml-2 text-brown-light normal-case tracking-normal font-medium">
                  · {lesson.words.length}
                </span>
              )}
            </h2>

            <ul className="space-y-4">
              {lesson.words.map((w) => (
                <li
                  key={w.chinese}
                  className="bg-white rounded-2xl border border-sage-light/20 p-5 flex items-center gap-4 hover:border-sage/40 hover:shadow-[0_8px_24px_rgba(168,201,160,0.18)] transition-all"
                >
                  <span className="font-serif text-3xl font-bold text-brown-dark w-16 text-center flex-shrink-0 select-none">
                    {w.chinese}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-sage-dark">{w.pinyin}</span>
                    <span className="block text-sm text-brown">{w.meaning}</span>
                    {w.example && (
                      <span className="mt-1.5 flex items-center gap-1.5 min-w-0">
                        <span className="text-xs text-brown-light min-w-0">“{w.example}”</span>
                        <ExampleAudio
                          text={w.example}
                          meaning={w.meaning}
                          active={speaking === `ex:${w.example}`}
                          label={ld.speakSentence}
                          onPlay={speakExample}
                        />
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => speak(w.chinese)}
                    aria-label={`${lm.speak}: ${w.meaning}`}
                    className={`w-11 h-11 flex-shrink-0 rounded-full flex items-center justify-center transition-all cursor-pointer min-h-[44px] ${
                      speaking === w.chinese
                        ? 'bg-sage text-brown-dark scale-105'
                        : 'bg-cream text-brown-light hover:text-sage-dark hover:bg-sage-light/20'
                    }`}
                  >
                    <Volume2 className="w-5 h-5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ================= دعوت به ثبت‌نام (کره‌ای) ================= */}
      {state === 'ready' && lesson && (
        <section className="py-20 bg-sec-butter relative overflow-hidden">
          {/* 🌊 لبهٔ منحنی از بخش سبز واژه‌ها */}
          <CurveDivider fill="var(--color-sec-sage)" />
          <div className="max-w-4xl mx-auto px-6 relative">
            <div className="bg-white/70 rounded-3xl border border-dashed border-sage/50 p-7 md:p-9 flex flex-col sm:flex-row items-center gap-5 text-center sm:text-right">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sage-light/60 to-butter/50 flex items-center justify-center flex-shrink-0" aria-hidden="true">
                <GraduationCap className="w-7 h-7 text-brown" />
              </div>
              <p className="text-sm text-brown-light leading-relaxed flex-1">{lm.registerNote}</p>
              <button
                onClick={() => onNavigate('register')}
                className="bg-sage text-brown-dark px-7 py-3 rounded-full text-sm font-bold inline-flex items-center gap-2 hover:bg-sage-dark hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(168,201,160,0.4)] transition-all cursor-pointer flex-shrink-0 min-h-[44px]"
              >
                <GraduationCap className="w-4 h-4" aria-hidden="true" /> {lm.registerCta}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
