-- CreateTable
CREATE TABLE "AdminSession" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateEvent" (
    "id" TEXT NOT NULL,
    "bucketKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateBlock" (
    "bucketKey" TEXT NOT NULL,
    "until" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateBlock_pkey" PRIMARY KEY ("bucketKey")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminSession_tokenHash_key" ON "AdminSession"("tokenHash");

-- CreateIndex
CREATE INDEX "AdminSession_lastSeenAt_idx" ON "AdminSession"("lastSeenAt");

-- CreateIndex
CREATE INDEX "AdminSession_expiresAt_idx" ON "AdminSession"("expiresAt");

-- CreateIndex
CREATE INDEX "RateEvent_bucketKey_createdAt_idx" ON "RateEvent"("bucketKey", "createdAt");

-- CreateIndex
CREATE INDEX "RateBlock_until_idx" ON "RateBlock"("until");

