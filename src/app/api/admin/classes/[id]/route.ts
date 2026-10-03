// ---------------------------------------------------------------------------
// 🎓 Admin Class API — GET / PUT / PATCH / DELETE برای یک کلاس (فاز ۴۲)
//
// امنیت: همهٔ متدها با isAuthorized (x-admin-key) گارد می‌شوند + guardResponse.
//
// قواعد مهم:
//  • PUT کل فیلدها را با همان اعتبارسنجی سمت سرور به‌روز می‌کند؛ updatedAt
//    به‌طور خودکار تغییر می‌کند (Prisma @updatedAt).
//  • PATCH فقط وضعیت را عوض می‌کند (toggle سریع در فهرست).
//  • DELETE «امن» است: اگر سفارش (UsdtOrder) یا ثبت‌نام (Registration) به این
//    کلاس اشاره کند، حذف دائمی رد می‌شود (409) و پیشنهاد بایگانی داده می‌شود؛
//    سفارش‌های تاریخی هرگز به‌خاطر حذف کلاس آسیب نمی‌بینند (اسنپ‌شات مستقل‌اند).
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { isAuthorized, getAdminActor } from '@/lib/admin-auth'
import { logAdminAction } from '@/lib/audit'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { guardResponse } from '@/lib/http-guard'
import { bumpClassesVersion, CLASS_STATUSES } from '@/lib/classes/store'
import { classPayloadSchema, dataFromPayload, zodFieldErrors, crossFieldErrors } from '@/lib/classes/validation'

export const dynamic = 'force-dynamic'

const CUID_RE = /^[a-z0-9]{20,36}$/i

const statusOnlySchema = z.object({
  status: z.enum(CLASS_STATUSES),
})

function isUniqueViolation(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: unknown }).code === 'P2002'
}

async function findClass(id: string) {
  if (!CUID_RE.test(id)) return null
  return db.courseClass.findUnique({ where: { id } })
}

// GET — جزئیات کامل برای فرم ویرایش
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  try {
    const row = await findClass(id)
    if (!row) return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    return NextResponse.json({ class: row })
  } catch (e) {
    console.error('[admin-classes] get failed:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// PUT — ویرایش کامل
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const guard = guardResponse(req)
  if (guard) return guard
  const rl = await rateLimit('admin-classes-write', req, 60, 600, 300)
  if (!rl.ok) return tooManyRequests(rl)

  const { id } = await params
  try {
    const existing = await findClass(id)
    if (!existing) return NextResponse.json({ error: 'Class not found' }, { status: 404 })

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    const parsed = classPayloadSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', fields: zodFieldErrors(parsed.error) }, { status: 400 })
    }
    const crossErrs = crossFieldErrors(parsed.data)
    if (Object.keys(crossErrs).length > 0) {
      return NextResponse.json({ error: 'Validation failed', fields: crossErrs }, { status: 400 })
    }

    const data = dataFromPayload(parsed.data)

    // 🔒 قفل productId پس از اولین سفارش (فاز ۴۴) — لینک‌های چک‌اوت و
    // اسنپ‌شات سفارش‌های تاریخی به این شناسه وابسته‌اند؛ تغییرش یعنی سفارش‌های
    // قدیمی دیگر به هیچ کلاسی وصل نمی‌شوند. اگر سفارشی هست → 409 فیلدی.
    if (data.productId !== existing.productId) {
      const orderCount = await db.usdtOrder.count({ where: { productId: existing.productId } })
      if (orderCount > 0) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            fields: {
              productId: `This product ID is locked — ${orderCount} existing order(s) reference it. Keep the current ID, or archive this class and create a new one.`,
            },
          },
          { status: 409 }
        )
      }
      console.info(
        `[admin-classes] PRODUCT ID CHANGED "${existing.title}": ${existing.productId} → ${data.productId} (no orders referenced the old ID)`
      )
    }

    const updated = await db.courseClass.update({ where: { id: existing.id }, data })

    // 🧾 لاگ ممیزی — مخصوصاً تغییر قیمت (هیچ سفارش تاریخی‌ای با این تغییر عوض نمی‌شود)
    if (Math.abs(updated.packagePrice - existing.packagePrice) > 0.004) {
      console.info(
        `[admin-classes] PRICE CHANGED "${updated.title}" (product=${updated.productId}): $${existing.packagePrice.toFixed(2)} → $${updated.packagePrice.toFixed(2)} — existing orders keep their original snapshot`
      )
    }
    const contentChanged =
      updated.title !== existing.title ||
      updated.shortDescription !== existing.shortDescription ||
      updated.highlights !== existing.highlights ||
      updated.fullDescription !== existing.fullDescription
    console.info(
      `[admin-classes] UPDATED "${updated.title}" (slug=${updated.slug}, status=${updated.status}, price=$${updated.packagePrice.toFixed(2)}${contentChanged ? ', content changed' : ''})`
    )

    bumpClassesVersion()
    // 🧾 فاز ۵۳ — Audit Log: ویرایش کلاس (شامل تغییر قیمت — قبل/بعد) (بند ۱۴)
    logAdminAction({
      actor: getAdminActor(req),
      action: 'class.update',
      targetType: 'class',
      targetId: updated.slug,
      meta: {
        title: updated.title,
        priceBefore: existing.packagePrice,
        priceAfter: updated.packagePrice,
        status: updated.status,
      },
    })
    return NextResponse.json({ class: updated })
  } catch (e) {
    if (isUniqueViolation(e)) {
      const msg = e instanceof Error ? e.message : ''
      const field = msg.includes('productId') ? 'productId' : 'slug'
      return NextResponse.json(
        {
          error: 'Duplicate value',
          fields: {
            [field]:
              field === 'slug'
                ? 'This URL slug is already used by another class'
                : 'This product ID is already used by another class',
          },
        },
        { status: 409 }
      )
    }
    console.error('[admin-classes] update failed:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// PATCH — تغییر سریع وضعیت
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const guard = guardResponse(req)
  if (guard) return guard
  const rl = await rateLimit('admin-classes-write', req, 60, 600, 300)
  if (!rl.ok) return tooManyRequests(rl)

  const { id } = await params
  try {
    const existing = await findClass(id)
    if (!existing) return NextResponse.json({ error: 'Class not found' }, { status: 404 })

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    const parsed = statusOnlySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
    }

    const updated = await db.courseClass.update({
      where: { id: existing.id },
      data: { status: parsed.data.status },
    })
    console.info(`[admin-classes] STATUS "${updated.title}": ${existing.status} → ${updated.status}`)
    // 🧾 فاز ۵۳ — Audit Log: تغییر وضعیت/غیرفعال‌سازی/بایگانی کلاس (بند ۱۴)
    logAdminAction({ actor: getAdminActor(req), action: 'class.status', targetType: 'class', targetId: updated.slug, meta: { title: updated.title, from: existing.status, to: updated.status } })
    bumpClassesVersion()
    return NextResponse.json({ class: updated })
  } catch (e) {
    console.error('[admin-classes] status change failed:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// DELETE — حذف امن (با گارد ارجاع سفارش/ثبت‌نام)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const guard = guardResponse(req)
  if (guard) return guard
  const rl = await rateLimit('admin-classes-write', req, 30, 600, 300)
  if (!rl.ok) return tooManyRequests(rl)

  const { id } = await params
  try {
    const existing = await findClass(id)
    if (!existing) return NextResponse.json({ error: 'Class not found' }, { status: 404 })

    // 🛡️ حذف دائمی فقط وقتی امن است — سفارش/ثبت‌نامِ موجود = بایگانی به‌جای حذف
    const [orderCount, registrationCount] = await Promise.all([
      db.usdtOrder.count({ where: { productId: existing.productId } }),
      db.registration.count({ where: { classTitle: existing.title } }),
    ])
    if (orderCount > 0 || registrationCount > 0) {
      return NextResponse.json(
        {
          error: 'CLASS_IN_USE',
          message: `This class cannot be permanently deleted — it is referenced by ${orderCount} order(s) and ${registrationCount} registration(s). Archive or deactivate it instead to keep historical records intact.`,
          orderCount,
          registrationCount,
        },
        { status: 409 }
      )
    }

    await db.courseClass.delete({ where: { id: existing.id } })
    console.info(`[admin-classes] DELETED "${existing.title}" (slug=${existing.slug}) — no orders/registrations referenced it`)
    // 🧾 فاز ۵۳ — Audit Log (بند ۱۴)
    logAdminAction({ actor: getAdminActor(req), action: 'class.delete', targetType: 'class', targetId: existing.slug, meta: { title: existing.title } })
    bumpClassesVersion()
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[admin-classes] delete failed:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
