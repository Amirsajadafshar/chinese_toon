// ---------------------------------------------------------------------------
// 🛠️ ensure-schema — خودترمیمیِ اسکیمای دیتابیس در زمان اجرا (فاز ۶۳)
//
// ریشهٔ واقعی «Could not create the account (Ref: …)» و «لاگین نمی‌شود» روی
// محیط استقرار: فایل SQLite تولید یا «خالی» است (بدون هیچ جدولی — Prisma خودش
// هرگز جدول نمی‌سازد؛ db push یک گام دستی CLI است) یا از یک بکاپِ قدیمی با
// اسکیمای کهنه بازیابی شده است (ستون‌های جدید مثل dateOfBirth/uniqueCode غایب‌اند).
// نتیجه: هر کوئری Prisma با P2021 (جدول غایب) یا P2022 (ستون غایب) خطا می‌دهد و
// register/login با 500 + کد رهگیری شکست می‌خورند.
//
// راه‌حل: این ماژول «فقط-افزاینده» (additive-only) است و هرگز:
//   • جدولی را drop نمی‌کند
//   • ستونی را حذف یا نوعش را تغییر نمی‌دهد
//   • هیچ ردیف داده‌ای را دست نمی‌زند
// فقط: جدول‌های غایب را با شکل کامل فعلی می‌سازد، ستون‌های غایب جدول‌های موجود
// را با DEFAULT امن اضافه می‌کند و ایندکس‌های یکتا/جست‌وجو را تضمین می‌کند.
// اجرای دوباره کاملاً بی‌اثر (idempotent) است.
//
// امنیت: هیچ راز/دادهٔ حساسی در این فایل نیست؛ فقط DDL.
// ---------------------------------------------------------------------------

import { db } from '@/lib/db'

/**
 * 🟢 PostgreSQL guard — تشخیص می‌دهد که آیا دیتابیس فعلی PostgreSQL است
 * (production روی Vercel + Neon). در PostgreSQL، مدیریت اسکیما بر عهدهٔ
 * `prisma migrate deploy` است و این خودترمیمِ SQLite-only نباید اجرا شود
 * (DDLهای زیر شامل `DATETIME`, `BOOLEAN NOT NULL DEFAULT 0`,
 * `sqlite_master`, `PRAGMA table_info` است که روی PostgreSQL نامعتبرند).
 */
function isPostgresDatabase(): boolean {
  const url = (process.env.DATABASE_URL ?? '').trim().toLowerCase()
  return url.startsWith('postgres') || url.startsWith('postgresql')
}

/** تشخیص خطای ناهم‌خوانی اسکیما (جدول/ستون غایب) از روی کد Prisma */
export function isSchemaDriftError(e: unknown): boolean {
  const code = (e as { code?: string } | null)?.code
  return code === 'P2021' || code === 'P2022'
}

// ---------------------------------------------------------------------------
// DDL کامل فعلی — آینهٔ prisma/schema.prisma (فاز ۶۳). اگر آینده جدولی اضافه
// یا ستونی پیدا کرد، همین‌جا هم به‌روز می‌شود (تک منبع مکمل).
// ---------------------------------------------------------------------------

const CREATE_TABLES: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS "SupportMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "topic" TEXT NOT NULL DEFAULT 'general',
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS "Registration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "userId" TEXT,
    "age" INTEGER,
    "level" TEXT NOT NULL,
    "classType" TEXT NOT NULL DEFAULT 'group',
    "deletedAt" DATETIME,
    "classTitle" TEXT,
    "schedule" TEXT,
    "goal" TEXT,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "timezone" TEXT NOT NULL DEFAULT '',
    "preferredDays" TEXT NOT NULL DEFAULT '[]',
    "preferredTimes" TEXT NOT NULL DEFAULT '[]',
    "daysPerWeek" INTEGER,
    "scheduleAck" BOOLEAN NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Registration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "NewsletterSubscriber" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS "Post" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "tag" TEXT NOT NULL DEFAULT 'news',
    "emoji" TEXT NOT NULL DEFAULT '📝',
    "color" TEXT NOT NULL DEFAULT 'sage',
    "image" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "excerpt" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "Testimonial" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "text" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "featured" BOOLEAN NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME
  )`,
  `CREATE TABLE IF NOT EXISTS "ReviewLike" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "testimonialId" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReviewLike_testimonialId_fkey" FOREIGN KEY ("testimonialId") REFERENCES "Testimonial" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "FaqItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL DEFAULT 'general',
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "helpfulYes" INTEGER NOT NULL DEFAULT 0,
    "helpfulNo" INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS "FaqVote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "faqId" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "vote" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FaqVote_faqId_fkey" FOREIGN KEY ("faqId") REFERENCES "FaqItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "LearnCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chinese" TEXT NOT NULL,
    "pinyin" TEXT NOT NULL,
    "meaning" TEXT NOT NULL,
    "example" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS "QuizQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "question" TEXT NOT NULL,
    "options" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS "Teacher" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "bio" TEXT NOT NULL DEFAULT '',
    "tag" TEXT NOT NULL DEFAULT '',
    "langs" TEXT NOT NULL DEFAULT 'Chinese, English',
    "image" TEXT,
    "resume" TEXT NOT NULL DEFAULT '',
    "experienceYears" INTEGER NOT NULL DEFAULT 0,
    "studentsTaught" INTEGER NOT NULL DEFAULT 0,
    "certificates" TEXT NOT NULL DEFAULT '',
    "samples" TEXT NOT NULL DEFAULT '[]',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS "Lesson" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL DEFAULT '',
    "subtitle" TEXT NOT NULL DEFAULT '',
    "big" TEXT NOT NULL DEFAULT '',
    "small" TEXT NOT NULL DEFAULT '',
    "tag" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'vocabulary',
    "color" TEXT NOT NULL DEFAULT 'sage',
    "action" TEXT NOT NULL DEFAULT 'Learn',
    "isVideo" BOOLEAN NOT NULL DEFAULT 0,
    "words" TEXT NOT NULL DEFAULT '[]',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS "SiteSetting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" DATETIME,
    "country" TEXT NOT NULL DEFAULT '',
    "countryCode" TEXT NOT NULL DEFAULT '',
    "phone" TEXT,
    "telegramUsername" TEXT,
    "telegramId" TEXT,
    "uniqueCode" TEXT,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "UserSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL DEFAULT '',
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "UsdtOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ref" TEXT NOT NULL,
    "userId" TEXT,
    "productId" TEXT NOT NULL,
    "productTitle" TEXT NOT NULL,
    "contactName" TEXT NOT NULL DEFAULT '',
    "contactEmail" TEXT NOT NULL DEFAULT '',
    "expectedMicro" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USDT',
    "network" TEXT NOT NULL DEFAULT 'TRON',
    "paymentMode" TEXT NOT NULL,
    "paymentAddress" TEXT NOT NULL,
    "addressIndex" INTEGER,
    "clientIp" TEXT NOT NULL DEFAULT '',
    "pricePerSession" REAL,
    "packageSessions" INTEGER,
    "baseAmount" REAL,
    "tierPercent" REAL,
    "discountCode" TEXT,
    "discountAmount" REAL,
    "discountType" TEXT,
    "discountValue" REAL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'USDT_TRON',
    "receiptId" TEXT,
    "receiptStatus" TEXT,
    "receiptMime" TEXT,
    "receiptSize" INTEGER,
    "receiptFileName" TEXT,
    "receiptSubmittedAt" DATETIME,
    "receiptResubmits" INTEGER NOT NULL DEFAULT 0,
    "reviewedAt" DATETIME,
    "reviewedBy" TEXT,
    "rejectionReason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "txHash" TEXT,
    "txAmountMicro" INTEGER,
    "txFrom" TEXT,
    "paidAt" DATETIME,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UsdtOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "CourseClass" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL DEFAULT '',
    "fullDescription" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'beginner',
    "status" TEXT NOT NULL DEFAULT 'active',
    "featured" BOOLEAN NOT NULL DEFAULT 0,
    "color" TEXT NOT NULL DEFAULT 'sage',
    "classType" TEXT NOT NULL DEFAULT 'group',
    "level" TEXT NOT NULL DEFAULT 'All Levels',
    "registerLevels" TEXT NOT NULL DEFAULT '[]',
    "currency" TEXT NOT NULL DEFAULT 'USDT',
    "pricePerSession" REAL NOT NULL DEFAULT 0,
    "packageSessions" INTEGER NOT NULL DEFAULT 1,
    "packagePrice" REAL NOT NULL DEFAULT 0,
    "priceNote" TEXT NOT NULL DEFAULT '',
    "sessionDurationMin" INTEGER,
    "format" TEXT NOT NULL DEFAULT 'online',
    "maxStudents" INTEGER,
    "minStudents" INTEGER,
    "schedule" TEXT NOT NULL DEFAULT '',
    "startDate" DATETIME,
    "endDate" DATETIME,
    "timezone" TEXT NOT NULL DEFAULT '',
    "meta" TEXT NOT NULL DEFAULT '[]',
    "highlights" TEXT NOT NULL DEFAULT '[]',
    "requirements" TEXT NOT NULL DEFAULT '[]',
    "audience" TEXT NOT NULL DEFAULT '[]',
    "curriculum" TEXT NOT NULL DEFAULT '[]',
    "materials" TEXT NOT NULL DEFAULT '[]',
    "notes" TEXT NOT NULL DEFAULT '',
    "image" TEXT NOT NULL DEFAULT '',
    "videoUrl" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "PaymentEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "orderRef" TEXT,
    "txHash" TEXT,
    "detail" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS "Discount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'percent',
    "value" REAL NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT 1,
    "startsAt" DATETIME,
    "endsAt" DATETIME,
    "classIds" TEXT NOT NULL DEFAULT '[]',
    "classTypes" TEXT NOT NULL DEFAULT '[]',
    "levels" TEXT NOT NULL DEFAULT '[]',
    "minSessions" INTEGER NOT NULL DEFAULT 1,
    "maxUses" INTEGER,
    "perCustomer" INTEGER NOT NULL DEFAULT 1,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
  )`,
  `CREATE TABLE IF NOT EXISTS "DiscountRedemption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "discountId" TEXT NOT NULL,
    "orderRef" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DiscountRedemption_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "Discount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "ClassSchedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "orderRef" TEXT,
    "registrationId" TEXT,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "timezone" TEXT NOT NULL,
    "inputDate" TEXT,
    "inputTime" TEXT,
    "inputDay" TEXT,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PROPOSED',
    "createdBy" TEXT NOT NULL DEFAULT 'admin',
    "confirmedAt" DATETIME,
    "confirmedBy" TEXT,
    "cancelledAt" DATETIME,
    "cancelledBy" TEXT,
    "cancelReason" TEXT,
    "supersededById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClassSchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClassSchedule_classId_fkey" FOREIGN KEY ("classId") REFERENCES "CourseClass" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClassSchedule_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ClassSchedule_supersededById_fkey" FOREIGN KEY ("supersededById") REFERENCES "ClassSchedule" ("id") ON DELETE SET NULL ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "ScheduleAudit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scheduleId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "detail" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScheduleAudit_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "ClassSchedule" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "ScheduleNotification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "scheduleId" TEXT,
    "kind" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'schedule',
    "orderRef" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScheduleNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScheduleNotification_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "ClassSchedule" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "BackupLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "sizeBytes" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'STARTED',
    "trigger" TEXT NOT NULL DEFAULT 'MANUAL',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "durationMs" INTEGER,
    "error" TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS "ErrorLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "context" TEXT NOT NULL DEFAULT '',
    "statusCode" INTEGER,
    "refId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL DEFAULT '',
    "meta" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS "AdminSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "RateEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bucketKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS "RateBlock" (
    "bucketKey" TEXT NOT NULL PRIMARY KEY,
    "until" DATETIME NOT NULL
  )`,
]

// ایندکس‌ها — نام‌ها دقیقاً مطابق قرارداد Prisma تا با db push هم‌خوان بمانند
const CREATE_INDEXES: readonly string[] = [
  `CREATE INDEX IF NOT EXISTS "Registration_userId_idx" ON "Registration"("userId")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Post_slug_key" ON "Post"("slug")`,
  `CREATE INDEX IF NOT EXISTS "Testimonial_status_featured_idx" ON "Testimonial"("status", "featured")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "ReviewLike_testimonialId_visitorId_key" ON "ReviewLike"("testimonialId", "visitorId")`,
  `CREATE INDEX IF NOT EXISTS "ReviewLike_visitorId_idx" ON "ReviewLike"("visitorId")`,
  `CREATE INDEX IF NOT EXISTS "FaqItem_published_sortOrder_idx" ON "FaqItem"("published", "sortOrder")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "FaqVote_faqId_visitorId_key" ON "FaqVote"("faqId", "visitorId")`,
  `CREATE INDEX IF NOT EXISTS "FaqVote_visitorId_idx" ON "FaqVote"("visitorId")`,
  `CREATE INDEX IF NOT EXISTS "FaqVote_faqId_idx" ON "FaqVote"("faqId")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Lesson_slug_key" ON "Lesson"("slug")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_uniqueCode_key" ON "User"("uniqueCode")`,
  `CREATE INDEX IF NOT EXISTS "User_createdAt_idx" ON "User"("createdAt")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "UserSession_tokenHash_key" ON "UserSession"("tokenHash")`,
  `CREATE INDEX IF NOT EXISTS "UserSession_userId_idx" ON "UserSession"("userId")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash")`,
  `CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "UsdtOrder_ref_key" ON "UsdtOrder"("ref")`,
  `CREATE INDEX IF NOT EXISTS "UsdtOrder_userId_idx" ON "UsdtOrder"("userId")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "UsdtOrder_txHash_key" ON "UsdtOrder"("txHash")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "UsdtOrder_addressIndex_key" ON "UsdtOrder"("addressIndex")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "UsdtOrder_receiptId_key" ON "UsdtOrder"("receiptId")`,
  `CREATE INDEX IF NOT EXISTS "UsdtOrder_status_expiresAt_idx" ON "UsdtOrder"("status", "expiresAt")`,
  `CREATE INDEX IF NOT EXISTS "UsdtOrder_paymentAddress_idx" ON "UsdtOrder"("paymentAddress")`,
  `CREATE INDEX IF NOT EXISTS "UsdtOrder_paymentMethod_status_idx" ON "UsdtOrder"("paymentMethod", "status")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "CourseClass_slug_key" ON "CourseClass"("slug")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "CourseClass_productId_key" ON "CourseClass"("productId")`,
  `CREATE INDEX IF NOT EXISTS "CourseClass_status_idx" ON "CourseClass"("status")`,
  `CREATE INDEX IF NOT EXISTS "CourseClass_classType_idx" ON "CourseClass"("classType")`,
  `CREATE INDEX IF NOT EXISTS "CourseClass_category_idx" ON "CourseClass"("category")`,
  `CREATE INDEX IF NOT EXISTS "CourseClass_sortOrder_idx" ON "CourseClass"("sortOrder")`,
  `CREATE INDEX IF NOT EXISTS "PaymentEvent_orderRef_idx" ON "PaymentEvent"("orderRef")`,
  `CREATE INDEX IF NOT EXISTS "PaymentEvent_txHash_idx" ON "PaymentEvent"("txHash")`,
  `CREATE INDEX IF NOT EXISTS "PaymentEvent_kind_createdAt_idx" ON "PaymentEvent"("kind", "createdAt")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Discount_code_key" ON "Discount"("code")`,
  `CREATE INDEX IF NOT EXISTS "Discount_active_idx" ON "Discount"("active")`,
  `CREATE INDEX IF NOT EXISTS "DiscountRedemption_discountId_idx" ON "DiscountRedemption"("discountId")`,
  `CREATE INDEX IF NOT EXISTS "DiscountRedemption_userEmail_idx" ON "DiscountRedemption"("userEmail")`,
  `CREATE INDEX IF NOT EXISTS "DiscountRedemption_orderRef_idx" ON "DiscountRedemption"("orderRef")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "ClassSchedule_userId_classId_startAt_key" ON "ClassSchedule"("userId", "classId", "startAt")`,
  `CREATE INDEX IF NOT EXISTS "ClassSchedule_status_startAt_idx" ON "ClassSchedule"("status", "startAt")`,
  `CREATE INDEX IF NOT EXISTS "ClassSchedule_userId_status_idx" ON "ClassSchedule"("userId", "status")`,
  `CREATE INDEX IF NOT EXISTS "ClassSchedule_classId_status_idx" ON "ClassSchedule"("classId", "status")`,
  `CREATE INDEX IF NOT EXISTS "ClassSchedule_orderRef_idx" ON "ClassSchedule"("orderRef")`,
  `CREATE INDEX IF NOT EXISTS "ScheduleAudit_scheduleId_createdAt_idx" ON "ScheduleAudit"("scheduleId", "createdAt")`,
  `CREATE INDEX IF NOT EXISTS "ScheduleNotification_userId_readAt_idx" ON "ScheduleNotification"("userId", "readAt")`,
  `CREATE INDEX IF NOT EXISTS "ScheduleNotification_userId_category_createdAt_idx" ON "ScheduleNotification"("userId", "category", "createdAt")`,
  `CREATE INDEX IF NOT EXISTS "BackupLog_status_startedAt_idx" ON "BackupLog"("status", "startedAt")`,
  `CREATE INDEX IF NOT EXISTS "BackupLog_trigger_startedAt_idx" ON "BackupLog"("trigger", "startedAt")`,
  `CREATE INDEX IF NOT EXISTS "ErrorLog_category_createdAt_idx" ON "ErrorLog"("category", "createdAt")`,
  `CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt")`,
  `CREATE INDEX IF NOT EXISTS "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "AdminSession_tokenHash_key" ON "AdminSession"("tokenHash")`,
  `CREATE INDEX IF NOT EXISTS "AdminSession_lastSeenAt_idx" ON "AdminSession"("lastSeenAt")`,
  `CREATE INDEX IF NOT EXISTS "AdminSession_expiresAt_idx" ON "AdminSession"("expiresAt")`,
  `CREATE INDEX IF NOT EXISTS "RateEvent_bucketKey_createdAt_idx" ON "RateEvent"("bucketKey", "createdAt")`,
  `CREATE INDEX IF NOT EXISTS "RateBlock_until_idx" ON "RateBlock"("until")`,
]

// ---------------------------------------------------------------------------
// ترمیم ستون‌های جدول‌های «موجودِ کهنه» — فقط ADD COLUMN با DEFAULT امن
// (محدودیت SQLite: ستون NOT NULL فقط با DEFAULT قابل‌اضافه است)
// ---------------------------------------------------------------------------
const ALTER_COLUMNS: Readonly<Record<string, readonly string[]>> = {
  User: [
    'ALTER TABLE "User" ADD COLUMN "dateOfBirth" DATETIME',
    'ALTER TABLE "User" ADD COLUMN "country" TEXT NOT NULL DEFAULT \'\'',
    'ALTER TABLE "User" ADD COLUMN "countryCode" TEXT NOT NULL DEFAULT \'\'',
    'ALTER TABLE "User" ADD COLUMN "phone" TEXT',
    'ALTER TABLE "User" ADD COLUMN "telegramUsername" TEXT',
    'ALTER TABLE "User" ADD COLUMN "telegramId" TEXT',
    'ALTER TABLE "User" ADD COLUMN "uniqueCode" TEXT',
    'ALTER TABLE "User" ADD COLUMN "lastLoginAt" DATETIME',
  ],
  UserSession: ['ALTER TABLE "UserSession" ADD COLUMN "userAgent" TEXT NOT NULL DEFAULT \'\''],
  PasswordResetToken: ['ALTER TABLE "PasswordResetToken" ADD COLUMN "usedAt" DATETIME'],
  Registration: [
    'ALTER TABLE "Registration" ADD COLUMN "userId" TEXT',
    'ALTER TABLE "Registration" ADD COLUMN "classType" TEXT NOT NULL DEFAULT \'group\'',
    'ALTER TABLE "Registration" ADD COLUMN "deletedAt" DATETIME',
    'ALTER TABLE "Registration" ADD COLUMN "classTitle" TEXT',
    'ALTER TABLE "Registration" ADD COLUMN "schedule" TEXT',
    'ALTER TABLE "Registration" ADD COLUMN "goal" TEXT',
    'ALTER TABLE "Registration" ADD COLUMN "message" TEXT',
    'ALTER TABLE "Registration" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT \'\'',
    'ALTER TABLE "Registration" ADD COLUMN "preferredDays" TEXT NOT NULL DEFAULT \'[]\'',
    'ALTER TABLE "Registration" ADD COLUMN "preferredTimes" TEXT NOT NULL DEFAULT \'[]\'',
    'ALTER TABLE "Registration" ADD COLUMN "daysPerWeek" INTEGER',
    'ALTER TABLE "Registration" ADD COLUMN "scheduleAck" BOOLEAN NOT NULL DEFAULT 0',
  ],
  UsdtOrder: [
    'ALTER TABLE "UsdtOrder" ADD COLUMN "userId" TEXT',
    'ALTER TABLE "UsdtOrder" ADD COLUMN "clientIp" TEXT NOT NULL DEFAULT \'\'',
    'ALTER TABLE "UsdtOrder" ADD COLUMN "pricePerSession" REAL',
    'ALTER TABLE "UsdtOrder" ADD COLUMN "packageSessions" INTEGER',
    'ALTER TABLE "UsdtOrder" ADD COLUMN "baseAmount" REAL',
    'ALTER TABLE "UsdtOrder" ADD COLUMN "tierPercent" REAL',
    'ALTER TABLE "UsdtOrder" ADD COLUMN "discountCode" TEXT',
    'ALTER TABLE "UsdtOrder" ADD COLUMN "discountAmount" REAL',
    'ALTER TABLE "UsdtOrder" ADD COLUMN "discountType" TEXT',
    'ALTER TABLE "UsdtOrder" ADD COLUMN "discountValue" REAL',
    'ALTER TABLE "UsdtOrder" ADD COLUMN "paymentMethod" TEXT NOT NULL DEFAULT \'USDT_TRON\'',
    'ALTER TABLE "UsdtOrder" ADD COLUMN "receiptId" TEXT',
    'ALTER TABLE "UsdtOrder" ADD COLUMN "receiptStatus" TEXT',
    'ALTER TABLE "UsdtOrder" ADD COLUMN "receiptMime" TEXT',
    'ALTER TABLE "UsdtOrder" ADD COLUMN "receiptSize" INTEGER',
    'ALTER TABLE "UsdtOrder" ADD COLUMN "receiptFileName" TEXT',
    'ALTER TABLE "UsdtOrder" ADD COLUMN "receiptSubmittedAt" DATETIME',
    'ALTER TABLE "UsdtOrder" ADD COLUMN "receiptResubmits" INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE "UsdtOrder" ADD COLUMN "reviewedAt" DATETIME',
    'ALTER TABLE "UsdtOrder" ADD COLUMN "reviewedBy" TEXT',
    'ALTER TABLE "UsdtOrder" ADD COLUMN "rejectionReason" TEXT',
    'ALTER TABLE "UsdtOrder" ADD COLUMN "txAmountMicro" INTEGER',
    'ALTER TABLE "UsdtOrder" ADD COLUMN "txFrom" TEXT',
  ],
  CourseClass: [
    'ALTER TABLE "CourseClass" ADD COLUMN "shortDescription" TEXT NOT NULL DEFAULT \'\'',
    'ALTER TABLE "CourseClass" ADD COLUMN "fullDescription" TEXT NOT NULL DEFAULT \'\'',
    'ALTER TABLE "CourseClass" ADD COLUMN "category" TEXT NOT NULL DEFAULT \'beginner\'',
    'ALTER TABLE "CourseClass" ADD COLUMN "status" TEXT NOT NULL DEFAULT \'active\'',
    'ALTER TABLE "CourseClass" ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT 0',
    'ALTER TABLE "CourseClass" ADD COLUMN "color" TEXT NOT NULL DEFAULT \'sage\'',
    'ALTER TABLE "CourseClass" ADD COLUMN "classType" TEXT NOT NULL DEFAULT \'group\'',
    'ALTER TABLE "CourseClass" ADD COLUMN "level" TEXT NOT NULL DEFAULT \'All Levels\'',
    'ALTER TABLE "CourseClass" ADD COLUMN "registerLevels" TEXT NOT NULL DEFAULT \'[]\'',
    'ALTER TABLE "CourseClass" ADD COLUMN "currency" TEXT NOT NULL DEFAULT \'USDT\'',
    'ALTER TABLE "CourseClass" ADD COLUMN "pricePerSession" REAL NOT NULL DEFAULT 0',
    'ALTER TABLE "CourseClass" ADD COLUMN "packageSessions" INTEGER NOT NULL DEFAULT 1',
    'ALTER TABLE "CourseClass" ADD COLUMN "packagePrice" REAL NOT NULL DEFAULT 0',
    'ALTER TABLE "CourseClass" ADD COLUMN "priceNote" TEXT NOT NULL DEFAULT \'\'',
    'ALTER TABLE "CourseClass" ADD COLUMN "sessionDurationMin" INTEGER',
    'ALTER TABLE "CourseClass" ADD COLUMN "format" TEXT NOT NULL DEFAULT \'online\'',
    'ALTER TABLE "CourseClass" ADD COLUMN "maxStudents" INTEGER',
    'ALTER TABLE "CourseClass" ADD COLUMN "minStudents" INTEGER',
    'ALTER TABLE "CourseClass" ADD COLUMN "schedule" TEXT NOT NULL DEFAULT \'\'',
    'ALTER TABLE "CourseClass" ADD COLUMN "startDate" DATETIME',
    'ALTER TABLE "CourseClass" ADD COLUMN "endDate" DATETIME',
    'ALTER TABLE "CourseClass" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT \'\'',
    'ALTER TABLE "CourseClass" ADD COLUMN "meta" TEXT NOT NULL DEFAULT \'[]\'',
    'ALTER TABLE "CourseClass" ADD COLUMN "highlights" TEXT NOT NULL DEFAULT \'[]\'',
    'ALTER TABLE "CourseClass" ADD COLUMN "requirements" TEXT NOT NULL DEFAULT \'[]\'',
    'ALTER TABLE "CourseClass" ADD COLUMN "audience" TEXT NOT NULL DEFAULT \'[]\'',
    'ALTER TABLE "CourseClass" ADD COLUMN "curriculum" TEXT NOT NULL DEFAULT \'[]\'',
    'ALTER TABLE "CourseClass" ADD COLUMN "materials" TEXT NOT NULL DEFAULT \'[]\'',
    'ALTER TABLE "CourseClass" ADD COLUMN "notes" TEXT NOT NULL DEFAULT \'\'',
    'ALTER TABLE "CourseClass" ADD COLUMN "image" TEXT NOT NULL DEFAULT \'\'',
    'ALTER TABLE "CourseClass" ADD COLUMN "videoUrl" TEXT NOT NULL DEFAULT \'\'',
    'ALTER TABLE "CourseClass" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0',
  ],
  Discount: [
    'ALTER TABLE "Discount" ADD COLUMN "startsAt" DATETIME',
    'ALTER TABLE "Discount" ADD COLUMN "endsAt" DATETIME',
    'ALTER TABLE "Discount" ADD COLUMN "classIds" TEXT NOT NULL DEFAULT \'[]\'',
    'ALTER TABLE "Discount" ADD COLUMN "classTypes" TEXT NOT NULL DEFAULT \'[]\'',
    'ALTER TABLE "Discount" ADD COLUMN "levels" TEXT NOT NULL DEFAULT \'[]\'',
    'ALTER TABLE "Discount" ADD COLUMN "minSessions" INTEGER NOT NULL DEFAULT 1',
    'ALTER TABLE "Discount" ADD COLUMN "maxUses" INTEGER',
    'ALTER TABLE "Discount" ADD COLUMN "perCustomer" INTEGER NOT NULL DEFAULT 1',
    'ALTER TABLE "Discount" ADD COLUMN "note" TEXT NOT NULL DEFAULT \'\'',
    'ALTER TABLE "Discount" ADD COLUMN "deletedAt" DATETIME',
  ],
  ClassSchedule: [
    'ALTER TABLE "ClassSchedule" ADD COLUMN "orderRef" TEXT',
    'ALTER TABLE "ClassSchedule" ADD COLUMN "registrationId" TEXT',
    'ALTER TABLE "ClassSchedule" ADD COLUMN "inputDate" TEXT',
    'ALTER TABLE "ClassSchedule" ADD COLUMN "inputTime" TEXT',
    'ALTER TABLE "ClassSchedule" ADD COLUMN "inputDay" TEXT',
    'ALTER TABLE "ClassSchedule" ADD COLUMN "note" TEXT',
    'ALTER TABLE "ClassSchedule" ADD COLUMN "createdBy" TEXT NOT NULL DEFAULT \'admin\'',
    'ALTER TABLE "ClassSchedule" ADD COLUMN "confirmedAt" DATETIME',
    'ALTER TABLE "ClassSchedule" ADD COLUMN "confirmedBy" TEXT',
    'ALTER TABLE "ClassSchedule" ADD COLUMN "cancelledAt" DATETIME',
    'ALTER TABLE "ClassSchedule" ADD COLUMN "cancelledBy" TEXT',
    'ALTER TABLE "ClassSchedule" ADD COLUMN "cancelReason" TEXT',
    'ALTER TABLE "ClassSchedule" ADD COLUMN "supersededById" TEXT',
  ],
  ScheduleNotification: [
    'ALTER TABLE "ScheduleNotification" ADD COLUMN "scheduleId" TEXT',
    'ALTER TABLE "ScheduleNotification" ADD COLUMN "category" TEXT NOT NULL DEFAULT \'schedule\'',
    'ALTER TABLE "ScheduleNotification" ADD COLUMN "orderRef" TEXT',
    'ALTER TABLE "ScheduleNotification" ADD COLUMN "readAt" DATETIME',
  ],
  ErrorLog: [
    'ALTER TABLE "ErrorLog" ADD COLUMN "context" TEXT NOT NULL DEFAULT \'\'',
    'ALTER TABLE "ErrorLog" ADD COLUMN "statusCode" INTEGER',
    'ALTER TABLE "ErrorLog" ADD COLUMN "refId" TEXT',
  ],
  Testimonial: [
    'ALTER TABLE "Testimonial" ADD COLUMN "role" TEXT',
    'ALTER TABLE "Testimonial" ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT 0',
    'ALTER TABLE "Testimonial" ADD COLUMN "likeCount" INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE "Testimonial" ADD COLUMN "deletedAt" DATETIME',
  ],
  FaqItem: [
    'ALTER TABLE "FaqItem" ADD COLUMN "deletedAt" DATETIME',
    'ALTER TABLE "FaqItem" ADD COLUMN "helpfulYes" INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE "FaqItem" ADD COLUMN "helpfulNo" INTEGER NOT NULL DEFAULT 0',
  ],
  Teacher: [
    'ALTER TABLE "Teacher" ADD COLUMN "resume" TEXT NOT NULL DEFAULT \'\'',
    'ALTER TABLE "Teacher" ADD COLUMN "experienceYears" INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE "Teacher" ADD COLUMN "studentsTaught" INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE "Teacher" ADD COLUMN "certificates" TEXT NOT NULL DEFAULT \'\'',
    'ALTER TABLE "Teacher" ADD COLUMN "samples" TEXT NOT NULL DEFAULT \'[]\'',
  ],
  Lesson: [
    'ALTER TABLE "Lesson" ADD COLUMN "text" TEXT NOT NULL DEFAULT \'\'',
    'ALTER TABLE "Lesson" ADD COLUMN "subtitle" TEXT NOT NULL DEFAULT \'\'',
    'ALTER TABLE "Lesson" ADD COLUMN "big" TEXT NOT NULL DEFAULT \'\'',
    'ALTER TABLE "Lesson" ADD COLUMN "small" TEXT NOT NULL DEFAULT \'\'',
    'ALTER TABLE "Lesson" ADD COLUMN "tag" TEXT NOT NULL DEFAULT \'\'',
    'ALTER TABLE "Lesson" ADD COLUMN "category" TEXT NOT NULL DEFAULT \'vocabulary\'',
    'ALTER TABLE "Lesson" ADD COLUMN "color" TEXT NOT NULL DEFAULT \'sage\'',
    'ALTER TABLE "Lesson" ADD COLUMN "action" TEXT NOT NULL DEFAULT \'Learn\'',
    'ALTER TABLE "Lesson" ADD COLUMN "isVideo" BOOLEAN NOT NULL DEFAULT 0',
    'ALTER TABLE "Lesson" ADD COLUMN "words" TEXT NOT NULL DEFAULT \'[]\'',
  ],
  Post: [
    'ALTER TABLE "Post" ADD COLUMN "emoji" TEXT NOT NULL DEFAULT \'📝\'',
    'ALTER TABLE "Post" ADD COLUMN "color" TEXT NOT NULL DEFAULT \'sage\'',
    'ALTER TABLE "Post" ADD COLUMN "image" TEXT',
    'ALTER TABLE "Post" ADD COLUMN "views" INTEGER NOT NULL DEFAULT 0',
  ],
  SupportMessage: ['ALTER TABLE "SupportMessage" ADD COLUMN "topic" TEXT NOT NULL DEFAULT \'general\''],
  PaymentEvent: ['ALTER TABLE "PaymentEvent" ADD COLUMN "detail" TEXT NOT NULL DEFAULT \'\''],
  BackupLog: [
    'ALTER TABLE "BackupLog" ADD COLUMN "sizeBytes" INTEGER',
    'ALTER TABLE "BackupLog" ADD COLUMN "durationMs" INTEGER',
    'ALTER TABLE "BackupLog" ADD COLUMN "error" TEXT',
  ],
  AuditLog: [
    'ALTER TABLE "AuditLog" ADD COLUMN "targetId" TEXT NOT NULL DEFAULT \'\'',
    'ALTER TABLE "AuditLog" ADD COLUMN "meta" TEXT NOT NULL DEFAULT \'\'',
  ],
  ScheduleAudit: ['ALTER TABLE "ScheduleAudit" ADD COLUMN "detail" TEXT NOT NULL DEFAULT \'\''],
}

export interface EnsureSchemaResult {
  createdTables: string[]
  addedColumns: string[]
  ensuredIndexes: number
  errors: string[]
}

async function runEnsureSchema(): Promise<EnsureSchemaResult> {
  const result: EnsureSchemaResult = { createdTables: [], addedColumns: [], ensuredIndexes: 0, errors: [] }

  // فهرست جدول‌های پیش از اجرا — برای گزارش دقیق «چه جدولی ساخته شد»
  let before: Set<string>
  try {
    const rows = await db.$queryRawUnsafe<Array<{ name: string }>>(`SELECT name FROM sqlite_master WHERE type='table'`)
    before = new Set(Array.isArray(rows) ? rows.map((r) => String(r.name)) : [])
  } catch {
    before = new Set()
  }

  // ۱) جدول‌های غایب ساخته می‌شوند (IF NOT EXISTS — اجرای دوباره بی‌اثر)
  for (const ddl of CREATE_TABLES) {
    const name = ddl.match(/CREATE TABLE IF NOT EXISTS "([^"]+)"/)?.[1] ?? ''
    try {
      await db.$executeRawUnsafe(ddl)
      if (name && !before.has(name)) result.createdTables.push(name)
    } catch (e) {
      result.errors.push(`create-table: ${e instanceof Error ? e.message : String(e)}`.slice(0, 200))
    }
  }

  // ۲) ایندکس‌ها تضمین می‌شوند — شکست یکی (مثلاً دادهٔ تکراری قدیمی) بقیه را نمی‌شکند
  for (const ddl of CREATE_INDEXES) {
    try {
      await db.$executeRawUnsafe(ddl)
      result.ensuredIndexes++
    } catch (e) {
      result.errors.push(`index: ${e instanceof Error ? e.message : String(e)}`.slice(0, 200))
    }
  }

  // ۳) ستون‌های غایب جدول‌های موجود (بازیابی‌شده از بکاپ کهنه) اضافه می‌شوند
  for (const [table, statements] of Object.entries(ALTER_COLUMNS)) {
    let existing: string[] = []
    try {
      const rows = await db.$queryRawUnsafe<Array<{ name: string }>>(`PRAGMA table_info("${table}")`)
      existing = Array.isArray(rows) ? rows.map((r) => String(r.name)) : []
    } catch {
      continue // جدول اصلاً موجود نیست — CREATE بالا هندل کرده
    }
    if (existing.length === 0) continue
    for (const stmt of statements) {
      const col = stmt.match(/ADD COLUMN\s+"([^"]+)"/)?.[1]
      if (!col || existing.includes(col)) continue
      try {
        await db.$executeRawUnsafe(stmt)
        result.addedColumns.push(`${table}.${col}`)
      } catch (e) {
        result.errors.push(`alter ${table}.${col}: ${e instanceof Error ? e.message : String(e)}`.slice(0, 200))
      }
    }
  }

  return result
}

// ---------------------------------------------------------------------------
// درگاه عمومی — dedupe هم‌زمانی + دفترچهٔ یک‌بار در هر پروسه (مگر اجبار)
// ---------------------------------------------------------------------------

let inFlight: Promise<EnsureSchemaResult> | null = null
let lastRunAt = 0
const RE_RUN_AFTER_MS = 60_000 // پس از یک اجرای موفق، حداکثر یک‌بار در دقیقه دوباره

export async function ensureSchema(opts?: { force?: boolean; reason?: string }): Promise<EnsureSchemaResult> {
  // 🟢 PostgreSQL (Vercel + Neon): خودترمیمیِ SQLite-only کاملاً no-op است.
  // مدیریت اسکیما در PostgreSQL از طریق `prisma migrate deploy` (در build)
  // انجام می‌شود. DDLهای این فایل روی PostgreSQL نامعتبرند و اجرایشان خطا می‌دهد.
  const noop: EnsureSchemaResult = { createdTables: [], addedColumns: [], ensuredIndexes: 0, errors: [] }
  if (isPostgresDatabase()) {
    return noop
  }
  const now = Date.now()
  if (!opts?.force && inFlight) return inFlight
  if (!opts?.force && now - lastRunAt < RE_RUN_AFTER_MS) {
    return { createdTables: [], addedColumns: [], ensuredIndexes: 0, errors: [] }
  }
  inFlight = runEnsureSchema()
    .then((r) => {
      lastRunAt = Date.now()
      if (r.createdTables.length > 0 || r.addedColumns.length > 0) {
        console.warn(
          `[ensure-schema] 🔧 self-healing applied (${opts?.reason ?? 'runtime'}): ` +
            `tables=[${r.createdTables.join(', ') || 'none'}] columns=[${r.addedColumns.join(', ') || 'none'}]` +
            (r.errors.length ? ` errors=${r.errors.length}` : '')
        )
      }
      return r
    })
    .finally(() => {
      inFlight = null
    })
  return inFlight
}
