'use client'

// ---------------------------------------------------------------------------
// 🌐 مرز خطای سراسری (شامل layout ریشه) — فاز ۶۳
// چون layout را هم پوشش می‌دهد، باید <html>/<body> خودش را داشته باشد.
// ---------------------------------------------------------------------------

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[ct-global-error-boundary]', error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#faf7f2',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
          padding: '24px',
          boxSizing: 'border-box',
        }}
      >
        <div
          role="alert"
          style={{
            maxWidth: 480,
            width: '100%',
            borderRadius: 24,
            border: '1px solid #d8e3d5',
            background: '#ffffff',
            boxShadow: '0 10px 30px rgba(90, 70, 40, 0.06)',
            padding: '32px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              margin: '0 auto 16px',
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'rgba(122, 156, 118, 0.15)',
              color: '#4e6b49',
              fontSize: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            人
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: '#3f3225', margin: '0 0 8px' }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, color: '#6b5b45', lineHeight: 1.6, margin: '0 0 24px' }}>
            The application hit an unexpected error — usually caused by an older page version after
            a site restart. Reloading fixes it.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                padding: '12px 20px',
                borderRadius: 12,
                border: 'none',
                background: '#7a9c76',
                color: '#fff',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Reload page
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  reset()
                } catch {
                  /* خروج به خانه */
                }
                window.location.hash = '#/'
              }}
              style={{
                padding: '12px 20px',
                borderRadius: 12,
                border: '1px solid #d8e3d5',
                background: '#f4efe6',
                color: '#3f3225',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Back to Home
            </button>
          </div>
          {error?.digest ? (
            <p
              style={{
                marginTop: 24,
                fontSize: 12,
                color: '#a89880',
                fontFamily: 'ui-monospace, monospace',
                wordBreak: 'break-all',
              }}
            >
              Error ref: {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  )
}
