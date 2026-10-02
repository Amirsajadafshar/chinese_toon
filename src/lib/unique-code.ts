// ---------------------------------------------------------------------------
// 🆔 کد یکتای پایدار دانش‌پذیر (فاز ۶۰ — بند ۱۰ و ۱۱ تسک پایداری)
//
// قواعد:
//  • فقط یک‌بار هنگام ساخت حساب ساخته می‌شود و برای همیشه در DB می‌ماند
//  • هرگز با restart/redeploy/لاگین دوباره تولید نمی‌شود — DB منبع حقیقت است
//  • قالب CT-XXXXXX از الفبای بدون ابهام (بدون 0/O/1/I/L) — قابل خواندن به مشتری
//  • یکتایی با قید @unique دیتابیس تضمین می‌شود؛ تصادم → تلاش دوباره (حداکثر ۸)
// ---------------------------------------------------------------------------

import { randomInt } from 'crypto'
import { db } from '@/lib/db'

// بدون 0/O و 1/I/L — هیچ جفتی شبیه هم نیست
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
const CODE_LENGTH = 6
export const UNIQUE_CODE_RE = /^CT-[2-9A-HJ-NP-Z]{6}$/

export function generateUniqueCode(): string {
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) code += ALPHABET[randomInt(ALPHABET.length)]
  return `CT-${code}`
}

/** حداقل سطح دسترسی لازم — با کلاینت تراکنش ($transaction) هم سازگار است */
interface UserWriter {
  user: {
    findUnique: (args: unknown) => Promise<{ uniqueCode: string | null } | null>
    update: (args: unknown) => Promise<{ uniqueCode: string | null }>
  }
}

/**
 * اختصاص کد یکتا به کاربر — فقط اگر کد ندارد (هرگز کد موجود را عوض نمی‌کند).
 * خروجی: کد نهایی ذخیره‌شده. شکست پس از ۸ تصادم خطا می‌دهد (عملاً ناممکن).
 * ♻️ فاز ۶۱ — پارامتر اختیاری client: داخل $transaction ثبت‌نام اتمی می‌شود
 * (ساخت حساب + کد یکتا یا هر دو، یا هیچ‌کدام — نصفه‌کاره ممکن نیست).
 */
export async function assignUniqueCode(userId: string, client: UserWriter = db as unknown as UserWriter): Promise<string> {
  const existing = await client.user.findUnique({ where: { id: userId }, select: { uniqueCode: true } })
  if (existing?.uniqueCode) return existing.uniqueCode // 🛡️ هرگز بازتولید نمی‌شود

  let lastError: unknown = null
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateUniqueCode()
    try {
      const updated = await client.user.update({
        where: { id: userId },
        data: { uniqueCode: code },
        select: { uniqueCode: true },
      })
      if (updated.uniqueCode) return updated.uniqueCode
    } catch (e) {
      lastError = e
      // P2002 = تصادم کد یکتا (خیلی نادر) — تلاش دوباره با کد جدید
      const ec = (e as { code?: string })?.code
      if (ec !== 'P2002') {
        // خطای غیر از تصادم — شاید کاربر هم‌زمان کد گرفته باشد؛ دوباره می‌خوانیم
        const current = await client.user
          .findUnique({ where: { id: userId }, select: { uniqueCode: true } })
          .catch(() => null)
        if (current?.uniqueCode) return current.uniqueCode
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Could not assign a unique code')
}
