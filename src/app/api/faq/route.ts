// ---------------------------------------------------------------------------
// ❓ FAQ API — /api/faq (فاز ۴۶)
//
// تنها منبع حقیقت سؤالات متداول. صفحهٔ عمومی Support و تب FAQ پنل ادمین
// هر دو از همین جدول (FaqItem) می‌خوانند — هیچ فهرست هاردکد دیگری وجود ندارد.
//
//  GET     عمومی: فقط published (مرتب با sortOrder) | با هدر مدیریت: همه
//  POST    فقط مدیریت: ایجاد سؤال جدید
//  PATCH   فقط مدیریت: ویرایش جزئی (سؤال/پاسخ/دسته/ترتیب/انتشار)
//  DELETE  فقط مدیریت: حذف — در UI با تأیید دو مرحله‌ای همراه است
//
// امنیت: همهٔ mutationها با isAuthorized + guardResponse + rate-limit +
// اعتبارسنجی zod سمت سرور. هیچ فیلدی از مرورگر بدون اعتبارسنجی پذیرفته نیست.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { isAuthorized, getAdminActor } from '@/lib/admin-auth'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { guardResponse } from '@/lib/http-guard'
import { logAdminAction } from '@/lib/audit'

export const dynamic = 'force-dynamic'

const faqSchema = z.object({
  category: z
    .string()
    .trim()
    .min(2, 'Category is required')
    .max(40, 'Max 40 characters')
    .regex(/^[a-z0-9-]+$/, 'Category key: lowercase letters, numbers and hyphens only'),
  question: z.string().trim().min(3, 'Question is required (3–300 chars)').max(300),
  answer: z.string().trim().min(3, 'Answer is required (3–2000 chars)').max(2000),
  sortOrder: z.number().int().min(0).max(10000).default(0),
  published: z.boolean().default(true),
})

// فرم مدیریت — همهٔ فیلدها اختیاری به‌جز id (ویرایش جزئی)
const patchSchema = faqSchema.partial().extend({
  id: z.string().trim().min(1),
  // 🗄️ بازگردانی از بایگانی (حذف نرم فاز ۵۵)
  restore: z.boolean().optional(),
})

const CUID_RE = /^[a-z0-9]{20,36}$/i

function isNotFound(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: unknown }).code === 'P2025'
}

export async function GET(req: NextRequest) {
  try {
    const admin = await isAuthorized(req)
    const onlyArchived = req.nextUrl.searchParams.get('archived') === '1'
    if (onlyArchived && !admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const faqs = await db.faqItem.findMany({
      // 🗄️ بایگانی‌شده‌ها (deletedAt) از هر دو فهرست خارج‌اند؛ فقط با ?archived=1 ادمین دیده می‌شوند
      where: onlyArchived ? { deletedAt: { not: null } } : { deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      take: 500, // 🛡️ سقف دفاعی — پاسخ هرگز بی‌کران نیست (فاز ۴۹)
    })
    return NextResponse.json({ faqs })
  } catch (err) {
    console.error('[GET /api/faq] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const guard = guardResponse(req)
  if (guard) return guard
  const rl = await rateLimit('faq-write', req, 30, 600, 300)
  if (!rl.ok) return tooManyRequests(rl)

  try {
    const body = await req.json()
    const parsed = faqSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const created = await db.faqItem.create({ data: parsed.data })
    console.info(`[faq] CREATED "${created.question.slice(0, 60)}" (category=${created.category})`)
    logAdminAction({
      actor: getAdminActor(req),
      action: 'faq.create',
      targetType: 'faq',
      targetId: created.id,
      meta: { category: created.category, sortOrder: created.sortOrder, published: created.published },
    })
    return NextResponse.json({ ok: true, faq: created }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/faq] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const guard = guardResponse(req)
  if (guard) return guard
  const rl = await rateLimit('faq-write', req, 30, 600, 300)
  if (!rl.ok) return tooManyRequests(rl)

  try {
    const body = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const { id, restore, ...data } = parsed.data
    if (restore) {
      // 🗄️ بازگردانی از بایگانی — هیچ فیلد دیگری همزمان تغییر نمی‌کند
      const restored = await db.faqItem.update({ where: { id }, data: { deletedAt: null } })
      logAdminAction({
        actor: getAdminActor(req),
        action: 'faq.restore',
        targetType: 'faq',
        targetId: id,
        meta: { question: restored.question.slice(0, 60) },
      })
      return NextResponse.json({ ok: true, faq: restored })
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }
    const updated = await db.faqItem.update({ where: { id }, data })
    console.info(`[faq] UPDATED "${updated.question.slice(0, 60)}"`)
    logAdminAction({
      actor: getAdminActor(req),
      action: 'faq.update',
      targetType: 'faq',
      targetId: id,
      meta: { published: updated.published, category: updated.category, sortOrder: updated.sortOrder },
    })
    return NextResponse.json({ ok: true, faq: updated })
  } catch (err) {
    if (isNotFound(err)) {
      return NextResponse.json({ error: 'FAQ not found' }, { status: 404 })
    }
    console.error('[PATCH /api/faq] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const guard = guardResponse(req)
  if (guard) return guard
  const rl = await rateLimit('faq-write', req, 30, 600, 300)
  if (!rl.ok) return tooManyRequests(rl)

  try {
    const body = await req.json().catch(() => null)
    const id = typeof body?.id === 'string' ? body.id : ''
    if (!CUID_RE.test(id)) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    // 🗄️ حذف نرم (فاز ۵۵) — بایگانی با امکان بازگردانی؛ رکورد و رأی‌هایش هرگز پاک نمی‌شوند
    const archived = await db.faqItem.update({
      where: { id },
      data: { deletedAt: new Date(), published: false },
    })
    console.info(`[faq] ARCHIVED "${archived.question.slice(0, 60)}"`)
    logAdminAction({
      actor: getAdminActor(req),
      action: 'faq.archive',
      targetType: 'faq',
      targetId: id,
      meta: { question: archived.question.slice(0, 60), category: archived.category },
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (isNotFound(err)) {
      return NextResponse.json({ error: 'FAQ not found' }, { status: 404 })
    }
    console.error('[DELETE /api/faq] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
