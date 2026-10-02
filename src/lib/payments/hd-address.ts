// ---------------------------------------------------------------------------
// 🎯 مشتق‌سازی آدرس‌های یکتای TRON از xpub (حالت HD — توصیه‌شده)
//
// چطور امن است؟
//  • سرور فقط xpub (کلید «عمومی» توسعه‌یافته) را دارد → هرگز نمی‌تواند خرج کند.
//  • seed/عبارت بازیابی فقط روی کاغذ/کیف‌پول آفلاین مالک است و هرگز وارد سرور نمی‌شود.
//  • هر سفارش آدرس اختصاصی خودش را می‌گیرد:
//      xpub در سطح حساب m/44'/195'/0' است و آدرس نهایی m/44'/195'/0'/0/<index>
//      (195 = شمارهٔ کویین‌تایپ ترون در BIP44) → اتصال تراکنش به سفارش قطعی است.
//  • این ماژول فقط «مشتق‌سازی عمومی» انجام می‌دهد — هیچ مسیری به کلید خصوصی ندارد.
//  • خرج‌کردن موجودی‌ها بعداً به‌صورت دستی/آفلاین با کلید خصوصی مالک انجام
//    می‌شود (اسکریپت scripts/payments-keygen-offline.mjs راهنمای آن است).
// ---------------------------------------------------------------------------

import { HDKey } from '@scure/bip32'
import { publicKeyToTronAddress, isValidTronAddress } from './tron-address'

/** مسیر دقیقی که xpub باید در آن باشد — به مالک در مستندات گفته می‌شود */
export const HD_PATH_LABEL = "m/44'/195'/0'"

/**
 * آدرس اختصاصی ایندکس i از xpub حساب (m/44'/195'/0').
 * مشتق نسبی m/0/<i> از سطح حساب = m/44'/195'/0'/0/<i> — همان مسیر استاندارد دریافت BIP44 ترون.
 */
export function deriveTronAddressFromXpub(xpub: string, index: number): string {
  if (typeof xpub !== 'string' || !xpub.startsWith('xpub')) throw new Error('Invalid xpub (must start with xpub)')
  if (!Number.isInteger(index) || index < 0 || index > 1_000_000) throw new Error('Invalid HD index')
  const account = HDKey.fromExtendedKey(xpub)
  if (!account.publicKey) throw new Error('Invalid xpub (no public key)')
  const child = account.derive(`m/0/${index}`) // زنجیرهٔ خارجی 0 + ایندکس i
  if (!child.publicKey || !(child.publicKey instanceof Uint8Array)) throw new Error('Failed to derive child public key')
  const addr = publicKeyToTronAddress(child.publicKey)
  if (!isValidTronAddress(addr)) throw new Error('Derived address failed validation')
  return addr
}

/**
 * اعتبارسنجی کامل xpub قبل از استفاده:
 *  • باید با xpub شروع شود (xprv/seed رد می‌شود)
 *  • باید بتواند چند آدرس اول (ایندکس ۰ و ۱) را واقعاً مشتق کند — خرابیِ
 *    فرمت/نسخه/مسیر همین‌جا لو می‌رود، نه وسط پرداخت واقعی.
 */
export function validateXpub(xpub: string): { ok: boolean; sampleAddress?: string; error?: string } {
  try {
    if (typeof xpub !== 'string' || !xpub.startsWith('xpub')) {
      return { ok: false, error: "must start with 'xpub'" }
    }
    const sample = deriveTronAddressFromXpub(xpub, 0)
    deriveTronAddressFromXpub(xpub, 1) // مقاوم‌سازی: مشتق دوم هم باید سالم باشد
    return { ok: true, sampleAddress: sample }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown' }
  }
}
