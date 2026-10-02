import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { guardResponse } from '@/lib/http-guard'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'

// ---------------------------------------------------------------------------
//  🧪 تسک ۸۲ — کپچر ایمیل (سرنخ) برای نتیجهٔ آزمون تعیین سطح
//  POST عمومی: {attemptId, email} → ایمیل به تلاش موجود وصل می‌شود.
//  صادقانه: فقط ذخیره در دیتابیس — ارسال ایمیل واقعی به RESEND_API_KEY نیاز دارد.
// ---------------------------------------------------------------------------

const leadSchema = z.object({
  attemptId: z.string().trim().min(8).max(64),
  email: z.string().trim().toLowerCase().email().max(160),
})

export async function POST(req: NextRequest) {
  // ⛔️ ضداسپم: حداکثر ۱۰ درخواست در ۱۰ دقیقه برای هر IP
  const rl = rateLimit('quiz-lead', req, 10, 10 * 60, 10 * 60)
  if (!rl.ok) return tooManyRequests(rl)
  const guard = guardResponse(req)
  if (guard) return guard

  try {
    const parsed = leadSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { attemptId, email } = parsed.data

    // اگر تلاش پیدا نشد → 404 صادقانه
    const attempt = await db.quizAttempt.findUnique({ where: { id: attemptId } })
    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    }

    // اگر ایمیل از قبل وصل بود → موفق (idempotent) — بدون رکورد تکراری
    if (attempt.email) {
      return NextResponse.json({ ok: true, already: true })
    }

    await db.quizAttempt.update({
      where: { id: attemptId },
      data: { email },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[POST /api/learn/quiz/lead] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
