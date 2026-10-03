'use client'

import { useEffect, useRef, useState } from 'react'
import { siteContent } from '@/content/site-content'
import { CurveDivider } from './CurveDivider'

const defaultStats = siteContent.stats.items

/**
 * شمارنده متحرک — وقتی وارد دید کاربر شود، از ۰ تا مقدار نهایی می‌شمارد.
 */
function useCountUp(target: number, active: boolean, duration = 1600) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!active) return
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(target * eased))
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, active, duration])

  return value
}

function StatItem({
  value,
  suffix,
  label,
  active,
}: {
  value: number
  suffix: string
  label: string
  active: boolean
}) {
  const display = useCountUp(value, active)
  return (
    <div className="text-center px-4">
      <p className="text-3xl md:text-4xl font-bold text-brown-dark mb-1">
        {display.toLocaleString('en-US')}
        <span className="text-sage-dark">{suffix}</span>
      </p>
      <p className="text-xs md:text-sm text-brown-light font-medium">{label}</p>
    </div>
  )
}

// ---------------------------------------------------------------------
//  📊 نوار آمار صفحهٔ اول — از تب Settings پنل ادمین قابل تغییر است
//  (PUT /api/settings → کلید homeStats). تا وقتی مالک چیزی ذخیره نکرده،
//  عددهای پیش‌فرض فایل محتوا نشان داده می‌شود.
// ---------------------------------------------------------------------
export function StatsBar() {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)
  const [stats, setStats] = useState(defaultStats)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActive(true)
            observer.disconnect()
          }
        })
      },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // آمار از تنظیمات (پنل ادمین) — با هر ورود به صفحهٔ خانه هم تازه می‌شود
  useEffect(() => {
    let cancelled = false
    const load = () => {
      fetch('/api/settings')
        .then((res) => res.json())
        .then((data) => {
          if (cancelled) return
          const s = data?.settings?.homeStats
          if (Array.isArray(s) && s.length > 0) {
            setStats(
              s.map((item: { value: number; suffix?: string; label: string }) => ({
                value: Number(item.value) || 0,
                suffix: item.suffix ?? '',
                label: item.label,
              }))
            )
          } else {
            setStats(defaultStats) // تنظیمی ذخیره نشده → پیش‌فرض فایل محتوا
          }
        })
        .catch(() => {})
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="py-14 relative overflow-hidden bg-white">
      {/* 🌊 لبهٔ منحنی از تپه‌های سبز هیرو وارد نوار سفید می‌شود */}
      <CurveDivider fill="#A8C9A0" />
      <div
        ref={ref}
        className="max-w-5xl mx-auto px-6 scroll-animate visible"
      >
        <div className="bg-white rounded-3xl shadow-[0_8px_40px_rgba(91,81,69,0.08)] border border-sage-light/20 px-6 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:divide-x divide-sage-light/25">
            {stats.map((s, i) => (
              <StatItem
                key={`${s.label}-${i}`}
                value={s.value}
                suffix={s.suffix}
                label={s.label}
                active={active}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
