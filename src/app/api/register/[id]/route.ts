import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { isAuthorized, getAdminActor } from '@/lib/admin-auth'
import { logAdminAction } from '@/lib/audit'

// ---------------------------------------------------------------------------
//  تغییر وضعیت / حذف درخواست ثبت‌نام — فقط مدیریت
// ---------------------------------------------------------------------------

const patchSchema = z.object({
  status: z.enum(['new', 'contacted', 'enrolled']),
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
    const updated = await db.registration.update({
      where: { id },
      data: { status: parsed.data.status },
    })
    // 🧾 فاز ۵۳ — Audit Log: تغییر وضعیت ثبت‌نام (مخصوصاً enrolled) (بند ۱۴)
    logAdminAction({ actor: getAdminActor(req), action: 'registration.status', targetType: 'registration', targetId: id, meta: { status: parsed.data.status, email: updated.email } })
    return NextResponse.json({ ok: true, registration: updated })
  } catch (err) {
    if ((err as { code?: string })?.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    console.error('[PATCH /api/register/:id] error:', err)
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
    // 🗄️ فاز ۵۲ (بند ۹) — حذف نرم: رکورد ثبت‌نام (سرنخ تجاری) هرگز سخت‌حذف
    // نمی‌شود؛ «حذف» یعنی بایگانی — تاریخچهٔ پیگیری و پیوند ClassSchedule سالم می‌ماند
    await db.registration.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
    return NextResponse.json({ ok: true, archived: true })
  } catch (err) {
    if ((err as { code?: string })?.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    console.error('[DELETE /api/register/:id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
