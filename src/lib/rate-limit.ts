// ---------------------------------------------------------------------------
// 🚦 محدودساز نرخ درخواست (Rate Limit) — حافظهٔ محلی، بدون وابستگی بیرونی
// برای جلوگیری از brute-force ورود مدیر و اسپم فرم‌های عمومی.
// پنجرهٔ لغزان: اگر درخواست‌های یک IP از سقف عبور کند تا پایان پنجره بلاک است.
// نکته: چون در حافظه است، با ری‌استارت سرور پاک می‌شود (برای این مقیاس کافی است).
// ---------------------------------------------------------------------------

interface Bucket {
  hits: number[] // timestamp هر درخواست موفقِ عبور (میلی‌ثانیه)
  blockedUntil: number // اگر > now یعنی در حالت قفل است
}

// ⚠️ روی globalThis نگه داشته می‌شود تا در حالت توسعه همهٔ مسیرها یک حافظهٔ مشترک داشته باشند
const globalStore = globalThis as unknown as {
  __ctRateBuckets?: Map<string, Bucket>
}
const buckets: Map<string, Bucket> = globalStore.__ctRateBuckets ?? new Map()
globalStore.__ctRateBuckets = buckets

// هر از گاهی سطل‌های کهنه پاک می‌شوند تا حافظه رشد نکند
// (پنجرهٔ پاک‌سازی: هر ۵ دقیقه؛ سطل‌های بیش از یک ساعت غیرفعال حذف می‌شوند)
const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanup(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [key, bucket] of buckets) {
    if (bucket.blockedUntil < now && (bucket.hits.length === 0 || bucket.hits[bucket.hits.length - 1] < now - 60 * 60 * 1000)) {
      buckets.delete(key)
    }
  }
}

/**
 * IP تقریبی کلاینت — در محیط پراکسی از هدر x-forwarded-for
 *
 * 🛡️ مدل اعتماد (سخت‌سازی امنیتی): «آخرین» عضو X-Forwarded-For استفاده می‌شود،
 * نه اولی. آخرین عضو را نزدیک‌ترین پراکسیِ قابل‌اعتماد به سرور اضافه می‌کند و
 * کلاینت نمی‌تواند آن را دست‌کاری کند؛ عضو اول در زنجیره‌های چندپراکسی تحت کنترل
 * مهاجم است. در این استقرار Caddy مقدار XFF را با remote_host واقعی «جایگزین»
 * می‌کند (Caddyfile: header_up X-Forwarded-For {remote_host})، پس تک‌عضوی است —
 * اما اگر روزی زنجیره عوض شد/پراکسی به‌جای جایگزینی الحاق کرد، «آخرین» همچنان
 * مقدار درست است و جعل هدرِ کلاینت هیچ‌وقت سطلِ rate-limit را دور نمی‌زند.
 */
export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) {
    const parts = fwd.split(',').map((p) => p.trim()).filter((p) => p.length > 0)
    if (parts.length > 0) return parts[parts.length - 1] // ← نزدیک‌ترین هاپ به خودِ سرور
  }
  return req.headers.get('x-real-ip')?.trim() || 'local'
}

export interface RateResult {
  ok: boolean
  /** ثانیه تا رفع قفل (وقتی ok=false) */
  retryAfter: number
  remaining: number
}

/**
 * بررسی/ثبت یک درخواست در سطلِ name برای این IP.
 * limit: سقف درخواست در windowSec ثانیه.
 * lockoutSec: در صورت عبور از سقف، چقدر کامل بلاک بماند.
 */
export function rateLimit(
  name: string,
  req: Request,
  limit: number,
  windowSec: number,
  lockoutSec = windowSec
): RateResult {
  const now = Date.now()
  cleanup(now)
  const key = `${name}:${clientIp(req)}`
  const windowMs = windowSec * 1000
  let bucket = buckets.get(key)
  if (!bucket) {
    bucket = { hits: [], blockedUntil: 0 }
    buckets.set(key, bucket)
  }

  // در حالت قفل؟
  if (bucket.blockedUntil > now) {
    return { ok: false, retryAfter: Math.ceil((bucket.blockedUntil - now) / 1000), remaining: 0 }
  }

  // پاک‌سازی درخواست‌های خارج از پنجره
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs)

  if (bucket.hits.length >= limit) {
    bucket.blockedUntil = now + lockoutSec * 1000
    return { ok: false, retryAfter: lockoutSec, remaining: 0 }
  }

  bucket.hits.push(now)
  return { ok: true, retryAfter: 0, remaining: limit - bucket.hits.length }
}

/** پاسخ استاندارد 429 با هدر Retry-After */
export function tooManyRequests(r: RateResult): Response {
  return new Response(
    JSON.stringify({ error: 'Too many requests. Please try again later.' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(Math.max(1, r.retryAfter)),
      },
    }
  )
}
