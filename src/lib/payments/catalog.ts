// ---------------------------------------------------------------------------
// 🎯 کاتالوگ قیمت «نوع کلاس + سطح» — تنها پل بین فرم ثبت‌نام و محصولات پرداخت
//
// فاز ۴۲: منبع حقیقت = جدول CourseClass (مدیریت کامل از پنل ادمین). ماتریس
// (classType × level) دیگر جدول هاردکد نیست — از فیلدهای ساخت‌یافتهٔ کلاس‌ها
// (classType + registerLevels + status + packagePrice) مشتق می‌شود؛ یعنی
// ادمین با اضافه/غیرفعال‌کردن هر کلاس، ماتریس را بدون کد عوض می‌کند.
//
// اصول ثابت (فاز ۴۱ → ۴۲):
//  ۱) قطعی: هر ترکیب همیشه همان کلاس/همان قیمت را می‌دهد (کمترین sortOrder،
//     مساوی = عنوان الفبایی) — نه حدس، نه تصادف، نه تطبیق مبهم.
//  ۲) fail-closed: ترکیبِ بدون کلاس فعال = available:false — بدون قیمت قلابی.
//  ۳) «Either/both» به قیمت واحد تبدیل نمی‌شود (CHOOSE_TYPE).
//  ۴) قیمت نمایش کاتالوگ و مبلغ سفارش هر دو از packagePrice می‌آیند —
//     هیچ قیمت دومی وجود ندارد.
// ---------------------------------------------------------------------------

import { siteContent } from '@/content/site-content'
import {
  getActiveProducts,
  resolveCombo,
  matchProductByClassTitle,
  listPublicClasses,
  type ComboResolution,
  type ComboUnavailableReason,
} from '@/lib/classes/store'
import type { PaymentProduct } from './config'

export type RegisterLevelKey =
  | 'complete-beginner'
  | 'beginner'
  | 'elementary'
  | 'intermediate'
  | 'advanced'
  | 'not-sure'

export type RegisterClassTypeKey = 'group' | 'private' | 'both'

export type { ComboResolution, ComboUnavailableReason }
export { resolveCombo, matchProductByClassTitle }

// ---------------------------------------------------------------------------
// 🧾 پاسخ کاتالوگ برای کلاینت — ماتریس کامل (classType × level) + کلاس‌ها
//    کلاینت فقط «نمایش» می‌کند؛ هیچ قیمتی از کلاینت پذیرفته نمی‌شود.
// ---------------------------------------------------------------------------

export interface CatalogCombo {
  classType: RegisterClassTypeKey
  level: RegisterLevelKey
  available: boolean
  reason?: ComboUnavailableReason
  productId?: string
  productLabel?: string
  classTitle?: string
  amountUsd?: number
  amountDisplay?: string // رشتهٔ نمایشی دو اعشار — از همان amountUsd سرچشمه می‌گیرد
}

export interface CatalogClass {
  title: string
  slug: string // 🆕 لینک پایدار جزئیات — ‎#/classes/<slug>
  type: string
  level: string
  category: string
  productId: string | null
  productLabel: string | null
  amountUsd: number | null
  amountDisplay: string | null
}

export interface PaymentCatalog {
  currency: string
  levels: { key: string; label: string }[]
  classTypes: { key: string; label: string }[]
  combos: CatalogCombo[]
  classes: CatalogClass[]
}

/** میکرو → رشتهٔ نمایشی (همان قرارداد نمایش بقیهٔ سیستم) */
function amountDisplayOf(amountUsd: number): string {
  return amountUsd.toFixed(2)
}

/**
 * ساخت کاتالوگ از منبع حقیقت (DB؛ fallback فایل فقط در خطای خواندن).
 * کش کوتاه‌مدت: داده از store کش می‌شود و با هر نوشتن ادمین نسخه بالا می‌رود —
 * پس تغییر پنل بلافاصله (حداکثر با TTL ۱۰ ثانیه) در کاتالوگ دیده می‌شود.
 */
const catCache = globalThis as unknown as { __ctCatalogCache?: { at: number; data: PaymentCatalog } }
const CATALOG_CACHE_MS = 10_000

export async function buildPaymentCatalog(): Promise<PaymentCatalog> {
  const cached = catCache.__ctCatalogCache
  if (cached && Date.now() - cached.at < CATALOG_CACHE_MS) return cached.data

  const reg = siteContent.register
  const levels = reg.levels.map((l) => ({ key: l.key, label: l.label }))
  const classTypes = reg.classTypes.map((t) => ({ key: t.key, label: t.label }))

  const [products, publicClasses] = await Promise.all([getActiveProducts(), listPublicClasses()])
  const productById = (id: string | null): PaymentProduct | null =>
    id ? (products.find((p) => p.id === id) ?? null) : null

  const combos: CatalogCombo[] = []
  for (const ct of reg.classTypes) {
    for (const lv of reg.levels) {
      const res = await resolveCombo(ct.key, lv.key)
      if (res.available && res.product) {
        combos.push({
          classType: ct.key as RegisterClassTypeKey,
          level: lv.key as RegisterLevelKey,
          available: true,
          productId: res.product.id,
          productLabel: res.product.label,
          classTitle: res.product.classTitle,
          amountUsd: res.product.amountUsd,
          amountDisplay: amountDisplayOf(res.product.amountUsd),
        })
      } else {
        combos.push({
          classType: ct.key as RegisterClassTypeKey,
          level: lv.key as RegisterLevelKey,
          available: false,
          reason: res.reason ?? 'UNAVAILABLE',
        })
      }
    }
  }

  // کلاس‌های عمومی + محصول متناظر (تطبیق قطعی عنوان) — productIdِ کلاسِ
  // غیرقابل‌خرید (full/inactive) عمداً null می‌ماند تا پرداخت خودکار مسدود شود
  const classes: CatalogClass[] = publicClasses.map((c) => {
    const product = c.productId ? productById(c.productId) : null
    return {
      title: c.title,
      slug: c.slug,
      type: c.type,
      level: c.level,
      category: c.category,
      productId: product?.id ?? null,
      productLabel: product?.label ?? null,
      amountUsd: product?.amountUsd ?? null,
      amountDisplay: product ? amountDisplayOf(product.amountUsd) : null,
    }
  })

  const data: PaymentCatalog = { currency: 'USD', levels, classTypes, combos, classes }
  catCache.__ctCatalogCache = { at: Date.now(), data }
  return data
}

// ---------------------------------------------------------------------------
// ⚠️ گارد ناهمسانی قیمت — قیمتِ نمایشی (price/priceNote) هر کلاسِ فعال باید با
//   packagePrice (مبلغ مرجع سفارش) هم‌خوان باشد. این‌ها در پنل ادمین فیلدهای
//   جدا هستند؛ اگر ادمین فقط یکی را عوض کند، همین‌جا در لاگ سرور دیده می‌شود.
//   قیمتِ نهایی سفارش همیشه packagePrice است — price/priceNote فقط نمایش‌اند.
//   (هم‌زمان سازگاری فایل محتوا هم ممیزی می‌شود تا fallback ناهم‌قیمت نماند.)
// ---------------------------------------------------------------------------

function dollarAmountIn(s: string): number | null {
  const m = s.match(/\$\s?([0-9]+(?:\.[0-9]+)?)/)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) && n > 0 ? n : null
}

export function auditClassPriceConsistency(classes: { title: string; price: string; priceNote: string; productId: string | null; amountUsd: number | null }[]): void {
  try {
    for (const c of classes) {
      if (!c.productId || c.amountUsd === null) {
        console.warn(`[catalog] class "${c.title}" has no active payment product — it cannot be paid online`)
        continue
      }
      const noteAmount = dollarAmountIn(c.priceNote)
      if (noteAmount !== null && Math.abs(noteAmount - c.amountUsd) > 0.005) {
        console.warn(
          `[catalog] price mismatch for "${c.title}": priceNote shows $${noteAmount} but authoritative packagePrice is $${c.amountUsd} (product ${c.productId}) — packagePrice wins`
        )
      }
    }
  } catch {
    // ممیزی نمایشی هرگز نباید مسیر پرداخت را بشکند
  }
}

// ممیزی یک‌بار برای هر پروسه + پس از هر تغییر نسخهٔ کلاس‌ها
const auditFlag = globalThis as unknown as { __ctCatalogAuditVersion?: number }
export async function auditOncePerClassesVersion(): Promise<void> {
  const g = globalThis as unknown as { __ctClassesVersion?: number }
  const v = g.__ctClassesVersion ?? 0
  if (auditFlag.__ctCatalogAuditVersion === v) return
  auditFlag.__ctCatalogAuditVersion = v
  try {
    const publicClasses = await listPublicClasses()
    auditClassPriceConsistency(
      publicClasses.map((c) => ({
        title: c.title,
        price: c.price,
        priceNote: c.priceNote,
        productId: c.productId,
        amountUsd: c.amountUsd,
      }))
    )
  } catch {
    // هرگز مسیر پرداخت را نمی‌شکند
  }
}
