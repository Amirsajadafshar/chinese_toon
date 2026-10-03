import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'

// ---------------------------------------------------------------------------
// 🔊 تلفظ هوش مصنوعی واژه‌های چینی (Text-to-Speech)
//    فرانت‌اند (src/lib/ct-speak.ts) اول این مسیر را صدا می‌زند؛ اگر ناموفق بود
//    به صدای مرورگر (speechSynthesis) برمی‌گردد.
//
// امنیت/پایداری:
//  • محدودیت نرخ: حداکثر ۳۰ درخواست در ۱۰ دقیقه برای هر IP
//  • فقط متن کوتاه (≤۱۲۰ نویسه) و سرعت معتبر 0.5–2.0 پذیرفته می‌شود
//  • کش صدا در حافظهٔ سرور (globalThis) — هر واژه فقط یک بار ساخته می‌شود
// ---------------------------------------------------------------------------

const MAX_TEXT = 120
const CACHE_MAX = 80 // حداکثر تعداد صداهای کش‌شده (حافظهٔ محدود)

// ⚠️ روی globalThis تا همهٔ مسیرها در حالت توسعه یک کش مشترک داشته باشند
const globalStore = globalThis as unknown as {
  __ctTtsCache?: Map<string, Buffer>
}
const cache: Map<string, Buffer> = globalStore.__ctTtsCache ?? new Map()
globalStore.__ctTtsCache = cache

function cachePut(key: string, buf: Buffer) {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  cache.set(key, buf)
}

export async function POST(req: NextRequest) {
  // ⛔️ سقف نرخ — این مسیر پرهزینه است (مدل صوتی)
  const rl = await rateLimit('tts', req, 30, 10 * 60, 300)
  if (!rl.ok) return tooManyRequests(rl)

  try {
    const body = await req.json().catch(() => null)
    const text = typeof body?.text === 'string' ? body.text.trim() : ''
    const speedRaw = typeof body?.speed === 'number' ? body.speed : 0.8
    // سرعت فقط بین 0.5 و 2.0 معتبر است (محدودیت API)
    const speed = Math.min(2, Math.max(0.5, Number.isFinite(speedRaw) ? speedRaw : 0.8))

    if (!text || text.length > MAX_TEXT) {
      return NextResponse.json({ error: 'Invalid text' }, { status: 400 })
    }

    const key = `${text}|${speed.toFixed(2)}`
    const cached = cache.get(key)
    if (cached) {
      return new NextResponse(new Uint8Array(cached), {
        status: 200,
        headers: {
          'Content-Type': 'audio/wav',
          'Content-Length': String(cached.length),
          'Cache-Control': 'private, max-age=86400',
          'X-TTS-Cache': 'hit',
        },
      })
    }

    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()
    const response = await zai.audio.tts.create({
      input: text,
      voice: 'tongtong', // صدای گرم و صمیمی — برای زبان‌آموز مناسب است
      speed,
      response_format: 'wav',
      stream: false,
    })
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(new Uint8Array(arrayBuffer))
    if (!buffer.length) {
      return NextResponse.json({ error: 'Empty audio' }, { status: 502 })
    }
    cachePut(key, buffer)

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': String(buffer.length),
        'Cache-Control': 'private, max-age=86400',
        'X-TTS-Cache': 'miss',
      },
    })
  } catch (err) {
    console.error('[POST /api/tts] error:', err)
    return NextResponse.json({ error: 'TTS failed' }, { status: 500 })
  }
}
