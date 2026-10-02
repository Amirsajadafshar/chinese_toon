// ---------------------------------------------------------------------------
// 🧾 ذخیرهٔ امن رسیدهای پرداخت دستی (فاز ۵۹)
//
// اصول امنیتی:
//  • فایل هرگز در public/ نیست — در uploads/receipts/ بیرون از وب‌روت ذخیره می‌شود
//    و فقط از مسیر GET /api/receipts/[id] با احراز مالک/ادمین سرو می‌شود
//  • شناسهٔ فایل = ۴۸ نویسهٔ hex تصادفی (غیرقابل‌حدس) — نام اصلی کاربر هرگز
//    روی دیسک نمی‌رود؛ فقط به‌عنوان متن نمایشی پاک‌سازی‌شده در DB می‌ماند
//  • نوع فایل از «magic bytes» تشخیص داده می‌شود، نه از ادعای مرورگر
//    (Content-Type و نام فایل هرگز قابل‌اعتماد نیستند)
//  • فقط JPEG/PNG/WEBP و PDF — هیچ فایل اجرایی/آرشیوی پذیرفته نمی‌شود
//  • سقف ۵ مگابایت
// ---------------------------------------------------------------------------

import { randomBytes } from 'crypto'
import { mkdir, readFile, writeFile, unlink } from 'fs/promises'
import path from 'path'

export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024 // ۵MB

// 🗄️ فاز ۶۰ — رسیدها در «داده‌های پایدار» بیرون از پوشهٔ پروژه ذخیره می‌شوند
// (CT_DATA_DIR، پیش‌فرض /home/z/data) تا redeploy پروژه هرگز فایل رسیدهای
// موجود را از بین نبرد — همان سیاست پایداری دیتابیس.
//
// 🟢 Vercel/PostgreSQL note: فایل‌سیستم Vercel read-only است و /home/z/data
// وجود ندارد. در نتیجه ذخیره/خواندن receipt روی Vercel شکست می‌خورد. راه‌حل
// تولید-ready واقعی: Vercel Blob (با BLOB_READ_WRITE_TOKEN). تا زمانی که
// Blob فعال نشود، توابع زیر یک خطای واضح پرتاب می‌کنند (به‌جای EROFS مبهم)
// تا مسیر API یک پاسخ خطای تمیز برگرداند. این محدودیت در گزارش ممیزی ذکر شده.
const CT_DATA_DIR = (process.env.CT_DATA_DIR || '/home/z/data').trim() || '/home/z/data'
const RECEIPTS_DIR = path.join(CT_DATA_DIR, 'uploads', 'receipts')

/**
 * 🟢 آیا ذخیرهٔ receipt روی فایل‌سیستم محلی ممکن است؟ روی Vercel (فایل‌سیستم
 * read-only، بدون CT_DATA_DIR قابل‌نوشتن) → false. در توسعهٔ محلی → true.
 */
export function isReceiptStorageAvailable(): boolean {
  // روی Vercel، اگر توکن Blob تنظیم نشده باشد، ذخیرهٔ FS ممکن نیست.
  if (process.env.VERCEL === '1' && !process.env.CT_DATA_DIR) return false
  return true
}

export const RECEIPT_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const
export type ReceiptMime = (typeof RECEIPT_MIMES)[number]

export const RECEIPT_EXT_BY_MIME: Record<ReceiptMime, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
}

/** شناسهٔ غیرقابل‌حدس فایل — ۴۸ نویسهٔ hex (۱۹۲ بیت آنتروپی) */
export function generateReceiptId(): string {
  return randomBytes(24).toString('hex')
}

export function isReceiptId(id: string): boolean {
  return /^[a-f0-9]{48}$/.test(id)
}

export interface DetectedFileType {
  mime: ReceiptMime
}

/**
 * تشخیص نوع واقعی فایل با magic bytes — هر نوع دیگری (اجراایی، آرشیو، SVG و…)
 * قطعاً رد می‌شود. SVG عمداً پذیرفته نیست (می‌تواند اسکریپت داشته باشد).
 */
export function detectReceiptType(bytes: Uint8Array): DetectedFileType | null {
  if (bytes.length < 12) return null
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { mime: 'image/jpeg' }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return { mime: 'image/png' }
  // WEBP: RIFF .... WEBP
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return { mime: 'image/webp' }
  }
  // PDF: %PDF-
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d) {
    return { mime: 'application/pdf' }
  }
  return null
}

/** نام فایل اصلی فقط برای نمایش پاک‌سازی می‌شود — هرگز برای مسیر/ذخیره استفاده نمی‌شود */
export function sanitizeDisplayName(name: string): string {
  const base = (name || '').split(/[\\/]/).pop() || ''
  return base.replace(/[^\w.\- ()\u0600-\u06FF]/g, '_').trim().slice(0, 80) || 'receipt'
}

/**
 * 🟢 خطای واضح وقتی ذخیرهٔ receipt روی فایل‌سیستم ممکن نیست (Vercel read-only FS).
 * مسیرهای API این خطا را می‌گیرند و یک پاسخ خطای تمیز برمی‌گردانند.
 */
export class ReceiptStorageUnavailableError extends Error {
  constructor() {
    super('Receipt file storage is not available in this environment. Configure Vercel Blob (BLOB_READ_WRITE_TOKEN) for production receipt uploads.')
    this.name = 'ReceiptStorageUnavailableError'
  }
}

async function ensureDir(): Promise<void> {
  if (!isReceiptStorageAvailable()) throw new ReceiptStorageUnavailableError()
  await mkdir(RECEIPTS_DIR, { recursive: true })
}

/** ذخیرهٔ فایل با شناسهٔ امن — مسیر از شناسهٔ hex-اعتبارسنجی‌شده ساخته می‌شود (بدون traversal) */
export async function saveReceiptFile(id: string, mime: ReceiptMime, data: Buffer): Promise<void> {
  if (!isReceiptId(id)) throw new Error('Invalid receipt id')
  await ensureDir()
  const ext = RECEIPT_EXT_BY_MIME[mime]
  await writeFile(path.join(RECEIPTS_DIR, `${id}.${ext}`), data, { mode: 0o600 })
}

/** خواندن امن — id همیشه قبل از ساخت مسیر اعتبارسنجی می‌شود */
export async function readReceiptFile(id: string, mime: ReceiptMime): Promise<Buffer | null> {
  if (!isReceiptId(id)) return null
  const ext = RECEIPT_EXT_BY_MIME[mime]
  if (!ext) return null
  try {
    return await readFile(path.join(RECEIPTS_DIR, `${id}.${ext}`))
  } catch {
    return null
  }
}

/** حذف فایل رسید قبلی (در ارسال دوباره) — شکست آن جریان اصلی را نمی‌شکند */
export async function deleteReceiptFile(id: string | null | undefined): Promise<void> {
  if (!id || !isReceiptId(id)) return
  for (const mime of RECEIPT_MIMES) {
    const ext = RECEIPT_EXT_BY_MIME[mime]
    await unlink(path.join(RECEIPTS_DIR, `${id}.${ext}`)).catch(() => {})
  }
}
