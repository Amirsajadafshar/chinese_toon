// ---------------------------------------------------------------------------
// 🎯 ابزار آدرس ترون — تنها منبع حقیقت برای ساخت/اعتبارسنجی آدرس‌ها
//
// چرا این ماژول جدا است؟ چون اعتبارسنجی آدرس باید «کامل» باشد نه فقط regex:
//   ۱) decode پایه۵۸ با بررسی چک‌سام (Base58Check = base58 + sha256d چهار بایت اول)
//   ۲) payload دقیقاً ۲۱ بایت
//   ۳) بایت اول دقیقاً 0x41 (پریفیکس آدرس ترون)
// هر آدرسی که این مسیر را پاس نکند رد می‌شود — حتی اگر شکلش شبیه آدرس ترون باشد.
//
// این ماژول عمداً هیچ وابستگی‌ای به config یا دیتابیس ندارد تا هم config.ts و
// هم hd-address.ts بتوانند بدون import چرخه‌ای از آن استفاده کنند.
// ---------------------------------------------------------------------------

import { sha256 } from '@noble/hashes/sha2.js'
import { keccak_256 } from '@noble/hashes/sha3.js'
import { createBase58check } from '@scure/base'
import { secp256k1 } from '@noble/curves/secp256k1.js'

const b58check = createBase58check(sha256)

/** طول استاندارد آدرس ترون در Base58 (۲۱ بایت payload + ۴ بایت چک‌سام) */
export const TRON_ADDRESS_LENGTH = 34

/**
 * decode امن آدرس ترون:
 *  • طول ۳۴ کاراکتر و شروع با T
 *  • Base58Check معتبر (چک‌سام sha256d — در صورت خرابی decode خطا می‌دهد)
 *  • payload دقیقاً ۲۱ بایت و بایت اول 0x41
 * در صورت هر مشکلی null برمی‌گرداند (هرگز throw نمی‌کند).
 */
export function decodeTronAddress(addr: unknown): Uint8Array | null {
  if (typeof addr !== 'string') return null
  const s = addr.trim()
  if (s.length !== TRON_ADDRESS_LENGTH || !s.startsWith('T')) return null
  try {
    const payload = b58check.decode(s) // چک‌سام را کامل تأیید می‌کند
    if (payload.length !== 21 || payload[0] !== 0x41) return null
    return payload
  } catch {
    return null
  }
}

/** اعتبارسنجی کامل آدرس ترون (چک‌سام + ۲۱ بایت + پریفیکس 0x41) */
export function isValidTronAddress(addr: unknown): boolean {
  return decodeTronAddress(addr) !== null
}

const HEX_RE = /^[0-9a-f]+$/

/**
 * تبدیل آدرس hex به Base58Check ترون — سخت‌گیرانه:
 *  • ورودی باید hex خالص باشد
 *  • بعد از نرمال‌سازی باید دقیقاً ۴۲ کاراکتر (۲۱ بایت) باشد
 *  • باید با «41» شروع شود (پریفیکس آدرس ترون) — اگر نیش‌گرید پدینگ‌شدهٔ
 *    ۶۴ کاراکتری بفرستد، ۲۱ بایت آخر بریده می‌شود و پریفیکس دوباره بررسی می‌شود
 * در هر ایرادی throw می‌کند (تماس‌دهنده موظف است خطا را «دادهٔ مشکوک» بداند).
 */
export function hexToTronAddress(hex: string): string {
  if (typeof hex !== 'string') throw new Error('Address hex must be a string')
  let clean = hex.toLowerCase().replace(/^0x/, '')
  if (clean.length > 42) clean = clean.slice(-42) // پدینگ ۶۴ کاراکتری نیش‌گرید
  if (clean.length !== 42) throw new Error(`Invalid TRON hex address length (${clean.length})`)
  if (!HEX_RE.test(clean)) throw new Error('TRON hex address has non-hex characters')
  if (!clean.startsWith('41')) throw new Error('TRON hex address must start with 0x41 prefix')
  const bytes = new Uint8Array(21)
  for (let i = 0; i < 21; i++) bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  return b58check.encode(bytes)
}

/**
 * topic لاگ ABI (۳۲ بایتِ چپ‌پد‌شده) → آدرس ترون.
 * ۲۴ کاراکتر اول باید صفر باشد (پدینگ آدرس ۲۰بایتی در uint256)؛
 * ۲۰ بایت آخر با پریفیکس 0x41 تبدیل به آدرس می‌شود.
 */
export function topicToTronAddress(topic: string): string {
  if (typeof topic !== 'string') throw new Error('Topic must be a string')
  const clean = topic.toLowerCase().replace(/^0x/, '')
  if (clean.length !== 64 || !HEX_RE.test(clean)) throw new Error('Invalid ABI topic (expected 32-byte hex)')
  if (clean.slice(0, 24) !== '0'.repeat(24)) throw new Error('ABI topic is not a zero-padded address')
  return hexToTronAddress('41' + clean.slice(-40))
}

/**
 * آدرس قرارداد داخل «لاگ تراکنش» ترون‌گرید → آدرس ترون با نرمال‌سازی کامل.
 *
 * فرمت‌های دیده‌شده در پاسخ واقعی TronGrid (هر سه باید پذیرفته شوند):
 *   • ۴۰ کاراکتر hex «بدون» پیشوند 41 — فرمت معمول (مثلاً a614f803…ded13c)
 *   • ۴۲ کاراکتر «با» پیشوند 41
 *   • ۶۴ کاراکتر پدینگ‌شده که ۲۱ بایت آخر معتبر است
 * بعد از نرمال‌سازی، همان اعتبارسنجی سخت‌گیرانه (۰x41 + طول) اجرا می‌شود.
 */
export function logAddressToTronAddress(hex: string): string {
  if (typeof hex !== 'string') throw new Error('Log address must be a string')
  let clean = hex.toLowerCase().replace(/^0x/, '')
  if (!HEX_RE.test(clean)) throw new Error('Log address has non-hex characters')
  if (clean.length === 40) clean = '41' + clean // بدون پیشوند — فرمت رایج TronGrid
  else if (clean.length === 64) clean = clean.slice(-42) // پدینگ‌شده — ۲۱ بایت آخر
  if (clean.length !== 42) throw new Error(`Unsupported log-address length (${clean.length})`)
  return hexToTronAddress(clean) // پریفیکس 41 + طول کامل اینجا دوباره تأیید می‌شود
}

/**
 * کلید عمومی فشردهٔ ۳۳بایتی → آدرس TRON.
 * ساختار: base58check(0x41 ‖ keccak256(کلیدعمومی‌فشرده‌نشده)[12:])
 */
export function publicKeyToTronAddress(compressedPub: Uint8Array): string {
  if (!(compressedPub instanceof Uint8Array) || compressedPub.length !== 33) {
    throw new Error('Expected 33-byte compressed public key')
  }
  const point = secp256k1.Point.fromBytes(compressedPub)
  const uncompressed = point.toBytes(false) // ۶۵ بایت با پیشوند 0x04
  const hash = keccak_256(uncompressed.slice(1)) // بدون پیشوند — ۳۲ بایت
  const payload = new Uint8Array(21)
  payload[0] = 0x41
  payload.set(hash.slice(12), 1) // ۲۰ بایت آخر هش
  const addr = b58check.encode(payload)
  if (!isValidTronAddress(addr)) throw new Error('Derived an invalid TRON address')
  return addr
}
