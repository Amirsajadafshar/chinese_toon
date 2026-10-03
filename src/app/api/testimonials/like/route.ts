// ---------------------------------------------------------------------------
// ❤️ لایک نظر — POST /api/testimonials/like (فاز ۴۶)
//
// رفتار تاگل: اگر این بازدیدکننده قبلاً لایک نکرده → لایک اضافه می‌شود؛
// اگر لایک کرده → لایک حذف می‌شود (unlike). پاسخ همیشه شمارندهٔ تازه از
// دیتابیس است — فرانت هرگز شمارنده را تعیین نمی‌کند.
//
// امنیت و صحت:
//  • شمارندهٔ مرجع = Testimonial.likeCount که فقط در همین تراکنش تغییر می‌کند
//  • یکتایی در سطح دیتابیس: @@unique([testimonialId, visitorId]) — حتی در
//    مسابقهٔ دوکلیک هم لایک تکراری ساخته نمی‌شود
//  • visitorId = هش سمت سرور (IP|UA) — کلاینت هیچ شناسه‌ای تحمیل نمی‌کند
//  • لایک فقط برای نظرات «approved» (کارت‌های واقعاً عمومی)؛ حذف لایک همیشه
//    مجاز است حتی اگر نظر بعداً مخفی شده باشد (شمارنده هرگز منفی نمی‌شود)
//  • rate-limit ۳۰ درخواست در ۱۰ دقیقه برای هر IP
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { guardResponse } from '@/lib/http-guard'
import { reviewVisitorId } from '@/lib/review-visitor'

export const dynamic = 'force-dynamic'

const CUID_RE = /^[a-z0-9]{20,36}$/i

function isUniqueViolation(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: unknown }).code === 'P2002'
}

function isNotFound(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: unknown }).code === 'P2025'
}

export async function POST(req: NextRequest) {
  const rl = await rateLimit('review-like', req, 30, 600, 300)
  if (!rl.ok) return tooManyRequests(rl)
  // 🛡️ گارد مبدأ + سقف حجم بدنه — هم‌خوان با بقیهٔ APIهای mutation (فاز ۵۵)
  const guard = guardResponse(req)
  if (guard) return guard

  try {
    const body = await req.json().catch(() => null)
    const id = typeof body?.id === 'string' ? body.id : ''
    if (!CUID_RE.test(id)) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    const testimonial = await db.testimonial.findUnique({ where: { id } })
    if (!testimonial) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    const visitorId = reviewVisitorId(req)
    const existing = await db.reviewLike.findUnique({
      where: { testimonialId_visitorId: { testimonialId: id, visitorId } },
    })

    if (existing) {
      // ---- حذف لایک (unlike) ----
      try {
        const updated = await db.$transaction(async (tx) => {
          await tx.reviewLike.delete({ where: { id: existing.id } })
          return tx.testimonial.update({
            where: { id },
            data: { likeCount: { decrement: 1 } },
          })
        })
        return NextResponse.json({ ok: true, liked: false, likeCount: updated.likeCount })
      } catch (e) {
        if (isNotFound(e)) {
          // مسابقهٔ دوکلیک روی unlike: لایک همین حالا حذف شده — وضعیت واقعی را برگردان
          const fresh = await db.testimonial.findUnique({ where: { id } })
          return NextResponse.json({ ok: true, liked: false, likeCount: fresh?.likeCount ?? 0 })
        }
        throw e
      }
    }

    // ---- لایک جدید — فقط برای کارت عمومی (approved) ----
    if (testimonial.status !== 'approved') {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }
    try {
      const updated = await db.$transaction(async (tx) => {
        await tx.reviewLike.create({ data: { testimonialId: id, visitorId } })
        return tx.testimonial.update({
          where: { id },
          data: { likeCount: { increment: 1 } },
        })
      })
      return NextResponse.json({ ok: true, liked: true, likeCount: updated.likeCount })
    } catch (e) {
      if (isUniqueViolation(e)) {
        // مسابقهٔ دوکلیک: رکورد همین حالا ساخته شده — وضعیت واقعی را برگردان
        const fresh = await db.testimonial.findUnique({ where: { id } })
        return NextResponse.json({ ok: true, liked: true, likeCount: fresh?.likeCount ?? 0 })
      }
      throw e
    }
  } catch (err) {
    console.error('[POST /api/testimonials/like] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
