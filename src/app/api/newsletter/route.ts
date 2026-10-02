import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { isAuthorized } from '@/lib/admin-auth'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'

const newsletterSchema = z.object({
  email: z.string().email().max(200),
})

export async function POST(req: NextRequest) {
  // ⛔️ ضداسپم: حداکثر ۶ ارسال در ۱۰ دقیقه برای هر IP
  const rl = rateLimit('newsletter', req, 6, 10 * 60, 10 * 60)
  if (!rl.ok) return tooManyRequests(rl)


  try {
    const body = await req.json()
    const parsed = newsletterSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid email', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { email } = parsed.data

    // اگر قبلاً ثبت‌نام کرده باشد خطا نمی‌دهیم — همان مشترک برمی‌گردد
    const saved = await db.newsletterSubscriber.upsert({
      where: { email: email.toLowerCase() },
      create: { email: email.toLowerCase() },
      update: {},
    })

    return NextResponse.json({ ok: true, id: saved.id }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/newsletter] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// خواندن مشترکان خبرنامه (فقط با توکن مدیریت — برای پنل #/admin)
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const subscribers = await db.newsletterSubscriber.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500, // 🛡️ سقف دفاعی — پاسخ هرگز بی‌کران نیست
    })
    return NextResponse.json({ subscribers, count: subscribers.length })
  } catch (err) {
    console.error('[GET /api/newsletter] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
