// ---------------------------------------------------------------------------
// ⚠️ POST /api/admin/backup/restore — بازیابی مخرب (فاز ۵۲ — بند 10-D/H)
//
// بدنه: { backupId: string, confirm: "RESTORE" } — بدون رشتهٔ تأییدِ دقیق رد می‌شود.
// زنجیرهٔ ایمنی داخل سرویس: اعتبارسنجی فایل → integrity_check روی کپی موقت →
// پشتیبان ایمنی PRE_RESTORE از وضعیت فعلی (fail-closed) → جایگزینی → راستی‌آزمایی.
// محدود نرخ: حداکثر ۳ بار در ۱۰ دقیقه.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isAuthorized, getAdminActor } from '@/lib/admin-auth'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { guardResponse } from '@/lib/http-guard'
import { restoreBackup } from '@/lib/backup/service'
import { logAdminAction } from '@/lib/audit'

export const dynamic = 'force-dynamic'

const restoreSchema = z.object({
  backupId: z.string().trim().min(10).max(60),
  confirm: z.literal('RESTORE'),
})

export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const guard = guardResponse(req)
  if (guard) return guard
  const rl = await rateLimit('backup-restore', req, 3, 600, 600)
  if (!rl.ok) return tooManyRequests(rl)
  try {
    const parsed = restoreSchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request — backupId and confirm:"RESTORE" are required' },
        { status: 400 }
      )
    }
    const result = await restoreBackup(parsed.data.backupId)
    // 🧾 فاز ۵۳ — Audit Log: بازیابی دیتابیس — اقدام حیاتی با ردپای کامل (بند ۱۴)
    logAdminAction({
      actor: getAdminActor(req),
      action: 'backup.restore',
      targetType: 'backup',
      targetId: result.restoredFrom ?? parsed.data.backupId,
      meta: { ok: result.ok, safetyBackupId: result.safetyBackupId ?? null, error: result.error ?? null },
    })
    // شکست صادقانه — حتی اگر فقط راستی‌آزمایی پس از نوشتن شکست بخورد
    return NextResponse.json(result, { status: result.ok ? 200 : 500 })
  } catch (e) {
    console.error('[POST /api/admin/backup/restore] error:', e instanceof Error ? e.message : e)
    return NextResponse.json({ ok: false, error: 'Restore failed unexpectedly' }, { status: 500 })
  }
}
