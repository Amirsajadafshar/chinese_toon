'use client'

// ---------------------------------------------------------------------------
// 💾 تب Backup پنل ادمین (فاز ۵۲ — بند 10-C/D)
//
//  • وضعیت پشتیبان‌گیری: آخرین موفق/ناموفق، تعداد نسخه‌ها، حجم کل
//  • Create Backup Now (بدون حذف نسخه‌های نگه‌داشته‌شده)
//  • تنظیمات پشتیبان خودکار: فعال/غیرفعال، فاصلهٔ ساعت، تعداد نسخه (retention)
//  • Restore: دیالوگ هشدار + تأیید صریح — عملیات مخرب سمت سرور انجام می‌شود
//    (پشتیبان ایمنی قبل از جایگزینی خودکار ساخته می‌شود)
// امنیت: همهٔ مسیرها با سشن ادمین گارد شده‌اند؛ فایل پشتیبان هرگز دانلود/سرو
// نمی‌شود — فقط متادیتا.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  DatabaseBackup,
  HardDriveDownload,
  History,
  Loader2,
  RotateCcw,
  Save,
  Timer,
  XCircle,
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface BackupRow {
  id: string
  filename: string
  status: string
  trigger: string
  startedAt: string
  completedAt: string | null
  durationMs: number | null
  sizeBytes: number | null
  fileExists: boolean
  error: string | null
}

interface BackupData {
  settings: { enabled: boolean; intervalHours: number; retentionCount: number }
  backups: BackupRow[]
  stats: {
    lastSuccess: { at: string; filename: string; sizeBytes: number | null } | null
    lastFailed: { at: string; error: string } | null
    versions: number
    totalSizeBytes: number
  }
}

const TRIGGER_LABEL: Record<string, string> = {
  SCHEDULED: 'Automatic',
  MANUAL: 'Manual',
  PRE_RESTORE: 'Safety (pre-restore)',
}

function fmtBytes(n: number | null): string {
  if (n === null || n <= 0) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
}

const inputCls =
  'w-full bg-white border border-sage-light/40 rounded-xl px-3.5 py-2.5 text-sm text-brown-dark focus:outline-none focus:ring-2 focus:ring-sage/40 focus:border-sage transition-colors'

export function BackupAdminTab({ token, onToast }: { token: string; onToast?: (m: string) => void }) {
  const [data, setData] = useState<BackupData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [enabled, setEnabled] = useState(true)
  const [intervalHours, setIntervalHours] = useState(24)
  const [retentionCount, setRetentionCount] = useState(10)
  const [restoreTarget, setRestoreTarget] = useState<BackupRow | null>(null)
  const [restoring, setRestoring] = useState(false)

  const load = useCallback(async () => {
    setError('')
    try {
      const res = await fetch('/api/admin/backup', { headers: { 'x-admin-key': token }, cache: 'no-store' })
      if (res.status === 401) {
        setError('Session expired — please sign in again.')
        return
      }
      if (!res.ok) {
        setError('Could not load backup status.')
        return
      }
      const d = (await res.json()) as BackupData
      setData(d)
      setEnabled(d.settings.enabled)
      setIntervalHours(d.settings.intervalHours)
      setRetentionCount(d.settings.retentionCount)
    } catch {
      setError('Could not load backup status.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void load()
  }, [load])

  const createNow = async () => {
    setCreating(true)
    try {
      const res = await fetch('/api/admin/backup', { method: 'POST', headers: { 'x-admin-key': token } })
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; backup?: { filename: string } }
      if (res.ok && d.ok) {
        onToast?.(`Backup created ✓ ${d.backup?.filename ?? ''}`)
        await load()
      } else {
        onToast?.(`Backup failed: ${d.error ?? 'unknown error'}`)
        await load()
      }
    } catch {
      onToast?.('Backup failed — network error.')
    } finally {
      setCreating(false)
    }
  }

  const saveSettings = async () => {
    setSavingSettings(true)
    try {
      const res = await fetch('/api/admin/backup/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': token },
        body: JSON.stringify({ enabled, intervalHours, retentionCount }),
      })
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
      if (res.ok && d.ok) {
        onToast?.('Backup settings saved ✓')
        await load()
      } else {
        onToast?.(d.error ?? 'Could not save settings.')
      }
    } catch {
      onToast?.('Could not save settings — network error.')
    } finally {
      setSavingSettings(false)
    }
  }

  const doRestore = async () => {
    if (!restoreTarget) return
    setRestoring(true)
    try {
      const res = await fetch('/api/admin/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': token },
        body: JSON.stringify({ backupId: restoreTarget.id, confirm: 'RESTORE' }),
      })
      const d = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        error?: string
        restoredFrom?: string
        safetyBackupId?: string
      }
      if (res.ok && d.ok) {
        onToast?.(`Database restored from ${d.restoredFrom ?? 'backup'} ✓ — safety backup ${d.safetyBackupId ?? ''} kept.`)
      } else {
        onToast?.(`Restore FAILED: ${d.error ?? 'unknown error'}`)
      }
    } catch {
      onToast?.('Restore failed — network error.')
    } finally {
      setRestoring(false)
      setRestoreTarget(null)
      await load()
    }
  }

  if (loading && !data) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading backup status">
        <div className="h-24 bg-white/70 rounded-2xl animate-pulse" />
        <div className="h-40 bg-white/50 rounded-2xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="animate-ct-fadeInUp">
      {/* وضعیت */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-sage-light/20 p-4 flex items-center gap-3">
          <span className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${data?.stats.lastSuccess ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            <CheckCircle2 className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-brown-dark leading-tight">
              {data?.stats.lastSuccess ? fmtDateTime(data.stats.lastSuccess.at) : 'Never'}
            </p>
            <p className="text-[11px] font-semibold text-brown-light mt-1">Last successful backup</p>
            {data?.stats.lastSuccess && (
              <p className="text-[10px] text-brown-light/80 truncate">
                {fmtBytes(data.stats.lastSuccess.sizeBytes)} · {data.stats.lastSuccess.filename.split('-').pop()?.replace('.db', '')}
              </p>
            )}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-sage-light/20 p-4 flex items-center gap-3">
          <span className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${data?.stats.lastFailed ? 'bg-red-100 text-red-700' : 'bg-sage-light/40 text-sage-dark'}`}>
            <XCircle className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-brown-dark leading-tight">
              {data?.stats.lastFailed ? fmtDateTime(data.stats.lastFailed.at) : 'None'}
            </p>
            <p className="text-[11px] font-semibold text-brown-light mt-1">Last failed backup</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-sage-light/20 p-4 flex items-center gap-3">
          <span className="w-11 h-11 rounded-xl bg-butter/40 text-brown flex items-center justify-center flex-shrink-0">
            <History className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xl font-bold text-brown-dark leading-none tabular-nums">{data?.stats.versions ?? 0}</p>
            <p className="text-[11px] font-semibold text-brown-light mt-1">Stored versions</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-sage-light/20 p-4 flex items-center gap-3">
          <span className="w-11 h-11 rounded-xl bg-peach-light/60 text-brown flex items-center justify-center flex-shrink-0">
            <HardDriveDownload className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xl font-bold text-brown-dark leading-none tabular-nums">{fmtBytes(data?.stats.totalSizeBytes ?? 0)}</p>
            <p className="text-[11px] font-semibold text-brown-light mt-1">Total backup size</p>
          </div>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">
          {error}
        </p>
      )}

      {/* Create Backup Now */}
      <div className="bg-white rounded-2xl border border-sage-light/20 p-5 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-brown-dark flex items-center gap-2">
              <DatabaseBackup className="w-4 h-4 text-sage-dark" /> Create Backup Now
            </p>
            <p className="text-xs text-brown-light mt-1">
              Takes a complete, consistent snapshot of the live SQLite database (VACUUM INTO) and keeps all retained versions.
            </p>
          </div>
          <button
            type="button"
            onClick={createNow}
            disabled={creating}
            className="bg-sage text-brown-dark px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-sage-dark transition-colors cursor-pointer disabled:opacity-60 inline-flex items-center gap-2 min-h-[44px]"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <DatabaseBackup className="w-4 h-4" />}
            {creating ? 'Backing up…' : 'Create Backup Now'}
          </button>
        </div>
      </div>

      {/* تنظیمات خودکار */}
      <div className="bg-white rounded-2xl border border-sage-light/20 p-5 mb-6">
        <p className="text-sm font-bold text-brown-dark flex items-center gap-2 mb-1">
          <Timer className="w-4 h-4 text-sage-dark" /> Automatic backups
        </p>
        <p className="text-xs text-brown-light mb-4">
          The scheduler runs inside the server process and records every automatic backup (success or failure) below.
        </p>
        <div className="grid sm:grid-cols-3 gap-4">
          <label className="block">
            <span className="block text-[11px] uppercase tracking-wider text-brown-light mb-1.5">Enabled</span>
            <select
              value={enabled ? '1' : '0'}
              onChange={(e) => setEnabled(e.target.value === '1')}
              className={inputCls}
              aria-label="Automatic backups enabled"
            >
              <option value="1">Enabled</option>
              <option value="0">Disabled</option>
            </select>
          </label>
          <label className="block">
            <span className="block text-[11px] uppercase tracking-wider text-brown-light mb-1.5">Interval (hours, 1–720)</span>
            <input
              type="number"
              min={1}
              max={720}
              value={intervalHours}
              onChange={(e) => setIntervalHours(Math.max(1, Math.min(720, Math.floor(Number(e.target.value) || 1))))}
              className={inputCls}
              aria-label="Backup interval hours"
            />
          </label>
          <label className="block">
            <span className="block text-[11px] uppercase tracking-wider text-brown-light mb-1.5">Keep versions (3–100)</span>
            <input
              type="number"
              min={3}
              max={100}
              value={retentionCount}
              onChange={(e) => setRetentionCount(Math.max(3, Math.min(100, Math.floor(Number(e.target.value) || 3))))}
              className={inputCls}
              aria-label="Backup retention count"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={saveSettings}
          disabled={savingSettings}
          className="mt-4 bg-sage text-brown-dark px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-sage-dark transition-colors cursor-pointer disabled:opacity-60 inline-flex items-center gap-2 min-h-[44px]"
        >
          {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save settings
        </button>
      </div>

      {/* تاریخچه */}
      <div className="bg-white rounded-2xl border border-sage-light/20 p-5">
        <p className="text-sm font-bold text-brown-dark mb-3">Backup history</p>
        {!data || data.backups.length === 0 ? (
          <p className="text-xs text-brown-light bg-cream rounded-xl px-4 py-4">
            No backups yet — create the first one with “Create Backup Now”.
          </p>
        ) : (
          <ul className="space-y-2 max-h-96 overflow-y-auto pr-1 ct-scroll-area">
            {data.backups.map((b) => (
              <li key={b.id} className="bg-cream/50 border border-sage-light/20 rounded-xl px-3.5 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      b.status === 'SUCCESS'
                        ? 'bg-green-100 text-green-700'
                        : b.status === 'FAILED'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {b.status}
                  </span>
                  <span className="text-[10px] font-semibold text-brown-light bg-white border border-sage-light/30 px-2 py-0.5 rounded-full">
                    {TRIGGER_LABEL[b.trigger] ?? b.trigger}
                  </span>
                  <span className="text-xs font-mono text-brown-dark truncate flex-1 min-w-40">{b.filename}</span>
                  <span className="text-[11px] text-brown-light tabular-nums">{fmtBytes(b.sizeBytes)}</span>
                  {b.fileExists && b.status === 'SUCCESS' && (
                    <button
                      type="button"
                      onClick={() => setRestoreTarget(b)}
                      className="text-[11px] font-bold px-3 py-1.5 rounded-lg border border-sage-light/50 bg-white text-brown hover:border-peach transition-colors cursor-pointer inline-flex items-center gap-1.5 min-h-[32px]"
                    >
                      <RotateCcw className="w-3 h-3" /> Restore
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-brown-light/80 mt-1">
                  {fmtDateTime(b.startedAt)}
                  {b.durationMs != null && ` · ${b.durationMs} ms`}
                  {!b.fileExists && b.status === 'SUCCESS' && ' · file removed by retention'}
                </p>
                {b.error && <p className="text-[10px] text-red-600/80 mt-1">{b.error}</p>}
              </li>
            ))}
          </ul>
        )}
        <p className="text-[10px] text-brown-light/70 mt-3">
          Backups live in <span className="font-mono">db/backups/</span> on the server — never inside the public web
          directory, never downloadable from a URL. Restore replaces the whole database.
        </p>
      </div>

      {/* ⚠️ دیالوگ تأیید Restore */}
      <AlertDialog open={!!restoreTarget} onOpenChange={(v) => !restoring && setRestoreTarget(v ? restoreTarget : null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" /> Restore this backup?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  This will <strong>replace the entire current database</strong> with the backup{' '}
                  <span className="font-mono text-brown-dark">{restoreTarget?.filename}</span>.
                </p>
                <ul className="list-disc pl-5 space-y-1 text-xs">
                  <li>A safety backup of the current state is created first — if anything fails, it can be restored.</li>
                  <li>Everything changed after this backup will be lost.</li>
                  <li>Users currently signed in may need to sign in again.</li>
                </ul>
                <p className="text-xs font-bold text-red-600">This action is destructive and cannot be undone.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoring} className="cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={restoring}
              onClick={(e) => {
                e.preventDefault()
                void doRestore()
              }}
              className="bg-red-600 text-white hover:bg-red-700 cursor-pointer"
            >
              {restoring ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Restoring…
                </>
              ) : (
                'Yes, restore database'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
