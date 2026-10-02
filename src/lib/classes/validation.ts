// ---------------------------------------------------------------------------
// 🎓 اعتبارسنجی مشترک payload کلاس — سرچشمهٔ واحد POST/PUT (فاز ۴۲)
// قاعده: اعتبارسنجی مرورگر فقط UX است؛ این ماژول تنها داور سمت سرور.
// ---------------------------------------------------------------------------

import { z } from 'zod'
import { siteContent } from '@/content/site-content'
import { REGISTER_LEVEL_KEYS, CLASS_STATUSES } from '@/lib/classes/store'
import { isValidTimezone } from '@/lib/timezones'

// کلیدهای فیلتر عمومی صفحهٔ کلاس‌ها — دستهٔ ناموجود = کلاسی که هرگز نمایش داده نمی‌شود
const CATEGORY_KEYS = siteContent.classes.filters
  .map((f) => f.key)
  .filter((k) => k !== 'all')

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** پیشنهاد slug از عنوان — برای UX ادمین (نهایی‌سازی همچنان سمت سرور اعتبارسنجی می‌شود) */
export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

const priceSchema = z
  .number({ message: 'Must be a number' })
  .refine((n) => Number.isFinite(n), 'Invalid number')
  .refine(
    (n) => Math.abs(Math.round(n * 100) - n * 100) < 1e-6,
    'Max 2 decimal places'
  )

export const classPayloadSchema = z.object({
  title: z.string().trim().min(2, 'Title is required (2–120 chars)').max(120),
  slug: z
    .string()
    .trim()
    .min(1, 'Slug is required')
    .max(100)
    .regex(SLUG_RE, 'Slug may only contain lowercase letters, numbers and hyphens'),
  productId: z
    .string()
    .trim()
    .min(2, 'Product ID is required')
    .max(60)
    .regex(SLUG_RE, 'Product ID may only contain lowercase letters, numbers and hyphens'),
  shortDescription: z.string().trim().max(500, 'Max 500 characters').default(''),
  fullDescription: z.string().trim().max(5000, 'Max 5000 characters').default(''),
  category: z
    .string()
    .trim()
    .min(1, 'Pick at least one category')
    .max(200)
    .refine(
      (v) => v.split(/\s+/).every((k) => CATEGORY_KEYS.includes(k)),
      'Category must be one of the public filter keys'
    ),
  status: z.enum(CLASS_STATUSES).default('active'),
  featured: z.boolean().default(false),
  color: z.enum(['sage', 'butter', 'peach', 'cream']).default('sage'),
  classType: z.enum(['group', 'private', 'both']).default('group'),
  level: z.string().trim().min(1, 'Level label is required').max(60),
  registerLevels: z
    .array(z.enum([...REGISTER_LEVEL_KEYS, 'all'] as unknown as [string, ...string[]]))
    .min(1, 'Pick at least one level')
    .max(7)
    .default([]),
  currency: z.literal('USDT', { message: 'Only USDT is supported' }).default('USDT'),
  pricePerSession: priceSchema.refine((n) => n >= 0 && n <= 2000, 'Price must be between 0 and 2000').default(0),
  packageSessions: z.number().int().min(1, 'At least 1 session').max(500).default(1),
  // ⚠️ فاز ۴۷: packagePrice دیگر از مرورگر پذیرفته نمی‌شود — سرور خودش از
  // pricePerSession × packageSessions محاسبه می‌کند (فیلد فقط برای سازگاری فرم‌های قدیمی اختیاری است)
  packagePrice: priceSchema.refine((n) => n > 0 && n <= 2000, 'Package price must be between 0.01 and 2000 USDT').optional(),
  priceNote: z.string().trim().max(200, 'Max 200 characters').default(''),
  sessionDurationMin: z.number().int().min(5).max(600).nullable().optional(),
  format: z.enum(['online', 'offline', 'hybrid']).default('online'),
  maxStudents: z.number().int().min(1).max(1000).nullable().optional(),
  minStudents: z.number().int().min(1).max(1000).nullable().optional(),
  schedule: z.string().trim().max(200, 'Max 200 characters').default(''),
  startDate: z.string().datetime({ message: 'Invalid date' }).nullable().optional(),
  endDate: z.string().datetime({ message: 'Invalid date' }).nullable().optional(),
  timezone: z
    .string()
    .trim()
    .max(60)
    .default('')
    .refine((v) => v === '' || isValidTimezone(v), 'Timezone must be a supported IANA identifier'),
  meta: z
    .array(
      z.object({
        icon: z.enum(['monitor', 'clock', 'users', 'mic', 'target', 'user']),
        text: z.string().min(1, 'Text is required').max(80, 'Max 80 characters'),
      })
    )
    .max(6, 'Max 6 info items')
    .default([]),
  highlights: z.array(z.string().trim().min(1, 'Empty line').max(200, 'Max 200 characters')).max(12, 'Max 12 items').default([]),
  requirements: z.array(z.string().trim().min(1, 'Empty line').max(300, 'Max 300 characters')).max(20, 'Max 20 items').default([]),
  audience: z.array(z.string().trim().min(1, 'Empty line').max(300, 'Max 300 characters')).max(20, 'Max 20 items').default([]),
  curriculum: z.array(z.string().trim().min(1, 'Empty line').max(300, 'Max 300 characters')).max(30, 'Max 30 items').default([]),
  materials: z.array(z.string().trim().min(1, 'Empty line').max(300, 'Max 300 characters')).max(20, 'Max 20 items').default([]),
  notes: z.string().trim().max(1000, 'Max 1000 characters').default(''),
  image: z.string().trim().max(500, 'Max 500 characters').default(''),
  videoUrl: z.string().trim().max(500, 'Max 500 characters').default(''),
  sortOrder: z.number().int().min(0).max(10000).default(100),
})

export type ClassPayload = z.infer<typeof classPayloadSchema>

export function zodFieldErrors(e: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of e.issues) {
    const key = issue.path.join('.') || '_'
    if (!out[key]) out[key] = issue.message
  }
  return out
}

export function dataFromPayload(p: ClassPayload) {
  return {
    title: p.title,
    slug: p.slug.toLowerCase(),
    productId: p.productId.toLowerCase(),
    shortDescription: p.shortDescription,
    fullDescription: p.fullDescription,
    category: p.category,
    status: p.status,
    featured: p.featured,
    color: p.color,
    classType: p.classType,
    level: p.level,
    registerLevels: JSON.stringify(p.registerLevels),
    currency: 'USDT' as const,
    pricePerSession: Math.round(p.pricePerSession * 100) / 100,
    packageSessions: p.packageSessions,
    // ⭐ مبلغ پایهٔ بسته فقط همین‌جا محاسبه می‌شود — ورودی مرورگر هرگز ملاک نیست
    packagePrice: Math.round(p.pricePerSession * p.packageSessions * 100) / 100,
    priceNote: p.priceNote,
    sessionDurationMin: p.sessionDurationMin ?? null,
    format: p.format,
    maxStudents: p.maxStudents ?? null,
    minStudents: p.minStudents ?? null,
    schedule: p.schedule,
    startDate: p.startDate ? new Date(p.startDate) : null,
    endDate: p.endDate ? new Date(p.endDate) : null,
    timezone: p.timezone,
    meta: JSON.stringify(p.meta),
    highlights: JSON.stringify(p.highlights),
    requirements: JSON.stringify(p.requirements),
    audience: JSON.stringify(p.audience),
    curriculum: JSON.stringify(p.curriculum),
    materials: JSON.stringify(p.materials),
    notes: p.notes,
    image: p.image,
    videoUrl: p.videoUrl,
    sortOrder: p.sortOrder,
  }
}

/** اعتبارسنجی قواعد متقاطع (تاریخ‌ها و ظرفیت‌ها) — آرایهٔ خطای فیلد برمی‌گرداند */
export function crossFieldErrors(p: ClassPayload): Record<string, string> {
  const out: Record<string, string> = {}
  if (p.startDate && p.endDate && new Date(p.endDate) < new Date(p.startDate)) {
    out.endDate = 'End date must be after the start date'
  }
  if (p.minStudents && p.maxStudents && p.minStudents > p.maxStudents) {
    out.minStudents = 'Minimum cannot exceed maximum students'
  }
  return out
}
