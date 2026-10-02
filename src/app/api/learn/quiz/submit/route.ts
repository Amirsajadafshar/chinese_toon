import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { guardResponse } from '@/lib/http-guard'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'

// ---------------------------------------------------------------------------
//  🧪 تسک ۸۲ — ثبت نتیجهٔ آزمون تعیین سطح
//  POST عمومی: کلاینت فقط {questionId, optionIndex} را می‌فرستد؛
//  نمره و باند **همیشه سمت سرور** از گزینه‌های واقعی دیتابیس محاسبه می‌شود —
//  دستکاری بدنهٔ درخواست هیچ اثری بر نتیجه ندارد (همان فلسفهٔ موتور قیمت).
//  باند بر اساس «درصد پیشرفت» است، پس با هر تعداد سؤال کار می‌کند.
// ---------------------------------------------------------------------------

const answerSchema = z.object({
  questionId: z.string().trim().min(1).max(64),
  optionIndex: z.number().int().min(0).max(5),
})

const submitSchema = z.object({
  answers: z.array(answerSchema).min(1).max(50),
})

function safeParseOptions(raw: string): { text: string; score: number }[] {
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((o) => o && typeof o.text === 'string' && typeof o.score === 'number')
      .map((o) => ({ text: o.text, score: o.score }))
  } catch {
    return []
  }
}

// درصد پیشرفت 0..1 → باند سطح؛ آستانه‌ها با فاصلهٔ مساوی بین کف و سقف
function bandFromPercent(pct: number): 'beginner' | 'elementary' | 'intermediate' {
  if (pct < 1 / 3) return 'beginner'
  if (pct < 2 / 3) return 'elementary'
  return 'intermediate'
}

export async function POST(req: NextRequest) {
  // ⛔️ ضداسپم: حداکثر ۲۰ ثبت در ۱۰ دقیقه برای هر IP
  const rl = rateLimit('quiz-submit', req, 20, 10 * 60, 10 * 60)
  if (!rl.ok) return tooManyRequests(rl)
  // 🛡️ گارد مبدأ + سقف حجم بدنه — هم‌خوان با بقیهٔ APIهای mutation
  const guard = guardResponse(req)
  if (guard) return guard

  try {
    const parsed = submitSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // فقط سؤالات منتشرشدهٔ واقعی دیتابیس ملاک هستند
    const ids = parsed.data.answers.map((a) => a.questionId)
    const questions = await db.quizQuestion.findMany({
      where: { id: { in: ids }, published: true },
    })
    const byId = new Map(questions.map((q) => [q.id, q]))

    let score = 0
    let maxScore = 0
    let minScore = 0
    const graded: { questionId: string; optionIndex: number; score: number }[] = []

    for (const a of parsed.data.answers) {
      const q = byId.get(a.questionId)
      if (!q) continue // سؤال ناموجود/پیش‌نویس → نادیده گرفته می‌شود
      const options = safeParseOptions(q.options)
      const opt = options[a.optionIndex]
      if (!opt) continue // ایندکس قلابی → نادیده
      score += opt.score
      maxScore += Math.max(...options.map((o) => o.score), 0)
      minScore += Math.min(...options.map((o) => o.score), 0)
      graded.push({ questionId: a.questionId, optionIndex: a.optionIndex, score: opt.score })
    }

    // اگر هیچ سؤال معتبری نبود — مثلاً همه‌چیز دستکاری شده بود
    if (graded.length === 0 || maxScore === 0) {
      return NextResponse.json({ error: 'No valid answers' }, { status: 400 })
    }

    const span = Math.max(maxScore - minScore, 1)
    const pct = Math.min(Math.max((score - minScore) / span, 0), 1)
    const band = bandFromPercent(pct)

    const attempt = await db.quizAttempt.create({
      data: {
        score,
        maxScore,
        band,
        answers: JSON.stringify(graded),
      },
    })

    return NextResponse.json(
      { ok: true, attemptId: attempt.id, score, maxScore, band },
      { status: 201 }
    )
  } catch (err) {
    console.error('[POST /api/learn/quiz/submit] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
