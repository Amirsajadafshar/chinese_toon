'use client'

// ---------------------------------------------------------------------------
// 🧩 آزمون تعیین سطح (Quick Level Check) — تسک ۴۷، ارتقای تسک ۸۲
// قبلاً پایین صفحهٔ Learn بود؛ حالا به تب Classes منتقل شد (درخواست مالک).
//
//  • سؤالات از پنل ادمین (تب Quiz → دیتابیس، GET /api/learn/quiz) می‌آیند؛
//    اگر دیتابیس خالی باشد سؤالات پیش‌فرض فایل محتوا (learn.quiz) استفاده می‌شود.
//  • 🧪 تسک ۸۲: در پایان، نتیجه با POST /api/learn/quiz/submit **سمت سرور**
//    دوباره محاسبه و در دیتابیس ذخیره می‌شود (نمره/باند از گزینه‌های واقعی
//    دیتابیس — دستکاری کلاینت بی‌اثر است)؛ کاربر می‌تواند ایمیلش را بگذارد
//    تا سرنخ «برنامهٔ مطالعه» ثبت شود (POST /api/learn/quiz/lead).
//  • باند بر اساس درصد پیشرفت است — با هر تعداد سؤال کار می‌کند.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Check, Loader2, Play, RotateCcw, Sparkles, Target } from 'lucide-react'
import { selectClassForRegistration } from './class-selection'
import { siteContent, PageKey } from '@/content/site-content'
import { resilientJsonFetch } from '@/lib/client-fetch'

const q = siteContent.learn.quiz

interface QuizOption {
  text: string
  score: number
}
interface QuizQuestionData {
  q: string
  options: QuizOption[]
}
// نتیجهٔ ثبت‌شدهٔ سمت سرور
interface QuizAttemptResult {
  attemptId: string
  score: number
  maxScore: number
  band: 'beginner' | 'elementary' | 'intermediate'
}

// درصد پیشرفت 0..1 → باند؛ همان آستانه‌های سرور (fallback وقتی سرور در دسترس نیست)
function clientBand(score: number, maxScore: number): QuizAttemptResult['band'] {
  const minScore = Math.min(maxScore, maxScore / 4) // هر سؤال حداقل امتیاز ۱ از ۴
  const span = Math.max(maxScore - minScore, 1)
  const pct = Math.min(Math.max((score - minScore) / span, 0), 1)
  if (pct < 1 / 3) return 'beginner'
  if (pct < 2 / 3) return 'elementary'
  return 'intermediate'
}

export function LevelQuiz({ onNavigate }: { onNavigate: (page: PageKey) => void }) {
  // 🗄️ سؤالات از دیتابیس (پنل ادمین) — تا وقتی خالی باشد پیش‌فرض فایل محتوا
  const [dbQuestions, setDbQuestions] = useState<QuizQuestionData[] | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/learn/quiz')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        if (Array.isArray(data.questions) && data.questions.length > 0) {
          setDbQuestions(
            data.questions.map(
              (q: { id?: string; question: string; options: { text: string; score: number }[] }) => ({
                q: q.question,
                options: q.options,
                id: q.id,
              })
            )
          )
        } else if (Array.isArray(data.questions) && data.questions.length === 0) {
          setDbQuestions(null) // دیتابیس خالی شد → برگرد به محتوای پیش‌فرض
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const questionsList: (QuizQuestionData & { id?: string })[] =
    dbQuestions && dbQuestions.length > 0
      ? dbQuestions
      : q.questions.map((item) => ({ q: item.q, options: [...item.options] }))

  const [step, setStep] = useState(-1) // -1 = شروع، 0..n = سؤال، n = نتیجه
  const [score, setScore] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  // 🧪 تسک ۸۲ — پاسخ‌ها برای ثبت سمت سرور + وضعیت ذخیره/سرنخ
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [attempt, setAttempt] = useState<QuizAttemptResult | null>(null)
  const [saveFailed, setSaveFailed] = useState(false)
  const [email, setEmail] = useState('')
  const [leadState, setLeadState] = useState<'idle' | 'sending' | 'success' | 'error' | 'invalid'>('idle')

  const total = questionsList.length
  const finished = step >= total && step >= 0

  const maxScore = useMemo(
    () => questionsList.reduce((sum, item) => sum + Math.max(...item.options.map((o) => o.score)), 0),
    [questionsList]
  )

  // 🧪 تسک ۸۳ — زیرنویس معرفی بر اساس «تعداد واقعی سؤال‌های دیتابیس» ساخته
  // می‌شود. قبلاً متن ثابتِ «۵ سؤال» بود و بعد از ارتقای بانک سؤال به ۱۵ سؤال
  // غیرواقعی و گمراه‌کننده شده بود (گزارش مالک). حالا اگر مالک در پنل ادمین
  // سؤال اضافه/کم کند، این متن خودکار به‌روز می‌شود.
  const introSubtitle = useMemo(() => {
    const count = dbQuestions?.length ?? 0
    if (count === 0) return q.subtitle
    const duration = count <= 6 ? q.durationShort : count <= 12 ? q.durationMedium : q.durationLong
    return q.subtitleTemplate.replace('{count}', String(count)).replace('{duration}', duration)
  }, [dbQuestions])

  const start = () => {
    setScore(0)
    setPicked(null)
    setAnswers({})
    setAttempt(null)
    setSaveFailed(false)
    setEmail('')
    setLeadState('idle')
    setStep(0)
  }

  const pick = (optIndex: number) => {
    if (picked !== null) return
    setPicked(optIndex)
    const item = questionsList[step]
    const s = item.options[optIndex].score
    if (item.id) setAnswers((prev) => ({ ...prev, [item.id as string]: optIndex }))
    setTimeout(() => {
      setScore((prev) => prev + s)
      setPicked(null)
      setStep((prev) => prev + 1)
    }, 380)
  }

  // پایان آزمون → ثبت سمت سرور (فقط وقتی سؤالات واقعی دیتابیس با شناسه باشند)
  useEffect(() => {
    if (!finished || attempt || saveFailed) return
    if (Object.keys(answers).length === 0) return // حالت فال‌بک فایل محتوا — ثبت ندارد
    const payloadAnswers = Object.entries(answers).map(([questionId, optionIndex]) => ({
      questionId,
      optionIndex,
    }))
    let cancelled = false
    resilientJsonFetch<{ ok?: boolean; attemptId?: string; score?: number; maxScore?: number; band?: QuizAttemptResult['band'] }>(
      '/api/learn/quiz/submit',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: payloadAnswers }),
      },
      { attempts: 2 }
    )
      .then((res) => {
        if (cancelled) return
        if (res.ok && res.data.ok && res.data.attemptId) {
          setAttempt({
            attemptId: res.data.attemptId,
            score: res.data.score ?? score,
            maxScore: res.data.maxScore ?? maxScore,
            band: res.data.band ?? clientBand(score, maxScore),
          })
        } else {
          setSaveFailed(true)
        }
      })
      .catch(() => {
        if (!cancelled) setSaveFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [finished, attempt, saveFailed, answers, score, maxScore])

  const shownBand = attempt?.band ?? clientBand(score, maxScore)
  const result = q.results.find((r) => r.badge === shownBand) ?? q.results[0]
  const shownScore = attempt?.score ?? score
  const shownMax = attempt?.maxScore ?? maxScore

  const submitLead = () => {
    if (!attempt) return
    const value = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setLeadState('invalid')
      return
    }
    setLeadState('sending')
    resilientJsonFetch<{ ok?: boolean; already?: boolean }>('/api/learn/quiz/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attemptId: attempt.attemptId, email: value }),
    })
      .then((res) => {
        if (res.ok && res.data.ok) setLeadState('success')
        else setLeadState('error')
      })
      .catch(() => setLeadState('error'))
  }

  return (
    <div className="mt-16 bg-white rounded-3xl border border-sage-light/20 shadow-sm overflow-hidden scroll-animate">
      {/* نوار بالای کارت */}
      <div className="h-2.5 bg-gradient-to-r from-sage via-butter to-peach"></div>

      <div className="p-8 md:p-12">
        {/* شروع */}
        {step === -1 && (
          <div className="text-center max-w-xl mx-auto animate-ct-fadeInUp">
            <span className="inline-flex items-center gap-1.5 bg-butter/20 rounded-full px-4 py-1.5 mb-4 text-xs font-semibold uppercase tracking-widest text-brown">
              <Sparkles className="w-3.5 h-3.5" /> {q.eyebrow}
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-brown-dark mb-3">{q.title}</h2>
            <p className="text-sm text-brown-light leading-relaxed mb-8">{introSubtitle}</p>
            <button
              onClick={start}
              className="bg-sage text-brown-dark px-8 py-3.5 rounded-full text-sm font-bold hover:bg-sage-dark transition-all cursor-pointer inline-flex items-center gap-2 btn-lift"
            >
              <Play className="w-4 h-4" /> Start the Quiz
            </button>
            <p className="text-6xl font-bold text-sage/20 mt-8 select-none" aria-hidden="true">
              汉语
            </p>
          </div>
        )}

        {/* سؤال‌ها */}
        {step >= 0 && !finished && (
          <div className="max-w-2xl mx-auto">
            {/* پیشرفت */}
            <div className="flex items-center justify-between mb-3 text-xs font-semibold text-brown-light">
              <span>
                {q.questionOf} {step + 1} / {total}
              </span>
              <span>{Math.round((step / total) * 100)}%</span>
            </div>
            <div
              className="h-2.5 bg-cream-dark rounded-full overflow-hidden mb-8"
              role="progressbar"
              aria-label={q.progressAria}
              aria-valuenow={Math.round((step / total) * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full bg-sage rounded-full transition-all duration-500 ease-out"
                style={{ width: `${(step / total) * 100}%` }}
              ></div>
            </div>

            <h3 key={step} className="text-lg md:text-xl font-bold text-brown-dark mb-6 animate-ct-fadeInUp">
              {questionsList[step].q}
            </h3>

            <div className="space-y-3">
              {questionsList[step].options.map((opt, i) => (
                <button
                  key={`${step}-${i}`}
                  onClick={() => pick(i)}
                  className={`w-full text-left px-5 py-4 rounded-2xl border text-sm font-medium transition-all cursor-pointer btn-lift ${
                    picked === i
                      ? 'bg-sage border-sage text-brown-dark scale-[0.98]'
                      : 'bg-cream/40 border-sage-light/30 text-brown hover:border-sage hover:bg-sage-light/20'
                  }`}
                >
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/80 text-[11px] font-bold text-sage-dark mr-3 border border-sage-light/40">
                    {String.fromCharCode(65 + i)}
                  </span>
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* نتیجه */}
        {finished && (
          <div className="max-w-xl mx-auto text-center animate-ct-pop">
            <span className="inline-block bg-sage-light/40 text-sage-dark text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">
              {q.resultLabel}
            </span>
            <div className="w-24 h-24 mx-auto mb-5 bg-cream rounded-3xl flex items-center justify-center shadow-inner">
              <span className="text-3xl font-bold text-brown-dark font-serif">{result.char}</span>
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-brown-dark mb-3">{result.title}</h3>
            <p className="text-sm text-brown-light leading-relaxed mb-5">{result.text}</p>

            {/* 🧪 نمرهٔ واقعی */}
            <div className="text-xs font-semibold text-brown-light mb-6">
              {q.scoreLabel}:{' '}
              <span className="text-sage-dark font-bold" aria-live="polite">
                {shownScore} / {shownMax}
              </span>
            </div>

            <div className="bg-cream/60 rounded-2xl p-5 mb-7 inline-flex items-center gap-3">
              <span className="w-10 h-10 bg-sage-light/40 rounded-xl flex items-center justify-center">
                <Target className="w-5 h-5 text-sage-dark" />
              </span>
              <span className="text-left">
                <span className="block text-[11px] uppercase tracking-wider text-brown-light">
                  {q.recommendedClass}
                </span>
                <span className="block text-sm font-bold text-brown-dark">{result.class}</span>
              </span>
            </div>

            {/* 🧪 کپچر ایمیل — فقط وقتی نتیجه واقعاً در دیتابیس ثبت شده */}
            {attempt ? (
              <div className="bg-sage-light/20 rounded-2xl p-6 mb-7 text-left">
                {leadState === 'success' ? (
                  <p className="text-sm font-semibold text-sage-dark flex items-center gap-2 justify-center text-center">
                    <Check className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                    {q.saveSuccess}
                  </p>
                ) : (
                  <>
                    <p className="text-sm font-bold text-brown-dark mb-1.5 text-center">{q.saveTitle}</p>
                    <p className="text-xs text-brown-light leading-relaxed mb-4 text-center">{q.saveText}</p>
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <label htmlFor="quiz-lead-email" className="sr-only">
                        {q.emailPlaceholder}
                      </label>
                      <input
                        id="quiz-lead-email"
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value)
                          if (leadState !== 'idle') setLeadState('idle')
                        }}
                        placeholder={q.emailPlaceholder}
                        className="flex-1 bg-white border border-sage-light/40 rounded-full px-5 py-3 text-sm text-brown focus:outline-none focus:border-sage transition-colors"
                      />
                      <button
                        onClick={submitLead}
                        disabled={leadState === 'sending'}
                        className="bg-sage text-brown-dark px-6 py-3 rounded-full text-sm font-bold hover:bg-sage-dark transition-all cursor-pointer inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {leadState === 'sending' ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> {q.saveSending}
                          </>
                        ) : (
                          q.saveCta
                        )}
                      </button>
                    </div>
                    {leadState === 'invalid' && (
                      <p className="text-xs text-peach-dark font-medium mt-2.5 text-center" role="alert">
                        {q.saveInvalid}
                      </p>
                    )}
                    {leadState === 'error' && (
                      <p className="text-xs text-peach-dark font-medium mt-2.5 text-center" role="alert">
                        {q.saveError}
                      </p>
                    )}
                  </>
                )}
              </div>
            ) : saveFailed ? (
              <p className="text-xs text-brown-light/80 mb-6">{q.saveFailedNote}</p>
            ) : null}

            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={() => {
                  selectClassForRegistration(result.class)
                  onNavigate('register')
                }}
                className="bg-sage text-brown-dark px-7 py-3 rounded-full text-sm font-bold hover:bg-sage-dark transition-all cursor-pointer inline-flex items-center gap-2 btn-lift"
              >
                {q.registerCta} <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={start}
                className="bg-white border border-sage-light/50 text-brown px-7 py-3 rounded-full text-sm font-semibold hover:border-sage transition-colors cursor-pointer inline-flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> {q.retry}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
