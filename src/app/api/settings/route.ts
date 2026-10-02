import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { isAuthorized, getAdminActor } from '@/lib/admin-auth'
import { logAdminAction } from '@/lib/audit'

// ---------------------------------------------------------------------------
//  ⚙️ تنظیمات سایت (کلید-مقدار JSON) — آنچه مالک از تب Settings پنل عوض می‌کند
//  GET عمومی: مقدارهای ذخیره‌شده (کلیدهای شناخته‌شده) — کلید غایب = پیش‌فرض فایل محتوا
//  PUT فقط مدیریت: { announcement?: {...}, homeStats?: [...] } — upsert هر کلید
// ---------------------------------------------------------------------------

const announcementSchema = z.object({
  enabled: z.boolean().default(true),
  id: z.string().trim().min(1).max(60), // نسخهٔ اعلان — با هر متن جدید عوض می‌شود تا نوار دوباره ظاهر شود
  emoji: z.string().trim().max(8).default('📣'),
  text: z.string().trim().min(3).max(300),
  ctaLabel: z.string().trim().min(1).max(60).default('Save my spot'),
  ctaPage: z
    .enum(['home', 'classes', 'learn', 'about', 'blog', 'reviews', 'support', 'register'])
    .default('register'),
})

// متن‌های هیروی صفحهٔ خانه — مالک از تب Settings ویرایش می‌کند (فاز ۲۲)
const heroSchema = z.object({
  badge: z.string().trim().min(2).max(60),
  titleTop: z.string().trim().min(2).max(80),
  titleMiddle: z.string().trim().min(1).max(80),
  titleHighlight: z.string().trim().min(1).max(80),
  subtitle: z.string().trim().min(10).max(300),
})

const statItemSchema = z.object({
  value: z.number().int().min(0).max(100_000_000),
  suffix: z.string().trim().max(8).default(''),
  label: z.string().trim().min(1).max(80),
})

const putSchema = z.object({
  announcement: announcementSchema.optional(),
  homeStats: z.array(statItemSchema).min(1).max(8).optional(),
  hero: heroSchema.optional(),
})

// پاسخ همیشه تازه خوانده شود (کش نشود) — مالک بلافاصله تغییرش را ببیند
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const rows = await db.siteSetting.findMany({
      where: { key: { in: ['announcement', 'homeStats', 'hero'] } },
    })
    const out: Record<string, unknown> = {}
    for (const row of rows) {
      try {
        out[row.key] = JSON.parse(row.value)
      } catch {
        // مقدار خراب — نادیده گرفته می‌شود (پیش‌فرض فایل محتوا استفاده می‌شود)
      }
    }
    return NextResponse.json({ settings: out })
  } catch (err) {
    console.error('[GET /api/settings] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const parsed = putSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const { announcement, homeStats, hero } = parsed.data
    const changedKeys: string[] = []
    if (announcement) {
      changedKeys.push('announcement')
      await db.siteSetting.upsert({
        where: { key: 'announcement' },
        create: { key: 'announcement', value: JSON.stringify(announcement) },
        update: { value: JSON.stringify(announcement) },
      })
    }
    if (homeStats) {
      await db.siteSetting.upsert({
        where: { key: 'homeStats' },
        create: { key: 'homeStats', value: JSON.stringify(homeStats) },
        update: { value: JSON.stringify(homeStats) },
      })
    }
    if (hero) {
      changedKeys.push('hero')
      await db.siteSetting.upsert({
        where: { key: 'hero' },
        create: { key: 'hero', value: JSON.stringify(hero) },
        update: { value: JSON.stringify(hero) },
      })
    }
    if (homeStats && !changedKeys.includes('homeStats')) changedKeys.push('homeStats')
    // 🧾 فاز ۵۳ — Audit Log: تغییر تنظیمات مهم سیستم (بند ۱۴) — فقط کلیدها، بدون محتوا
    if (changedKeys.length > 0) {
      logAdminAction({ actor: getAdminActor(req), action: 'settings.update', targetType: 'settings', targetId: changedKeys.join(','), meta: { keys: changedKeys.join(',') } })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[PUT /api/settings] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
