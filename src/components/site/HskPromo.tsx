'use client'

import { useCallback, useRef, useSyncExternalStore } from 'react'
import { ArrowRight, CalendarClock, Check, GraduationCap } from 'lucide-react'
import { siteContent, PageKey } from '@/content/site-content'

const p = siteContent.classes.hskPromo

// ---------------------------------------------------------------------
// 🎯 سکشن تبلیغاتی «آمادگی HSK» با شمارش معکوس زندهٔ آزمون
//    - تاریخ آزمون از فایل محتوا خوانده می‌شود (owner-editable)
//    - بعد از گذشتن تاریخ → حالت «تاریخ جدید به‌زودی»
//    - دکمهٔ CTA کلاس را در sessionStorage می‌گذارد و به فرم ثبت‌نام می‌رود
// ---------------------------------------------------------------------

interface HskPromoProps {
  onNavigate: (page: PageKey) => void
}

// ساعت زنده — الگوی رسمی useSyncExternalStore. نکتهٔ مهم: getSnapshot باید
// مقدار «کش‌شده و پایدار» برگرداند؛ اگر مستقیم Date.now() بدهیم، هر صدا زدن
// عدد جدید است و React در حلقهٔ بی‌نهایت رندر می‌افتد. پس مقدار فقط داخل
// interval تیک به‌روز می‌شود و با callback به React خبر داده می‌شود.
// سرور ۰ برمی‌گرداند (خروجی SSR پایدار → '--' نمایش داده می‌شود).
function useNow(intervalMs = 1000) {
  const cache = useRef(0)
  const subscribe = useCallback(
    (cb: () => void) => {
      const t = setInterval(() => {
        cache.current = Date.now()
        cb()
      }, intervalMs)
      return () => clearInterval(t)
    },
    [intervalMs]
  )
  const getSnapshot = useCallback(() => {
    if (cache.current === 0) cache.current = Date.now() // مقدار اولیهٔ پایدار
    return cache.current
  }, [])
  const getServerSnapshot = useCallback(() => 0, [])
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

function pad(n: number) {
  return n.toString().padStart(2, '0')
}

export function HskPromo({ onNavigate }: HskPromoProps) {
  const now = useNow()

  // سکشن قابل خاموش‌کردن از فایل محتوا
  if (!p.enabled) return null

  const target = new Date(p.examDate).getTime()
  const valid = Number.isFinite(target)
  // now === 0 یعنی snapshot سرور (قبل از hydration) — هنوز عدد واقعی نداریم
  const ready = now > 0
  const remaining = valid && ready ? target - now : 0
  const expired = valid && ready && remaining <= 0

  const days = Math.max(0, Math.floor(remaining / 86_400_000))
  const hours = Math.max(0, Math.floor((remaining % 86_400_000) / 3_600_000))
  const minutes = Math.max(0, Math.floor((remaining % 3_600_000) / 60_000))
  const seconds = Math.max(0, Math.floor((remaining % 60_000) / 1000))

  const cells = [
    { value: days, label: p.daysLabel },
    { value: hours, label: p.hoursLabel },
    { value: minutes, label: p.minutesLabel },
    { value: seconds, label: p.secondsLabel },
  ]

  const goRegister = () => {
    // همان الگوی دکمه‌های Register کارت‌های کلاس: انتخاب کلاس → فرم ثبت‌نام
    // ⚠️ عنوان باید «دقیقاً» با title کلاس در site-content یکی باشد
    // (برای قفل‌شدن نوع کلاس و تطبیق بستهٔ پرداخت)
    try {
      sessionStorage.setItem('ct-selected-class', 'HSK Preparation')
    } catch {
      // بی‌اهمیت — فرم بدون انتخاب کلاس هم کار می‌کند
    }
    onNavigate('register')
  }

  return (
    <section className="pb-24" aria-labelledby="hsk-promo-title">
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-sage-light/45 via-butter/30 to-peach-light/40 border border-sage/25 shadow-[0_10px_40px_-18px_rgba(93,64,55,0.25)]">
        {/* واترمارک تزئینی */}
        <span
          aria-hidden="true"
          className="char-bg pointer-events-none select-none -top-8 right-2"
          style={{ fontSize: '190px', opacity: 0.05 }}
        >
          考
        </span>

        <div className="relative grid lg:grid-cols-2 gap-10 p-8 md:p-12 items-center">
          {/* ستون متن */}
          <div>
            <span className="inline-flex items-center gap-2 bg-white/80 backdrop-blur text-sage-dark text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full shadow-sm">
              <GraduationCap className="w-4 h-4" />
              {p.eyebrow}
            </span>
            <h2 id="hsk-promo-title" className="text-2xl md:text-4xl font-bold text-brown-dark mt-4 mb-4">
              {p.title}
            </h2>
            <p className="text-brown-light leading-relaxed mb-6 max-w-lg">{p.text}</p>

            <ul className="space-y-2.5 mb-8">
              {p.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-sage/80 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-[#FFFFFF]" strokeWidth={3.5} />
                  </span>
                  <span className="text-sm text-brown font-medium">{f}</span>
                </li>
              ))}
            </ul>

            {expired ? (
              /* حالت «تاریخ جدید به‌زودی» */
              <div className="bg-white/80 rounded-2xl p-5 border border-sage-light/40">
                <p className="text-base font-bold text-brown-dark mb-1">{p.closedTitle}</p>
                <p className="text-sm text-brown-light leading-relaxed">{p.closedText}</p>
              </div>
            ) : (
              /* دکمهٔ ثبت‌نام + یادداشت */
              <div>
                <button
                  onClick={goRegister}
                  className="group inline-flex items-center gap-2 bg-sage text-brown-dark px-7 py-3.5 rounded-full text-sm font-bold hover:bg-sage-dark hover:-translate-y-px hover:shadow-[0_6px_20px_rgba(168,201,160,0.45)] transition-all cursor-pointer"
                >
                  {p.cta}
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </button>
                <p className="text-xs text-brown-light mt-3">{p.enrollNote}</p>
              </div>
            )}
          </div>

          {/* ستون شمارش معکوس */}
          {!expired && (
            <div className="bg-white/75 backdrop-blur rounded-3xl p-6 md:p-8 border border-white/60 shadow-inner">
              <div className="flex items-center gap-2 text-sage-dark font-semibold text-sm mb-5">
                <CalendarClock className="w-4.5 h-4.5" />
                {p.examLabel}
              </div>
              {/* اعداد با tabular-nums تا هنگام تیک‌زدن نلرزند */}
              <div className="grid grid-cols-4 gap-2.5 md:gap-3" role="timer" aria-live="off">
                {cells.map((cell) => (
                  <div
                    key={cell.label}
                    className="bg-cream rounded-2xl py-4 md:py-5 text-center border border-sage-light/25"
                  >
                    <div className="text-2xl md:text-4xl font-bold text-brown-dark tabular-nums leading-none">
                      {ready ? pad(cell.value) : '--'}
                    </div>
                    <div className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-brown-light mt-2">
                      {cell.label}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 h-2 rounded-full bg-sage-light/25 overflow-hidden" aria-hidden="true">
                {/* نوار پیشرفت نسبت به ۸ هفتهٔ دوره (۵۶ روز) */}
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sage to-butter transition-[width] duration-1000"
                  style={{ width: `${Math.min(100, Math.max(4, 100 - (remaining / (56 * 86_400_000)) * 100))}%` }}
                />
              </div>
              <p className="text-[11px] text-brown-light mt-3 text-center">
                {ready ? `${days} ${p.daysLabel.toLowerCase()} to exam day — let's use them well!` : ''}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
