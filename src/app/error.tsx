'use client'

// ---------------------------------------------------------------------------
// 🛑 مرز خطای route (Next.js App Router) — فاز ۶۳
//
// ریشهٔ گزارش مالک: «Application error: a client-side exception has occurred»
// — وقتی سرور ری‌استارت می‌شود، chunkهای JS کهنهٔ مرورگر دیگر روی دیسک نیستند
// و Next.js صفحهٔ خطای پیش‌فرضِ بدون‌راه‌حل نشان می‌داد. این boundary پیام
// دوستانه با دکمهٔ Reload/خروج به خانه می‌دهد تا کاربر با یک کلیک ریکاور کند.
// ---------------------------------------------------------------------------

import { useEffect } from 'react'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // برای عیب‌یابی در کنسول مرورگر باقی می‌ماند
    console.error('[ct-error-boundary]', error)
  }, [error])

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16 bg-cream/40">
      <div
        role="alert"
        className="max-w-lg w-full rounded-3xl border border-sage-light/40 bg-white/90 shadow-lg shadow-brown/5 p-8 text-center"
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sage/15 text-2xl text-sage-dark">
          人
        </div>
        <h1 className="text-xl font-semibold text-brown-dark mb-2">Something went wrong</h1>
        <p className="text-sm text-brown/80 leading-relaxed mb-6">
          The page hit an unexpected error — this usually happens right after the site restarts and
          your browser is holding an older version. A quick reload almost always fixes it.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-5 py-3 rounded-xl bg-sage text-white text-sm font-medium hover:bg-sage-dark transition-colors focus:outline-none focus:ring-[3px] focus:ring-sage/30"
          >
            Reload page
          </button>
          <button
            type="button"
            onClick={() => {
              try {
                reset()
              } catch {
                /* fallback به خانه */
              }
              window.location.hash = '#/'
            }}
            className="px-5 py-3 rounded-xl border border-sage-light/60 bg-cream/60 text-brown-dark text-sm font-medium hover:bg-cream transition-colors focus:outline-none focus:ring-[3px] focus:ring-sage/20"
          >
            Back to Home
          </button>
        </div>
        {error?.digest ? (
          <p className="mt-6 text-xs text-brown-light/70 font-mono break-all">Error ref: {error.digest}</p>
        ) : null}
      </div>
    </div>
  )
}
