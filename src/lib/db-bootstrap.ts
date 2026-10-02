// ---------------------------------------------------------------------------
// 🗄️ db-bootstrap — محافظ راه‌اندازی دیتابیس (فاز ۶۰ — بند ۵ تا ۹ و ۲۷ تسک)
//                     + 🛡️ فاز ۶۲: تشخیص «دیتابیس خالی» و بازیابی دومکانی
//
// ریشهٔ واقعی «ناپدیدشدن ثبت‌نام‌ها بعد از deploy»: فایل SQLite داخل پوشهٔ
// پروژه بود و پلتفرم هنگام deploy پوشهٔ پروژه را از اسنپ‌شات بازسازی می‌کرد —
// نتیجه: هر داده‌ای که بعد از آن اسنپ‌شات نوشته شده بود، با deploy بعدی برمی‌گشت
// به عقب. فیکس ریشه‌ای: DB حالا در /home/z/data (بیرون از پوشهٔ پروژه) است.
//
// 🛡️ فاز ۶۲ — درس واقعیِ حادثهٔ امروز: پلتفرم کل /home/z را بازسازی کرد؛
// پوشهٔ /home/z/data (شامل بکاپ‌ها) پاک شد و یک DB «فقط-اسکیما و بدون داده»
// جای دیتابیس تولید نشست — نتیجه: صفر کلاس → خطای BAD_PRODUCT در پرداخت.
// دو اصلاح ریشه‌ای:
//   ۱) بکاپ‌ها همیشه در «دو محل» نگهداری می‌شوند: کنار DB (/home/z/data/backups)
//      و داخل پروژه (db/backups) — چون پلتفرم پوشهٔ پروژه را از اسنپ‌شات
//      بازمی‌گرداند، بکاپِ داخل پروژه از پاک‌شدنِ کل /home/z جان سالم به در می‌برد.
//   ۲) «خالی‌بودنِ تولید» هم مثل «غایب‌بودن فایل» treated می‌شود: اگر DB موجود
//      باشد ولی هیچ داده‌ای در جداول اصلی نداشته باشد (و بکاپِ داده‌داری موجود
//      باشد)، جدیدترین بکاپِ داده‌دار خودکار بازیابی می‌شود. دیتابیسِ خالیِ
//      «عمدی» در این سامانه معنایی ندارد (هیچ UI پاک‌کردنِ کلی وجود ندارد).
//
// ⛔ هیچ‌گاه چیزی را «ریست» نمی‌کند: فقط وقتی مداخله می‌کند که تولیدِ فعلی
//    فاقد هر داده‌ای باشد (یا فایل غایب باشد) و بکاپِ داده‌دار موجود باشد.
// ---------------------------------------------------------------------------

import { existsSync, mkdirSync, readdirSync, copyFileSync, statSync } from 'node:fs'
import { join, dirname, resolve, isAbsolute } from 'node:path'

/** ریشهٔ داده‌های پایدار — هماهنگ با receipts.ts و .env (فقط برای SQLite محلی) */
export const CT_DATA_DIR: string =
  (process.env.CT_DATA_DIR || '/home/z/data').trim() || '/home/z/data'

/**
 * 🟢 PostgreSQL/Vercel guard — اگر DATABASE_URL به PostgreSQL اشاره می‌کند
 * (production روی Vercel + Neon)، کل ماژول db-bootstrap باید no-op باشد:
 *   • pinDatabaseUrl هیچ متغیری را بازنویسی نمی‌کند (Neon URL محترم شمرده می‌شود)
 *   • ensureDatabaseFile هیچ کاری نمی‌کند (PostgreSQL فایل محلی ندارد)
 *   • هیچ `require('bun:sqlite')` اجرا نمی‌شود (ماژول روی runtime Node.js
 *     Vercel موجود نیست و خطای MODULE_NOT_FOUND می‌داد)
 *
 * منطق SQLite-only زیر فقط در توسعهٔ محلی (DATABASE_URL = file:…) فعال می‌ماند
 * تا دیتابیس SQLite موجود کاربر دست‌نخورده باقی بماند.
 */
export function isPostgresDatabase(): boolean {
  const url = (process.env.DATABASE_URL ?? '').trim().toLowerCase()
  return url.startsWith('postgres') || url.startsWith('postgresql')
}

/** مسیر مطلق دیتابیس SQLite محلی — فقط برای توسعهٔ محلی (file:) */
export function canonicalDatabaseUrl(): string {
  return `file:${join(CT_DATA_DIR, 'chinesetoon.db')}`
}

/** 🗂️ محل‌های بکاپ SQLite محلی — فقط برای توسعهٔ محلی */
export function backupDirs(): string[] {
  return [join(CT_DATA_DIR, 'backups'), join(process.cwd(), 'db', 'backups')]
}

/**
 * 📌 pinDatabaseUrl — فقط برای SQLite محلی.
 *
 * 🟢 روی PostgreSQL (Vercel + Neon): کاملاً no-op — هیچ تغییری روی
 * DATABASE_URL اعمال نمی‌کند. این تابع قبلاً ریشهٔ خطاهای 500 بود چون
 * Neon URL را با `file:/home/z/data/chinesetoon.db` بازنویسی می‌کرد.
 *
 * قانون قفل (فقط برای SQLite): اگر DATABASE_URL غایب باشد، یا داخل پوشهٔ
 * پروژه باشد، یا به فایل ناموجودی اشاره کند در حالی که دیتابیسِ مطلق تولید
 * موجود است → به مسیر مطلق قفل می‌شود.
 */
export function pinDatabaseUrl(): { pinned: boolean; from: string; to: string } {
  // 🟢 PostgreSQL: هیچ مداخله‌ای — Neon URL محترم شمرده می‌شود
  if (isPostgresDatabase()) {
    return { pinned: false, from: process.env.DATABASE_URL ?? '(unset)', to: process.env.DATABASE_URL ?? '(unset)' }
  }

  const canonical = canonicalDatabaseUrl()
  const canonicalPath = canonical.slice('file:'.length)
  const current = (process.env.DATABASE_URL ?? '').trim()
  const from = current || '(unset)'

  if (!(process.env.CT_DATA_DIR ?? '').trim()) {
    process.env.CT_DATA_DIR = CT_DATA_DIR
  }

  let needsPin = true
  if (current.startsWith('file:')) {
    let p = current.slice('file:'.length)
    const q = p.indexOf('?')
    if (q >= 0) p = p.slice(0, q)
    if (p) {
      if (!isAbsolute(p)) p = resolve(process.cwd(), p)
      const rp = resolve(p)
      if (rp === resolve(canonicalPath)) {
        needsPin = false // خودِ مسیر مطلق — کاری نیست
      } else if (!isInsideProjectDir(rp) && existsSync(rp)) {
        needsPin = false // مسیر بیرونِ پروژه که واقعاً موجود است — انتخاب عمدی
      }
    }
  }

  if (needsPin) {
    process.env.DATABASE_URL = canonical
    console.warn(
      `[db-bootstrap] 📌 DATABASE_URL pinned to the local SQLite database: ${from} → ${canonical}`
    )
  }
  return { pinned: needsPin, from, to: needsPin ? canonical : from }
}

/** مسیر فایل DB از DATABASE_URL (فقط file: SQLite) — بدون وابستگی به Prisma */
export function resolveDatabasePath(): string | null {
  const raw = (process.env.DATABASE_URL ?? '').trim()
  if (!raw.startsWith('file:')) return null
  let p = raw.slice('file:'.length)
  const q = p.indexOf('?')
  if (q >= 0) p = p.slice(0, q)
  if (!p) return null
  if (!isAbsolute(p)) p = resolve(process.cwd(), p)
  return p
}

/** فایل DB باید بیرون از پوشهٔ پروژه باشد — اگر داخل بود هشدار واضح می‌دهیم */
function isInsideProjectDir(dbPath: string): boolean {
  const project = resolve(process.cwd())
  return resolve(dbPath).startsWith(project + '/')
}

// ---------------------------------------------------------------------------
// 🛡️ فاز ۶۲ — بررسی «داده‌داشتن» فایل SQLite بدون Prisma (bun:sqlite با گارد)
// ---------------------------------------------------------------------------

/** جداول اصلی که «تولیدِ واقعی» همیشه داده دارد؛ هرکدام که موجود باشد باید ردیف داشته باشد */
const CORE_TABLES = ['User', 'CourseClass', 'Registration', 'UsdtOrder'] as const

interface SqliteRowCounter {
  (dbFile: string, table: string): number | null
}

/**
 * شمارش ردیف‌های یک جدول از فایل SQLite به‌صورت read-only.
 * اگر bun:sqlite در دسترس نباشد یا جدول موجود نباشد → null (نامعلوم — حکم نمی‌زنیم).
 */
const countRows: SqliteRowCounter = (dbFile, table) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Database } = require('bun:sqlite') as { Database: new (p: string, o?: { readonly?: boolean }) => { query: (s: string) => { get: () => Record<string, unknown> | null }; close: () => void } }
    const conn = new Database(dbFile, { readonly: true })
    try {
      const row = conn.query(`SELECT COUNT(*) AS c FROM "${table}"`).get()
      const c = row?.c
      return typeof c === 'number' ? c : null
    } finally {
      conn.close()
    }
  } catch {
    return null
  }
}

/** آیا این فایل DB «دادهٔ واقعی» دارد؟ حداقل یکی از جداول اصلی ردیف داشته باشد */
function sqliteHasData(dbFile: string): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Database } = require('bun:sqlite') as { Database: new (p: string, o?: { readonly?: boolean }) => { query: (s: string) => { get: () => Record<string, unknown> | null }; close: () => void } }
    const conn = new Database(dbFile, { readonly: true })
    try {
      for (const t of CORE_TABLES) {
        const row = conn.query(`SELECT COUNT(*) AS c FROM "${t}"`).get()
        const c = row?.c
        if (typeof c === 'number' && c > 0) return true
      }
      return false
    } finally {
      conn.close()
    }
  } catch {
    return false
  }
}

/**
 * جدیدترین «بکاپِ داده‌دار» بین هر دو محل بکاپ.
 * فایل‌های بدون داده (فقط-اسکیما/خالی/خراب) کاندیدای بازیابی نمی‌شوند —
 * درس حادثهٔ فاز ۶۲: یک بکاپِ فقط-اسکیما اگر جدیدترین می‌بود، بازیابیِ بی‌فایده می‌شد.
 */
function newestDataBackup(): string | null {
  const candidates: string[] = []
  for (const dir of backupDirs()) {
    if (!existsSync(dir)) continue
    let files: string[] = []
    try {
      files = readdirSync(dir)
    } catch {
      continue
    }
    for (const f of files) {
      if (!f.endsWith('.db') || f.endsWith('-wal') || f.endsWith('-shm')) continue
      const full = join(dir, f)
      try {
        if (statSync(full).size <= 4096) continue // خالی/خرابِ بدوی
      } catch {
        continue
      }
      candidates.push(full)
    }
  }
  // جدیدترین اول؛ بعد اولینِ داده‌دار را برمی‌گردانیم
  candidates
    .sort((a, b) => {
      try {
        return statSync(b).mtimeMs - statSync(a).mtimeMs
      } catch {
        return 0
      }
    })
  for (const c of candidates) {
    if (sqliteHasData(c)) return c
  }
  return null
}

/** آیا فایل DB تولید «عملاً خالی» است؟ (وجود دارد ولی هیچ جدول اصلی داده ندارد) */
function productionDbIsEmpty(dbPath: string): boolean {
  let sawAnyTable = false
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Database } = require('bun:sqlite') as { Database: new (p: string, o?: { readonly?: boolean }) => { query: (s: string) => { get: () => Record<string, unknown> | null }; close: () => void } }
    const conn = new Database(dbPath, { readonly: true })
    try {
      for (const t of CORE_TABLES) {
        const row = conn.query(`SELECT COUNT(*) AS c FROM "${t}"`).get()
        if (row) {
          sawAnyTable = true
          const c = row.c
          if (typeof c === 'number' && c > 0) return false // داده دارد — دست نمی‌زنیم
        }
      }
      return sawAnyTable // اگر هیچ‌کدام از جداول هم نبودند، فایل ناقص است → خالی تلقی می‌شود
    } finally {
      conn.close()
    }
  } catch {
    return false // نمی‌توانیم بخوانیم (فایل قفل/خراب؟) — حکم نمی‌زنیم، Prisma خودش خطا می‌دهد
  }
}

export interface BootstrapResult {
  dbPath: string | null
  existed: boolean
  restored: boolean
  restoredFrom?: string
  warning?: string
}

/** قبل از اولین کوئری Prisma صدا زده می‌شود (instrumentation.register) */
export function ensureDatabaseFile(): BootstrapResult {
  // 🟢 PostgreSQL (Vercel + Neon): فایل دیتابیس محلی وجود ندارد — no-op.
  // PostgreSQL یک سرویس شبکه‌ای است، نه یک فایل. مدیریت اسکیما از طریق
  // `prisma migrate deploy` انجام می‌شود، نه بازیابی فایل.
  if (isPostgresDatabase()) {
    return { dbPath: null, existed: false, restored: false }
  }

  // 📌 اول از همه: DATABASE_URL روی دیتابیس مطلق تولید قفل می‌شود
  pinDatabaseUrl()
  const dbPath = resolveDatabasePath()
  if (!dbPath) {
    return { dbPath: null, existed: false, restored: false, warning: 'DATABASE_URL is not a file: SQLite URL' }
  }

  if (isInsideProjectDir(dbPath)) {
    console.warn(
      `[db-bootstrap] ⚠️ DATABASE_URL points INSIDE the project directory (${dbPath}) — ` +
        'redeploys will wipe production data. Move it outside the project (e.g. /home/z/data).'
    )
  }

  if (existsSync(dbPath)) {
    // 🛡️ فاز ۶۲ — فایل هست ولی شاید «خالی» باشد (فاجعهٔ فقط-اسکیما)
    if (productionDbIsEmpty(dbPath)) {
      const backup = newestDataBackup()
      if (backup && resolve(backup) !== resolve(dbPath)) {
        try {
          copyFileSync(backup, dbPath)
          console.warn(
            `[db-bootstrap] 🛡️ production database existed but had NO data — restored latest data-bearing backup: ${backup}`
          )
          return { dbPath, existed: true, restored: true, restoredFrom: backup }
        } catch (e) {
          console.error(
            `[db-bootstrap] failed to restore backup ${backup}: ${e instanceof Error ? e.message : e}`
          )
          return { dbPath, existed: true, restored: false, warning: 'Empty production DB; backup restore failed' }
        }
      }
      console.warn(
        `[db-bootstrap] ⚠️ production database has NO data and no data-bearing backup found in [${backupDirs().join(', ')}] — leaving it as-is (fresh install?)`
      )
      return { dbPath, existed: true, restored: false, warning: 'Production DB empty; no data-bearing backup available' }
    }
    return { dbPath, existed: true, restored: false }
  }

  // فایل DB غایب است — پوشهٔ والد ساخته می‌شود و از جدیدترین بکاپِ داده‌دار بازیابی می‌کنیم
  try {
    mkdirSync(dirname(dbPath), { recursive: true })
  } catch {
    /* mkdir خطا داد — Prisma خودش بعداً تلاش می‌کند */
  }

  const backup = newestDataBackup()
  if (backup) {
    try {
      copyFileSync(backup, dbPath)
      console.info(`[db-bootstrap] database file was missing — restored latest data-bearing backup: ${backup}`)
      return { dbPath, existed: false, restored: true, restoredFrom: backup }
    } catch (e) {
      console.error(
        `[db-bootstrap] failed to restore backup ${backup}: ${e instanceof Error ? e.message : e} — a fresh empty database will be created`
      )
      return { dbPath, existed: false, restored: false, warning: 'Backup restore failed — fresh database will be created' }
    }
  }

  console.warn(
    `[db-bootstrap] database file missing and no data-bearing backup found in [${backupDirs().join(', ')}] — a fresh empty database will be created`
  )
  return { dbPath, existed: false, restored: false, warning: 'No backup available for restore' }
}
