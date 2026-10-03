import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { guardResponse } from '@/lib/http-guard'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'

// ---------------------------------------------------------------------------
//  شمارندهٔ بازدید مقاله — POST { slug } → views + 1
//  عمومی است (بدون توکن) ولی فقط برای مقاله‌های منتشرشده اعمال می‌شود.
//  سمت کلاینت هر بازدید در هر نشست (sessionStorage) فقط یک‌بار شمرده می‌شود.
//
//  🛡️ سخت‌سازی امنیتی (فاز ۴۹):
//   • guardResponse — هم‌مبدأ + سقف حجم بدنه (mutation کوچک عمومی)
//   • rate limit — ۳۰ درخواست در ۱۰ دقیقه برای هر IP (نرمال: هر مقاله هر نشست
//     یک‌بار؛ سقف فقط برای جلوگیری از تورم شمارنده و فشار نوشتن روی SQLite)
//   • افزایش «اتمی» و فقط برای published: updateMany با شرط published:true —
//     مقالهٔ پیش‌نویس هرگز increment/decrement دوبخشی و بی‌اتم نمی‌شود.
// ---------------------------------------------------------------------------

const viewSchema = z.object({
  slug: z.string().trim().min(1).max(200),
})

export async function POST(req: NextRequest) {
  const guard = guardResponse(req)
  if (guard) return guard

  const rl = await rateLimit('post-view', req, 30, 600, 300)
  if (!rl.ok) return tooManyRequests(rl)

  try {
    const body = await req.json()
    const parsed = viewSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    // افزایش اتمی فقط برای مقالهٔ منتشرشده — پیش‌نویس اصلاً لمس نمی‌شود
    const res = await db.post.updateMany({
      where: { slug: parsed.data.slug, published: true },
      data: { views: { increment: 1 } },
    })
    if (res.count === 0) {
      const exists = await db.post.findUnique({
        where: { slug: parsed.data.slug },
        select: { id: true },
      })
      if (!exists) {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 })
      }
      // مقالهٔ پیش‌نویس — بدون شمارش
      return NextResponse.json({ ok: true, counted: false })
    }
    const row = await db.post.findUnique({
      where: { slug: parsed.data.slug },
      select: { views: true },
    })
    return NextResponse.json({ ok: true, views: row?.views ?? null, counted: true })
  } catch (err) {
    // P2025 = مقاله پیدا نشد — خطای عادی محسوب می‌شود
    if ((err as { code?: string })?.code === 'P2025') {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }
    console.error('[POST /api/posts/view] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
