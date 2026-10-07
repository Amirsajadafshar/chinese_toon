'use client'

// ---------------------------------------------------------------------
//  🏮 HskPath — مسیر پیشرفت HSK 1 → HSK 4 صفحهٔ خانه
//  یک «جادهٔ چراغانی» که با اسکرول کشیده می‌شود (stroke-dashoffset) و
//  ایستگاه‌ها یکی‌یکی روشن می‌شوند. تابلوی هر سطح: شماره + تعداد واژه +
//  توضیح. دسکتاپ: مسیر موجی افقی؛ موبایل: خط عمودی ساده.
// ---------------------------------------------------------------------

import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Flag, Leaf, LeafyGreen, MessagesSquare, Trophy } from 'lucide-react'
import { siteContent } from '@/content/site-content'
import { CurveDivider } from '../CurveDivider'

const hsk = siteContent.home.hskPath

const stopIcons = [Leaf, LeafyGreen, MessagesSquare, Trophy]

export function HskPath({ onNavigate }: { onNavigate: (page: 'classes') => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setRevealed(true)
            io.disconnect()
          }
        }
      },
      { threshold: 0.25 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <section id="hsk" className="relative overflow-hidden bg-cream-dark scroll-mt-44 py-20">
      <CurveDivider fill="var(--color-sec-leaf)" />
      <div aria-hidden="true" className="char-bg top-16 left-[4%]" style={{ fontSize: '230px', opacity: 0.045 }}>
        汉
      </div>
      <div aria-hidden="true" className="absolute bottom-10 right-[5%] w-44 h-44 ct-dots opacity-40 [mask-image:radial-gradient(circle,black,transparent_70%)] hidden md:block" />

      <div className="max-w-6xl mx-auto px-6 relative">
        <div className="text-center mb-14 scroll-animate">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-sage-dark mb-3">
            {hsk.eyebrow}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-brown-dark mb-4">{hsk.title}</h2>
          <p className="text-brown-light max-w-2xl mx-auto">{hsk.subtitle}</p>
        </div>

        <div ref={ref} className={`relative scroll-animate ${revealed ? 'ct-path-visible' : ''}`}>
          {/* 🛣️ مسیر موجی — فقط دسکتاپ */}
          <svg
            viewBox="0 0 1100 190"
            className="absolute left-0 top-0 w-full hidden md:block"
            fill="none"
            aria-hidden="true"
          >
            {/* مسیر محو زیرین */}
            <path
              d="M80 130 C 240 30, 380 30, 550 100 C 720 170, 860 170, 1020 60"
              stroke="var(--color-sage-light, #C5DEC0)"
              strokeWidth="10"
              strokeLinecap="round"
            />
            {/* مسیر اصلی — با اسکرول کشیده می‌شود */}
            <path
              className="ct-path-draw"
              d="M80 130 C 240 30, 380 30, 550 100 C 720 170, 860 170, 1020 60"
              stroke="var(--color-sage-dark, #8DB585)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray="2 16"
              style={{ '--path-len': 1150 } as React.CSSProperties}
            />
          </svg>

          {/* ایستگاه‌ها */}
          <div className="md:grid md:grid-cols-4 md:gap-6 relative">
            {hsk.levels.map((lv, i) => {
              const Icon = stopIcons[i] ?? Leaf
              return (
                <div key={lv.level} className="relative md:text-center mb-10 md:mb-0">
                  {/* ستون موبایل — خط عمودی */}
                  <div
                    aria-hidden="true"
                    className={`absolute left-[27px] top-14 bottom-[-34px] w-1 rounded-full md:hidden ${
                      i < 3 ? 'bg-sage-light/70' : 'bg-transparent'
                    }`}
                  />
                  <div className="flex md:justify-center md:flex-col items-start md:items-center gap-4">
                    {/* مدالیون سطح */}
                    <div className="relative flex-shrink-0">
                      <div
                        className={`${revealed ? 'ct-scene-in' : 'opacity-0'} w-14 h-14 rounded-2xl bg-white border-2 border-sage-light/60 shadow-sm flex items-center justify-center`}
                        style={{ animationDelay: `${i * 0.18}s` }}
                      >
                        <Icon className="w-7 h-7 text-sage-dark" aria-hidden="true" />
                      </div>
                      {/* نشان شمارهٔ سطح */}
                      <span
                        className={`${revealed ? 'ct-chip-in' : 'opacity-0'} absolute -top-2 -right-2 min-w-6 h-6 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                          i === 0 ? 'bg-butter text-brown' : 'bg-sage-dark text-brown-dark'
                        }`}
                        style={{ animationDelay: `${0.3 + i * 0.18}s` }}
                      >
                        {i + 1}
                      </span>
                    </div>
                    <div
                      className={`${revealed ? 'ct-scene-in' : 'opacity-0'} flex-1 md:flex-none`}
                      style={{ animationDelay: `${0.12 + i * 0.18}s` }}
                    >
                      <div className="flex md:flex-col items-baseline md:items-center gap-2 md:gap-1">
                        <h3 className="text-lg font-bold text-brown-dark">{lv.level}</h3>
                        <span className="text-xs font-semibold text-sage-dark bg-sage-light/30 rounded-full px-2 py-0.5">
                          {lv.count}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-brown mt-0.5">{lv.title}</p>
                      <p className="text-sm text-brown-light leading-relaxed md:mt-2 max-w-xs md:mx-auto">
                        {lv.text}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 🚩 نشان پایان مسیر — دسکتاپ */}
          <div aria-hidden="true" className="hidden md:flex absolute right-0 -top-1 items-center gap-1.5 text-butter">
            <Flag className="w-6 h-6 fill-butter/40" />
          </div>
          <p aria-hidden="true" className="hidden md:block absolute right-0 top-6 text-[10px] font-bold uppercase tracking-widest text-brown-light">
            {hsk.flagLabel}
          </p>
          <p aria-hidden="true" className="hidden md:block absolute left-0 top-[104px] text-[10px] font-bold uppercase tracking-widest text-brown-light">
            {hsk.startLabel}
          </p>
        </div>

        <div className="text-center mt-12 scroll-animate">
          <button
            onClick={() => onNavigate('classes')}
            className="bg-sage text-brown-dark px-8 py-3.5 rounded-full text-sm font-semibold inline-flex items-center gap-2 hover:bg-sage-dark hover:-translate-y-px hover:shadow-[0_6px_20px_rgba(168,201,160,0.45)] transition-all cursor-pointer"
          >
            {hsk.ctaButton}
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  )
}
