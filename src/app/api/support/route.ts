import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { isAuthorized } from '@/lib/admin-auth'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'

// ثبت پیام جدید از فرم صفحهٔ Support
const supportSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().email().max(200),
  topic: z.string().trim().min(2).max(60).default('general'),
  message: z.string().trim().min(5).max(2000),
})

export async function POST(req: NextRequest) {
  // ⛔️ ضداسپم: حداکثر ۶ ارسال در ۱۰ دقیقه برای هر IP
  const rl = await rateLimit('support', req, 6, 10 * 60, 10 * 60)
  if (!rl.ok) return tooManyRequests(rl)


  try {
    const body = await req.json()
    const parsed = supportSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const saved = await db.supportMessage.create({ data: parsed.data })
    return NextResponse.json({ ok: true, id: saved.id }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/support] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// خواندن پیام‌های پشتیبانی (فقط با توکن مدیریت — برای پنل #/admin)
export async function GET(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const messages = await db.supportMessage.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500, // 🛡️ سقف دفاعی — پاسخ هرگز بی‌کران نیست
    })
    const newCount = messages.filter((m) => m.status === 'new').length
    return NextResponse.json({ messages, count: messages.length, newCount })
  } catch (err) {
    console.error('[GET /api/support] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
