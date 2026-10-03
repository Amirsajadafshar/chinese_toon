import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { isAuthorized } from '@/lib/admin-auth'

// ---------------------------------------------------------------------------
//  🗑️ حذف / ✏️ ویرایش تک‌مقاله — فقط مدیریت (مسیر /api/posts/:id)
//  پنل ادمین برای حذف مقاله از همین مسیر استفاده می‌کند
// ---------------------------------------------------------------------------

const patchSchema = z.object({
  published: z.boolean().optional(),
  title: z.string().trim().min(3).max(150).optional(),
  tag: z.enum(['news', 'culture', 'tips', 'hsk']).optional(),
  emoji: z.string().trim().min(1).max(8).optional(),
  color: z.enum(['sage', 'butter', 'peach']).optional(),
  image: z
    .string()
    .trim()
    .max(500)
    .nullable()
    .optional()
    .transform((v) => (v ? v : null)), // رشتهٔ خالی → null (کاور گرادیانی)
  excerpt: z.string().trim().min(10).max(300).optional(),
  content: z.string().trim().min(20).max(20000).optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params
    const parsed = patchSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    const updated = await db.post.update({ where: { id }, data: parsed.data })
    return NextResponse.json({ ok: true, post: updated })
  } catch (err) {
    if ((err as { code?: string })?.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    console.error('[PATCH /api/posts/:id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params
    await db.post.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    if ((err as { code?: string })?.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    console.error('[DELETE /api/posts/:id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
