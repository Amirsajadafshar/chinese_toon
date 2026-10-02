// ---------------------------------------------------------------------------
// ⚙️ /api/schedules/settings (فاز ۴۸) — تنظیمات قواعد برنامه‌ریزی
// GET  — عمومی‌های بی‌ضرر (برای نمایش فرم ادمین/برچسب‌ها) + ادمین کامل
// PUT  — فقط ادمین: فاصلهٔ حداقلی بین جلسات + مدت پیش‌فرض جلسه
// در SiteSetting (کلید scheduleSettings) ذخیره می‌شود — هیچ حالت فرانت‌اندی.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isAuthorized } from '@/lib/admin-auth'
import { guardResponse } from '@/lib/http-guard'
import { loadSchedulingSettings, saveSchedulingSettings } from '@/lib/schedule-service'
import { sanitizeSettings } from '@/lib/scheduling'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const settings = await loadSchedulingSettings()
  void req
  return NextResponse.json({ settings })
}

const putSchema = z.object({
  minSpacingMinutes: z.number().int().min(0).max(24 * 60),
  defaultSessionDurationMin: z.number().int().min(15).max(8 * 60),
})

export async function PUT(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const guard = guardResponse(req)
  if (guard) return guard
  try {
    const parsed = putSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
    }
    const clean = sanitizeSettings(parsed.data)
    await saveSchedulingSettings(clean)
    return NextResponse.json({ ok: true, settings: clean })
  } catch (err) {
    console.error('[PUT /api/schedules/settings] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
