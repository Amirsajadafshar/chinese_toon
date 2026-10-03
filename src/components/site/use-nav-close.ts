'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

// ---------------------------------------------------------------------
//  با هر تغییر مسیر پنجره‌های دیالوگ بسته شوند (فاز SEO — مسیر واقعی).
//  دیالوگ‌های باز درون یک صفحه با ناوبری به مسیر دیگر باید بسته شوند.
// ---------------------------------------------------------------------
export function useCloseOnNavigate(close: () => void) {
  const pathname = usePathname()
  useEffect(() => {
    close()
  }, [close, pathname])
}
