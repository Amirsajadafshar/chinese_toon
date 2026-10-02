'use client'

import { useEffect } from 'react'

/**
 * اتصال انیمیشن‌های ظاهرشدن هنگام اسکرول (scroll-animate).
 * هر بار که صفحهٔ فعال عوض شود، دوباره فراخوانی کنید.
 *
 * 🔁 علاوه بر اسکن اولیه، یک MutationObserver هم می‌گذارد تا هر
 * .scroll-animate که بعداً (مثلاً بعد از لود شدن داده از سرور) به DOM
 * اضافه شود هم مشاهده شود — وگرنه کارت‌های async (کاروسل نظرات،
 * Testimonials، ...) برای همیشه شفاف می‌مانند.
 */
export function useReveal(dep: unknown) {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    )

    const seen = new WeakSet<Element>()
    const scan = () => {
      document.querySelectorAll('.scroll-animate:not(.visible)').forEach((el) => {
        if (!seen.has(el)) {
          seen.add(el)
          observer.observe(el)
        }
      })
    }

    // تغییرهای DOM را تماشا می‌کنیم تا عناصر جدید هم وارد مشاهده شوند
    const mo = new MutationObserver(() => scan())

    const timer = setTimeout(() => {
      scan()
      mo.observe(document.body, { childList: true, subtree: true })
    }, 120)

    return () => {
      clearTimeout(timer)
      mo.disconnect()
      observer.disconnect()
    }
  }, [dep])
}
