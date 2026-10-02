'use client'

import { useEffect, useRef, useState } from 'react'
import { BookOpenText, GraduationCap, Volume2, X } from 'lucide-react'
import { siteContent, PageKey } from '@/content/site-content'

const lm = siteContent.learn.lessons.modal

// ---------------------------------------------------------------------
//  📚 مودال درس — با کلیک روی دکمهٔ Learn هر کارت (خانه یا Learn)
//  واژه‌های درس + تلفظ با صدای چینی دستگاه + دکمهٔ ثبت‌نام
//  با Esc یا کلیک روی پس‌زمینه بسته می‌شود؛ جلوی اسکرول پس‌زمینه هم گرفته می‌شود
// ---------------------------------------------------------------------

export interface LessonData {
  title: string
  subtitle: string
  words: { chinese: string; pinyin: string; meaning: string; example?: string }[]
}

export function LessonModal({
  lesson,
  onClose,
  onNavigate,
}: {
  lesson: LessonData
  onClose: () => void
  onNavigate: (page: PageKey) => void
}) {
  // 🔊 تلفظ واژه با صدای چینی دستگاه (اگر نصب باشد)
  const [speaking, setSpeaking] = useState<string | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  const speak = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'zh-CN'
    u.rate = 0.85
    u.onstart = () => setSpeaking(text)
    u.onend = () => setSpeaking(null)
    u.onerror = () => setSpeaking(null)
    window.speechSynthesis.speak(u)
  }

  // بستن با Esc + فوکوس روی دکمهٔ بستن + قفل اسکرول پس‌زمینه
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={lesson.title}
    >
      {/* پس‌زمینهٔ تار — کلیک = بستن */}
      <button
        aria-label={lm.close}
        onClick={onClose}
        className="absolute inset-0 bg-brown-dark/40 backdrop-blur-sm cursor-pointer"
        tabIndex={-1}
      />

      {/* کارت درس */}
      <div className="relative bg-cream w-full sm:max-w-2xl max-h-[88vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl animate-ct-pop">
        {/* نوار گرادیانی برند */}
        <div className="h-2.5 bg-gradient-to-r from-sage via-butter to-peach sticky top-0 z-10" aria-hidden="true" />

        <div className="p-6 md:p-8">
          {/* سربرگ + دکمهٔ بستن */}
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <span className="inline-flex items-center gap-1.5 bg-sage-light/30 rounded-full px-3.5 py-1.5 mb-3 text-xs font-semibold uppercase tracking-widest text-sage-dark">
                <BookOpenText className="w-3.5 h-3.5" aria-hidden="true" /> Lesson
              </span>
              <h2 className="text-2xl md:text-3xl font-bold text-brown-dark leading-snug">{lesson.title}</h2>
              <p className="text-sm text-brown-light mt-2 leading-relaxed">{lesson.subtitle}</p>
            </div>
            <button
              ref={closeRef}
              onClick={onClose}
              aria-label={lm.close}
              className="w-10 h-10 flex-shrink-0 rounded-xl bg-white border border-sage-light/40 text-brown flex items-center justify-center hover:border-sage hover:text-sage-dark transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* واژه‌های درس */}
          <h3 className="text-xs font-bold uppercase tracking-widest text-sage-dark mb-3">{lm.wordsTitle}</h3>
          <ul className="space-y-2.5 mb-6">
            {lesson.words.map((w) => (
              <li
                key={w.chinese}
                className="bg-white rounded-2xl border border-sage-light/20 p-4 flex items-center gap-4 hover:border-sage/40 transition-colors"
              >
                <span className="font-serif text-2xl font-bold text-brown-dark w-14 text-center flex-shrink-0 select-none">
                  {w.chinese}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-sage-dark">{w.pinyin}</span>
                  <span className="block text-sm text-brown">{w.meaning}</span>
                  {w.example && (
                    <span className="block text-xs text-brown-light mt-0.5 truncate">“{w.example}”</span>
                  )}
                </span>
                <button
                  onClick={() => speak(w.chinese)}
                  aria-label={`${lm.speak}: ${w.meaning}`}
                  className={`w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center transition-all cursor-pointer ${
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

          {/* دعوت به ثبت‌نام */}
          <div className="bg-white/70 rounded-2xl border border-dashed border-sage/40 p-4 flex flex-col sm:flex-row items-center gap-3">
            <p className="text-xs text-brown-light flex-1 text-center sm:text-left">{lm.registerNote}</p>
            <button
              onClick={() => {
                onClose()
                onNavigate('register')
              }}
              className="bg-sage text-brown-dark px-5 py-2.5 rounded-full text-sm font-bold inline-flex items-center gap-2 hover:bg-sage-dark transition-colors cursor-pointer flex-shrink-0 min-h-[44px]"
            >
              <GraduationCap className="w-4 h-4" aria-hidden="true" /> {lm.registerCta}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
