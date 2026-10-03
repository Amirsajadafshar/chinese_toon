import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { isAuthorized } from '@/lib/admin-auth'

// ---------------------------------------------------------------------------
//  وبلاگ: GET عمومی (فقط منتشرشده‌ها) + GET با هدر مدیریت (همه) + POST مدیریت
// ---------------------------------------------------------------------------

const postSchema = z.object({
  title: z.string().trim().min(3).max(150),
  tag: z.enum(['news', 'culture', 'tips', 'hsk']).default('news'),
  emoji: z.string().trim().min(1).max(8).default('📝'),
  color: z.enum(['sage', 'butter', 'peach']).default('sage'),
  // تصویر کاور اختیاری — آدرس داخلی (/images/...) یا لینک کامل
  image: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === '' || v.startsWith('/') || /^https?:\/\//.test(v), {
      message: 'Image must be a local path or an http(s) URL',
    })
    .optional()
    .transform((v) => (v ? v : null)),
  excerpt: z.string().trim().min(10).max(300),
  content: z.string().trim().min(20).max(20000),
  published: z.boolean().default(true),
})

// ساخت slug یکتا از عنوان
function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60)
  const suffix = Math.random().toString(36).slice(2, 7)
  return `${base || 'post'}-${suffix}`
}

export async function GET(req: NextRequest) {
  const admin = await isAuthorized(req)
  try {
    const posts = await db.post.findMany({
      where: admin ? {} : { published: true },
      orderBy: { createdAt: 'desc' },
      take: 200, // 🛡️ سقف دفاعی — پاسخ هرگز بی‌کران نیست (فاز ۴۹)
    })
    return NextResponse.json({
      posts,
      count: posts.length,
      publishedCount: posts.filter((p) => p.published).length,
    })
  } catch (err) {
    console.error('[GET /api/posts] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await req.json()
    const parsed = postSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const created = await db.post.create({
      data: { ...parsed.data, slug: slugify(parsed.data.title) },
    })
    return NextResponse.json({ ok: true, post: created }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/posts] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ویرایش پست (انتشار/لغو انتشار یا ویرایش متن) — فقط مدیریت
const patchSchema = z.object({
  title: z.string().trim().min(3).max(150).optional(),
  tag: z.enum(['news', 'culture', 'tips', 'hsk']).optional(),
  emoji: z.string().trim().min(1).max(8).optional(),
  color: z.enum(['sage', 'butter', 'peach']).optional(),
  image: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === '' || v.startsWith('/') || /^https?:\/\//.test(v), {
      message: 'Image must be a local path or an http(s) URL',
    })
    .optional()
    .transform((v) => (v === '' ? null : v)),
  excerpt: z.string().trim().min(10).max(300).optional(),
  content: z.string().trim().min(20).max(20000).optional(),
  published: z.boolean().optional(),
})

export async function PATCH(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await req.json()
    const { id, ...fields } = { ...body } as { id?: string }
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }
    const parsed = patchSchema.safeParse(fields)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const updated = await db.post.update({ where: { id }, data: parsed.data })
    return NextResponse.json({ ok: true, post: updated })
  } catch (err) {
    console.error('[PATCH /api/posts] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }
    await db.post.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/posts] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
