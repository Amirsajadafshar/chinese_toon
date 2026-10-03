// ---------------------------------------------------------------------------
// 💰 موتور قیمت‌گذاری مقتدر (فاز ۴۷)
//
// زنجیرهٔ قیمت در کل سایت — فقط همین ماژول محاسبه می‌کند:
//   base   = pricePerSession × packageSessions     (بستهٔ پایه — خودکار)
//   tier%  = تخفیف خودکار بسته بر اساس تعداد جلسه (قابل‌تنظیم در پنل)
//   code   = تخفیف کد (percent | fixed) — فقط با اعتبارسنجی کامل سمت سرور
//   final  = max(0, base − tierAmount − codeAmount)  → مبلغ مرجع سفارش
//
// قواعد سخت:
//  • هیچ عددی از مرورگر پذیرفته نمی‌شود — کلاینت فقط productId و «کدِ» تخفیف می‌فرستد
//  • سفارش‌های تاریخی اسنپ‌شات خودشان را دارند (expectedMicro) و هرگز بازمحاسبه نمی‌شوند
//  • پیکربندی پله‌های تخفیف بسته در SiteSetting کلید sessionDiscountTiers است
//    (JSON آرایهٔ {min,max,percent}) — ادمین از تب Discounts عوض می‌کند
// ---------------------------------------------------------------------------

import { db } from '@/lib/db'
import type { CourseClassRow } from '@/lib/classes/store'
import { round2 } from '@/lib/money'

export const TIERS_SETTING_KEY = 'sessionDiscountTiers'

export interface SessionTier {
  min: number // از این تعداد جلسه (شامل)
  max: number | null // تا این تعداد (شامل) — null = بدون سقف
  percent: number // 0–100
}

const gt = globalThis as unknown as {
  __ctTiersCache?: { at: number; tiers: SessionTier[] }
}

/** پله‌های پیش‌فرض — همان نمونهٔ سفارش مالک؛ از پنل قابل تغییر است */
export const DEFAULT_TIERS: SessionTier[] = [
  { min: 4, max: 7, percent: 5 },
  { min: 8, max: 11, percent: 10 },
  { min: 12, max: null, percent: 15 },
]

export function sanitizeTiers(raw: unknown): SessionTier[] | null {
  if (!Array.isArray(raw)) return null
  const out: SessionTier[] = []
  for (const t of raw) {
    const min = Number((t as SessionTier)?.min)
    const percent = Number((t as SessionTier)?.percent)
    const maxRaw = (t as SessionTier)?.max as number | string | null | undefined
    const max = maxRaw === null || maxRaw === undefined || maxRaw === '' ? null : Number(maxRaw)
    if (
      !Number.isInteger(min) || min < 1 ||
      !Number.isFinite(percent) || percent < 0 || percent > 100 ||
      (max !== null && (!Number.isInteger(max) || max < min))
    ) {
      return null
    }
    out.push({ min, max: max === null ? null : Math.floor(max), percent: Math.round(percent * 100) / 100 })
  }
  return out
}

/** خواندن تازه از DB (با کش ۱۰ثانیه‌ای روی globalThis — مثل بقیهٔ تنظیمات) */
export async function refreshTiers(): Promise<void> {
  const cached = gt.__ctTiersCache
  if (cached && Date.now() - cached.at < 10_000) return
  let tiers = DEFAULT_TIERS
  try {
    const row = await db.siteSetting.findUnique({ where: { key: TIERS_SETTING_KEY } })
    if (row) {
      const parsed = sanitizeTiers(JSON.parse(row.value))
      if (parsed) tiers = parsed
    }
  } catch {
    // DB در دسترس نیست → آخرین/پیش‌فرض معتبر حفظ می‌شود
  }
  gt.__ctTiersCache = { at: Date.now(), tiers }
}

/** خواندن همگام از کش — فقط بعد از refreshTiers مقدار تازه است */
export function getTiers(): SessionTier[] {
  return gt.__ctTiersCache?.tiers ?? DEFAULT_TIERS
}

export async function getTiersAsync(): Promise<SessionTier[]> {
  await refreshTiers()
  return getTiers()
}

export async function saveTiers(tiers: SessionTier[]): Promise<void> {
  const value = JSON.stringify(tiers)
  await db.siteSetting.upsert({
    where: { key: TIERS_SETTING_KEY },
    update: { value },
    create: { key: TIERS_SETTING_KEY, value },
  })
  gt.__ctTiersCache = { at: Date.now(), tiers }
}

/** درصد پلهٔ متناظر با تعداد جلسه — قطعی: اولین پلهٔ تطبیقی */
export function tierPercentFor(sessions: number, tiers: SessionTier[]): number {
  for (const t of tiers) {
    if (sessions >= t.min && (t.max === null || sessions <= t.max)) return t.percent
  }
  return 0
}

// ---------------------------------------------------------------------------
// اعتبارسنجی کد تخفیف — همهٔ قواعد سمت سرور
// ---------------------------------------------------------------------------

export interface DiscountRow {
  id: string
  code: string
  type: string // percent | fixed
  value: number
  active: boolean
  startsAt: Date | null
  endsAt: Date | null
  classIds: string
  classTypes: string
  levels: string
  minSessions: number
  maxUses: number | null
  perCustomer: number
}

function parseJsonArray(s: string): string[] {
  try {
    const v = JSON.parse(s || '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export type DiscountRejection =
  | 'NOT_FOUND'
  | 'INACTIVE'
  | 'NOT_STARTED'
  | 'EXPIRED'
  | 'MAX_USES'
  | 'PER_CUSTOMER'
  | 'MIN_SESSIONS'
  | 'CLASS_SCOPE'
  | 'TYPE_SCOPE'
  | 'LEVEL_SCOPE'
  | 'ZERO_FINAL'

export async function validateDiscount(
  discount: DiscountRow,
  ctx: { sessions: number; classId: string; classType: string; registerLevels: string[]; email: string }
): Promise<DiscountRejection | null> {
  const now = new Date()
  if (!discount.active) return 'INACTIVE'
  if (discount.startsAt && discount.startsAt > now) return 'NOT_STARTED'
  if (discount.endsAt && discount.endsAt < now) return 'EXPIRED'
  if (ctx.sessions < discount.minSessions) return 'MIN_SESSIONS'

  const ids = parseJsonArray(discount.classIds)
  if (ids.length > 0 && !ids.includes(ctx.classId)) return 'CLASS_SCOPE'
  const types = parseJsonArray(discount.classTypes)
  if (types.length > 0 && !types.includes(ctx.classType)) return 'TYPE_SCOPE'
  const levels = parseJsonArray(discount.levels)
  if (
    levels.length > 0 &&
    !ctx.registerLevels.some((lv) => levels.includes(lv) || (lv === 'all' && levels.includes('all')))
  ) {
    return 'LEVEL_SCOPE'
  }

  const usedTotal = await db.discountRedemption.count({ where: { discountId: discount.id } })
  if (discount.maxUses !== null && usedTotal >= discount.maxUses) return 'MAX_USES'
  if (ctx.email) {
    const usedBy = await db.discountRedemption.count({
      where: { discountId: discount.id, userEmail: ctx.email.toLowerCase() },
    })
    if (usedBy >= Math.max(1, discount.perCustomer)) return 'PER_CUSTOMER'
  }
  return null
}

// ---------------------------------------------------------------------------
// محاسبهٔ نهایی — ورودی فقط ردیف کلاس از DB + کد (رشتهٔ خام)
// ---------------------------------------------------------------------------

export interface PriceBreakdown {
  pricePerSession: number
  sessions: number
  base: number // pricePerSession × sessions
  tierPercent: number
  tierDiscount: number
  code: string | null
  codeType: 'percent' | 'fixed' | null
  codeValue: number | null
  codeDiscount: number
  final: number
  discountId: string | null
}

export interface ClassPricingSource {
  id: string
  classType: string
  registerLevels: string // JSON
  pricePerSession: number
  packageSessions: number
}

export async function calculatePrice(
  cls: ClassPricingSource,
  opts: { code?: string | null; email?: string | null } = {}
): Promise<{ breakdown: PriceBreakdown; rejection: DiscountRejection | null; discount: DiscountRow | null }> {
  await refreshTiers()
  const sessions = Math.max(1, Math.floor(cls.packageSessions || 1))
  const perSession = Math.round((cls.pricePerSession || 0) * 100) / 100
  const base = round2(perSession * sessions)
  const tierPercent = tierPercentFor(sessions, getTiers())
  const tierDiscount = round2((base * tierPercent) / 100)

  let codeDiscount = 0
  let codeType: 'percent' | 'fixed' | null = null
  let codeValue: number | null = null
  let discountRow: DiscountRow | null = null
  let rejection: DiscountRejection | null = null
  const rawCode = (opts.code || '').trim().toUpperCase().slice(0, 40)

  if (rawCode) {
    const found = await db.discount.findUnique({ where: { code: rawCode } })
    // 🗄️ فاز ۵۲ — کد بایگانی‌شده (حذف نرم) برای مشتری «وجود ندارد»؛
    // فقط رکورد و تاریخچهٔ سفارش‌های قبلی سمت ادمین حفظ می‌شود
    if (!found || found.deletedAt) {
      rejection = 'NOT_FOUND'
    } else {
      discountRow = found as unknown as DiscountRow
      rejection = await validateDiscount(discountRow, {
        sessions,
        classId: cls.id,
        classType: cls.classType,
        registerLevels: parseJsonArray(cls.registerLevels),
        email: (opts.email || '').toLowerCase(),
      })
      if (!rejection) {
        codeType = found.type === 'fixed' ? 'fixed' : 'percent'
        codeValue = found.value
        const candidate =
          codeType === 'fixed'
            ? round2(Math.min(found.value, base - tierDiscount)) // ثابت — هرگز منفی نمی‌شود
            : round2((base * found.value) / 100)
        // 🎟️ فاز ۵۸ — کدی که مبلغ نهایی را صفر می‌کند (مثلاً ۱۰۰٪ یا تخفیف ثابت
        // ≥ مبلغ بسته) پذیرفته نمی‌شود: پرداخت USDT هیچ مبلغ صفری ندارد و سفارشِ
        // بی‌مبلغ ساختنی نیست — به‌جای «اعمال و بعداً مبلغ کامل»، همین‌جا رد می‌شود.
        if (round2(base - tierDiscount - candidate) <= 0) {
          rejection = 'ZERO_FINAL'
        } else {
          codeDiscount = candidate
        }
      }
    }
  }

  const final = round2(Math.max(0, base - tierDiscount - codeDiscount))
  return {
    breakdown: {
      pricePerSession: perSession,
      sessions,
      base,
      tierPercent,
      tierDiscount,
      code: rejection ? null : rawCode || null,
      codeType: rejection ? null : codeType,
      codeValue: rejection ? null : codeValue,
      codeDiscount,
      final,
      discountId: rejection ? null : discountRow?.id ?? null,
    },
    rejection,
    discount: rejection ? null : discountRow,
  }
}
