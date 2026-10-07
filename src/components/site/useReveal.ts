'use client'

import { useEffect } from 'react'

/**
 * اتصال انیمیشن‌های ظاهرشدن هنگام اسکرول (scroll-animate).
 * هر بار که صفحهٔ فعال عوض شود، دوباره فراخوانی کنید.
 *
 * 🔁 MutationObserver دو کار می‌کند:
 *  • هر .scroll-animate که بعداً به DOM اضافه شود (دادهٔ async) مشاهده می‌شود
 *  • اگر رندر مجدد React کلاس visible را از className پاک کند (className
 *    از JSX بازنویسی می‌شود)، همان عنصر دوباره مشاهده و revealed می‌شود —
 *    وگرنه بخش‌های پایین صفحه برای همیشه شفاف می‌مانند
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

    const scan = () => {
      document.querySelectorAll('.scroll-animate:not(.visible)').forEach((el) => {
        // observe روی عنصرِ تحت‌مشاهدهٔ تکراری no-op است؛ فراخوانی همیشه بی‌خطر
        observer.observe(el)
      })
    }

    // تغییرهای DOM (افزودن عنصر یا پاک‌شدن کلاس visible) را تماشا می‌کنیم
    const mo = new MutationObserver(() => scan())

    const timer = setTimeout(() => {
      scan()
      mo.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class'],
      })
    }, 120)

    return () => {
      clearTimeout(timer)
      mo.disconnect()
      observer.disconnect()
    }
  }, [dep])
}
