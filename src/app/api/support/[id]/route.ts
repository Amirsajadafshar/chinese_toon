import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { isAuthorized } from '@/lib/admin-auth'

// ---------------------------------------------------------------------------
//  تغییر وضعیت / حذف پیام پشتیبانی — فقط مدیریت
// ---------------------------------------------------------------------------

const patchSchema = z.object({
  status: z.enum(['new', 'in-progress', 'resolved']),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params
    const parsed = patchSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    const updated = await db.supportMessage.update({
      where: { id },
      data: { status: parsed.data.status },
    })
    return NextResponse.json({ ok: true, message: updated })
  } catch (err) {
    if ((err as { code?: string })?.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    console.error('[PATCH /api/support/:id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params
    await db.supportMessage.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/support/:id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
