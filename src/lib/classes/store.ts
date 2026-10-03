// ---------------------------------------------------------------------------
// 🎓 فروشگاه کلاس‌ها (CourseClass) — تنها منبع حقیقت کلاس‌ها و قیمت‌ها (فاز ۴۲)
//
// جایگاه معماری:
//  • جدول CourseClass در دیتابیس = منبع حقیقت کلاس‌ها (محتوا + قیمت مرجع)
//  • فایل محتوا فقط در دو حالت به‌کار می‌آید: (۱) رندر فوری اولیهٔ سمت کلاینت
//    و (۲) fallback وضعیتِ «خطای خواندن DB» — تا سایت هرگز خالی نشود.
//  • «محصول پرداخت» مدل جداگانه ندارد — نمای مشتق‌شدهٔ همین کلاس است:
//    PaymentProduct { id: productId, classTitle: title, amountUsd: packagePrice }
//    پس هیچ سیستم قیمت‌گذاری دومی وجود ندارد (قیمت مرجع = packagePrice).
//
// اصول (ادامهٔ فاز ۴۱ — بدون استثنا):
//  ۱) قطعی: برای هر (classType, level) همیشه دقیقاً یک کلاس انتخاب می‌شود —
//     کمترین sortOrder، مساوی = اولین عنوان الفبایی. نه حدس، نه تصادف.
//  ۲) fail-closed: ترکیبِ بدون کلاس فعال = available:false — بدون قیمت قلابی.
//  ۳) قیمت هرگز از مرورگر نمی‌آید؛ سفارش فقط productId می‌فرستد.
//  ۴) سفارش‌های موجود دست‌نخورده: تغییر قیمت/حذف کلاس فقط انتخاب‌های جدید را
//     عوض می‌کند (اسنپ‌شات expectedMicro/productTitle در UsdtOrder فریز است).
// ---------------------------------------------------------------------------

import { siteContent } from '@/content/site-content'
import type { PaymentProduct } from '@/lib/payments/config'
import { getTiers, refreshTiers, tierPercentFor } from '@/lib/pricing'
import { round2 } from '@/lib/money'

// ---------------------------------------------------------------------------
// انواع مشترک
// ---------------------------------------------------------------------------

export const CLASS_STATUSES = ['active', 'inactive', 'draft', 'full', 'archived'] as const
export type ClassStatus = (typeof CLASS_STATUSES)[number]

/** active/full برای نمایش عمومی؛ فقط active قابل خرید است */
export const PUBLIC_STATUSES: ClassStatus[] = ['active', 'full']
export const BOOKABLE_STATUS: ClassStatus = 'active'

export const CLASS_TYPES = ['group', 'private', 'both'] as const
export type ClassTypeKey = (typeof CLASS_TYPES)[number]

export const REGISTER_LEVEL_KEYS = [
  'complete-beginner',
  'beginner',
  'elementary',
  'intermediate',
  'advanced',
  'not-sure',
] as const

/** برچسب نمایشی نوع کلاس — همان عبارت‌های صفحهٔ کلاس‌ها */
export function classTypeLabel(t: string): string {
  if (t === 'private') return 'Private'
  if (t === 'both') return 'Group / Private'
  return 'Group Class'
}

// ---------------------------------------------------------------------------
// شکل عمومی کلاس — همان شکلی که ClassesPage می‌کشد (سازگار با آیتم‌های فایل)
// ---------------------------------------------------------------------------

export interface PublicClassItem {
  slug: string
  title: string
  category: string
  color: string
  image: string
  level: string
  type: string // برچسب نمایشی (Group Class | Private | Group / Private)
  classType: ClassTypeKey
  status: ClassStatus
  featured: boolean
  text: string // توضیح کوتاه
  meta: { icon: string; text: string }[]
  schedule: string
  price: string // نمایشی — «$12 / session»
  priceNote: string
  highlights: string[]
  // محتوای اختیاری — فقط وقتی خالی نیستند نمایش داده می‌شوند
  fullDescription: string
  requirements: string[]
  audience: string[]
  curriculum: string[]
  materials: string[]
  notes: string
  videoUrl: string
  /** null = قابل پرداخت آنلاین نیست (کلاس active با قیمت معتبر نیست) */
  productId: string | null
  amountUsd: number | null
  amountDisplay: string | null
  /** 💰 ریزِ قیمت مقتدر (فاز ۴۷) — پایه، تخفیف خودکار بسته و مبلغ نهایی (اختیاری) */
  pricing?: {
    pricePerSession: number
    sessions: number
    base: number
    tierPercent: number
    tierDiscount: number
    final: number
  } | null
}

// ---------------------------------------------------------------------------
// کش خواندن با نسخه — تغییرات ادمین فوراً دیده می‌شود (بدون ری‌استارت)
// ---------------------------------------------------------------------------

type ClassesCache = {
  version: number
  fetchedAt: number
  rows: CourseClassRow[]
  failed: boolean
}

export interface CourseClassRow {
  id: string
  slug: string
  productId: string
  title: string
  shortDescription: string
  fullDescription: string
  category: string
  status: string
  featured: boolean
  color: string
  classType: string
  level: string
  registerLevels: string
  currency: string
  pricePerSession: number
  packageSessions: number
  packagePrice: number
  priceNote: string
  sessionDurationMin: number | null
  format: string
  maxStudents: number | null
  minStudents: number | null
  schedule: string
  startDate: Date | null
  endDate: Date | null
  timezone: string
  meta: string
  highlights: string
  requirements: string
  audience: string
  curriculum: string
  materials: string
  notes: string
  image: string
  videoUrl: string
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

const CACHE_TTL_MS = 10_000

const g = globalThis as unknown as { __ctClassesCache?: ClassesCache; __ctClassesVersion?: number }

/** با هر نوشتن ادمین صدا زده می‌شود — خواندن بعدی تازه است */
export function bumpClassesVersion(): void {
  g.__ctClassesVersion = (g.__ctClassesVersion ?? 0) + 1
  g.__ctClassesCache = undefined
}

async function readRows(): Promise<{ rows: CourseClassRow[]; failed: boolean }> {
  const now = Date.now()
  const cached = g.__ctClassesCache
  if (cached && cached.version === (g.__ctClassesVersion ?? 0) && now - cached.fetchedAt < CACHE_TTL_MS) {
    return { rows: cached.rows, failed: cached.failed }
  }
  try {
    const { db } = await import('@/lib/db')
    const rows = (await db.courseClass.findMany({
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    })) as unknown as CourseClassRow[]
    g.__ctClassesCache = { version: g.__ctClassesVersion ?? 0, fetchedAt: now, rows, failed: false }
    return { rows, failed: false }
  } catch (e) {
    // خطای DB → fallback فایل (سایت نباید خالی شود)؛ در لاگ دیده می‌شود
    console.error('[classes] DB read failed, falling back to content file:', e instanceof Error ? e.message : e)
    return { rows: [], failed: true }
  }
}

// ---------------------------------------------------------------------------
// پارس امن فیلدهای JSON — خرابی = مقدار خالی، نه crash
// ---------------------------------------------------------------------------

function parseStringArray(json: string): string[] {
  try {
    const v = JSON.parse(json || '[]')
    if (!Array.isArray(v)) return []
    return v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((s) => s.trim())
  } catch {
    return []
  }
}

function parseMetaArray(json: string): { icon: string; text: string }[] {
  try {
    const v = JSON.parse(json || '[]')
    if (!Array.isArray(v)) return []
    return v
      .filter(
        (x): x is { icon: string; text: string } =>
          typeof x?.icon === 'string' && typeof x?.text === 'string' && x.text.trim().length > 0
      )
      .slice(0, 6)
  } catch {
    return []
  }
}

function parseRegisterLevels(json: string): string[] {
  try {
    const v = JSON.parse(json || '[]')
    if (!Array.isArray(v)) return []
    return v.filter((x): x is string => typeof x === 'string')
  } catch {
    return []
  }
}

function normalizeType(t: string): ClassTypeKey {
  const v = (t || '').trim().toLowerCase()
  if (v === 'private') return 'private'
  if (v === 'both') return 'both'
  return 'group'
}

function normalizeStatus(s: string): ClassStatus {
  const v = (s || '').trim().toLowerCase()
  return (CLASS_STATUSES as readonly string[]).includes(v) ? (v as ClassStatus) : 'draft'
}

function priceDisplay(perSession: number): string {
  const n = Math.round(perSession * 100) / 100
  return `$${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)} / session`
}

function amountDisplayOf(amountUsd: number): string {
  return amountUsd.toFixed(2)
}

/** برچسب محصول پرداخت — همان قالب قدیمی سفارش‌ها */
export function productLabelFor(title: string, packageSessions: number, classType: ClassTypeKey): string {
  if (packageSessions > 1) return `${title} — ${packageSessions}-session package`
  return `${title} — single session`
}

/** ⭐ مبلغ پایهٔ بسته — تعریف رسمی: pricePerSession × packageSessions (فاز ۴۷).
 *  packagePrice در DB همین مقدار محاسبه‌شده است (مهاجرت فاز ۴۷ + هر ذخیرهٔ ادمین). */
function basePriceOf(row: CourseClassRow): number {
  return round2((Number(row.pricePerSession) || 0) * Math.max(1, Math.floor(Number(row.packageSessions) || 1)))
}

/** آیا این ردیف قابل خرید آنلاین است؟ (فعال + قیمت معتبر) */
export function isBookable(row: CourseClassRow): boolean {
  const base = basePriceOf(row)
  return (
    normalizeStatus(row.status) === BOOKABLE_STATUS &&
    row.currency === 'USDT' &&
    Number.isFinite(base) &&
    base > 0 &&
    base <= 2000 // همان سقف ایمن محصولات (میکرو در Int جا می‌شود)
  )
}

/** ردیف DB → محصول پرداخت (نمای مشتق‌شده — نه سیستم دومی)
 *  مبلغ = قیمت نهایی مقتدر: پایه (pricePerSession×sessions) منهای تخفیف خودکار
 *  پلهٔ بسته — کل زنجیرهٔ سفارش/پرداخت همین عدد را می‌بیند. */
function rowToProduct(row: CourseClassRow): PaymentProduct {
  const classType = normalizeType(row.classType)
  const base = basePriceOf(row)
  const tierPercent = tierPercentFor(row.packageSessions, getTiers())
  const final = round2(Math.max(0, base - (base * tierPercent) / 100))
  return {
    id: row.productId,
    classTitle: row.title,
    label: productLabelFor(row.title, row.packageSessions, classType),
    amountUsd: final,
  }
}

/** ردیف DB → شکل عمومی صفحهٔ کلاس‌ها */
export function rowToPublicItem(row: CourseClassRow): PublicClassItem {
  const classType = normalizeType(row.classType)
  const status = normalizeStatus(row.status)
  const bookable = isBookable(row)
  const base = basePriceOf(row)
  const tierPercent = tierPercentFor(row.packageSessions, getTiers())
  const tierDiscount = round2((base * tierPercent) / 100)
  const final = round2(Math.max(0, base - tierDiscount))
  return {
    slug: row.slug,
    title: row.title,
    category: row.category,
    color: row.color,
    image: row.image,
    level: row.level,
    type: classTypeLabel(classType),
    classType,
    status,
    featured: row.featured,
    text: row.shortDescription,
    meta: parseMetaArray(row.meta),
    schedule: row.schedule,
    price: priceDisplay(row.pricePerSession),
    priceNote: row.priceNote,
    highlights: parseStringArray(row.highlights),
    fullDescription: row.fullDescription,
    requirements: parseStringArray(row.requirements),
    audience: parseStringArray(row.audience),
    curriculum: parseStringArray(row.curriculum),
    materials: parseStringArray(row.materials),
    notes: row.notes,
    videoUrl: row.videoUrl,
    productId: bookable ? row.productId : null,
    amountUsd: bookable ? final : null,
    amountDisplay: bookable ? amountDisplayOf(final) : null,
    pricing:
      bookable && base > 0
        ? {
            pricePerSession: round2(row.pricePerSession),
            sessions: row.packageSessions,
            base,
            tierPercent,
            tierDiscount,
            final,
          }
        : null,
  }
}

// ---------------------------------------------------------------------------
// Fallback فایل — همان نگاشت قدیمی (فقط وقتی جدول DB خالی است یا خواندن خطا داد)
// ---------------------------------------------------------------------------

function fileItemsToRows(): CourseClassRow[] {
  const items = siteContent.classes.items
  const products = (siteContent as unknown as { payments?: { products?: PaymentProduct[] } }).payments?.products ?? []
  const OLD_GROUP_MAP: Record<string, string> = {
    'complete-beginner': 'beginner-chinese-12',
    beginner: 'beginner-chinese-12',
    elementary: 'elementary-chinese-16',
    intermediate: 'intermediate-chinese-16',
  }
  return items.map((item, idx) => {
    const product = products.find((p) => p.classTitle === item.title)
    const isPrivateOnly = item.type === 'Private'
    const isBoth = item.type.includes('Private') && item.type.includes('Group')
    const classType: ClassTypeKey = isPrivateOnly ? 'private' : isBoth ? 'both' : 'group'
    const registerLevels: string[] =
      classType === 'private' || classType === 'both'
        ? ['all']
        : Object.entries(OLD_GROUP_MAP)
            .filter(([, pid]) => pid === product?.id)
            .map(([lv]) => lv)
    const perSession = Number((item.price.match(/([0-9]+(?:\.[0-9]+)?)/) ?? [])[1] ?? 0)
    const sessions = Number((item.priceNote.match(/(\d+)-session/) ?? [])[1] ?? 1)
    const pkg = product?.amountUsd ?? 0
    return {
      id: `file-${idx}`,
      slug: item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
      productId: product?.id ?? '',
      title: item.title,
      shortDescription: item.text,
      fullDescription: '',
      category: item.category,
      status: 'active',
      featured: false,
      color: item.color,
      classType,
      level: item.level,
      registerLevels: JSON.stringify(registerLevels),
      currency: 'USDT',
      pricePerSession: perSession,
      packageSessions: sessions,
      packagePrice: pkg,
      priceNote: item.priceNote,
      sessionDurationMin: null,
      format: 'online',
      maxStudents: null,
      minStudents: null,
      schedule: item.schedule,
      startDate: null,
      endDate: null,
      timezone: '',
      meta: JSON.stringify(item.meta),
      highlights: JSON.stringify(item.highlights),
      requirements: '[]',
      audience: '[]',
      curriculum: '[]',
      materials: '[]',
      notes: '',
      image: item.image,
      videoUrl: '',
      sortOrder: idx + 1,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    } satisfies CourseClassRow
  })
}

// ---------------------------------------------------------------------------
// APIهای عمومی فروشگاه
// ---------------------------------------------------------------------------

/** همهٔ کلاس‌های قابل نمایش عمومی (active + full) — fallback فایل فقط در خطای DB */
export async function listPublicClasses(): Promise<PublicClassItem[]> {
  await refreshTiers()
  const { rows, failed } = await readRows()
  const source = rows.length > 0 ? rows : failed ? fileItemsToRows() : []
  return source
    .filter((r) => PUBLIC_STATUSES.includes(normalizeStatus(r.status)))
    .map(rowToPublicItem)
}

/** یک کلاس عمومی با slug (فقط active/full) */
export async function getPublicClassBySlug(slug: string): Promise<PublicClassItem | null> {
  await refreshTiers()
  const { rows, failed } = await readRows()
  const source = rows.length > 0 ? rows : failed ? fileItemsToRows() : []
  const row = source.find((r) => r.slug === slug && PUBLIC_STATUSES.includes(normalizeStatus(r.status)))
  return row ? rowToPublicItem(row) : null
}

/** محصولات پرداخت — نمای مشتق‌شدهٔ کلاس‌های active (fallback فایل در خطا/خالی‌بودن DB) */
export async function getActiveProducts(): Promise<PaymentProduct[]> {
  await refreshTiers()
  const { rows, failed } = await readRows()
  if (rows.length > 0) {
    return rows.filter(isBookable).map(rowToProduct)
  }
  if (failed) {
    // فقط در خطای DB به فایل برمی‌گردیم — جدولِ خالیِ عمدی ادمین را دور نمی‌زنیم
    const products = (siteContent as unknown as { payments?: { products?: PaymentProduct[] } }).payments?.products ?? []
    return products.filter((p) => p.amountUsd > 0 && p.amountUsd <= 2000)
  }
  return []
}

// ---------------------------------------------------------------------------
// ماتریس «نوع + سطح» — مشتق از فیلدهای ساخت‌یافتهٔ کلاس‌ها (قطعی و fail-closed)
// ---------------------------------------------------------------------------

export type ComboUnavailableReason = 'UNAVAILABLE' | 'CHOOSE_TYPE'

export interface ComboResolution {
  available: boolean
  reason?: ComboUnavailableReason
  product: PaymentProduct | null
}

/**
 * انتخاب قطعی کلاس برای (classType, level):
 *  • نامزدها فقط کلاس‌های «تک‌نوع» فعال‌اند: گروهی (classType=group) برای
 *    ترکیب‌های گروهی و خصوصی (classType=private) برای ترکیب‌های خصوصی —
 *    دقیقاً همان معنای جدول قدیمی (GROUP_LEVEL_PRODUCT/PRIVATE).
 *    کلاس‌های «Group / Private» (both) در ماتریس شرکت نمی‌کنند و از صفحهٔ
 *    خودشان (تطبیق عنوان) فروخته می‌شوند — تا ماتریس هرگز حدس نزند.
 *  • اولویت: تطبیق سطحِ مشخص بر «all»، بعد کمترین sortOrder، مساوی = عنوان الفبایی.
 *  • «both» یعنی نوع نامشخص → CHOOSE_TYPE (حدس ممنوع).
 */
export async function resolveCombo(classType: string, level: string): Promise<ComboResolution> {
  const ct = (classType || '').trim().toLowerCase()
  const lv = (level || '').trim().toLowerCase()

  if (ct === 'both') {
    return { available: false, reason: 'CHOOSE_TYPE', product: null }
  }
  if (ct !== 'group' && ct !== 'private') {
    return { available: false, reason: 'UNAVAILABLE', product: null }
  }
  if (lv !== 'all' && !(REGISTER_LEVEL_KEYS as readonly string[]).includes(lv)) {
    return { available: false, reason: 'UNAVAILABLE', product: null }
  }

  const { rows, failed } = await readRows()
  let candidates: CourseClassRow[]
  if (rows.length > 0) {
    candidates = rows.filter((r) => {
      if (!isBookable(r)) return false
      if (normalizeType(r.classType) !== ct) return false // فقط تک‌نوع — both در ماتریس نیست
      const levels = parseRegisterLevels(r.registerLevels)
      return levels.includes(lv) || levels.includes('all')
    })
  } else if (failed) {
    // fallback فایل — جدول نگاشت قدیمی (تا خطای DB مسیر پرداخت را نشکند)
    const products = await getActiveProducts()
    if (ct === 'private') {
      const p = products.find((x) => x.id === 'private-lessons-1') ?? null
      return p ? { available: true, product: p } : { available: false, reason: 'UNAVAILABLE', product: null }
    }
    const GROUP_MAP: Record<string, string | null> = {
      'complete-beginner': 'beginner-chinese-12',
      beginner: 'beginner-chinese-12',
      elementary: 'elementary-chinese-16',
      intermediate: 'intermediate-chinese-16',
      advanced: null,
      'not-sure': null,
    }
    const mapped = GROUP_MAP[lv]
    const p = mapped ? (products.find((x) => x.id === mapped) ?? null) : null
    return p ? { available: true, product: p } : { available: false, reason: 'UNAVAILABLE', product: null }
  } else {
    candidates = []
  }

  if (candidates.length === 0) {
    return { available: false, reason: 'UNAVAILABLE', product: null }
  }

  // تطبیق سطح مشخص اولویت دارد بر «all» — قطعی و قابل توضیح
  const specific = candidates.filter((r) => parseRegisterLevels(r.registerLevels).includes(lv))
  const pool = specific.length > 0 ? specific : candidates
  pool.sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title))
  return { available: true, product: rowToProduct(pool[0]) }
}

/** تطبیق قطعی محصول با عنوان کلاس (انتخاب کلاس از صفحهٔ کلاس‌ها/آزمون) */
export async function matchProductByClassTitle(title: string): Promise<PaymentProduct | null> {
  const n = (title || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  if (!n) return null
  const products = await getActiveProducts()
  return products.find((p) => p.classTitle.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() === n) ?? null
}

/** ردیف کامل کلاسِ قابل‌خرید با productId — ورودی موتور قیمت‌گذاری سمت سرور */
export async function findBookableClassRowByProductId(productId: string): Promise<CourseClassRow | null> {
  await refreshTiers()
  const { rows, failed } = await readRows()
  if (rows.length === 0) return null // fallback فایل → محاسبه از محصول خودش انجام می‌شود
  const row = rows.find((r) => r.productId === productId && isBookable(r))
  return row ?? null
}
