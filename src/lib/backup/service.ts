// ---------------------------------------------------------------------------
// 💾 سرویس پشتیبان‌گیری و بازیابی دیتابیس SQLite (فاز ۵۲ — بند ۱۰)
//      + 🛡️ فاز ۶۲: ذخیرهٔ دومکانی — هر بکاپ در «کنار DB» و «داخل پروژه» کپی می‌شود
//
// دیتابیس پروژه: SQLite (Prisma) بیرون از پوشهٔ پروژه — پس «مکانیزم رسمی»
// پشتیبان‌گیری، دستور VACUUM INTO است: یک اسنپ‌شات کامل و سازگار (consistent)
// حتی در حین نوشتن می‌سازد و کپی خام فایل نیست.
//
// 🛡️ درس حادثهٔ فاز ۶۲: پلتفرم می‌تواند کل /home/z را بازسازی کند و پوشهٔ
// /home/z/data (شامل بکاپ‌های کنار DB) پاک شود — اما پوشهٔ پروژه از اسنپ‌شات
// بازمی‌گردد. پس هر بکاپ موفق بلافاصله در db/backups پروژه هم کپی می‌شود تا
// همیشه دست‌کم یک نسخه از پاک‌شدنِ زیرساختی جان سالم به در ببرد.
// db-bootstrap (بازیابی خودکار استارت‌آپ) هر دو محل را می‌گردد.
//
// امنیت (بند 10-E):
//  • فایل‌های پشتیبان در db/backups/ کنار دیتابیس ذخیره می‌شوند — هرگز داخل
//    public/ نیستند و هیچ route استاتیکی به آن‌ها سرویس نمی‌دهد.
//  • دانلود پشتیبان وجود ندارد؛ فقط متادیتا (نام/حجم/زمان/وضعیت) به ادمین
//    برمی‌گردد و Restore کاملاً سمت سرور انجام می‌شود.
//  • هیچ رازی (رمز/کلید/seed/محتوای رکوردها) در لاگ‌ها یا پیام خطا نمی‌رود.
//
// چرخهٔ کامل هر پشتیبان (بند 10-G): ردیف BackupLog با STARTED ساخته می‌شود و
// فقط اگر واقعاً کامل شود SUCCESS می‌گیرد؛ در خطا FAILED + پیام کوتاه.
//
// Restore (بند 10-D/H):
//  ① فایل بکاپ وجود دارد؟ ② هدر SQLite + integrity_check روی «کپی موقت»
//  ③ پشتیبان ایمنی از وضعیت فعلی (PRE_RESTORE) — اگر نشود، Restore کامل متوقف
//  ④ wal_checkpoint(TRUNCATE) ⑤ نوشتن بکاپ روی فایل اصلی + حذف -wal/-shm کهنه
//  ⑥ قطع/وصل کلاینت Prisma (کش صفحه تازه) ⑦ integrity_check + شمارش جداول
// هر شکست صادقانه گزارش می‌شود — هرگز موفقیت ساختگی نیست.
// ---------------------------------------------------------------------------

import { existsSync, mkdirSync, statSync, unlinkSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs'
import { join, dirname, resolve, isAbsolute } from 'node:path'
import { PrismaClient } from '@prisma/client'
import { db } from '@/lib/db'
import { logAppError } from '@/lib/error-log'

const SETTING_KEY = 'backupSettings'

export interface BackupSettings {
  /** زمان‌بند خودکار روشن/خاموش */
  enabled: boolean
  /** فاصلهٔ پشتیبان خودکار (ساعت) — ۱ تا ۷۲۰ */
  intervalHours: number
  /** تعداد نسخه‌های نگه‌داشته‌شده — ۳ تا ۱۰۰ (بند 10-B) */
  retentionCount: number
}

export const DEFAULT_BACKUP_SETTINGS: BackupSettings = {
  enabled: true,
  intervalHours: 24,
  retentionCount: 10,
}

export type BackupTrigger = 'SCHEDULED' | 'MANUAL' | 'PRE_RESTORE'

/** مسیر فایل دیتابیس از DATABASE_URL — فقط file: (SQLite) پشتیبانی می‌شود */
export function resolveDbPath(): string | null {
  const raw = (process.env.DATABASE_URL ?? '').trim()
  if (!raw.startsWith('file:')) return null
  let p = raw.slice('file:'.length)
  const q = p.indexOf('?')
  if (q >= 0) p = p.slice(0, q)
  if (!p) return null
  if (!isAbsolute(p)) p = resolve(process.cwd(), p)
  return p
}

/** پوشهٔ پشتیبان‌ها — کنار فایل دیتابیس، خارج از public/ (بند 10-E) */
function backupsDir(dbPath: string): string {
  return join(dirname(dbPath), 'backups')
}

/** 🛡️ فاز ۶۲ — پوشهٔ دوم بکاپ داخل پروژه؛ جانِ سالم به‌در از ریستِ کل /home/z */
function secondaryBackupsDir(): string {
  return join(process.cwd(), 'db', 'backups')
}

/** کپی بی‌سرو‌صدای بکاپ به محل دوم — شکستش هرگز بکاپ اصلی را نامعتبر نمی‌کند */
function mirrorToProject(backupPath: string, filename: string): void {
  try {
    const dir = secondaryBackupsDir()
    mkdirSync(dir, { recursive: true })
    const dest = join(dir, filename)
    if (resolve(dest) !== resolve(backupPath)) copyFileSync(backupPath, dest)
  } catch {
    // محل دوم در دسترس نیست — بکاپ اصلی همچنان معتبر است
  }
}

/** حذف آینهٔ فایل در محل دوم (برای retention) */
function removeMirror(filename: string): void {
  try {
    const p = join(secondaryBackupsDir(), filename)
    if (existsSync(p)) unlinkSync(p)
  } catch {}
}

function safeSegment(s: string): string {
  return s.replace(/[^a-z0-9-]/gi, '').slice(0, 24)
}

function safeSqlLiteral(p: string): string {
  // مسیر سمت سرور تولید می‌شود (فقط حروف/عدد/خط‌تیره/نقطه/اسلش) — گارد دفاعی
  if (!/^[A-Za-z0-9/._-]+$/.test(p)) throw new Error('Unsafe backup path')
  return p
}

// ---------------------------------------------------------------------------
// تنظیمات (در SiteSetting — همان جدول تنظیمات موجود، نه سیستم جدید)
// ---------------------------------------------------------------------------

function mergeSettings(raw: unknown): BackupSettings {
  const base = { ...DEFAULT_BACKUP_SETTINGS }
  if (typeof raw === 'object' && raw !== null) {
    const r = raw as Record<string, unknown>
    if (typeof r.enabled === 'boolean') base.enabled = r.enabled
    if (typeof r.intervalHours === 'number' && Number.isFinite(r.intervalHours)) {
      base.intervalHours = Math.min(720, Math.max(1, Math.round(r.intervalHours)))
    }
    if (typeof r.retentionCount === 'number' && Number.isFinite(r.retentionCount)) {
      base.retentionCount = Math.min(100, Math.max(3, Math.round(r.retentionCount)))
    }
  }
  return base
}

export async function getBackupSettings(): Promise<BackupSettings> {
  try {
    const row = await db.siteSetting.findUnique({ where: { key: SETTING_KEY } })
    if (!row) return { ...DEFAULT_BACKUP_SETTINGS }
    return mergeSettings(JSON.parse(row.value))
  } catch {
    return { ...DEFAULT_BACKUP_SETTINGS }
  }
}

export async function saveBackupSettings(patch: Partial<BackupSettings>): Promise<BackupSettings> {
  const current = await getBackupSettings()
  const next = mergeSettings({ ...current, ...patch })
  await db.siteSetting.upsert({
    where: { key: SETTING_KEY },
    update: { value: JSON.stringify(next) },
    create: { key: SETTING_KEY, value: JSON.stringify(next) },
  })
  return next
}

// ---------------------------------------------------------------------------
// ساخت پشتیبان
// ---------------------------------------------------------------------------

export interface BackupResult {
  ok: boolean
  id?: string
  filename?: string
  sizeBytes?: number
  durationMs?: number
  error?: string
}

/** سیاست نگهداری (بند 10-B): فقط N نسخهٔ موفقِ تازه می‌ماند؛ بقیه پاک می‌شوند.
 * ردیف‌های STARTEDِ خیلی قدیمی (عملیات نیمه‌کاره/کرش‌شده) هم بسته و فایلشان پاک می‌شود */
async function applyRetention(retentionCount: number): Promise<number> {
  const rows = await db.backupLog.findMany({
    where: { status: 'SUCCESS' },
    orderBy: { startedAt: 'desc' },
  })
  let removed = 0
  for (const row of rows.slice(Math.max(1, retentionCount))) {
    try {
      if (row.filePath && existsSync(row.filePath)) {
        unlinkSync(row.filePath)
        removed++
      }
    } catch {
      // فایل قفل است/حذف نشد — دفعهٔ بعد تلاش می‌شود
    }
    // 🛡️ فاز ۶۲ — آینهٔ داخل پروژه هم با همان سیاست نگهداری پاک می‌شود
    if (row.filename) removeMirror(row.filename)
  }
  // 🧹 پاک‌سازی STARTEDهای یتیم (مثلاً ردیفِ داخل اسنپ‌شاتِ Restore شده) —
  // اگر فایل‌شان هنوز هست، نگه داشتنشان فقط فضای بی‌صاحب می‌سازد
  const staleStartedCutoff = new Date(Date.now() - 24 * 3600 * 1000)
  const staleStarted = await db.backupLog
    .findMany({ where: { status: 'STARTED', startedAt: { lt: staleStartedCutoff } } })
    .catch(() => [])
  for (const row of staleStarted) {
    try {
      if (row.filePath && existsSync(row.filePath)) {
        unlinkSync(row.filePath)
        removed++
      }
    } catch {}
    await db.backupLog
      .update({ where: { id: row.id }, data: { status: 'FAILED', error: 'Stale STARTED row cleaned by retention' } })
      .catch(() => {})
  }
  return removed
}

/** ساخت یک پشتیبان کامل با VACUUM INTO — هرگز throw نمی‌کند */
export async function createBackup(trigger: BackupTrigger): Promise<BackupResult> {
  const started = Date.now()
  try {
    const dbPath = resolveDbPath()
    if (!dbPath || !existsSync(dbPath)) {
      return { ok: false, error: 'Database file not found on server' }
    }
    const dir = backupsDir(dbPath)
    mkdirSync(dir, { recursive: true })
    const filename = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}-${safeSegment(trigger)}.db`
    const outPath = join(dir, filename)

    const log = await db.backupLog.create({
      data: { filename, filePath: outPath, status: 'STARTED', trigger },
    })

    try {
      // ⭐ مکانیزم رسمی SQLite — اسنپ‌شات سازگار حتی حین تراکنش‌های فعال
      await db.$executeRawUnsafe(`VACUUM INTO '${safeSqlLiteral(outPath)}'`)
      const size = statSync(outPath).size
      if (size <= 0) throw new Error('Backup file is empty')
      const durationMs = Date.now() - started
      await db.backupLog.update({
        where: { id: log.id },
        data: { status: 'SUCCESS', completedAt: new Date(), durationMs, sizeBytes: size },
      })
      const settings = await getBackupSettings()
      await applyRetention(settings.retentionCount)
      // 🛡️ فاز ۶۲ — نسخهٔ دوم در db/backups پروژه (مقاوم در برابر ریست /home/z)
      mirrorToProject(outPath, filename)
      console.log(`[backup] SUCCESS ${filename} (${size} bytes, ${durationMs}ms, ${trigger})`)
      return { ok: true, id: log.id, filename, sizeBytes: size, durationMs }
    } catch (e) {
      const msg = (e instanceof Error ? e.message : 'backup failed').slice(0, 300)
      await db.backupLog
        .update({
          where: { id: log.id },
          data: { status: 'FAILED', completedAt: new Date(), durationMs: Date.now() - started, error: msg },
        })
        .catch(() => {})
      // فایل ناقص حذف شود — هیچ پشتیبان نصفه‌ای حفظ نمی‌شود
      try {
        if (existsSync(outPath)) unlinkSync(outPath)
      } catch {}
      console.error(`[backup] FAILED (${trigger}):`, msg)
      // 🚨 فاز ۵۳ — لاگ خطا (بند ۱۲) — BACKUP
      logAppError({ category: 'BACKUP', error: msg, fallback: 'Backup failed', refId: log.id, context: { note: `trigger=${trigger}` } })
      return { ok: false, id: log.id, error: msg }
    }
  } catch (e) {
    return { ok: false, error: (e instanceof Error ? e.message : 'backup failed').slice(0, 300) }
  }
}

// ---------------------------------------------------------------------------
// فهرست + آمار (بند 10-C)
// ---------------------------------------------------------------------------

export interface BackupListItem {
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

export async function listBackups(): Promise<{
  backups: BackupListItem[]
  stats: {
    lastSuccess: { at: string; filename: string; sizeBytes: number | null } | null
    lastFailed: { at: string; error: string } | null
    versions: number
    totalSizeBytes: number
  }
}> {
  const rows = await db.backupLog.findMany({ orderBy: { startedAt: 'desc' }, take: 100 })
  const backups: BackupListItem[] = rows.map((r) => {
    let exists = false
    let sizeBytes = r.sizeBytes ?? null
    try {
      exists = !!r.filePath && existsSync(r.filePath)
      if (exists) sizeBytes = statSync(r.filePath).size
    } catch {}
    return {
      id: r.id,
      filename: r.filename,
      status: r.status,
      trigger: r.trigger,
      startedAt: r.startedAt.toISOString(),
      completedAt: r.completedAt?.toISOString() ?? null,
      durationMs: r.durationMs,
      sizeBytes,
      fileExists: exists,
      error: r.error,
    }
  })
  const successRows = rows.filter((r) => r.status === 'SUCCESS')
  const lastSuccess = successRows[0] ?? null
  const lastFailed = rows.find((r) => r.status === 'FAILED') ?? null
  const existing = backups.filter((b) => b.fileExists)
  return {
    backups,
    stats: {
      lastSuccess: lastSuccess
        ? { at: lastSuccess.startedAt.toISOString(), filename: lastSuccess.filename, sizeBytes: lastSuccess.sizeBytes ?? null }
        : null,
      lastFailed: lastFailed
        ? { at: lastFailed.startedAt.toISOString(), error: lastFailed.error ?? 'unknown' }
        : null,
      versions: existing.length,
      totalSizeBytes: existing.reduce((s, b) => s + (b.sizeBytes ?? 0), 0),
    },
  }
}

// ---------------------------------------------------------------------------
// اعتبارسنجی بکاپ — روی «کپی موقت» تا فایل اصلی بکاپ هرگز دستکاری نشود
// ---------------------------------------------------------------------------

async function checkBackupIntegrity(backupPath: string): Promise<{ ok: boolean; error?: string }> {
  const tmp = join(dirname(backupPath), `.validate-${Date.now()}.db`)
  try {
    copyFileSync(backupPath, tmp)
  } catch {
    return { ok: false, error: 'Backup file is not readable' }
  }
  let probe: PrismaClient | null = null
  try {
    probe = new PrismaClient({ datasourceUrl: `file:${tmp}` })
    const integ = (await probe.$queryRawUnsafe('PRAGMA integrity_check')) as Array<{ integrity_check?: string }>
    if (!Array.isArray(integ) || integ[0]?.integrity_check !== 'ok') {
      return { ok: false, error: 'Integrity check did not return OK — file may be corrupted' }
    }
    // حداقل جداول حیاتی موجود باشند (بند 10-I — ساختار حفظ شده باشد)
    const tables = (await probe.$queryRawUnsafe(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('User','UsdtOrder','CourseClass','Discount')"
    )) as Array<{ name: string }>
    if (!Array.isArray(tables) || tables.length < 4) {
      return { ok: false, error: 'Backup is missing core tables (User/Order/Class/Discount)' }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: `Backup validation failed: ${(e instanceof Error ? e.message : 'unknown').slice(0, 200)}` }
  } finally {
    try {
      await probe?.$disconnect()
    } catch {}
    for (const p of [tmp, tmp + '-wal', tmp + '-shm']) {
      try {
        if (existsSync(p)) unlinkSync(p)
      } catch {}
    }
  }
}

// ---------------------------------------------------------------------------
// بازیابی (Restore) — مخرب؛ فقط با تأیید صریح ادمین از API گاردشده
// ---------------------------------------------------------------------------

export interface RestoreResult {
  ok: boolean
  error?: string
  restoredFrom?: string
  safetyBackupId?: string
  durationMs?: number
  verify?: Record<string, number>
}

export async function restoreBackup(backupId: string): Promise<RestoreResult> {
  const started = Date.now()
  // 🚨 فاز ۵۳ — هر شکست Restore هم در ErrorLog ثبت می‌شود (بند ۱۲ — RESTORE)
  const fail = (error: string, extra?: Partial<RestoreResult>): RestoreResult => {
    logAppError({ category: 'RESTORE', error, fallback: 'Restore failed', refId: backupId })
    return { ok: false, error, ...extra }
  }
  const dbPath = resolveDbPath()
  if (!dbPath || !existsSync(dbPath)) return fail('Database file not found on server')

  // ① بکاپ انتخابی معتبر و موجود باشد (بند 10-H گام ۱ و ۲)
  const row = await db.backupLog.findUnique({ where: { id: backupId } }).catch(() => null)
  if (!row || row.status !== 'SUCCESS') {
    return fail('Backup not found or was not a successful backup')
  }
  if (!row.filePath || !existsSync(row.filePath)) {
    // 🛡️ فاز ۶۲ — اگر فایل کنار DB پاک شده (ریست پلتفرم؟) از آینهٔ داخل پروژه استفاده می‌کنیم
    const mirrored = join(secondaryBackupsDir(), row.filename)
    if (!existsSync(mirrored)) {
      return fail('Backup file is missing on the server (removed by retention?)')
    }
    row.filePath = mirrored
  }
  const validity = await checkBackupIntegrity(row.filePath)
  if (!validity.ok) return fail(validity.error ?? 'Backup validation failed')

  // ③ پشتیبان ایمنی از وضعیت فعلی — اگر نشود هرگز ادامه نمی‌دهیم (fail-closed)
  const safety = await createBackup('PRE_RESTORE')
  if (!safety.ok) {
    return fail(`Safety backup of the current database failed — restore aborted. (${safety.error ?? 'unknown'})`)
  }

  // ④ همهٔ دادهٔ WAL به فایل اصلی بنشیند تا جایگزینی کامل باشد
  try {
    await db.$queryRawUnsafe('PRAGMA wal_checkpoint(TRUNCATE)')
  } catch {}

  // ⑤ نوشتن بکاپ روی فایل دیتابیس (همان inode) + حذف WAL/SHM کهنه
  try {
    const data = readFileSync(row.filePath)
    if (data.length <= 0 || data.subarray(0, 16).toString('latin1').indexOf('SQLite format 3') !== 0) {
      return fail('Selected file is not a valid SQLite database', { safetyBackupId: safety.id })
    }
    writeFileSync(dbPath, data)
    for (const suffix of ['-wal', '-shm']) {
      try {
        if (existsSync(dbPath + suffix)) unlinkSync(dbPath + suffix)
      } catch {}
    }
  } catch {
    return fail('Writing the restored database failed — the safety backup of the previous state is preserved and can be restored.', { safetyBackupId: safety.id })
  }

  // ⑥ اتصال تازهٔ Prisma — کش صفحهٔ قدیمی خنثی می‌شود
  try {
    await db.$disconnect()
    await db.$connect()
  } catch {}

  // ⑦ راستی‌آزمایی پس از بازیابی (بند 10-H گام ۶)
  try {
    const integ = (await db.$queryRawUnsafe('PRAGMA integrity_check')) as Array<{ integrity_check?: string }>
    if (!Array.isArray(integ) || integ[0]?.integrity_check !== 'ok') {
      throw new Error('integrity_check failed after restore')
    }
    const verify = {
      users: await db.user.count(),
      orders: await db.usdtOrder.count(),
      payments: await db.paymentEvent.count(),
      classes: await db.courseClass.count(),
      discounts: await db.discount.count(),
      schedules: await db.classSchedule.count(),
      backups: await db.backupLog.count(),
    }
    console.log(`[backup] RESTORED from ${row.filename} in ${Date.now() - started}ms — verify: ${JSON.stringify(verify)}`)
    return {
      ok: true,
      restoredFrom: row.filename,
      safetyBackupId: safety.id,
      durationMs: Date.now() - started,
      verify,
    }
  } catch (e) {
    return fail(
      `Restore was written but post-restore verification failed: ${(e instanceof Error ? e.message : 'unknown').slice(0, 200)}`,
      { safetyBackupId: safety.id }
    )
  }
}
