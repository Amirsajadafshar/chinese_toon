'use client'

import { useEffect } from 'react'

// ---------------------------------------------------------------------
//  با هر تغییر صفحه (تغییر hash) پنجره‌های دیالوگ بسته شوند
//  چون همهٔ صفحه‌ها همیشه رندر می‌مانند، دیالوگ‌ها بدون این قلاب
//  بعد از ناوبری هم باز می‌مانند.
// ---------------------------------------------------------------------
export function useCloseOnNavigate(close: () => void) {
  useEffect(() => {
    const onHashChange = () => close()
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [close])
}
