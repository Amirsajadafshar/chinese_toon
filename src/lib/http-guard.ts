// ---------------------------------------------------------------------------
// 🛡️ گارد درخواست‌های HTTP — دفاع در عمق برای mutationهای کوکی‌محور
//
// ⚠️ فاز ۳۹ — تصمیم صریح مالک (۱۴۰۴/۰۶/۲۵):
//    چک سخت‌گیرانهٔ Origin در محیط پیش‌نمایش سندباکس، «ورود واقعی کاربران» را
//    با 403 می‌بست (زنجیرهٔ گیت‌وی/پراکسی، Host را بازنویسی می‌کند). با درخواست
//    مالک («پروکسی بررسی نکن، اجازه ورود بده») چک مبدأ به حالت «مشاهده‌ای»
//    (log-only) رفت و دیگر هیچ درخواستی را رد نمی‌کند.
//
//    • دفاع اصلی CSRF = کوکی SameSite=Lax + httpOnly (استاندارد فریمورک‌ها؛
//      مرورگرها کوکی را به POST بین‌سایتی نمی‌چسبانند) + rate-limit همه‌جانبه.
//    • سقف حجم بدنه (ضد DoS حافظه) همچنان فعال و ردکننده است.
//    • برای استقرار پروداکشن (دامنهٔ واقعی/HTTPS): STRICT_ORIGIN_ENFORCE=1 در
//      env بگذارید تا چک سخت‌گیرانهٔ مبدأ (فهرست سفید Host / X-Forwarded-Host /
//      TRUSTED_ORIGINS) دوباره «ردکننده» شود — کد آن کامل و حفظ‌شده است.
//
// تاریخی (فاز ۳۶/۳۸): چک Origin فقط برای POSTهای کوکی‌محور (login/register/
// logout/orders) اعمال می‌شد؛ APIهای ادمین با هدر x-admin-key ذاتاً CSRF-امن‌اند
// (مرورگر سایت دیگر نمی‌تواند این هدر را بدون اجازهٔ CORS بفرستد).
// ---------------------------------------------------------------------------

import { NextRequest } from 'next/server'

/** حد پیش‌فرض حجم بدنهٔ JSON — همهٔ APIهای این سایت بدنهٔ کوچک دارند */
export const DEFAULT_MAX_BODY_BYTES = 16 * 1024

/** نرمال‌سازی هاست: حروف کوچک + حذف پورت پیش‌فرض https/:443 و http/:80 */
function normalizeHost(raw: string): string {
  const host = raw.trim().toLowerCase()
  if (host.endsWith(':443')) return host.slice(0, -4)
  if (host.endsWith(':80')) return host.slice(0, -3)
  return host
}

/** استخراج هاست‌ها از یک هدر (پراکسی‌ها ممکن است لیست ویرگولی بفرستند) */
function hostsFromHeader(raw: string | null): string[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((part) => normalizeHost(part))
    .filter((h) => h.length > 0)
}

/**
 * مجموعهٔ هاست‌های قابل‌اعتماد برای همین درخواست — اکیداً از هدرهای زنجیرهٔ
 * پراکسی و پیکربندی عملیاتی ساخته می‌شود؛ هیچ ورودی دلخواه/داینامیکی از
 * کلاینت به آن اضافه نمی‌شود.
 */
function trustedRequestHosts(req: NextRequest): Set<string> {
  const set = new Set<string>()
  for (const h of hostsFromHeader(req.headers.get('host'))) set.add(h)
  for (const h of hostsFromHeader(req.headers.get('x-forwarded-host'))) set.add(h)

  // فقط توسعه: پیش‌نمایش سندباکس ممکن است روی localhost/آی‌پی داخلی سرو شود
  if (process.env.NODE_ENV !== 'production') {
    set.add('localhost:3000')
    set.add('127.0.0.1:3000')
    set.add('localhost')
    set.add('127.0.0.1')
  }

  // فهرست سفید عملیاتی — TRUSTED_ORIGINS="https://example.com,https://www.example.com"
  for (const entry of (process.env.TRUSTED_ORIGINS ?? '').split(',')) {
    const trimmed = entry.trim()
    if (!trimmed) continue
    try {
      const u = new URL(trimmed)
      if (u.protocol === 'https:' || u.protocol === 'http:') set.add(normalizeHost(u.host))
    } catch {
      // ورودی بدشکل در TRUSTED_ORIGINS نادیده گرفته می‌شود (خطای پیکربندی، نه سیگنال امنیتی)
    }
  }
  return set
}

/**
 * چک سخت‌گیرانهٔ هم‌مبدأ (نسخهٔ آگاه از پراکسی) — فقط در حالت STRICT_ORIGIN_ENFORCE=1
 * «ردکننده» است. true یعنی درخواست از مبدأ قابل‌اعتماد (یا کلاینتِ بدون Origin) است.
 */
function isSameOriginStrict(req: NextRequest): boolean {
  const origin = req.headers.get('origin')
  if (!origin) return true // کلاینت غیرمرورگری — کوکی و rate-limit خط دفاع‌اند
  if (origin === 'null') return true // مبدأ مات (فریم sandbox) — بدون کوکی Lax

  let originHost: string
  try {
    originHost = normalizeHost(new URL(origin).host)
  } catch {
    return false // Origin بدشکل = مشکوک → رد
  }
  if (!originHost) return false

  const trusted = trustedRequestHosts(req)
  if (trusted.has(originHost)) return true

  // فقط در dev: همان hostname با پورت متفاوت — اثر شناخته‌شدهٔ پراکسی محلی
  if (process.env.NODE_ENV !== 'production') {
    for (const t of trusted) {
      const tHostname = t.replace(/:\d+$/, '')
      const oHostname = originHost.replace(/:\d+$/, '')
      if (tHostname && tHostname === oHostname) return true
    }

    // فقط در dev: Origin و Refererِ مرورگر هاستِ یکسان دارند (درخواست هم‌مبدأ واقعی)
    const referer = req.headers.get('referer')
    if (referer) {
      try {
        if (normalizeHost(new URL(referer).host) === originHost) return true
      } catch {
        // Referer بدشکل — نادیده گرفته می‌شود؛ قواعد بالاتر تصمیم می‌گیرند
      }
    }
  }
  return false
}

// لاگ مشاهده‌ای/تشخیصی — با سقف نرخ تا اسپمِ لاگ (توسط مهاجم بی‌احراز) ممکن نشود
let lastObserveLog = 0
function logOriginObservation(req: NextRequest, mode: 'observe' | 'reject'): void {
  const now = Date.now()
  if (now - lastObserveLog < 5_000) return
  lastObserveLog = now
  // ⚠️ هیچ راز/کوکی/توکنی لاگ نمی‌شود — فقط هاست‌ها برای عیب‌یابی پراکسی
  console.warn(`[http-guard] origin ${mode === 'reject' ? 'REJECTED' : 'mismatch (observed, allowed)'}`, {
    origin: req.headers.get('origin'),
    host: req.headers.get('host'),
    forwardedHost: req.headers.get('x-forwarded-host'),
    referer: req.headers.get('referer'),
  })
}

/**
 * بررسی مبدأ بر اساس سیاست جاری:
 *  • پیش‌فرض (سندباکس/پیش‌نمایش): مشاهده‌ای — همه عبور می‌کنند، عدم‌تطابق فقط لاگ می‌شود.
 *  • STRICT_ORIGIN_ENFORCE=1: سخت‌گیرانه — عدم‌تطابق رد می‌شود (پروداکشن).
 */
export function isSameOrigin(req: NextRequest): boolean {
  const enforce = process.env.STRICT_ORIGIN_ENFORCE === '1'
  if (!enforce) {
    if (!isSameOriginStrict(req)) logOriginObservation(req, 'observe')
    return true
  }
  const ok = isSameOriginStrict(req)
  if (!ok) logOriginObservation(req, 'reject')
  return ok
}

/**
 * گارد ترکیبی برای مسیرهای mutation کوکی‌محور:
 * سیاست مبدأ (طبق بالا) + سقف حجم بدنه (Content-Length در صورت حضور).
 * برمی‌گرداند: null = عبور؛ رشته = پیام خطای امن (سمت API تبدیل به 403/413 می‌شود)
 */
export function requestGuardIssue(req: NextRequest, maxBytes = DEFAULT_MAX_BODY_BYTES): string | null {
  if (!isSameOrigin(req)) {
    return 'Cross-origin request rejected'
  }
  const lenHeader = req.headers.get('content-length')
  if (lenHeader) {
    const len = Number(lenHeader)
    if (Number.isFinite(len) && len > maxBytes) {
      return 'Payload too large'
    }
  }
  return null
}

/** 403 استاندارد برای نقض same-origin (فقط در حالت STRICT_ORIGIN_ENFORCE=1 ممکن است برگردد) */
export function forbiddenResponse(): Response {
  return Response.json({ error: 'Forbidden' }, { status: 403 })
}

/** 413 استاندارد برای بدنهٔ بزرگ‌تر از حد */
export function payloadTooLargeResponse(): Response {
  return Response.json({ error: 'Payload too large' }, { status: 413 })
}

/** میان‌بر: اگر گارد رد کرد، پاسخ آماده برگردانده می‌شود؛ وگرنه null */
export function guardResponse(req: NextRequest, maxBytes = DEFAULT_MAX_BODY_BYTES): Response | null {
  const issue = requestGuardIssue(req, maxBytes)
  if (!issue) return null
  return issue === 'Cross-origin request rejected' ? forbiddenResponse() : payloadTooLargeResponse()
}
