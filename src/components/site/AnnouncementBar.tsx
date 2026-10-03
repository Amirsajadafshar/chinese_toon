'use client'

import { useEffect, useState } from 'react'
import { useSyncExternalStore } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import { siteContent, PageKey } from '@/content/site-content'

// ---------------------------------------------------------------------
//  📣 نوار اعلان بالای سایت — برای خبرهای فوری (مثل شروع ثبت‌نام)
//    - متن و دکمه از تب Settings پنل ادمین (PUT /api/settings) یا فایل محتوا
//    - بستن نوار فقط برای «همین نشست مرورگر» ذخیره می‌شود (sessionStorage)؛
//      با باز کردن دوبارهٔ سایت، نوار دوباره دیده می‌شود — رفع باگ «نوار
//      نمایش داده نمی‌شود» که به‌خاطر dismiss همیشگی در localStorage بود
//    - ضمناً پنل ادمین با هر تغییر متن، Version id را خودکار عوض می‌کند
//    - وضعیت بستن با الگوی رسمی useSyncExternalStore خوانده می‌شود
//      (بدون setState در effect — سازگار با قانون lint)
// ---------------------------------------------------------------------

const staticAnnouncement = siteContent.announcement

interface AnnouncementData {
  enabled: boolean
  id: string
  emoji: string
  text: string
  ctaLabel: string
  ctaPage: string
}

const listeners = new Set<() => void>()

function dismiss(id: string) {
  try {
    sessionStorage.setItem('ct-announce-dismissed', id) // فقط تا آخر همین نشست
  } catch {
    // حافظه در دسترس نیست — فقط تا رفرش بعدی پنهان می‌ماند
  }
  listeners.forEach((l) => l())
}

function subscribe(callback: () => void) {
  listeners.add(callback)
  // همگام‌سازی بین تب‌های مرورگر
  window.addEventListener('storage', callback)
  return () => {
    listeners.delete(callback)
    window.removeEventListener('storage', callback)
  }
}

function makeGetSnapshot(id: string) {
  return function getSnapshot(): boolean {
    // true = بسته شده (فقط در همین نشست مرورگر)
    try {
      return sessionStorage.getItem('ct-announce-dismissed') === id
    } catch {
      return false
    }
  }
}

function getServerSnapshot(): boolean {
  return false // روی سرور نوار باز فرض می‌شود
}

export function AnnouncementBar() {
  const [a, setA] = useState<AnnouncementData>(staticAnnouncement)
  const dismissed = useSyncExternalStore(subscribe, makeGetSnapshot(a.id), getServerSnapshot)

  // اعلان از تنظیمات (پنل ادمین) — با هر جابه‌جایی بین صفحه‌ها هم تازه می‌شود
  // تا تغییرات مالک بلافاصله دیده شود
  useEffect(() => {
    let cancelled = false
    const load = () => {
      fetch('/api/settings')
        .then((res) => res.json())
        .then((data) => {
          if (cancelled) return
          const s = data?.settings?.announcement
          if (s && typeof s.text === 'string' && s.text.length > 0) {
            setA({
              enabled: s.enabled !== false,
              id: String(s.id ?? staticAnnouncement.id),
              emoji: String(s.emoji ?? '📣'),
              text: s.text,
              ctaLabel: String(s.ctaLabel ?? 'Save my spot'),
              ctaPage: String(s.ctaPage ?? 'register'),
            })
          } else {
            setA(staticAnnouncement) // تنظیمی ذخیره نشده → پیش‌فرض فایل محتوا
          }
        })
        .catch(() => {})
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (!a.enabled || dismissed) return null

  return (
    <div className="ct-announce relative bg-gradient-to-r from-sage/60 via-butter/50 to-peach/50 border-b border-sage/20">
      <div className="max-w-7xl mx-auto pl-10 pr-10 py-2 flex items-center justify-center gap-3 text-center">
        <span aria-hidden="true" className="text-sm select-none flex-shrink-0">
          {a.emoji}
        </span>
        <p className="text-xs md:text-[13px] font-medium text-brown-dark leading-snug min-w-0 line-clamp-2 md:line-clamp-none">
          {a.text}
        </p>
        <Link
          href={a.ctaPage === 'home' ? '/' : `/${a.ctaPage}`}
          className="flex-shrink-0 bg-white/80 hover:bg-white text-brown-dark text-[11px] md:text-xs font-bold px-3 py-1 rounded-full transition-all hover:-translate-y-px shadow-sm cursor-pointer whitespace-nowrap"
        >
          {a.ctaLabel}
        </Link>
        <button
          onClick={() => dismiss(a.id)}
          aria-label="Dismiss announcement"
          className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-brown/70 hover:text-brown hover:bg-white/60 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
