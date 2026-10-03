// ---------------------------------------------------------------------------
// 👍👎 رأی «آیا این پاسخ مفید بود؟» — /api/faq/vote (فاز ۵۵)
//
// جایگزین کامل localStorage فاز ۵۴ — رأی‌ها حالا واقعاً در دیتابیس ذخیره
// می‌شوند (FaqVote + شمارنده‌های helpfulYes/helpfulNo روی خود FaqItem) تا
// ادمین ببیند کدام پاسخ‌ها مفید یا مبهم‌اند. هیچ وضعیت جعلی مرورگری نیست.
//
//  GET  عمومی: نقشهٔ رأی‌های همین بازدیدکننده { votes: { faqId: 'up'|'down' } }
//  POST عمومی: { id, vote: 'up'|'down' } — هر بازدیدکننده یک رأی به هر سؤال
//
// امنیت و صحت:
//  • visitorId = هش sha256(IP|UA) سمت سرور — کلاینت هیچ شناسه‌ای تحمیل نمی‌کند
//  • یکتایی در سطح دیتابیس: @@unique([faqId, visitorId]) — ضد رأی تکراری
//  • شمارندهٔ مرجع = FaqItem.helpfulYes/helpfulNo که فقط در همین تراکنش تغییر می‌کند
//  • رأی فقط برای سؤال «منتشرشده و بایگانی‌نشده» پذیرفته می‌شود (خطای 404 = رأی ثبت نشد)
//  • rate-limit ۲۰ رأی در ۱۰ دقیقه برای هر IP + گارد مبدأ/سقف بدنه
//  • پاسخ همیشه شمارنده‌های تازه از دیتابیس است — فرانت هرگز شمارنده را تعیین نمی‌کند
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { guardResponse } from '@/lib/http-guard'
import { reviewVisitorId } from '@/lib/review-visitor'

export const dynamic = 'force-dynamic'

const CUID_RE = /^[a-z0-9]{20,36}$/i

export async function GET(req: NextRequest) {
  try {
    const visitorId = reviewVisitorId(req)
    const votes = await db.faqVote.findMany({
      where: { visitorId },
      select: { faqId: true, vote: true },
      take: 500, // 🛡️ سقف دفاعی
    })
    const map: Record<string, string> = {}
    for (const v of votes) map[v.faqId] = v.vote
    return NextResponse.json({ votes: map })
  } catch (err) {
    console.error('[GET /api/faq/vote] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const rl = await rateLimit('faq-vote', req, 20, 600, 300)
  if (!rl.ok) return tooManyRequests(rl)
  const guard = guardResponse(req)
  if (guard) return guard

  try {
    const body = await req.json().catch(() => null)
    const id = typeof body?.id === 'string' ? body.id : ''
    const vote = body?.vote === 'up' ? 'up' : body?.vote === 'down' ? 'down' : null
    if (!CUID_RE.test(id) || !vote) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    const faq = await db.faqItem.findUnique({ where: { id } })
    if (!faq || !faq.published || faq.deletedAt) {
      // سؤال ناموجود/پیش‌نویس/بایگانی‌شده = رأی عمومی ندارد
      return NextResponse.json({ error: 'FAQ not found' }, { status: 404 })
    }

    const visitorId = reviewVisitorId(req)
    const existing = await db.faqVote.findUnique({
      where: { faqId_visitorId: { faqId: id, visitorId } },
    })
    if (existing) {
      // قبلاً رأی داده — هیچ تغییر دوم؛ شمارنده‌های واقعی برگردانده می‌شود
      return NextResponse.json({
        ok: true,
        vote: existing.vote,
        helpfulYes: faq.helpfulYes,
        helpfulNo: faq.helpfulNo,
        alreadyVoted: true,
      })
    }

    await db.$transaction([
      db.faqVote.create({ data: { faqId: id, visitorId, vote } }),
      db.faqItem.update({
        where: { id },
        data: vote === 'up' ? { helpfulYes: { increment: 1 } } : { helpfulNo: { increment: 1 } },
      }),
    ])
    const fresh = await db.faqItem.findUnique({
      where: { id },
      select: { helpfulYes: true, helpfulNo: true },
    })
    return NextResponse.json({
      ok: true,
      vote,
      helpfulYes: fresh?.helpfulYes ?? 0,
      helpfulNo: fresh?.helpfulNo ?? 0,
    })
  } catch (err) {
    console.error('[POST /api/faq/vote] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
