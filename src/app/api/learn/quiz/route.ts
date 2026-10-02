import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { isAuthorized } from '@/lib/admin-auth'

// ---------------------------------------------------------------------------
//  🧩 سؤالات آزمون تعیین سطح صفحهٔ Learn — مدیریت از پنل ادمین
//  GET عمومی: سؤالات منتشرشده به‌ترتیب | خالی → فرانت از فایل محتوا استفاده می‌کند
//  POST/PATCH/DELETE: فقط مدیریت
//  گزینه‌ها JSON: [{"text":"...","score":1}, …] با ۲ تا ۶ گزینه
// ---------------------------------------------------------------------------

const optionSchema = z.object({
  text: z.string().trim().min(1).max(200),
  score: z.number().int().min(0).max(100),
})

const quizSchema = z.object({
  question: z.string().trim().min(3).max(300),
  options: z.array(optionSchema).min(2).max(6),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  published: z.boolean().default(true),
})

export async function GET(req: NextRequest) {
  try {
    const admin = isAuthorized(req)
    const questions = await db.quizQuestion.findMany({
      where: admin ? {} : { published: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      take: 500, // 🛡️ سقف دفاعی — پاسخ هرگز بی‌کران نیست (فاز ۴۹)
    })
    // گزینه‌ها از JSON به آبجکت تبدیل می‌شوند
    const parsed = questions.map((q) => ({
      id: q.id,
      question: q.question,
      options: safeParseOptions(q.options),
      sortOrder: q.sortOrder,
      published: q.published,
    }))
    return NextResponse.json({ questions: parsed })
  } catch (err) {
    console.error('[GET /api/learn/quiz] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const parsed = quizSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const created = await db.quizQuestion.create({
      data: {
        question: parsed.data.question,
        options: JSON.stringify(parsed.data.options),
        sortOrder: parsed.data.sortOrder,
        published: parsed.data.published,
      },
    })
    return NextResponse.json({ ok: true, id: created.id }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/learn/quiz] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await req.json()
    const id = typeof body?.id === 'string' ? body.id : ''
    if (!id) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

    // حالت سریع: فقط تغییر انتشار
    if (typeof body?.published === 'boolean' && Object.keys(body).length === 2) {
      await db.quizQuestion.update({ where: { id }, data: { published: body.published } })
      return NextResponse.json({ ok: true })
    }

    const parsed = quizSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    await db.quizQuestion.update({
      where: { id },
      data: {
        question: parsed.data.question,
        options: JSON.stringify(parsed.data.options),
        sortOrder: parsed.data.sortOrder,
        published: parsed.data.published,
      },
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[PATCH /api/learn/quiz] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await req.json().catch(() => null)
    const id = typeof body?.id === 'string' ? body.id : ''
    if (!id) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    await db.quizQuestion.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/learn/quiz] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function safeParseOptions(raw: string): { text: string; score: number }[] {
  try {
    const arr = JSON.parse(raw)
    if (Array.isArray(arr)) {
      return arr
        .filter((o) => o && typeof o.text === 'string' && typeof o.score === 'number')
        .map((o) => ({ text: o.text, score: o.score }))
    }
  } catch {
    // JSON خراب → خالی
  }
  return []
}
