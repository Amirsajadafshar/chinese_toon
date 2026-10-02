'use client'

import { useEffect, useState } from 'react'
import { siteContent } from '@/content/site-content'

const nav = siteContent.home.sectionNav

// ---------------------------------------------------------------------
//  🧭 ناوبری بخش‌های صفحهٔ خانه — چسبان زیر منوی اصلی
//  ・ با اسکرول، خط زیر آیتمِ بخشِ فعال جابه‌جا می‌شود (scroll-spy)
//  ・ با کلیک، صفحه با حرکت نرم به همان بخش می‌رود
//  ارتفاع هدر ثابت است (نوار اعلان + منو) → با ResizeObserver اندازه‌گیری
//  می‌شود تا نوار همیشه دقیقاً زیر هدر بچسبد.
// ---------------------------------------------------------------------

export function HomeSectionNav() {
  const [active, setActive] = useState('')
  const [headerH, setHeaderH] = useState(120)

  // اندازهٔ هدر ثابت (شامل نوار اعلان) — با هر تغییر اندازه به‌روز می‌شود
  useEffect(() => {
    const header = document.querySelector('header')
    if (!header) return
    const update = () => setHeaderH(header.offsetHeight)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(header)
    return () => ro.disconnect()
  }, [])

  // Scroll-spy — بخشی که بیشترِ آن از خط لولا رد شده فعال است
  useEffect(() => {
    const sections = nav
      .map((n) => document.getElementById(n.id))
      .filter((el): el is HTMLElement => !!el)
    if (sections.length === 0) return

    const visible = new Map<string, boolean>()
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) visible.set((e.target as HTMLElement).id, e.isIntersecting)
        // اولین بخش visible از بالا = بخش فعال
        for (const n of nav) {
          if (visible.get(n.id)) {
            setActive(n.id)
            break
          }
        }
      },
      // خط لولا کمی زیر هدر + نوار بخش‌ها
      { rootMargin: `-${Math.min(headerH + 64, 220)}px 0px -55% 0px`, threshold: 0 }
    )
    sections.forEach((s) => io.observe(s))
    return () => io.disconnect()
  }, [headerH])

  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    const y = el.getBoundingClientRect().top + window.scrollY - headerH - 56
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' })
    setActive(id)
  }

  return (
    <nav
      aria-label="Page sections"
      className="sticky z-30"
      style={{ top: `${headerH}px` }}
    >
      <div className="bg-cream/85 backdrop-blur-md border-y border-sage-light/25 shadow-[0_2px_10px_rgba(91,81,69,0.04)]">
        <div className="max-w-7xl mx-auto px-6">
          <ul className="flex items-center gap-1 overflow-x-auto ct-scroll-x py-1 -mx-1" role="tablist">
            {nav.map((item) => {
              const isActive = active === item.id
              return (
                <li key={item.id} className="flex-shrink-0">
                  <button
                    onClick={() => scrollTo(item.id)}
                    role="tab"
                    aria-selected={isActive}
                    className={`relative px-4 py-2.5 text-sm font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap min-h-[40px] ${
                      isActive
                        ? 'text-sage-dark bg-sage-light/25'
                        : 'text-brown-light hover:text-brown hover:bg-sage-light/10'
                    }`}
                  >
                    {item.label}
                    {/* 🔔 خط زیر آیتم فعال — با اسکرول بین بخش‌ها جابه‌جا می‌شود */}
                    <span
                      aria-hidden="true"
                      className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 h-[3px] rounded-full bg-sage-dark transition-all duration-300 ${
                        isActive ? 'w-8 opacity-100' : 'w-0 opacity-0'
                      }`}
                    ></span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </nav>
  )
}
