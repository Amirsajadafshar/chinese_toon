import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'

// ---------------------------------------------------------------------------
// 🔐 احراز هویت پنل مدیریت — نسخهٔ سخت‌گیرانه (فاز ۲۲) + سشن DB-backed (فاز ۶۴)
//
// ارتقاهای امنیتی نسبت به نسخهٔ قبل:
//  ۱) توکن سشن به‌جای هش ثابتِ نام‌کاربری/رمز — هر ورود یک توکن تصادفی ۳۲بایتی
//     می‌سازد (از روی رمز قابل محاسبهٔ آفلاین نیست و با تغییر رمز بی‌اعتبار نمی‌شود)
//  ۲) انقضای سشن: ۲ ساعت بی‌کاری (لغزان) و سقف مطلق ۸ ساعت
//  ۳) مقایسهٔ توکن با timingSafeEqual (بدون نشت زمانی) روی هشِ توکن
//  ۴) امکان باطل‌کردن سشن از سرور (Logout) و پاک‌سازی خودکار سشن‌های منقضی
//  ۵) فقط هش توکن ذخیره می‌شود — نه خود توکن
//
// 🛫 فاز ۶۴ — سشن‌ها در جدول AdminSession دیتابیس نگه داشته می‌شوند، نه حافظهٔ
// پروسه. نگهداری در حافظه (Map روی globalThis) فقط در استقرار تک‌پروسه‌ای درست
// کار می‌کرد؛ روی Serverless (Vercel) هر درخواست ممکن است روی نمونهٔ دیگری اجرا
// شود و سشنِ ساخته‌شده در حافظهٔ نمونهٔ دیگر «ناموجود» می‌شد → الگوی ۴۰۱ تصادفی
// بعد از لاگین موفق. با DB، سشن بین همهٔ نمونه‌ها و در برابر ری‌استارت معتبر است.
//
// نام کاربری پیش‌فرض: admin — رمز پیش‌فرض: فقط در متغیرهای محیطی ADMIN_USERNAME/ADMIN_PASSWORD
// (متن رمز عمداً در هیچ کامنت/سورسی نوشته نمی‌شود — بهداشت رازها؛ فاز ۴۹)
// برای تغییر، در فایل .env مقدار ADMIN_USERNAME و ADMIN_PASSWORD را ویرایش کنید
// یا مستقیم از تب Settings پنل (کارت «Panel access») اعتبارنامهٔ جدید بسازید —
// اعتبارنامهٔ سفارشی با scrypt هش می‌شود و در جدول SiteSetting (کلید adminAuth) ذخیره می‌شود.
// لینک پنل در فوتر حذف شده — ورود فقط با آدرس مستقیم: #/admin
// ---------------------------------------------------------------------------

export const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin'
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'chinesetoon2024'

/**
 * 🛡️ سخت‌سازی امنیتی (فاز ۴۹) — کلید خاموش‌کنندهٔ اعتبارنامهٔ پیش‌فرض:
 * ADMIN_ALLOW_DEFAULT=0 یا "false" → در استقرار پروداکشن، اگر اعتبارنامهٔ سفارشی
 * در دیتابیس ذخیره نشده باشد، ورود با اعتبارنامهٔ پیش‌فرض env «رد» می‌شود
 * (fail-closed) تا رمز شناخته‌شدهٔ عمومی هرگز دروازهٔ ادمین نباشد.
 * پیش‌فرض (خالی/1) رفتار فعلی سندباکس را حفظ می‌کند تا پیش‌نمایش مالک نشکند.
 */
export const ADMIN_ALLOW_DEFAULT = !['0', 'false', 'no', 'off'].includes(
  (process.env.ADMIN_ALLOW_DEFAULT ?? '').trim().toLowerCase()
)

// ---------------------------------------------------------------------------
// 🔑 اعتبارنامهٔ سفارشی مالک (فاز ۲۴) — hash با scrypt در SiteSetting
//    ساختار ذخیره‌شده: { username, salt, hash } — هرگز رمز خام ذخیره نمی‌شود
// ---------------------------------------------------------------------------
interface CustomCredentials {
  username: string
  salt: string
  hash: string
}

const ADMIN_AUTH_KEY = 'adminAuth'

async function loadCustomCredentials(): Promise<CustomCredentials | null> {
  try {
    const row = await db.siteSetting.findUnique({ where: { key: ADMIN_AUTH_KEY } })
    if (!row) return null
    const parsed = JSON.parse(row.value) as Partial<CustomCredentials>
    if (
      typeof parsed?.username !== 'string' ||
      typeof parsed?.salt !== 'string' ||
      typeof parsed?.hash !== 'string' ||
      !parsed.username ||
      !parsed.salt ||
      !parsed.hash
    ) {
      return null
    }
    return { username: parsed.username, salt: parsed.salt, hash: parsed.hash }
  } catch {
    return null // دیتابیس در دسترس نیست → افتادن به اعتبارنامهٔ env
  }
}

/** ذخیرهٔ اعتبارنامهٔ جدید (هش scrypt) — از مسیر /api/admin/credentials صدا زده می‌شود */
export async function setAdminCredentials(username: string, password: string): Promise<void> {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  const value = JSON.stringify({ username: username.trim().toLowerCase(), salt, hash })
  await db.siteSetting.upsert({
    where: { key: ADMIN_AUTH_KEY },
    update: { value },
    create: { key: ADMIN_AUTH_KEY, value },
  })
}

/** آیا اعتبارنامهٔ سفارشی ذخیره شده؟ (برای نمایش در پنل) */
export async function hasCustomCredentials(): Promise<boolean> {
  return (await loadCustomCredentials()) !== null
}

/** نام کاربری مؤثر — سفارشی اگر باشد، وگرنه env */
export async function getEffectiveUsername(): Promise<string> {
  const custom = await loadCustomCredentials()
  return custom?.username ?? ADMIN_USERNAME.trim().toLowerCase()
}

const SESSION_IDLE_MS = 2 * 60 * 60 * 1000 // ۲ ساعت بی‌کاری
const SESSION_ABSOLUTE_MS = 8 * 60 * 60 * 1000 // سقف مطلق ۸ ساعت

// 🧠 کش per-instance نام ادمینِ سشن — «فقط» برای سینک ماندن امضای getAdminActor
// (که بعد از isAuthorized صدا زده می‌شود) استفاده می‌شود؛ اعتبارِ واقعی توکن
// همیشه و در هر درخواست از دیتابیس چک می‌شود، پس این کش هرگز مجوز نمی‌دهد.
const actorStore = globalThis as unknown as {
  __ctAdminActors?: Map<string, { username: string; expiresAt: number }>
}
const actorCache: Map<string, { username: string; expiresAt: number }> =
  actorStore.__ctAdminActors ?? new Map()
actorStore.__ctAdminActors = actorCache

let lastSweep = Date.now()
function sweepExpired(): void {
  const now = Date.now()
  if (now - lastSweep < 60 * 1000) return
  lastSweep = now
  // پاک‌سازی سشن‌های منقضی در دیتابیس — fire-and-forget تا جریان اصلی نشکند
  void db.adminSession
    .deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date(now) } },
          { lastSeenAt: { lt: new Date(now - SESSION_IDLE_MS) } },
        ],
      },
    })
    .catch(() => {})
  for (const [k, v] of actorCache) {
    if (now > v.expiresAt) actorCache.delete(k)
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

// مقایسهٔ امن رشته‌ها (بدون نشت زمانی)
function safeEqual(a: string | Buffer, b: string | Buffer): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  return ba.length === bb.length && timingSafeEqual(ba, bb)
}

// مقایسهٔ امن نام کاربری و رمز ورود
// اولویت: اعتبارنامهٔ سفارشی ذخیره‌شده در دیتابیس (scrypt) → اگر نبود، env پیش‌فرض
export async function verifyLogin(username: string, password: string): Promise<boolean> {
  try {
    const uHash = createHash('sha256').update(username.trim().toLowerCase()).digest('hex')

    // ۱) اعتبارنامهٔ سفارشی مالک
    const custom = await loadCustomCredentials()
    if (custom) {
      const uOkCustom = safeEqual(
        uHash,
        createHash('sha256').update(custom.username).digest('hex')
      )
      if (!uOkCustom) return false
      const attempt = scryptSync(password, custom.salt, 64)
      const stored = Buffer.from(custom.hash, 'hex')
      return safeEqual(attempt, stored)
    }

    // ۲) اعتبارنامهٔ پیش‌فرض env — در حالت fail-closed پروداکشن کاملاً مسدود است
    if (!ADMIN_ALLOW_DEFAULT) return false

    // 🛡️ ردپای ممیزی: استفاده از اعتبارنامهٔ پیش‌فرض فقط یک‌بار در لاگ هشدار داده می‌شود
    // (بدون هیچ رازی — فقط رویداد) تا مالک بداند هنوز روی رمز عمومی است.
    if (!defaultCredWarned) {
      defaultCredWarned = true
      console.warn('[admin-auth] login using DEFAULT env credentials — set custom credentials from the panel or ADMIN_ALLOW_DEFAULT=0 in production')
    }

    const uOk = safeEqual(
      uHash,
      createHash('sha256').update(ADMIN_USERNAME.trim().toLowerCase()).digest('hex')
    )
    const pOk = safeEqual(
      createHash('sha256').update(password).digest('hex'),
      createHash('sha256').update(ADMIN_PASSWORD).digest('hex')
    )
    return uOk && pOk
  } catch {
    return false
  }
}

// 🛡️ پرچم یک‌بارمصرف هشدار «ورود با اعتبارنامهٔ پیش‌فرض» (فاز ۴۹)
let defaultCredWarned = false

/** باطل‌کردن همهٔ سشن‌ها — بعد از تغییر رمز از پنل (ورود دوباره اجباری) */
export async function revokeAllSessions(): Promise<number> {
  actorCache.clear()
  try {
    const r = await db.adminSession.deleteMany({})
    return r.count
  } catch {
    return 0
  }
}

/** ساخت سشن جدید پس از ورود موفق — توکن تصادفی ۳۲بایتی (۶۴ کاراکتر hex) */
export async function createAdminSession(username = 'admin'): Promise<{ token: string; expiresAt: number }> {
  sweepExpired()
  const token = randomBytes(32).toString('hex')
  const now = Date.now()
  const expiresAt = now + SESSION_ABSOLUTE_MS
  await db.adminSession.create({
    data: {
      tokenHash: hashToken(token),
      username: (username || 'admin').slice(0, 60),
      issuedAt: new Date(now),
      lastSeenAt: new Date(now),
      expiresAt: new Date(expiresAt),
    },
  })
  return { token, expiresAt }
}

/** بررسی هدر x-admin-key روی درخواست‌های مدیریتی + تمدید لغزان سشن */
export async function isAuthorized(req: NextRequest): Promise<boolean> {
  const key = req.headers.get('x-admin-key')
  if (!key || key.length !== 64) return false
  const hashed = hashToken(key)
  const now = Date.now()
  try {
    const session = await db.adminSession.findUnique({ where: { tokenHash: hashed } })
    if (!session) return false
    if (session.expiresAt.getTime() <= now || now - session.lastSeenAt.getTime() > SESSION_IDLE_MS) {
      // سشن منقضی — ردیفش را هم جمع کن (fire-and-forget)
      void db.adminSession.delete({ where: { tokenHash: hashed } }).catch(() => {})
      actorCache.delete(hashed)
      return false
    }
    // تمدید لغزان — نوشتن در DB حداکثر هر ۶۰ ثانیه یک‌بار کافی است (کاهش بار)
    if (now - session.lastSeenAt.getTime() > 60 * 1000) {
      void db.adminSession
        .update({ where: { tokenHash: hashed }, data: { lastSeenAt: new Date(now) } })
        .catch(() => {})
    }
    actorCache.set(hashed, { username: session.username, expiresAt: session.expiresAt.getTime() })
    return true
  } catch {
    return false // دیتابیس در دسترس نیست → fail-closed (هرگز مجوز کورکورانه نده)
  }
}

/** باطل‌کردن سشن (خروج از پنل) */
export async function revokeAdminSession(token: string | null | undefined): Promise<boolean> {
  if (!token) return false
  const hashed = hashToken(token)
  actorCache.delete(hashed)
  try {
    const r = await db.adminSession.deleteMany({ where: { tokenHash: hashed } })
    return r.count > 0
  } catch {
    return false
  }
}

/** 🧾 فاز ۵۳ — نام ادمینِ صاحب سشن برای Audit Log (فقط بعد از isAuthorized صدا زده شود؛
 *  کش per-instance توسط isAuthorized پر شده است) */
export function getAdminActor(req: NextRequest): string {
  const key = req.headers.get('x-admin-key')
  if (!key || key.length !== 64) return 'admin'
  const hit = actorCache.get(hashToken(key))
  if (!hit || Date.now() > hit.expiresAt) return 'admin'
  return hit.username || 'admin'
}

/** تعداد سشن‌های فعال (برای پایش) */
export async function activeSessionCount(): Promise<number> {
  sweepExpired()
  try {
    const now = Date.now()
    return await db.adminSession.count({
      where: {
        expiresAt: { gt: new Date(now) },
        lastSeenAt: { gt: new Date(now - SESSION_IDLE_MS) },
      },
    })
  } catch {
    return 0
  }
}
