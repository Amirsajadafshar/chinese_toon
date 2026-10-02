'use client'

// ---------------------------------------------------------------------------
// 🔊 پخش تلفظ چینی — اول صدای هوش مصنوعی (/api/tts) و در صورت خطا صدای مرورگر
//    مزیت AI: تلفظ واقعی mandarin با تُن درست (صدای مرورگر روی خیلی دستگاه‌ها
//    صدای چینی ندارد یا تلفظش مصنوعی است).
//    • کش blob در حافظهٔ تب — هر واژه فقط یک بار از سرور گرفته می‌شود
//    • فقط یک صدا در هر لحظه؛ صدا جدید، قبلی را قطع می‌کند
// ---------------------------------------------------------------------------

interface SpeakOptions {
  /** سرعت پخش 0.5–2.0 (پیش‌فرض 0.8 برای زبان‌آموز) */
  speed?: number
  /** بعد از پایان/خطای پخش صدا زده می‌شود (برای ریست state دکمه) */
  onEnd?: () => void
}

type SpeakSource = 'ai' | 'browser' | 'none'

const blobCache = new Map<string, string>() // key → objectURL
const BLOB_CACHE_MAX = 60

let currentAudio: HTMLAudioElement | null = null
let currentUrl: string | null = null

function cachePut(key: string, url: string) {
  if (blobCache.size >= BLOB_CACHE_MAX) {
    const oldest = blobCache.keys().next().value
    if (oldest !== undefined) {
      const old = blobCache.get(oldest)
      if (old && old !== currentUrl) URL.revokeObjectURL(old)
      blobCache.delete(oldest)
    }
  }
  blobCache.set(key, url)
}

/** قطع هر صدای در حال پخش (AI و مرورگر) */
export function stopSpeak() {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.src = ''
    currentAudio = null
  }
  if (currentUrl) {
    URL.revokeObjectURL(currentUrl)
    blobCache.forEach((v, k) => {
      if (v === currentUrl) blobCache.delete(k)
    })
    currentUrl = null
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
}

/** آیا مرورگر صدای چینی دارد؟ (برای تصمیم fallback) */
function hasChineseVoice(): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false
  try {
    return window.speechSynthesis
      .getVoices()
      .some((v) => v.lang.toLowerCase().startsWith('zh'))
  } catch {
    return false
  }
}

/**
 * پخش تلفظ متن چینی.
 * خروجی:
 *  • «ai» = صدای هوش مصنوعی سرور پخش شد
 *  • «browser» = صدای چینی مرورگر پخش شد (سرور در دسترس نبود)
 *  • «none» = هیچ صدایی قابل پخش نبود (مثلاً مرورگر صدای چینی ندارد)
 * همیشه resolve می‌شود — خطاها بی‌صدا به fallback می‌روند.
 */
export async function speakChinese(text: string, opts: SpeakOptions = {}): Promise<SpeakSource> {
  const clean = text.trim()
  if (!clean) return 'none'
  stopSpeak()

  const speed = Math.min(2, Math.max(0.5, opts.speed ?? 0.8))
  const onEnd = () => opts.onEnd?.()

  // ۱) صدای هوش مصنوعی از سرور
  try {
    const key = `${clean}|${speed.toFixed(2)}`
    let url = blobCache.get(key)
    if (!url) {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: clean, speed }),
      })
      if (!res.ok) throw new Error(`tts ${res.status}`)
      const blob = await res.blob()
      if (!blob.size) throw new Error('empty audio')
      url = URL.createObjectURL(blob)
      cachePut(key, url)
    }
    const audio = new Audio(url)
    currentAudio = audio
    currentUrl = url
    audio.onended = onEnd
    audio.onerror = onEnd
    await audio.play()
    return 'ai'
  } catch {
    // ۲) جایگزین: صدای چینی مرورگر — فقط اگر واقعاً صدای zh نصب باشد
    currentAudio = null
    currentUrl = null
    if (!hasChineseVoice()) {
      onEnd()
      return 'none'
    }
    try {
      const u = new SpeechSynthesisUtterance(clean)
      u.lang = 'zh-CN'
      u.rate = speed
      u.onend = onEnd
      u.onerror = onEnd
      window.speechSynthesis.speak(u)
      return 'browser'
    } catch {
      onEnd()
      return 'none'
    }
  }
}
