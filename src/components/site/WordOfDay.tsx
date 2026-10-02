'use client'

import { useCallback, useState } from 'react'
import { Volume2, Square, Shuffle, ArrowRight } from 'lucide-react'
import { siteContent, PageKey } from '@/content/site-content'
import { PinyinText, toneOf, toneMark } from './pinyin'
import { CurveDivider } from './CurveDivider'
import { speakChinese, stopSpeak as stopCtSpeak } from '@/lib/ct-speak'

// ---------------------------------------------------------------------
//  📅 کلمهٔ روز (每日一词) — در صفحهٔ خانه
//  • هر روز یک کلمهٔ متفاوت (چرخش بر اساس تاریخ روز)
//  • دکمهٔ تلفظ با صدای هوش مصنوعی (/api/tts) — جایگزین: صدای مرورگر
//  • دکمهٔ «کلمهٔ دیگر» برای مرور تصادفی
//  • پین‌یین رنگی بر اساس تُن هر هجا
// ---------------------------------------------------------------------

const wod = siteContent.home.wordOfDay

export function WordOfDay({ onNavigate }: { onNavigate: (page: PageKey) => void }) {
  const total = wod.words.length

  // کلمهٔ روز: شمارهٔ روز از ابتدای سال mod تعداد کلمات — هر ۲۴ ساعت عوض می‌شود
  // فقط هنگام mount محاسبه می‌شود (در طول بازدید ثابت می‌ماند)
  const [dailyIndex] = useState(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), 0, 0)
    const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000)
    return dayOfYear % total
  })
  const [index, setIndex] = useState(dailyIndex)
  const [speaking, setSpeaking] = useState(false)
  const [speakingSentence, setSpeakingSentence] = useState(false)

  const word = wod.words[index]
  const tone = toneOf(word.pinyin.split(/\s+/)[0] ?? '')

  const speak = useCallback(() => {
    // 🔊 اول صدای هوش مصنوعی سرور (تلفظ واقعی mandarin)؛ اگر در دسترس نبود،
    //    هلپر ct-speak خودش به صدای مرورگر (zh-CN) برمی‌گردد
    setSpeaking(true)
    void speakChinese(word.chinese, { speed: 0.8, onEnd: () => setSpeaking(false) })
  }, [word.chinese])

  const stopSpeak = useCallback(() => {
    stopCtSpeak()
    setSpeaking(false)
    setSpeakingSentence(false)
  }, [])

  // 🔈 پخش جملهٔ نمونه — همان زنجیرهٔ صوتی هوش مصنوعی (سرعت کمی آرام‌تر)
  const speakSentence = useCallback(() => {
    setSpeakingSentence(true)
    void speakChinese(word.example, { speed: 0.75, onEnd: () => setSpeakingSentence(false) })
  }, [word.example])

  // کلمهٔ تصادفی متفاوت + قطع صدای قبلی
  const another = useCallback(() => {
    stopSpeak()
    setIndex((prev) => {
      let next = prev
      while (next === prev && total > 1) {
        next = Math.floor(Math.random() * total)
      }
      return next
    })
  }, [stopSpeak, total])

  return (
    <section className="py-20 relative overflow-hidden bg-sec-butter" aria-labelledby="wod-title">
      {/* 🌊 لبهٔ منحنی از بخش نظرات (هلویی) وارد کرهٔ کره‌ای می‌شود */}
      <CurveDivider fill="var(--color-sec-peach)" />
      {/* واترمارک کاراکتر پشت کارت */}
      <div className="char-bg top-8 right-4 md:right-24" style={{ fontSize: '220px', opacity: 0.04 }} aria-hidden="true">
        词
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* معرفی بخش */}
        <div className="text-center max-w-xl mx-auto mb-10 scroll-animate">
          <span className="inline-flex items-center gap-1.5 bg-sage/15 rounded-full px-4 py-1.5 mb-4 text-xs font-semibold uppercase tracking-widest text-sage-dark">
            <Volume2 className="w-3.5 h-3.5" aria-hidden="true" /> {wod.eyebrow}
          </span>
          <h2 id="wod-title" className="text-2xl md:text-3xl font-bold text-brown-dark mb-3">
            {wod.title}
          </h2>
          <p className="text-sm text-brown-light leading-relaxed">{wod.subtitle}</p>
        </div>

        {/* کارت اصلی کلمهٔ روز */}
        <div className="scroll-animate relative bg-white rounded-3xl border border-sage-light/25 shadow-sm overflow-hidden">
          {/* نوار گرادیانی بالای کارت (هماهنگ با بقیهٔ برند) */}
          <div className="h-2.5 bg-gradient-to-r from-sage via-butter to-peach" aria-hidden="true" />

          <div
            key={index} /* با هر تعویض کلمه، انیمیشن ورود دوباره اجرا می‌شود */
            className="animate-ct-wod-in p-8 md:p-10 grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8 md:gap-10 items-center"
          >
            {/* سمت راست: کاراکتر بزرگ + تلفظ */}
            <div className="flex flex-col items-center gap-4 md:w-56">
              <span
                className={`font-serif font-bold text-brown-dark leading-none select-none ${
                  word.chinese.length <= 1 ? 'text-8xl' : 'text-7xl md:text-8xl'
                }`}
              >
                {word.chinese}
              </span>
              <PinyinText
                pinyin={word.pinyin}
                className="text-xl font-semibold tracking-wide"
              />

              {/* دکمهٔ تلفظ — با موج‌های متحرک هنگام پخش */}
              <button
                type="button"
                onClick={speaking ? stopSpeak : speak}
                aria-label={speaking ? wod.speakingLabel : `${wod.speakLabel}: ${word.meaning}`}
                className={`group relative inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold min-h-[44px] transition-all cursor-pointer ${
                  speaking
                    ? 'bg-peach text-brown-dark shadow-md'
                    : 'bg-sage text-brown-dark hover:bg-sage-dark hover:shadow-md'
                }`}
              >
                {speaking ? (
                  <Square className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Volume2 className="w-4 h-4 transition-transform group-hover:scale-110" aria-hidden="true" />
                )}
                {speaking ? wod.speakingLabel : wod.speakLabel}
                {/* موج‌های صدا هنگام پخش */}
                {speaking && (
                  <span className="absolute -right-1 -top-1 flex h-3 w-3" aria-hidden="true">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-peach opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-peach-dark/60"></span>
                  </span>
                )}
              </button>
            </div>

            {/* سمت چپ: معنی + جملهٔ نمونه + بَج تُن */}
            <div className="flex flex-col gap-5">
              {/* بَج تُن هجای اول */}
              <div className="flex items-center gap-2.5">
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-cream ${
                    tone === 1 ? 'ct-tone-1' : tone === 2 ? 'ct-tone-2' : tone === 3 ? 'ct-tone-3' : tone === 4 ? 'ct-tone-4' : 'ct-tone-0'
                  }`}
                >
                  <span className="text-sm leading-none">{toneMark(tone)}</span>
                  {tone === 0 ? 'neutral tone' : `tone ${tone}`}
                </span>
                <span className="text-xs text-brown-light/70">first syllable</span>
              </div>

              <p className="text-2xl md:text-3xl font-bold text-brown-dark leading-tight">
                {word.meaning}
              </p>

              {/* جملهٔ نمونه — چینی + ترجمه + دکمهٔ پخش جمله */}
              <div className="bg-cream rounded-2xl px-5 py-4 border border-cream-dark">
                <p className="text-base text-brown-dark leading-relaxed">{word.example}</p>
                <div className="mt-2 flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-sm text-brown-light italic">{word.exampleTranslation}</p>
                  <button
                    type="button"
                    onClick={speakingSentence ? stopSpeak : speakSentence}
                    aria-label={`${wod.speakSentenceLabel}: ${word.exampleTranslation}`}
                    aria-pressed={speakingSentence}
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1.5 transition-all cursor-pointer min-h-[32px] ${
                      speakingSentence
                        ? 'bg-peach text-brown-dark shadow-sm'
                        : 'bg-white text-sage-dark border border-sage-light/50 hover:border-sage hover:shadow-sm'
                    }`}
                  >
                    <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                    {wod.speakSentenceLabel}
                  </button>
                </div>
              </div>

              {/* دکمه‌های «کلمهٔ دیگر» و ثبت‌نام */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={another}
                  className="inline-flex items-center gap-2 bg-white border border-sage-light/60 text-brown px-5 py-2.5 rounded-full text-sm font-semibold hover:border-sage hover:shadow-sm transition-all cursor-pointer min-h-[44px]"
                >
                  <Shuffle className="w-4 h-4 text-sage-dark" aria-hidden="true" />
                  {wod.anotherLabel}
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('register')}
                  className="group inline-flex items-center gap-1.5 text-sm font-semibold text-sage-dark hover:gap-2.5 transition-all cursor-pointer min-h-[44px]"
                >
                  {wod.registerCta}
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
