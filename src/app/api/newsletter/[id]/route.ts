import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isAuthorized } from '@/lib/admin-auth'

// ---------------------------------------------------------------------------
//  حذف مشترک خبرنامه — فقط مدیریت
// ---------------------------------------------------------------------------

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params
    await db.newsletterSubscriber.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/newsletter/:id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
