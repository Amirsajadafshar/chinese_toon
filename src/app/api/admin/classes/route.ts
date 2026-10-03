// ---------------------------------------------------------------------------
// 🎓 Admin Classes API — GET (فهرست) + POST (ایجاد) — فاز ۴۲
//
// امنیت:
//  • هر دو متد با isAuthorized (توکن پنل، هدر x-admin-key) گارد می‌شوند؛
//    کاربر عادی حتی با فراخوانی مستقیم API نمی‌تواند کلاس بسازد/ببیند.
//  • guardResponse (هوم‌مبدأ + سقف حجم بدنه) + rate limit.
//  • اعتبارسنجی کامل سمت سرور با zod (lib/classes/validation.ts) —
//    اعتبارسنجی مرورگر فقط UX است.
//  • slug/productId یکتا هستند؛ نقض یکتایی = 409 با پیام روشن (نه 500).
//
// قیمت: packagePrice (USD) تنها مبلغ مرجع سفارش‌های جدید است. تغییر آن فقط
// انتخاب‌های بعدی را عوض می‌کند — سفارش‌های موجود اسنپ‌شات خودشان را دارند.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isAuthorized, getAdminActor } from '@/lib/admin-auth'
import { logAdminAction } from '@/lib/audit'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { guardResponse } from '@/lib/http-guard'
import { bumpClassesVersion, REGISTER_LEVEL_KEYS, CLASS_STATUSES } from '@/lib/classes/store'
import { classPayloadSchema, dataFromPayload, zodFieldErrors, crossFieldErrors } from '@/lib/classes/validation'

export const dynamic = 'force-dynamic'

function isUniqueViolation(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: unknown }).code === 'P2002'
}

// ---------------------------------------------------------------------------
// GET — فهرست با جست‌وجو/فیلتر/مرتب‌سازی سمت دیتابیس (بدون کشیدن کل جدول به مرورگر)
// پارامترها: q, status, type, level (کلید ساخت‌یافته), availability (bookable|not-bookable),
//            sort (title|price|createdAt|updatedAt|status|sortOrder), dir (asc|desc), take
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const url = new URL(req.url)
    const q = (url.searchParams.get('q') ?? '').trim()
    const status = url.searchParams.get('status') ?? 'all'
    const type = url.searchParams.get('type') ?? 'all'
    const level = url.searchParams.get('level') ?? 'any'
    const availability = url.searchParams.get('availability') ?? 'all'
    const sort = url.searchParams.get('sort') ?? 'sortOrder'
    const dir = url.searchParams.get('dir') === 'desc' ? 'desc' : 'asc'
    const takeRaw = Number(url.searchParams.get('take') ?? '200')
    const take = Number.isFinite(takeRaw) ? Math.min(Math.max(Math.floor(takeRaw), 1), 500) : 200

    const where: Record<string, unknown> = {}
    if (q) {
      where.OR = [{ title: { contains: q } }, { slug: { contains: q } }, { level: { contains: q } }, { productId: { contains: q } }]
    }
    if ((CLASS_STATUSES as readonly string[]).includes(status)) where.status = status
    if (['group', 'private', 'both'].includes(type)) where.classType = type
    // ⚠️ «any» = بدون فیلتر؛ «all» مقدارِ معتبرِ DB است (کلاس همه‌سطح) — قاطی نشوند
    if (level && level !== 'any' && [...REGISTER_LEVEL_KEYS, 'all'].includes(level)) {
      where.registerLevels = { contains: `"${level}"` }
    }
    if (availability === 'bookable') {
      where.status = 'active'
      where.packagePrice = { gt: 0 }
    } else if (availability === 'not-bookable') {
      where.OR = [
        { status: { not: 'active' } },
        { packagePrice: { lte: 0 } },
      ]
    }

    const orderBy: Record<string, 'asc' | 'desc'> =
      sort === 'title'
        ? { title: dir }
        : sort === 'price'
          ? { packagePrice: dir }
          : sort === 'createdAt'
            ? { createdAt: dir }
            : sort === 'updatedAt'
              ? { updatedAt: dir }
              : sort === 'status'
                ? { status: dir }
                : { sortOrder: dir }

    const [rows, total, allRows] = await Promise.all([
      db.courseClass.findMany({ where: where as never, orderBy, take }),
      db.courseClass.count({ where: where as never }),
      db.courseClass.findMany({ select: { status: true } }),
    ])

    const counts: Record<string, number> = { active: 0, inactive: 0, draft: 0, full: 0, archived: 0 }
    for (const r of allRows) counts[r.status] = (counts[r.status] ?? 0) + 1

    return NextResponse.json({ classes: rows, total, counts })
  } catch (e) {
    console.error('[admin-classes] list failed:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// POST — ایجاد کلاس جدید (اعتبارسنجی کامل + یکتایی slug/productId + لاگ ممیزی)
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const guard = guardResponse(req)
  if (guard) return guard

  const rl = await rateLimit('admin-classes-write', req, 30, 600, 300)
  if (!rl.ok) return tooManyRequests(rl)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = classPayloadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', fields: zodFieldErrors(parsed.error) },
      { status: 400 }
    )
  }
  const crossErrs = crossFieldErrors(parsed.data)
  if (Object.keys(crossErrs).length > 0) {
    return NextResponse.json({ error: 'Validation failed', fields: crossErrs }, { status: 400 })
  }

  try {
    const created = await db.courseClass.create({ data: dataFromPayload(parsed.data) })
    bumpClassesVersion()
    console.info(
      `[admin-classes] CREATED "${created.title}" (slug=${created.slug}, product=${created.productId}, price=$${created.packagePrice.toFixed(2)}, status=${created.status})`
    )
    // 🧾 فاز ۵۳ — Audit Log (بند ۱۴)
    logAdminAction({ actor: getAdminActor(req), action: 'class.create', targetType: 'class', targetId: created.slug, meta: { title: created.title, productId: created.productId, price: created.packagePrice, status: created.status } })
    return NextResponse.json({ class: created }, { status: 201 })
  } catch (e) {
    if (isUniqueViolation(e)) {
      // تشخیص اینکه کدام فیلد تکراری است برای پیام دقیق
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
    console.error('[admin-classes] create failed:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
