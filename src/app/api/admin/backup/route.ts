// ---------------------------------------------------------------------------
// 💾 /api/admin/backup — مدیریت پشتیبان‌گیری دیتابیس (فاز ۵۲ — بند 10-C)
// GET  — تنظیمات + آمار + فهرست نسخه‌ها (فقط متادیتا؛ خود فایل هرگز سرو نمی‌شود)
// POST — «Create Backup Now» — بدون حذف نسخه‌های موجود (فقط سیاست نگهداری)
// امنیت: isAuthorized (سشن ادمین) + guardResponse + rate-limit
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { isAuthorized, getAdminActor } from '@/lib/admin-auth'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { guardResponse } from '@/lib/http-guard'
import { createBackup, getBackupSettings, listBackups } from '@/lib/backup/service'
import { logAdminAction } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const [settings, list] = await Promise.all([getBackupSettings(), listBackups()])
    return NextResponse.json({ settings, ...list })
  } catch (e) {
    console.error('[GET /api/admin/backup] error:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Failed to load backup status' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const guard = guardResponse(req)
  if (guard) return guard
  // حداکثر ۶ پشتیبان دستی در ۱۰ دقیقه
  const rl = rateLimit('backup-create', req, 6, 600, 300)
  if (!rl.ok) return tooManyRequests(rl)
  try {
    const result = await createBackup('MANUAL')
    if (!result.ok) {
      // شکست صادقانه گزارش می‌شود — هرگز موفقیت ساختگی نیست
      return NextResponse.json({ ok: false, error: result.error ?? 'Backup failed' }, { status: 500 })
    }
    // 🧾 فاز ۵۳ — Audit Log: ساخت پشتیبان (بند ۱۴)
    logAdminAction({ actor: getAdminActor(req), action: 'backup.create', targetType: 'backup', targetId: result.filename ?? '', meta: { trigger: 'MANUAL', sizeBytes: result.sizeBytes ?? null } })
    return NextResponse.json({ ok: true, backup: result })
  } catch (e) {
    console.error('[POST /api/admin/backup] error:', e instanceof Error ? e.message : e)
    return NextResponse.json({ ok: false, error: 'Backup failed unexpectedly' }, { status: 500 })
  }
}
