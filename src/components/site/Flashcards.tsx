'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Layers, RefreshCw, Shuffle } from 'lucide-react'
import { siteContent } from '@/content/site-content'
import { PinyinText, toneMark, toneOf } from './pinyin'

const fc = siteContent.learn.flashcards

// ---------------------------------------------------------------------
//  🃏 فلش‌کارت واژگان — پایین صفحهٔ Learn (زیر آزمون تعیین سطح)
//  یک کارت بزرگ در هر لحظه؛ کلیک/Enter/Space = چرخش سه‌بعدی کارت
//  ناوبری با فلش‌های کیبورد ← → هم کار می‌کند
//  کارت‌ها از پنل ادمین (تب Words → دیتابیس) می‌آیند؛ اگر خالی بود
//  واژه‌های پیش‌فرض فایل محتوا استفاده می‌شوند.
// ---------------------------------------------------------------------

export interface FlashCardData {
  chinese: string
  pinyin: string
  meaning: string
  example?: string | null
}

// جلدهای گرادیانی برند — به‌ترتیب ایندکس کارت می‌چرخند (sage/butter/peach)
const coverStyles = ['from-sage to-sage-light', 'from-butter to-butter-light', 'from-peach to-peach-light'] as const

export function Flashcards({ cards }: { cards?: FlashCardData[] }) {
  const deck = (cards && cards.length > 0 ? cards : fc.cards).map((c) => ({
    chinese: c.chinese,
    pinyin: c.pinyin,
    meaning: c.meaning,
    example: c.example || '',
  }))
  const total = deck.length

  // ترتیب فعلی دستهٔ کارت‌ها (برای شافل) — pos = موقعیت در دسته
  const [order, setOrder] = useState<number[]>(() => deck.map((_, i) => i))
  const [pos, setPos] = useState(0)
  const [flipped, setFlipped] = useState(false)

  const cardIndex = order[pos]
  const card = deck[cardIndex]
  const cover = coverStyles[cardIndex % coverStyles.length]
  // تُن هجای اول — روی کارت با بَج رنگی نشان داده می‌شود
  const firstTone = toneOf(card.pinyin.split(/\s+/)[0] ?? '')

  // ناوبری: هنگام تعویض کارت، کارت به رو اول برمی‌گردد
  const goPrev = () => {
    setFlipped(false)
    setPos((p) => (p - 1 + total) % total)
  }
  const goNext = () => {
    setFlipped(false)
    setPos((p) => (p + 1) % total)
  }

  // شافل: بُر زدن ترتیب کارت‌ها (Fisher–Yates) + بازگشت به کارت اول از رو
  const shuffleDeck = () => {
    const next = [...order]
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[next[i], next[j]] = [next[j], next[i]]
    }
    setOrder(next)
    setPos(0)
    setFlipped(false)
  }

  // دسترسی‌پذیری کیبورد: Enter/Space چرخش، فلش‌ها ناوبری
  const onCardKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setFlipped((f) => !f)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      goPrev()
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      goNext()
    }
  }

  return (
    <div className="mt-20 bg-white rounded-3xl border border-sage-light/20 shadow-sm overflow-hidden scroll-animate">
      {/* نوار گرادیانی بالای کارت (هماهنگ با آزمون) */}
      <div className="h-2.5 bg-gradient-to-r from-peach via-butter to-sage"></div>

      <div className="p-8 md:p-12">
        {/* معرفی بخش */}
        <div className="text-center max-w-xl mx-auto mb-10">
          <span className="inline-flex items-center gap-1.5 bg-peach-light/30 rounded-full px-4 py-1.5 mb-4 text-xs font-semibold uppercase tracking-widest text-brown">
            <Layers className="w-3.5 h-3.5" /> {fc.eyebrow}
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-brown-dark mb-3">{fc.title}</h2>
          <p className="text-sm text-brown-light leading-relaxed">{fc.subtitle}</p>
        </div>

        {/* صحنهٔ چرخش کارت */}
        <div className="ct-flip-scene mx-auto w-full max-w-md">
          <div
            className={`ct-flip-card select-none ${flipped ? 'is-flipped' : ''}`}
            role="button"
            tabIndex={0}
            aria-pressed={flipped}
            aria-label={`Flashcard ${pos + 1} of ${total}: ${card.pinyin}, ${card.meaning}`}
            onClick={() => setFlipped((f) => !f)}
            onKeyDown={onCardKeyDown}
          >
            <div className="ct-flip-inner h-80 sm:h-96">
              {/* روی اول — کاراکتر چینی + پین‌یین روی جلد برند */}
              <div
                className={`ct-flip-face h-full w-full rounded-3xl shadow-lg bg-gradient-to-br ${cover} flex flex-col items-center justify-center relative overflow-hidden`}
              >
                <span className="absolute top-4 left-4 w-8 h-8 bg-white/60 rounded-full text-xs font-bold text-brown-dark flex items-center justify-center">
                  {pos + 1}
                </span>
                <span
                  className={`font-serif font-bold text-brown-dark leading-none ${
                    card.chinese.length <= 1 ? 'text-8xl' : 'text-7xl'
                  }`}
                >
                  {card.chinese}
                </span>
                <span className="mt-5 text-lg md:text-xl font-medium text-brown-dark/70">
                  {card.pinyin}
                </span>
                {/* بَج تُن هجای اول (رنگ در globals.css — ct-tone-*) */}
                <span
                  className={`mt-3 inline-flex items-center gap-1.5 bg-white/70 rounded-full px-3 py-1 text-xs font-bold ${
                    firstTone === 1
                      ? 'ct-tone-1'
                      : firstTone === 2
                        ? 'ct-tone-2'
                        : firstTone === 3
                          ? 'ct-tone-3'
                          : firstTone === 4
                            ? 'ct-tone-4'
                            : 'ct-tone-0'
                  }`}
                >
                  <span className="text-sm leading-none">{toneMark(firstTone)}</span>
                  {firstTone === 0 ? 'neutral tone' : `tone ${firstTone}`}
                </span>
                <RefreshCw className="absolute bottom-5 w-5 h-5 text-brown-dark/40" aria-hidden="true" />
              </div>

              {/* روی دوم — معنی انگلیسی + جملهٔ نمونه */}
              <div className="ct-flip-face ct-flip-face-back h-full w-full rounded-3xl shadow-lg bg-white border border-sage-light/40 flex flex-col items-center justify-center px-8 text-center">
                <span className="text-sm font-medium text-sage-dark">
                  {card.chinese} · <PinyinText pinyin={card.pinyin} />
                </span>
                <span className="mt-3 text-2xl md:text-3xl font-bold text-brown-dark">
                  {card.meaning}
                </span>
                <span className="mt-6 bg-cream rounded-2xl px-5 py-4 text-sm text-brown-light leading-relaxed">
                  “{card.example || card.meaning}”
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* راهنمای کوچک زیر کارت */}
        <p className="mt-4 text-center text-xs text-brown-light">{fc.hint}</p>

        {/* 🎨 راهنمای رنگ تُن‌ها (۲–۵) */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] font-medium">
          {[1, 2, 3, 4, 0].map((t) => (
            <span
              key={t}
              className={`inline-flex items-center gap-1 ${
                t === 1
                  ? 'ct-tone-1'
                  : t === 2
                    ? 'ct-tone-2'
                    : t === 3
                      ? 'ct-tone-3'
                      : t === 4
                        ? 'ct-tone-4'
                        : 'ct-tone-0'
              }`}
            >
              <span className="text-sm leading-none font-bold">{toneMark(t)}</span>
              {t === 0 ? 'neutral' : `tone ${t}`}
            </span>
          ))}
        </div>

        {/* نقطه‌های پیشرفت + شمارنده */}
        <div className="mt-5 flex items-center justify-center gap-2" aria-hidden="true">
          {deck.map((_, i) => (
            <span
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === pos ? 'w-6 bg-sage-dark' : 'w-2 bg-sage-light/70'
              }`}
            ></span>
          ))}
        </div>
        <p aria-live="polite" aria-atomic="true" className="mt-2 text-center text-sm font-semibold text-brown">
          {pos + 1} / {total}
        </p>

        {/* دکمه‌های ناوبری */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={goPrev}
            aria-label={fc.buttons.prev}
            className="bg-white border border-sage-light/50 text-brown px-6 py-3 rounded-full text-sm font-semibold hover:border-sage transition-all cursor-pointer inline-flex items-center gap-2 btn-lift min-h-[44px]"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" /> {fc.buttons.prev}
          </button>
          <button
            type="button"
            onClick={shuffleDeck}
            aria-label={fc.buttons.shuffle}
            className="bg-butter/25 text-brown px-6 py-3 rounded-full text-sm font-semibold hover:bg-butter/40 transition-all cursor-pointer inline-flex items-center gap-2 btn-lift min-h-[44px]"
          >
            <Shuffle className="w-4 h-4" aria-hidden="true" /> {fc.buttons.shuffle}
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label={fc.buttons.next}
            className="bg-sage text-brown-dark px-6 py-3 rounded-full text-sm font-bold hover:bg-sage-dark transition-all cursor-pointer inline-flex items-center gap-2 btn-lift min-h-[44px]"
          >
            {fc.buttons.next} <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}
