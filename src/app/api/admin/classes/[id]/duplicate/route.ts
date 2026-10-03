// ---------------------------------------------------------------------------
// 🎓 POST /api/admin/classes/[id]/duplicate — رونوشت‌برداری از یک کلاس (فاز ۴۲)
//
// برای ساخت سریع کلاس مشابه. شناسه‌های یکتا (slug/productId) خودکار با پسوند
// «-copy» (و در صورت لزوم عدد) یکتا می‌شوند تا نقض unique رخ ندهد. رونوشت
// پیش‌فرض «draft» است تا تصادفاً عمومی نشود. تاریخ‌ها و وضعیت featured هم
// بازنویسی/ریست می‌شوند (رونوشت = نقطهٔ شروع، نه کپی کامل).
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isAuthorized } from '@/lib/admin-auth'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { guardResponse } from '@/lib/http-guard'
import { bumpClassesVersion } from '@/lib/classes/store'

export const dynamic = 'force-dynamic'

const CUID_RE = /^[a-z0-9]{20,36}$/i

async function uniqueSlug(base: string): Promise<string> {
  let candidate = `${base}-copy`.slice(0, 96)
  let n = 2
  // حلقهٔ قطعی — تا یافتن اولین slug آزاد (تعداد ردیف‌ها کوچک است)
  while (await db.courseClass.findUnique({ where: { slug: candidate } })) {
    candidate = `${base}-copy-${n}`.slice(0, 96)
    n++
    if (n > 50) {
      candidate = `${base}-copy-${Date.now()}`.slice(0, 96)
      break
    }
  }
  return candidate
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const guard = guardResponse(req)
  if (guard) return guard
  const rl = await rateLimit('admin-classes-write', req, 30, 600, 300)
  if (!rl.ok) return tooManyRequests(rl)

  const { id } = await params
  if (!CUID_RE.test(id)) {
    return NextResponse.json({ error: 'Class not found' }, { status: 404 })
  }

  try {
    const src = await db.courseClass.findUnique({ where: { id } })
    if (!src) return NextResponse.json({ error: 'Class not found' }, { status: 404 })

    const slugBase = src.slug.length > 90 ? src.slug.slice(0, 90) : src.slug
    const slug = await uniqueSlug(slugBase)
    const productIdBase = src.productId.length > 52 ? src.productId.slice(0, 52) : src.productId
    let productId = `${productIdBase}-copy`
    let pn = 2
    while (await db.courseClass.findUnique({ where: { productId } })) {
      productId = `${productIdBase}-copy-${pn}`
      pn++
      if (pn > 50) {
        productId = `${productIdBase}-copy-${Date.now()}`
        break
      }
    }

    const copy = await db.courseClass.create({
      data: {
        slug,
        productId,
        title: `${src.title} (Copy)`.slice(0, 120),
        shortDescription: src.shortDescription,
        fullDescription: src.fullDescription,
        category: src.category,
        status: 'draft', // رونوشت هرگز خودکار عمومی نمی‌شود
        featured: false,
        color: src.color,
        classType: src.classType,
        level: src.level,
        registerLevels: src.registerLevels,
        currency: src.currency,
        pricePerSession: src.pricePerSession,
        packageSessions: src.packageSessions,
        packagePrice: src.packagePrice,
        priceNote: src.priceNote,
        sessionDurationMin: src.sessionDurationMin,
        format: src.format,
        maxStudents: src.maxStudents,
        minStudents: src.minStudents,
        schedule: src.schedule,
        startDate: null,
        endDate: null,
        timezone: src.timezone,
        meta: src.meta,
        highlights: src.highlights,
        requirements: src.requirements,
        audience: src.audience,
        curriculum: src.curriculum,
        materials: src.materials,
        notes: src.notes,
        image: src.image,
        videoUrl: src.videoUrl,
        sortOrder: src.sortOrder + 1,
      },
    })
    console.info(`[admin-classes] DUPLICATED "${src.title}" → "${copy.title}" (slug=${copy.slug}, draft)`)
    bumpClassesVersion()
    return NextResponse.json({ class: copy }, { status: 201 })
  } catch (e) {
    console.error('[admin-classes] duplicate failed:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
