import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { isAuthorized } from '@/lib/admin-auth'

// ---------------------------------------------------------------------------
//  👩‍🏫 معلم‌های صفحهٔ About — مدیریت از پنل ادمین (تب Teachers)
//  GET عمومی: معلم‌های منتشرشده به‌ترتیب | خالی → فرانت از فایل محتوا استفاده می‌کند
//  POST/PATCH/DELETE: فقط مدیریت
// ---------------------------------------------------------------------------

// 🎬 یک نمونهٔ تدریس — ویدیو/صدا (لینک) یا متن/دیالوگ (متن)
const sampleSchema = z
  .object({
    kind: z.enum(['video', 'audio', 'text', 'dialog']),
    title: z.string().trim().min(1).max(120),
    url: z.string().trim().max(500).default(''),
    desc: z.string().trim().max(2000).default(''),
  })
  .superRefine((s, ctx) => {
    // ویدیو و صدا حتماً باید لینک http(s) معتبر داشته باشند
    if ((s.kind === 'video' || s.kind === 'audio') && !/^https?:\/\//i.test(s.url)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['url'], message: 'A valid http(s) URL is required for video/audio samples' })
    }
    // متن و دیالوگ حتماً باید توضیح داشته باشند
    if ((s.kind === 'text' || s.kind === 'dialog') && !s.desc) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['desc'], message: 'Description is required for text/dialog samples' })
    }
  })

const teacherSchema = z.object({
  name: z.string().trim().min(2).max(120),
  role: z.string().trim().min(2).max(160),
  bio: z.string().trim().max(1000).default(''),
  tag: z.string().trim().max(60).default(''),
  langs: z.string().trim().max(200).default('Chinese, English'),
  image: z.string().trim().max(500).optional().or(z.literal('')),
  // 🆕 رزومه و نمونهٔ تدریس
  resume: z.string().trim().max(4000).default(''),
  experienceYears: z.number().int().min(0).max(60).default(0),
  studentsTaught: z.number().int().min(0).max(100000).default(0),
  certificates: z.string().trim().max(1000).default(''),
  samples: z.array(sampleSchema).max(12).default([]),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  published: z.boolean().default(true),
})

export async function GET(req: NextRequest) {
  try {
    const admin = isAuthorized(req)
    const teachers = await db.teacher.findMany({
      where: admin ? {} : { published: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      take: 500, // 🛡️ سقف دفاعی — پاسخ هرگز بی‌کران نیست (فاز ۴۹)
    })
    return NextResponse.json({ teachers })
  } catch (err) {
    console.error('[GET /api/teachers] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const parsed = teacherSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const created = await db.teacher.create({
      data: {
        ...parsed.data,
        image: parsed.data.image || null,
        samples: JSON.stringify(parsed.data.samples), // نمونه‌ها به‌صورت JSON ذخیره می‌شوند
      },
    })
    return NextResponse.json({ ok: true, id: created.id }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/teachers] error:', err)
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
      await db.teacher.update({ where: { id }, data: { published: body.published } })
      return NextResponse.json({ ok: true })
    }

    const parsed = teacherSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    await db.teacher.update({
      where: { id },
      data: {
        ...parsed.data,
        image: parsed.data.image || null,
        samples: JSON.stringify(parsed.data.samples), // نمونه‌ها به‌صورت JSON ذخیره می‌شوند
      },
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[PATCH /api/teachers] error:', err)
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
    await db.teacher.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/teachers] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
