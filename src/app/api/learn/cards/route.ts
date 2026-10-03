import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { isAuthorized } from '@/lib/admin-auth'

// ---------------------------------------------------------------------------
//  🃏 واژه‌های فلش‌کارت صفحهٔ Learn — مدیریت از پنل ادمین
//  GET عمومی: واژه‌های منتشرشده به‌ترتیب | خالی → فرانت از فایل محتوا استفاده می‌کند
//  POST/PATCH/DELETE: فقط مدیریت
// ---------------------------------------------------------------------------

const cardSchema = z.object({
  chinese: z.string().trim().min(1).max(20),
  pinyin: z.string().trim().min(1).max(80),
  meaning: z.string().trim().min(1).max(200),
  example: z.string().trim().max(300).optional().or(z.literal('')),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  published: z.boolean().default(true),
})

export async function GET(req: NextRequest) {
  try {
    const admin = await isAuthorized(req)
    const cards = await db.learnCard.findMany({
      where: admin ? {} : { published: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      take: 500, // 🛡️ سقف دفاعی — پاسخ هرگز بی‌کران نیست (فاز ۴۹)
    })
    return NextResponse.json({ cards })
  } catch (err) {
    console.error('[GET /api/learn/cards] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const parsed = cardSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const created = await db.learnCard.create({
      data: { ...parsed.data, example: parsed.data.example || null },
    })
    return NextResponse.json({ ok: true, id: created.id }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/learn/cards] error:', err)
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
      await db.learnCard.update({ where: { id }, data: { published: body.published } })
      return NextResponse.json({ ok: true })
    }

    const parsed = cardSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    await db.learnCard.update({
      where: { id },
      data: { ...parsed.data, example: parsed.data.example || null },
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[PATCH /api/learn/cards] error:', err)
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
    await db.learnCard.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/learn/cards] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
