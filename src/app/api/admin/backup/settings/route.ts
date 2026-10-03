// ---------------------------------------------------------------------------
// 💾 PUT /api/admin/backup/settings — پیکربندی پشتیبان‌گیری خودکار (بند 10-A/B)
// body: { enabled?: boolean, intervalHours?: number(1-720), retentionCount?: number(3-100) }
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isAuthorized, getAdminActor } from '@/lib/admin-auth'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { guardResponse } from '@/lib/http-guard'
import { getBackupSettings, saveBackupSettings } from '@/lib/backup/service'
import { logAdminAction } from '@/lib/audit'

export const dynamic = 'force-dynamic'

const settingsSchema = z.object({
  enabled: z.boolean().optional(),
  intervalHours: z.number().int().min(1).max(720).optional(),
  retentionCount: z.number().int().min(3).max(100).optional(),
})

export async function PUT(req: NextRequest) {
  if (!(await isAuthorized(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const guard = guardResponse(req)
  if (guard) return guard
  const rl = await rateLimit('backup-settings', req, 20, 600, 300)
  if (!rl.ok) return tooManyRequests(rl)
  try {
    const parsed = settingsSchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid settings — intervalHours must be 1-720, retentionCount must be 3-100',
          details: parsed.error.flatten(),
        },
        { status: 400 }
      )
    }
    const settings = await saveBackupSettings(parsed.data)
    // 🧾 فاز ۵۳ — Audit Log: تغییر تنظیمات پشتیبان‌گیری (بند ۱۴)
    logAdminAction({ actor: getAdminActor(req), action: 'backup.settings', targetType: 'settings', targetId: 'backupSettings', meta: { enabled: settings.enabled, intervalHours: settings.intervalHours, retentionCount: settings.retentionCount } })
    return NextResponse.json({ ok: true, settings })
  } catch (e) {
    console.error('[PUT /api/admin/backup/settings] error:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Failed to save backup settings' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  if (!(await isAuthorized(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const settings = await getBackupSettings()
  return NextResponse.json({ settings })
}
