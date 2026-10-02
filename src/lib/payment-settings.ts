// ---------------------------------------------------------------------------
// 💳 تنظیمات «پرداخت دستی کارت بانکی» (فاز ۵۹)
//
// تنها منبع حقیقت اطلاعات کارتی که مشتری می‌بیند — همان الگوی SiteSetting
// کلید-مقدارِ JSON که sessionDiscountTiers و paymentsWallet قدیمی دارند.
// اصول:
//  • شمارهٔ کارت هرگز در کد هارد‌کد نمی‌شود؛ ادمین از پنل وارد/ویرایش می‌کند
//  • هر مقدار ورودی sanitize می‌شود (طول/نویسه‌ها) — قبل از ذخیره و بعد از خواندن
//  • کش کوتاه ۵ ثانیه‌ای مثل بقیهٔ تنظیمات؛ ذخیره، کش را بلافاصله تازه می‌کند
//  • «آمادهٔ پرداخت» = فعال + شمارهٔ کارت با حداقل ۱۲ رقم — fail-closed
// ---------------------------------------------------------------------------

import { db } from '@/lib/db'

export const BANK_CARD_SETTING_KEY = 'bankCardPayment'

export interface BankCardSettings {
  enabled: boolean
  cardNumber: string // همان‌طور که ادمین تایپ می‌کند (ارقام + فاصله) — بدون تغییر ذخیره می‌شود
  cardHolder: string
  bankName: string
  instructions: string // دستورالعمل اختیاری نمایش‌داده‌شده به مشتری
  updatedAt?: string
}

const gt = globalThis as unknown as {
  __ctBankCardCache?: { at: number; value: BankCardSettings }
}

export const EMPTY_BANK_CARD: BankCardSettings = {
  enabled: false,
  cardNumber: '',
  cardHolder: '',
  bankName: '',
  instructions: '',
}

/** پاک‌سازی و اعتبارسنجی هر فیلد — خروجی همیشه امن است */
export function sanitizeBankCardSettings(raw: unknown): BankCardSettings | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>

  const cardNumber = typeof r.cardNumber === 'string' ? r.cardNumber.replace(/[^\d ]/g, '').trim().slice(0, 34) : ''
  const digits = cardNumber.replace(/ /g, '')
  // شمارهٔ کارت باید فقط رقم/فاصله باشد و حداقل ۱۲ رقم داشته باشد (SAN واقعی)
  if (digits.length > 0 && (digits.length < 12 || digits.length > 23 || !/^\d+$/.test(digits))) return null
  if (cardNumber.length > 0 && digits.length < 12) return null

  const cleanText = (v: unknown, max: number): string =>
    typeof v === 'string' ? v.replace(/[\u0000-\u001F<>]/g, '').trim().slice(0, max) : ''

  const enabled = r.enabled === true
  const out: BankCardSettings = {
    enabled,
    cardNumber,
    cardHolder: cleanText(r.cardHolder, 80),
    bankName: cleanText(r.bankName, 80),
    instructions: cleanText(r.instructions, 500),
  }
  return out
}

/** خواندن تازه از DB (کش ۵ ثانیه‌ای) */
export async function refreshBankCardSettings(): Promise<void> {
  const cached = gt.__ctBankCardCache
  if (cached && Date.now() - cached.at < 5_000) return
  let value = EMPTY_BANK_CARD
  try {
    const row = await db.siteSetting.findUnique({ where: { key: BANK_CARD_SETTING_KEY } })
    if (row) {
      try {
        const parsed = sanitizeBankCardSettings(JSON.parse(row.value))
        if (parsed) {
          value = parsed
          try {
            const meta = JSON.parse(row.value) as { updatedAt?: string }
            if (meta && typeof meta.updatedAt === 'string') value.updatedAt = meta.updatedAt
          } catch {}
        }
      } catch {}
    }
  } catch {
    // DB در دسترس نیست → آخرین/پیش‌فرض امن حفظ می‌شود
  }
  gt.__ctBankCardCache = { at: Date.now(), value }
}

export async function getBankCardSettings(): Promise<BankCardSettings> {
  await refreshBankCardSettings()
  return gt.__ctBankCardCache?.value ?? EMPTY_BANK_CARD
}

export async function saveBankCardSettings(input: BankCardSettings): Promise<BankCardSettings> {
  const clean = sanitizeBankCardSettings(input)
  if (!clean) throw new Error('Invalid bank card settings')
  const value: BankCardSettings = { ...clean, updatedAt: new Date().toISOString() }
  await db.siteSetting.upsert({
    where: { key: BANK_CARD_SETTING_KEY },
    update: { value: JSON.stringify(value) },
    create: { key: BANK_CARD_SETTING_KEY, value: JSON.stringify(value) },
  })
  gt.__ctBankCardCache = { at: Date.now(), value }
  return value
}

/** آیا جریانِ پرداختِ دستی آماده است؟ (fail-closed — مثل پیکربندی کیف‌پول قبلی) */
export function isBankCardReady(s: BankCardSettings): boolean {
  const digits = (s.cardNumber || '').replace(/ /g, '')
  return s.enabled === true && digits.length >= 12
}

/** نمای عمومی برای صفحهٔ پرداخت مشتری — فقط وقتی فعال است چیزی برمی‌گرداند */
export function publicBankCardView(s: BankCardSettings) {
  if (!isBankCardReady(s)) {
    return { enabled: false, cardNumber: '', cardHolder: '', bankName: '', instructions: '' }
  }
  return {
    enabled: true,
    cardNumber: s.cardNumber,
    cardHolder: s.cardHolder,
    bankName: s.bankName,
    instructions: s.instructions,
  }
}

/**
 * نمایش شمارهٔ کارت در گروه‌های ۴تایی فقط برای خوانایی — مقدار ذخیره‌شده
 * هرگز تغییر نمی‌کند؛ این تابع صرفاً display است.
 */
export function formatCardNumberForDisplay(raw: string): string {
  const digits = (raw || '').replace(/[^\d]/g, '')
  if (!digits) return ''
  return digits.replace(/(.{4})/g, '$1 ').trim()
}
