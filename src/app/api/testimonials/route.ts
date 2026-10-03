import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { isAuthorized, getAdminActor } from '@/lib/admin-auth'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { guardResponse } from '@/lib/http-guard'
import { logAdminAction } from '@/lib/audit'
import { reviewVisitorId } from '@/lib/review-visitor'

// ---------------------------------------------------------------------------
//  💬 نظرات — کاربران + نظرات منتخب مالک (featured)
//  POST عمومی: ثبت نظر جدید (وضعیت = pending تا ادمین تأیید کند)
//              با هدر مدیریت: ساخت/افزودن نظر با وضعیت و featured دلخواه
//  GET عمومی: نظرات تأییدشده | ?featured=1 فقط منتخب‌ها | ?scope=home همهٔ
//             تأییدشده‌ها (منتخب‌ها اول — برای کاروسل خانه) | با هدر مدیریت: همه
//             | ?archived=1 (فقط مدیریت): بایگانی‌شده‌ها (حذف نرم)
//  PATCH/DELETE: فقط مدیریت — ویرایش کامل + بازگردانی (restore:true) + بایگانی
//  🗄️ فاز ۵۵: DELETE هرگز رکورد را پاک نمی‌کند — فقط deletedAt می‌گذارد
//  🧾 فاز ۵۵: همهٔ اقدامات مدیریتی در Audit Log ثبت می‌شوند
// ---------------------------------------------------------------------------

const testimonialSchema = z.object({
  name: z.string().trim().min(2).max(80),
  role: z.string().trim().max(80).optional().or(z.literal('')),
  rating: z.number().int().min(1).max(5),
  text: z.string().trim().min(10).max(1000),
})

// فرم مدیریت — همهٔ فیلدها اختیاری به‌جز id (ویرایش جزئی)
const patchSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(2).max(80).optional(),
  role: z.string().trim().max(80).optional().or(z.literal('')),
  rating: z.number().int().min(1).max(5).optional(),
  text: z.string().trim().min(10).max(1000).optional(),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  featured: z.boolean().optional(),
  // 🗄️ بازگردانی از بایگانی (حذف نرم)
  restore: z.boolean().optional(),
})

export const dynamic = 'force-dynamic' // دادهٔ مدیریتی — هرگز کش نشود

function isNotFound(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: unknown }).code === 'P2025'
}

export async function POST(req: NextRequest) {
  // ⛔️ ضداسپم: حداکثر ۶ ارسال در ۱۰ دقیقه برای هر IP
  const rl = await rateLimit('testimonials', req, 6, 10 * 60, 10 * 60)
  if (!rl.ok) return tooManyRequests(rl)
  // 🛡️ گارد مبدأ + سقف حجم بدنه — هم‌خوان با بقیهٔ APIهای mutation (فاز ۵۵)
  const guard = guardResponse(req)
  if (guard) return guard

  const admin = await isAuthorized(req)
  try {
    const body = await req.json()
    const parsed = testimonialSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    // مدیریت می‌تواند نظر را مستقیم تأییدشده/منتخب بسازد؛ کاربر عادی همیشه pending
    const adminExtras = admin
      ? {
          status: body?.status === 'approved' || body?.status === 'rejected' ? body.status : 'pending',
          featured: body?.featured === true,
        }
      : { status: 'pending', featured: false }
    const saved = await db.testimonial.create({
      data: {
        name: parsed.data.name,
        role: parsed.data.role || null,
        rating: parsed.data.rating,
        text: parsed.data.text,
        ...adminExtras,
      },
    })
    if (admin) {
      logAdminAction({
        actor: getAdminActor(req),
        action: 'testimonial.create',
        targetType: 'testimonial',
        targetId: saved.id,
        meta: { status: saved.status, featured: saved.featured, rating: saved.rating },
      })
    }
    return NextResponse.json({ ok: true, id: saved.id }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/testimonials] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const admin = await isAuthorized(req)
    const params = req.nextUrl.searchParams
    const onlyFeatured = params.get('featured') === '1'
    const scopeHome = params.get('scope') === 'home'
    const onlyArchived = params.get('archived') === '1'
    if (onlyArchived && !admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // 🐞 رفع تکرار: فهرست عمومی فقط نظرات «تأییدشدهٔ غیرمنتخب» را می‌دهد و
    // منتخب‌ها فقط با ?featured=1 — تا یک نظر هرگز دو بار در صفحهٔ نظرات دیده نشود.
    // ?scope=home همهٔ تأییدشده‌ها (منتخب‌ها اول) — مخصوص کاروسل خانه که باید
    // نظرات منتخب مالک را هم نشان دهد (فاز ۵۵: رفع رگرسیون حذف منتخب‌ها).
    const where = onlyArchived
      ? { deletedAt: { not: null } }
      : {
          deletedAt: null,
          ...(admin
            ? {}
            : scopeHome
              ? { status: 'approved' }
              : onlyFeatured
                ? { status: 'approved', featured: true }
                : { status: 'approved', featured: false }),
        }
    const testimonials = await db.testimonial.findMany({
      where,
      orderBy: onlyArchived
        ? [{ createdAt: 'desc' }]
        : [{ featured: 'desc' }, { createdAt: 'desc' }],
      take: 500, // 🛡️ سقف دفاعی — پاسخ هرگز بی‌کران نیست (فاز ۴۹)
    })
    // ❤️ وضعیت لایکِ همین بازدیدکننده — قلب پر/خالی و شمارنده درست نمایش داده شود
    const visitorId = reviewVisitorId(req)
    const likedSet = new Set<string>()
    if (testimonials.length > 0) {
      const likes = await db.reviewLike.findMany({
        where: { visitorId, testimonialId: { in: testimonials.map((t) => t.id) } },
        select: { testimonialId: true },
      })
      for (const l of likes) likedSet.add(l.testimonialId)
    }
    return NextResponse.json({
      testimonials: testimonials.map((t) => ({ ...t, likedByMe: likedSet.has(t.id) })),
    })
  } catch (err) {
    console.error('[GET /api/testimonials] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// تأیید/رد + ویرایش کامل نظر (نام، متن، ستاره، منتخب) + بازگردانی — فقط مدیریت
export async function PATCH(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const guard = guardResponse(req)
  if (guard) return guard
  try {
    const body = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const { id, role, restore, ...rest } = parsed.data
    const data: Record<string, unknown> = { ...rest }
    if (role !== undefined) data.role = role || null // رشتهٔ خالی = حذف نقش
    if (restore) data.deletedAt = null // 🗄️ بازگردانی از بایگانی
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }
    const updated = await db.testimonial.update({ where: { id }, data })
    if (restore) {
      logAdminAction({
        actor: getAdminActor(req),
        action: 'testimonial.restore',
        targetType: 'testimonial',
        targetId: id,
        meta: { name: updated.name.slice(0, 60) },
      })
    } else {
      logAdminAction({
        actor: getAdminActor(req),
        action: 'testimonial.update',
        targetType: 'testimonial',
        targetId: id,
        meta: { status: updated.status, featured: updated.featured },
      })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (isNotFound(err)) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }
    console.error('[PATCH /api/testimonials] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// 🗄️ حذف نرم — بایگانی؛ رکورد و لایک‌هایش حفظ می‌شوند و از بایگانی قابل بازگردانی‌اند
export async function DELETE(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const guard = guardResponse(req)
  if (guard) return guard
  try {
    const body = await req.json().catch(() => null)
    const id = typeof body?.id === 'string' ? body.id : ''
    if (!id) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    const archived = await db.testimonial.update({
      where: { id },
      data: { deletedAt: new Date(), featured: false },
    })
    logAdminAction({
      actor: getAdminActor(req),
      action: 'testimonial.archive',
      targetType: 'testimonial',
      targetId: id,
      meta: { name: archived.name.slice(0, 60), status: archived.status },
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (isNotFound(err)) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }
    console.error('[DELETE /api/testimonials] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
