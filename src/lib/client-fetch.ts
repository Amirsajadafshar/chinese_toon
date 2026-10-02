'use client'

// ---------------------------------------------------------------------------
// 🌐 کلاینت fetch تاب‌آور (فاز ۶۲ — رفع «Could not create the account /
//    Could not sign in» که کاربران می‌دیدند)
//
// 🔍 ریشه‌یابی واقعی: این پیام‌ها خطای منطق احراز هویت نبودند — هنگام از
//    کارافتادگی موقت سرور/گیت‌وی، پراکسی به‌جای JSON یک «صفحهٔ HTML خطای 502»
//    برمی‌گرداند؛ res.json() شکست می‌خورد و کد به پیام عمومی fallback می‌رفت.
//
// راه‌حل:
//  ۱) تلاش مجدد خودکار روی خطای شبکه و 502/503/504 (با backoff کوتاه)
//  ۲) تفکیک صادقانهٔ سه حالت: unreachable (سرور در دسترس نیست) / badjson
//     (پاسخ غیر JSON) / http (خطای واقعی سرور با پیام خودش)
//  ۳) پیام کاربرپسند و قابل‌اقدام به‌جای پیام مبهم
// ---------------------------------------------------------------------------

export type FetchFailKind = 'unreachable' | 'badjson' | 'http'

export interface FetchOk<T> {
  ok: true
  status: number
  data: T
}

export interface FetchFail {
  ok: false
  kind: FetchFailKind
  status: number | null
  /** پیام آمادهٔ نمایش به کاربر — صادقانه و قابل‌اقدام */
  message: string
  /** بدنهٔ parseشدهٔ سرور در حالت http — برای خطاهای فیلدی 400/409 */
  data?: unknown
}

export type FetchResult<T> = FetchOk<T> | FetchFail

/** پیام‌های استاندارد UI — انگلیسی (زبان رابط سایت) */
export const UNREACHABLE_MESSAGE =
  'We could not reach the server after several attempts. The site may be restarting for a few seconds — please try again in a moment.'
export const BADJSON_MESSAGE =
  'The server returned an unexpected response. Please try again in a moment.'

const RETRYABLE_STATUS = new Set([502, 503, 504])
const DEFAULT_ATTEMPTS = 3 // ۱ تلاش اصلی + ۲ تلاش مجدد
const BASE_DELAY_MS = 700

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * fetch مقاوم برای POST/GETهای JSON — خطای شبکه و 502/503/504 را با backoff
 * تلاش مجدد می‌کند و نتیجه را تفکیک‌شده برمی‌گرداند (هرگز throw نمی‌کند).
 */
export async function resilientJsonFetch<T = unknown>(
  url: string,
  init: RequestInit = {},
  opts: { attempts?: number; timeoutMs?: number } = {}
): Promise<FetchResult<T>> {
  const attempts = Math.max(1, opts.attempts ?? DEFAULT_ATTEMPTS)
  const timeoutMs = opts.timeoutMs ?? 20_000

  let lastKind: FetchFailKind = 'unreachable'
  let lastStatus: number | null = null

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(url, { ...init, signal: controller.signal })
      clearTimeout(timer)

      if (res.ok || !RETRYABLE_STATUS.has(res.status)) {
        // پاسخ نهایی سرور (موفق یا خطای واقعی) — JSON را جدا می‌کنیم
        const text = await res.text()
        let data: unknown = null
        if (text) {
          try {
            data = JSON.parse(text)
          } catch {
            // بدنهٔ غیر JSON (مثلاً صفحهٔ HTML پراکسی) — با وضعیت واقعی اعلام می‌شود
            return {
              ok: false,
              kind: 'badjson',
              status: res.status,
              message: BADJSON_MESSAGE,
            }
          }
        }
        if (res.ok) return { ok: true, status: res.status, data: data as T }
        const msg =
          data && typeof data === 'object' && 'error' in data && typeof (data as { error?: unknown }).error === 'string'
            ? (data as { error: string }).error
            : BADJSON_MESSAGE
        return { ok: false, kind: 'http', status: res.status, message: msg, data }
      }

      // 502/503/504 — تلاش مجدد
      lastKind = 'unreachable'
      lastStatus = res.status
    } catch {
      // خطای شبکه/timeout — تلاش مجدد
      clearTimeout(timer)
      lastKind = 'unreachable'
    }
    if (attempt < attempts) await sleep(BASE_DELAY_MS * attempt)
  }

  return {
    ok: false,
    kind: lastKind,
    status: lastStatus,
    message: lastKind === 'unreachable' ? UNREACHABLE_MESSAGE : BADJSON_MESSAGE,
  }
}
