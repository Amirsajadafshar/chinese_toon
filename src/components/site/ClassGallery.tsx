'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react'
import { siteContent } from '@/content/site-content'

const g = siteContent.about.gallery

// ---------------------------------------------------------------------
// 📸 گالری «لحظه‌های کلاس» — چیدمان masonry با CSS columns + لایت‌باکس
//    با پشتیبانی کیبورد (Escape / فلش چپ و راست)، قفل اسکرول بدنه،
//    برگرداندن فوکوس به کارت قبلی بعد از بستن، و fallback گرادیانی.
// ---------------------------------------------------------------------

export function ClassGallery() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const closeRef = useRef<HTMLButtonElement | null>(null)

  // Portal بعد از hydration وصل می‌شود — الگوی رسمی بدون setState در effect:
  // روی سرور false، بعد از hydrate در کلاینت true
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  const open = (i: number) => setOpenIndex(i)
  const close = useCallback(() => setOpenIndex(null), [])
  const step = useCallback(
    (dir: 1 | -1) => {
      setOpenIndex((cur) =>
        cur === null ? cur : (cur + dir + g.items.length) % g.items.length
      )
    },
    []
  )

  // کیبورد: Escape می‌بندد، فلش‌ها بین عکس‌ها حرکت می‌کنند
  useEffect(() => {
    if (openIndex === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowRight') step(1)
      else if (e.key === 'ArrowLeft') step(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openIndex, close, step])

  // قفل اسکرول بدنه وقتی لایت‌باکس باز است + فوکوس اولیه
  useEffect(() => {
    if (openIndex === null) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      document.body.style.overflow = prevOverflow
      // برگرداندن فوکوس به کارتی که لایت‌باکس را باز کرده
      triggerRef.current?.focus()
    }
  }, [openIndex])

  // در حالت بدون عکس، سکشن اصلاً رندر نشود (مدیریت‌پذیر از فایل محتوا)
  if (!g.items.length) return null

  return (
    <section className="py-20 bg-white/50 relative overflow-hidden" aria-labelledby="gallery-title">
      <div
        aria-hidden="true"
        className="char-bg pointer-events-none select-none top-6 right-0"
        style={{ fontSize: '200px', opacity: 0.03 }}
      >
        时光
      </div>
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-sage-dark mb-3">
            {g.eyebrow}
          </span>
          <h2 id="gallery-title" className="text-2xl md:text-3xl font-bold text-brown-dark mb-3">
            {g.title}
          </h2>
          <p className="text-brown-light max-w-2xl mx-auto">{g.subtitle}</p>
        </div>

        {/* چیدمان masonry: ستون‌ها با CSS columns — عکس‌های عمودی و افقی قشنگ جا می‌گیرند */}
        <div className="columns-2 md:columns-3 gap-4 [column-fill:_balance]">
          {g.items.map((item, i) => (
            <button
              key={i}
              ref={openIndex === null ? (i === 0 ? triggerRef : undefined) : undefined}
              onClick={() => open(i)}
              aria-label={`${item.tag} — ${item.caption}`}
              className="ct-gallery-card group relative w-full mb-4 rounded-3xl overflow-hidden break-inside-avoid text-left cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sage/40"
            >
              <div
                className={`w-full bg-gradient-to-br from-sage-light/50 via-butter/40 to-peach-light/50 ${
                  item.tall ? 'aspect-[3/4]' : 'aspect-[4/3]'
                }`}
              >
                <img
                  src={item.image}
                  alt={item.caption}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).style.opacity = '0'
                  }}
                />
              </div>

              {/* هاور: گرادیان + کپشن */}
              <div className="absolute inset-0 bg-gradient-to-t from-brown-dark/80 via-brown-dark/10 to-transparent opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-300" />
              <div className="absolute inset-x-0 bottom-0 p-4 translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 transition-all duration-300">
                <span className="inline-block bg-butter/90 text-brown-dark text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full mb-2">
                  {item.tag}
                </span>
                <p className="text-[#FFFFFF] text-xs font-medium leading-relaxed line-clamp-2">
                  {item.caption}
                </p>
              </div>

              {/* آیکون بزرگ‌نمایی — همیشه در گوشه دیده می‌شود */}
              <span className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/85 backdrop-blur flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-300">
                <Expand className="w-4 h-4 text-brown" />
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 🔍 لایت‌باکس — با portal به body رندر می‌شود؛ اگر داخل سکشن می‌ماند،
          transform باقی‌مانده از انیمیشن ct-page-in (fill-mode: both) باعث می‌شد
          position: fixed نسبت به همان سکشن بلند محاسبه شود و تصویر از دید خارج شود */}
      {mounted &&
        openIndex !== null &&
        createPortal(
          <div
          role="dialog"
          aria-modal="true"
          aria-label={`${g.items[openIndex].tag} — ${g.items[openIndex].caption}`}
          className="ct-lightbox fixed inset-0 z-[90] flex items-center justify-center p-4 md:p-10 bg-brown-dark/85 backdrop-blur-sm"
          onClick={close}
        >
          {/* دکمهٔ بستن */}
          <button
            ref={closeRef}
            onClick={close}
            aria-label="Close gallery"
            className="absolute top-4 right-4 z-10 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-[#FFFFFF] flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
          >
            <X className="w-5 h-5" />
          </button>

          {/* شمارنده */}
          <span className="absolute top-6 left-5 text-[#FFFFFF]/80 text-xs font-semibold tabular-nums tracking-wide bg-white/10 px-3 py-1.5 rounded-full">
            {openIndex + 1} / {g.items.length}
          </span>

          {/* قبلی */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              step(-1)
            }}
            aria-label="Previous photo"
            className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 w-11 h-11 md:w-12 md:h-12 rounded-full bg-white/15 hover:bg-white/30 text-[#FFFFFF] flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* تصویر + کپشن */}
          <figure
            className="ct-lightbox-figure max-w-4xl w-full flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full flex items-center justify-center rounded-3xl overflow-hidden bg-cream/10 ring-1 ring-white/15 shadow-2xl">
              <img
                key={g.items[openIndex].image}
                src={g.items[openIndex].image}
                alt={g.items[openIndex].caption}
                decoding="async"
                className="ct-lightbox-img max-h-[68vh] w-auto max-w-full object-contain"
              />
            </div>
            <figcaption className="mt-4 text-center max-w-xl">
              <span className="inline-block bg-butter/90 text-brown-dark text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full mb-2">
                {g.items[openIndex].tag}
              </span>
              <p className="text-[#FFFFFF]/95 text-sm font-medium leading-relaxed">
                {g.items[openIndex].caption}
              </p>
            </figcaption>
          </figure>

          {/* بعدی */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              step(1)
            }}
            aria-label="Next photo"
            className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 w-11 h-11 md:w-12 md:h-12 rounded-full bg-white/15 hover:bg-white/30 text-[#FFFFFF] flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>,
          document.body
        )}
    </section>
  )
}
