import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { isAuthorized } from '@/lib/admin-auth'

// ---------------------------------------------------------------------------
//  📚 درس‌های بخش Learn — کارت‌ها + واژه‌های داخل هر درس، همه از پنل ادمین
//  GET عمومی: درس‌های منتشرشده به‌ترتیب | خالی → فرانت از فایل محتوا استفاده می‌کند
//  POST/PATCH/DELETE: فقط مدیریت (words به‌صورت JSON ذخیره می‌شود)
// ---------------------------------------------------------------------------

const wordSchema = z.object({
  chinese: z.string().trim().min(1).max(30),
  pinyin: z.string().trim().min(1).max(120),
  meaning: z.string().trim().min(1).max(200),
  example: z.string().trim().max(300).optional().or(z.literal('')),
})

const lessonSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'slug must be lowercase letters/numbers/dashes'),
  title: z.string().trim().min(2).max(160),
  text: z.string().trim().max(400).default(''),
  subtitle: z.string().trim().max(400).default(''),
  big: z.string().trim().max(20).default(''),
  small: z.string().trim().max(80).default(''),
  tag: z.string().trim().max(60).default(''),
  category: z.string().trim().max(80).default('vocabulary'),
  color: z.enum(['sage', 'butter', 'peach', 'cream']).default('sage'),
  action: z.string().trim().max(30).default('Learn'),
  isVideo: z.boolean().default(false),
  words: z.array(wordSchema).max(60).default([]),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  published: z.boolean().default(true),
})

type LessonInput = z.infer<typeof lessonSchema>

// پاسخ همیشه تازه خوانده شود (کش نشود) — تغییرات پنل فوراً در سایت دیده شود
export const dynamic = 'force-dynamic'

function serialize(data: LessonInput) {
  return {
    ...data,
    words: JSON.stringify(
      data.words.map((w) => ({ ...w, example: w.example || undefined }))
    ),
  }
}

export async function GET(req: NextRequest) {
  try {
    const admin = await isAuthorized(req)
    const lessons = await db.lesson.findMany({
      where: admin ? {} : { published: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      take: 500, // 🛡️ سقف دفاعی — پاسخ هرگز بی‌کران نیست (فاز ۴۹)
    })
    // words از JSON به آرایه تبدیل شود
    return NextResponse.json({
      lessons: lessons.map((l) => ({ ...l, words: safeParseWords(l.words) })),
    })
  } catch (err) {
    console.error('[GET /api/learn/lessons] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const parsed = lessonSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const exists = await db.lesson.findUnique({ where: { slug: parsed.data.slug } })
    if (exists) {
      return NextResponse.json(
        { error: 'Duplicate slug — another lesson uses this link key.' },
        { status: 409 }
      )
    }
    const created = await db.lesson.create({ data: serialize(parsed.data) })
    return NextResponse.json({ ok: true, id: created.id }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/learn/lessons] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await req.json()
    const id = typeof body?.id === 'string' ? body.id : ''
    if (!id) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

    // حالت سریع: فقط تغییر انتشار
    if (typeof body?.published === 'boolean' && Object.keys(body).length === 2) {
      await db.lesson.update({ where: { id }, data: { published: body.published } })
      return NextResponse.json({ ok: true })
    }

    const parsed = lessonSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    // اگر slug عوض شده، مطمئن شویم تکراری نیست
    const clash = await db.lesson.findFirst({
      where: { slug: parsed.data.slug, NOT: { id } },
      select: { id: true },
    })
    if (clash) {
      return NextResponse.json(
        { error: 'Duplicate slug — another lesson uses this link key.' },
        { status: 409 }
      )
    }
    await db.lesson.update({ where: { id }, data: serialize(parsed.data) })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[PATCH /api/learn/lessons] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await req.json().catch(() => null)
    const id = typeof body?.id === 'string' ? body.id : ''
    if (!id) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    await db.lesson.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/learn/lessons] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function safeParseWords(raw: string): { chinese: string; pinyin: string; meaning: string; example?: string }[] {
  try {
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}
