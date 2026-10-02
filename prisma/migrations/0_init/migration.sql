-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "SupportMessage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "topic" TEXT NOT NULL DEFAULT 'general',
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Registration" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "userId" TEXT,
    "age" INTEGER,
    "level" TEXT NOT NULL,
    "classType" TEXT NOT NULL DEFAULT 'group',
    "deletedAt" TIMESTAMP(3),
    "classTitle" TEXT,
    "schedule" TEXT,
    "goal" TEXT,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "timezone" TEXT NOT NULL DEFAULT '',
    "preferredDays" TEXT NOT NULL DEFAULT '[]',
    "preferredTimes" TEXT NOT NULL DEFAULT '[]',
    "daysPerWeek" INTEGER,
    "scheduleAck" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Registration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "tag" TEXT NOT NULL DEFAULT 'news',
    "emoji" TEXT NOT NULL DEFAULT '📝',
    "color" TEXT NOT NULL DEFAULT 'sage',
    "image" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "excerpt" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Testimonial" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "text" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewLike" (
    "id" TEXT NOT NULL,
    "testimonialId" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaqItem" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FaqItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearnCard" (
    "id" TEXT NOT NULL,
    "chinese" TEXT NOT NULL,
    "pinyin" TEXT NOT NULL,
    "meaning" TEXT NOT NULL,
    "example" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearnCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizQuestion" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "options" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizAttempt" (
    "id" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "maxScore" INTEGER NOT NULL,
    "band" TEXT NOT NULL,
    "email" TEXT,
    "answers" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Teacher" (
    "id" TEXT NOT NULL,
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
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Teacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lesson" (
    "id" TEXT NOT NULL,
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
    "isVideo" BOOLEAN NOT NULL DEFAULT false,
    "words" TEXT NOT NULL DEFAULT '[]',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "country" TEXT NOT NULL DEFAULT '',
    "countryCode" TEXT NOT NULL DEFAULT '',
    "phone" TEXT,
    "telegramUsername" TEXT,
    "telegramId" TEXT,
    "uniqueCode" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL DEFAULT '',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsdtOrder" (
    "id" TEXT NOT NULL,
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
    "pricePerSession" DOUBLE PRECISION,
    "packageSessions" INTEGER,
    "baseAmount" DOUBLE PRECISION,
    "tierPercent" DOUBLE PRECISION,
    "discountCode" TEXT,
    "discountAmount" DOUBLE PRECISION,
    "discountType" TEXT,
    "discountValue" DOUBLE PRECISION,
    "paymentMethod" TEXT NOT NULL DEFAULT 'USDT_TRON',
    "receiptId" TEXT,
    "receiptStatus" TEXT,
    "receiptMime" TEXT,
    "receiptSize" INTEGER,
    "receiptFileName" TEXT,
    "receiptSubmittedAt" TIMESTAMP(3),
    "receiptResubmits" INTEGER NOT NULL DEFAULT 0,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "rejectionReason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "txHash" TEXT,
    "txAmountMicro" INTEGER,
    "txFrom" TEXT,
    "paidAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsdtOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseClass" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL DEFAULT '',
    "fullDescription" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'beginner',
    "status" TEXT NOT NULL DEFAULT 'active',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT NOT NULL DEFAULT 'sage',
    "classType" TEXT NOT NULL DEFAULT 'group',
    "level" TEXT NOT NULL DEFAULT 'All Levels',
    "registerLevels" TEXT NOT NULL DEFAULT '[]',
    "currency" TEXT NOT NULL DEFAULT 'USDT',
    "pricePerSession" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "packageSessions" INTEGER NOT NULL DEFAULT 1,
    "packagePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priceNote" TEXT NOT NULL DEFAULT '',
    "sessionDurationMin" INTEGER,
    "format" TEXT NOT NULL DEFAULT 'online',
    "maxStudents" INTEGER,
    "minStudents" INTEGER,
    "schedule" TEXT NOT NULL DEFAULT '',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "orderRef" TEXT,
    "txHash" TEXT,
    "detail" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Discount" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'percent',
    "value" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "classIds" TEXT NOT NULL DEFAULT '[]',
    "classTypes" TEXT NOT NULL DEFAULT '[]',
    "levels" TEXT NOT NULL DEFAULT '[]',
    "minSessions" INTEGER NOT NULL DEFAULT 1,
    "maxUses" INTEGER,
    "perCustomer" INTEGER NOT NULL DEFAULT 1,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Discount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscountRedemption" (
    "id" TEXT NOT NULL,
    "discountId" TEXT NOT NULL,
    "orderRef" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscountRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassSchedule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "orderRef" TEXT,
    "registrationId" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "timezone" TEXT NOT NULL,
    "inputDate" TEXT,
    "inputTime" TEXT,
    "inputDay" TEXT,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PROPOSED',
    "createdBy" TEXT NOT NULL DEFAULT 'admin',
    "confirmedAt" TIMESTAMP(3),
    "confirmedBy" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" TEXT,
    "cancelReason" TEXT,
    "supersededById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleAudit" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "detail" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduleAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scheduleId" TEXT,
    "kind" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'schedule',
    "orderRef" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduleNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackupLog" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "sizeBytes" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'STARTED',
    "trigger" TEXT NOT NULL DEFAULT 'MANUAL',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "error" TEXT,

    CONSTRAINT "BackupLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErrorLog" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "context" TEXT NOT NULL DEFAULT '',
    "statusCode" INTEGER,
    "refId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErrorLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL DEFAULT '',
    "meta" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Registration_userId_idx" ON "Registration"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Post_slug_key" ON "Post"("slug");

-- CreateIndex
CREATE INDEX "Testimonial_status_featured_idx" ON "Testimonial"("status", "featured");

-- CreateIndex
CREATE INDEX "ReviewLike_visitorId_idx" ON "ReviewLike"("visitorId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewLike_testimonialId_visitorId_key" ON "ReviewLike"("testimonialId", "visitorId");

-- CreateIndex
CREATE INDEX "FaqItem_published_sortOrder_idx" ON "FaqItem"("published", "sortOrder");

-- CreateIndex
CREATE INDEX "QuizAttempt_createdAt_idx" ON "QuizAttempt"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_slug_key" ON "Lesson"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_uniqueCode_key" ON "User"("uniqueCode");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_tokenHash_key" ON "UserSession"("tokenHash");

-- CreateIndex
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UsdtOrder_ref_key" ON "UsdtOrder"("ref");

-- CreateIndex
CREATE INDEX "UsdtOrder_userId_idx" ON "UsdtOrder"("userId");

-- CreateIndex
CREATE INDEX "UsdtOrder_status_expiresAt_idx" ON "UsdtOrder"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "UsdtOrder_paymentAddress_idx" ON "UsdtOrder"("paymentAddress");

-- CreateIndex
CREATE INDEX "UsdtOrder_paymentMethod_status_idx" ON "UsdtOrder"("paymentMethod", "status");

-- CreateIndex
CREATE UNIQUE INDEX "UsdtOrder_txHash_key" ON "UsdtOrder"("txHash");

-- CreateIndex
CREATE UNIQUE INDEX "UsdtOrder_addressIndex_key" ON "UsdtOrder"("addressIndex");

-- CreateIndex
CREATE UNIQUE INDEX "UsdtOrder_receiptId_key" ON "UsdtOrder"("receiptId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseClass_slug_key" ON "CourseClass"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CourseClass_productId_key" ON "CourseClass"("productId");

-- CreateIndex
CREATE INDEX "CourseClass_status_idx" ON "CourseClass"("status");

-- CreateIndex
CREATE INDEX "CourseClass_classType_idx" ON "CourseClass"("classType");

-- CreateIndex
CREATE INDEX "CourseClass_category_idx" ON "CourseClass"("category");

-- CreateIndex
CREATE INDEX "CourseClass_sortOrder_idx" ON "CourseClass"("sortOrder");

-- CreateIndex
CREATE INDEX "PaymentEvent_orderRef_idx" ON "PaymentEvent"("orderRef");

-- CreateIndex
CREATE INDEX "PaymentEvent_txHash_idx" ON "PaymentEvent"("txHash");

-- CreateIndex
CREATE INDEX "PaymentEvent_kind_createdAt_idx" ON "PaymentEvent"("kind", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Discount_code_key" ON "Discount"("code");

-- CreateIndex
CREATE INDEX "Discount_active_idx" ON "Discount"("active");

-- CreateIndex
CREATE INDEX "DiscountRedemption_discountId_idx" ON "DiscountRedemption"("discountId");

-- CreateIndex
CREATE INDEX "DiscountRedemption_userEmail_idx" ON "DiscountRedemption"("userEmail");

-- CreateIndex
CREATE INDEX "DiscountRedemption_orderRef_idx" ON "DiscountRedemption"("orderRef");

-- CreateIndex
CREATE INDEX "ClassSchedule_status_startAt_idx" ON "ClassSchedule"("status", "startAt");

-- CreateIndex
CREATE INDEX "ClassSchedule_userId_status_idx" ON "ClassSchedule"("userId", "status");

-- CreateIndex
CREATE INDEX "ClassSchedule_classId_status_idx" ON "ClassSchedule"("classId", "status");

-- CreateIndex
CREATE INDEX "ClassSchedule_orderRef_idx" ON "ClassSchedule"("orderRef");

-- CreateIndex
CREATE UNIQUE INDEX "ClassSchedule_userId_classId_startAt_key" ON "ClassSchedule"("userId", "classId", "startAt");

-- CreateIndex
CREATE INDEX "ScheduleAudit_scheduleId_createdAt_idx" ON "ScheduleAudit"("scheduleId", "createdAt");

-- CreateIndex
CREATE INDEX "ScheduleNotification_userId_readAt_idx" ON "ScheduleNotification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "ScheduleNotification_userId_category_createdAt_idx" ON "ScheduleNotification"("userId", "category", "createdAt");

-- CreateIndex
CREATE INDEX "BackupLog_status_startedAt_idx" ON "BackupLog"("status", "startedAt");

-- CreateIndex
CREATE INDEX "BackupLog_trigger_startedAt_idx" ON "BackupLog"("trigger", "startedAt");

-- CreateIndex
CREATE INDEX "ErrorLog_category_createdAt_idx" ON "ErrorLog"("category", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewLike" ADD CONSTRAINT "ReviewLike_testimonialId_fkey" FOREIGN KEY ("testimonialId") REFERENCES "Testimonial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsdtOrder" ADD CONSTRAINT "UsdtOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountRedemption" ADD CONSTRAINT "DiscountRedemption_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "Discount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSchedule" ADD CONSTRAINT "ClassSchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSchedule" ADD CONSTRAINT "ClassSchedule_classId_fkey" FOREIGN KEY ("classId") REFERENCES "CourseClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSchedule" ADD CONSTRAINT "ClassSchedule_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSchedule" ADD CONSTRAINT "ClassSchedule_supersededById_fkey" FOREIGN KEY ("supersededById") REFERENCES "ClassSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleAudit" ADD CONSTRAINT "ScheduleAudit_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "ClassSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleNotification" ADD CONSTRAINT "ScheduleNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleNotification" ADD CONSTRAINT "ScheduleNotification_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "ClassSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

