-- AlterTable
ALTER TABLE "FaqItem" ADD COLUMN     "helpfulNo" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "helpfulYes" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "FaqVote" (
    "id" TEXT NOT NULL,
    "faqId" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "vote" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FaqVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FaqVote_visitorId_idx" ON "FaqVote"("visitorId");

-- CreateIndex
CREATE INDEX "FaqVote_faqId_idx" ON "FaqVote"("faqId");

-- CreateIndex
CREATE UNIQUE INDEX "FaqVote_faqId_visitorId_key" ON "FaqVote"("faqId", "visitorId");

-- AddForeignKey
ALTER TABLE "FaqVote" ADD CONSTRAINT "FaqVote_faqId_fkey" FOREIGN KEY ("faqId") REFERENCES "FaqItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

