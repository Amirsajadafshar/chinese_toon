'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, RotateCcw, Volume2, XCircle } from 'lucide-react'
import { siteContent } from '@/content/site-content'
import { PinyinText } from './pinyin'
import { speakChinese, stopSpeak as stopCtSpeak } from '@/lib/ct-speak'

const t = siteContent.learn.toneTrainer

// ---------------------------------------------------------------------
// 👂 بازی «تمرین تُن‌ها» — یک هجا پخش می‌شود، بازیکن تُن (۱ تا ۴) را حدس می‌زند
//    - صدا با صدای چینی دستگاه (zh-CN) و از روی «هان‌زی» پخش می‌شود تا تُن واقعی
//      شنیده شود (سیستم‌ها پین‌یین را با تُن نمی‌خوانند)
//    - اگر دستگاه صدای چینی نداشت → حالت «حافظهٔ واژگان»: هان‌زی + پین‌یین
//      ساده نمایش داده می‌شود و بازیکن از حفظ تُن واژه را حدس می‌زند
//    - لیست واژه‌ها = نمونه‌های استاندارد کلاس تُن (ma/ba/yi/shi/bi/fu/tu/mo/hu)
// ---------------------------------------------------------------------

interface ToneItem {
  tone: number
  pinyin: string
  hanzi: string
  meaning: string
}

const SYLLABLES: { plain: string; items: ToneItem[] }[] = [
  {
    plain: 'ma',
    items: [
      { tone: 1, pinyin: 'mā', hanzi: '妈', meaning: 'mother' },
      { tone: 2, pinyin: 'má', hanzi: '麻', meaning: 'numb' },
      { tone: 3, pinyin: 'mǎ', hanzi: '马', meaning: 'horse' },
      { tone: 4, pinyin: 'mà', hanzi: '骂', meaning: 'to scold' },
    ],
  },
  {
    plain: 'ba',
    items: [
      { tone: 1, pinyin: 'bā', hanzi: '八', meaning: 'eight' },
      { tone: 2, pinyin: 'bá', hanzi: '拔', meaning: 'to pull' },
      { tone: 3, pinyin: 'bǎ', hanzi: '把', meaning: 'to hold' },
      { tone: 4, pinyin: 'bà', hanzi: '爸', meaning: 'dad' },
    ],
  },
  {
    plain: 'yi',
    items: [
      { tone: 1, pinyin: 'yī', hanzi: '一', meaning: 'one' },
      { tone: 2, pinyin: 'yí', hanzi: '移', meaning: 'to move' },
      { tone: 3, pinyin: 'yǐ', hanzi: '椅', meaning: 'chair' },
      { tone: 4, pinyin: 'yì', hanzi: '亿', meaning: '100 million' },
    ],
  },
  {
    plain: 'shi',
    items: [
      { tone: 1, pinyin: 'shī', hanzi: '湿', meaning: 'wet' },
      { tone: 2, pinyin: 'shí', hanzi: '十', meaning: 'ten' },
      { tone: 3, pinyin: 'shǐ', hanzi: '使', meaning: 'to use' },
      { tone: 4, pinyin: 'shì', hanzi: '是', meaning: 'to be' },
    ],
  },
  {
    plain: 'bi',
    items: [
      { tone: 1, pinyin: 'bī', hanzi: '逼', meaning: 'to force' },
      { tone: 2, pinyin: 'bí', hanzi: '鼻', meaning: 'nose' },
      { tone: 3, pinyin: 'bǐ', hanzi: '笔', meaning: 'pen' },
      { tone: 4, pinyin: 'bì', hanzi: '必', meaning: 'must' },
    ],
  },
  {
    plain: 'fu',
    items: [
      { tone: 1, pinyin: 'fū', hanzi: '夫', meaning: 'husband' },
      { tone: 2, pinyin: 'fú', hanzi: '福', meaning: 'luck' },
      { tone: 3, pinyin: 'fǔ', hanzi: '斧', meaning: 'axe' },
      { tone: 4, pinyin: 'fù', hanzi: '付', meaning: 'to pay' },
    ],
  },
  {
    plain: 'tu',
    items: [
      { tone: 1, pinyin: 'tū', hanzi: '突', meaning: 'sudden' },
      { tone: 2, pinyin: 'tú', hanzi: '图', meaning: 'picture' },
      { tone: 3, pinyin: 'tǔ', hanzi: '土', meaning: 'soil' },
      { tone: 4, pinyin: 'tù', hanzi: '吐', meaning: 'to spit' },
    ],
  },
  {
    plain: 'mo',
    items: [
      { tone: 1, pinyin: 'mō', hanzi: '摸', meaning: 'to touch' },
      { tone: 2, pinyin: 'mó', hanzi: '模', meaning: 'model' },
      { tone: 3, pinyin: 'mǒ', hanzi: '抹', meaning: 'to wipe' },
      { tone: 4, pinyin: 'mò', hanzi: '墨', meaning: 'ink' },
    ],
  },
  {
    plain: 'hu',
    items: [
      { tone: 1, pinyin: 'hū', hanzi: '呼', meaning: 'to call' },
      { tone: 2, pinyin: 'hú', hanzi: '湖', meaning: 'lake' },
      { tone: 3, pinyin: 'hǔ', hanzi: '虎', meaning: 'tiger' },
      { tone: 4, pinyin: 'hù', hanzi: '户', meaning: 'door' },
    ],
  },
]

const toneDigitClass: Record<number, string> = {
  1: 'ct-tone-1',
  2: 'ct-tone-2',
  3: 'ct-tone-3',
  4: 'ct-tone-4',
}

interface Round {
  syllable: (typeof SYLLABLES)[number]
  item: ToneItem
}

function newRound(): Round {
  const syllable = SYLLABLES[Math.floor(Math.random() * SYLLABLES.length)]
  const item = syllable.items[Math.floor(Math.random() * 4)]
  return { syllable, item }
}

// راند اول باید «قطعی» باشد — Math.random() در state اولیه باعث hydration
// mismatch می‌شود (سرور و کلاینت راندهای متفاوت رندر می‌کنند).
// راندهای بعدی در next() ساخته می‌شوند (رویداد کاربر — مشکلی ندارند).
const FIRST_ROUND: Round = { syllable: SYLLABLES[0], item: SYLLABLES[0].items[2] } // mǎ 马 (horse) — مثال کلاسیک تُن ۳

// پخش صدای چینی — با صدای هوش مصنوعی (/api/tts) و جایگزین مرورگری
// (منطق fallback داخل ct-speak است؛ خروجی «none» یعنی هیچ صدایی در دسترس نیست)

export function ToneTrainer() {
  const [round, setRound] = useState<Round>(FIRST_ROUND)
  const [answered, setAnswered] = useState(false)
  const [picked, setPicked] = useState<number | null>(null)
  const [recallMode, setRecallMode] = useState(false) // دستگاه صدای چینی ندارد
  const [roundNo, setRoundNo] = useState(1)
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(0)
  const [playedOnce, setPlayedOnce] = useState(false)
  // 🪜 نردبان تُن‌ها: بعد از هر پاسخ، هر چهار تُنِ همان هجا یکی‌یکی پخش می‌شود
  const [ladderIdx, setLadderIdx] = useState<number | null>(null) // تایل در حال پخش
  const ladderRunRef = useRef(0) // شمارهٔ اجرا — برای لغو زنجیره هنگام راند بعد/خروج

  // 🔇 خروج از بازی → قطع صدا و لغو زنجیرهٔ نردبان
  useEffect(() => {
    return () => {
      ladderRunRef.current += 1
      stopCtSpeak()
    }
  }, [])

  if (!t.enabled) return null

  const play = async () => {
    // پخش اصلی، زنجیرهٔ نردبان قبلی را باطل می‌کند
    ladderRunRef.current += 1
    setLadderIdx(null)
    setPlayedOnce(true)
    try {
      const source = await speakChinese(round.item.hanzi, { speed: 0.75 })
      setRecallMode(source === 'none') // هیچ صدایی (نه AI نه مرورگر) در دسترس نیست
    } catch {
      setRecallMode(true)
    }
  }

  // 🪜 پخش تدریجی نردبان تُن — هر چهار تُنِ هجای فعلی، یکی‌یکی با مکث کوتاه
  const playLadder = () => {
    const run = ++ladderRunRef.current
    const items = round.syllable.items
    const playAt = (i: number) => {
      if (run !== ladderRunRef.current) return // راند عوض شد یا پخش دیگری شروع شد
      if (i >= items.length) {
        setLadderIdx(null)
        return
      }
      setLadderIdx(i)
      void speakChinese(items[i].hanzi, {
        speed: 0.7,
        onEnd: () => window.setTimeout(() => playAt(i + 1), 450),
      })
    }
    playAt(0)
  }

  // ▶️ پخش یک تایل جدا از نردبان (هر تُن را می‌توان تنها هم شنید)
  const playLadderTile = (i: number) => {
    const run = ++ladderRunRef.current
    setLadderIdx(i)
    void speakChinese(round.syllable.items[i].hanzi, {
      speed: 0.7,
      onEnd: () =>
        window.setTimeout(() => {
          if (run === ladderRunRef.current) setLadderIdx(null)
        }, 200),
    })
  }

  const guess = (tone: number) => {
    if (answered) return
    setPicked(tone)
    setAnswered(true)
    const correct = tone === round.item.tone
    setStreak((s) => {
      const next = correct ? s + 1 : 0
      setBest((b) => Math.max(b, next))
      return next
    })
  }

  const next = () => {
    // لغو زنجیرهٔ نردبان و قطع صدا قبل از شروع راند جدید
    ladderRunRef.current += 1
    stopCtSpeak()
    setLadderIdx(null)
    setRound(newRound())
    setAnswered(false)
    setPicked(null)
    setPlayedOnce(false)
    setRoundNo((n) => n + 1)
  }

  const isCorrect = answered && picked === round.item.tone

  return (
    <section className="mt-20" aria-labelledby="tone-trainer-title">
      <div className="text-center mb-8">
        <span className="inline-block text-xs font-semibold uppercase tracking-widest text-sage-dark mb-3">
          {t.eyebrow}
        </span>
        <h2 id="tone-trainer-title" className="text-2xl md:text-3xl font-bold text-brown-dark mb-3">
          {t.title}
        </h2>
        <p className="text-brown-light max-w-xl mx-auto">{t.subtitle}</p>
      </div>

      <div className="max-w-xl mx-auto bg-white rounded-3xl border border-sage-light/20 shadow-sm p-6 md:p-8 relative overflow-hidden">
        {/* واترمارک تزئینی */}
        <span
          aria-hidden="true"
          className="char-bg pointer-events-none select-none -bottom-10 -left-4"
          style={{ fontSize: '150px', opacity: 0.04 }}
        >
          声
        </span>

        {/* نوار آمار */}
        <div className="flex items-center justify-center gap-6 mb-6 text-xs font-semibold relative">
          <span className="text-brown-light">
            {t.roundLabel} <span className="text-brown-dark tabular-nums">{roundNo}</span>
          </span>
          <span className="text-brown-light">
            {t.streakLabel}{' '}
            <span className={`tabular-nums ${streak >= 3 ? 'text-peach font-bold' : 'text-brown-dark'}`}>
              {streak >= 3 ? '🔥 ' : ''}
              {streak}
            </span>
          </span>
          <span className="text-brown-light">
            {t.bestLabel} <span className="text-brown-dark tabular-nums">{best}</span>
          </span>
        </div>

        {/* دکمهٔ پخش صدا (در حالت صوتی) یا نمایش واژه (حالت حافظه) */}
        <div className="text-center mb-7 relative">
          {!recallMode ? (
            <div>
              <button
                onClick={play}
                aria-label={playedOnce ? t.playAgain : t.play}
                className="ct-play-btn w-20 h-20 mx-auto rounded-full bg-sage hover:bg-sage-dark text-brown-dark flex items-center justify-center transition-all hover:scale-105 cursor-pointer shadow-[0_8px_24px_rgba(168,201,160,0.45)]"
              >
                <Volume2 className="w-9 h-9" />
              </button>
              <p className="text-xs text-brown-light mt-3 font-medium">
                {playedOnce ? t.playAgain : t.play}
              </p>
              <p className="text-2xl font-bold text-brown-dark mt-2 tracking-wide">
                {round.syllable.plain}
              </p>
            </div>
          ) : (
            <div className="animate-ct-fadeInUp">
              {/* حالت حافظه: هان‌زی + پین‌یین ساده — تُن را از حفظ حدس بزن */}
              <p className="text-6xl font-bold text-brown-dark mb-2" lang="zh-CN">
                {round.item.hanzi}
              </p>
              <p className="text-xl text-brown-light font-semibold tracking-wide">
                {round.syllable.plain}
              </p>
              <p className="inline-flex items-center gap-1.5 text-[11px] text-brown bg-butter/25 border border-butter/40 rounded-full px-3 py-1 mt-3">
                ⚠️ {t.noVoiceNote}
              </p>
            </div>
          )}
        </div>

        {/* دکمه‌های تُن */}
        <p className="text-sm font-semibold text-brown-dark text-center mb-3 relative">{t.question}</p>
        <div className="grid grid-cols-2 gap-3 relative" role="group" aria-label={t.question}>
          {t.tones.map((tone) => {
            const isPicked = picked === tone.key
            const isAnswer = answered && tone.key === round.item.tone
            return (
              <button
                key={tone.key}
                onClick={() => guess(tone.key)}
                disabled={answered}
                className={`rounded-2xl border-2 px-4 py-3 text-left transition-all cursor-pointer disabled:cursor-default ${
                  answered
                    ? isAnswer
                      ? 'border-sage bg-sage-light/30 shadow-sm'
                      : isPicked
                        ? 'border-peach/70 bg-peach-light/25 opacity-70'
                        : 'border-sage-light/20 bg-white opacity-60'
                    : 'border-sage-light/30 bg-cream/40 hover:border-sage hover:bg-sage-light/20 hover:-translate-y-0.5 active:scale-[0.98]'
                } ${answered && isPicked && !isCorrect ? 'ct-shake' : ''}`}
              >
                <span className={`text-lg font-bold leading-none ${toneDigitClass[tone.key]}`}>
                  {tone.key}
                </span>
                <span className="block text-sm font-semibold text-brown-dark mt-1">{tone.label}</span>
                <span className="block text-[11px] text-brown-light mt-0.5">{tone.hint}</span>
              </button>
            )
          })}
        </div>

        {/* بازخورد */}
        {answered && (
          <div
            className={`ct-feedback mt-6 rounded-2xl px-5 py-4 flex items-start gap-3 ${
              isCorrect ? 'bg-sage-light/30 border border-sage/40' : 'bg-peach-light/30 border border-peach/40'
            }`}
            role="status"
          >
            {isCorrect ? (
              <CheckCircle2 className="w-5 h-5 text-sage-dark flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-peach flex-shrink-0 mt-0.5" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-bold text-brown-dark">
                {isCorrect ? t.correct : t.wrong}
              </p>
              <p className="text-lg mt-1 flex items-center gap-2 flex-wrap">
                <span className="font-bold text-brown-dark text-2xl" lang="zh-CN">
                  {round.item.hanzi}
                </span>
                <PinyinText pinyin={round.item.pinyin} className="text-base font-semibold" />
                <span className="text-sm text-brown-light font-normal">— {round.item.meaning}</span>
              </p>
            </div>
          </div>
        )}

        {/* 🪜 نردبان تُن‌ها — مقایسهٔ چهار تُنِ همان هجا پس از هر پاسخ */}
        {answered && !recallMode && (
          <div className="ct-feedback mt-5 no-print">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-2.5">
              <p className="text-xs font-semibold text-brown-light">{t.ladderHint}</p>
              <button
                onClick={playLadder}
                className="inline-flex items-center gap-1.5 text-xs font-bold rounded-full px-3.5 py-1.5 bg-cream text-brown border border-sage-light/50 hover:border-sage hover:text-sage-dark transition-all cursor-pointer min-h-[32px]"
              >
                <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                {t.ladderButton}
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2" role="group" aria-label={t.ladderButton}>
              {round.syllable.items.map((it, i) => (
                <button
                  key={it.pinyin}
                  onClick={() => playLadderTile(i)}
                  aria-pressed={ladderIdx === i}
                  className={`rounded-xl border px-2 py-2.5 flex flex-col items-center gap-0.5 transition-all cursor-pointer ${
                    ladderIdx === i
                      ? 'border-sage bg-sage-light/40 shadow-sm scale-[1.04]'
                      : 'border-sage-light/30 bg-white hover:border-sage/50'
                  }`}
                >
                  <span className="text-xl font-bold text-brown-dark leading-none" lang="zh-CN">
                    {it.hanzi}
                  </span>
                  <PinyinText pinyin={it.pinyin} className="text-[11px] font-semibold" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* دکمهٔ بعدی */}
        {answered && (
          <button
            onClick={next}
            className="ct-feedback mt-5 w-full bg-sage text-brown-dark py-3 rounded-2xl text-sm font-bold hover:bg-sage-dark transition-all cursor-pointer inline-flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            {t.next}
          </button>
        )}
      </div>
    </section>
  )
}
