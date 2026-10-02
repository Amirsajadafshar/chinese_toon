// ---------------------------------------------------------------------
//  اسکریپت یک‌باره: اتصال تصاویر کاور تولیدشده به مقاله‌های موجود
//  + عدد اولیهٔ بازدید برای نمایش طبیعی
//  اجرا:  bun prisma/seed-post-images.ts
// ---------------------------------------------------------------------
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const IMAGES: Record<string, string> = {
  'autumn-semester-enrollment-now-open-r7avt': '/images/blog/autumn-semester.png',
  'study-habits-vocabulary': '/images/blog/study-habits.png',
  'real-chinese-greetings': '/images/blog/real-greetings.png',
  'new-hsk1-survival-course': '/images/blog/hsk1-course.png',
}

const VIEWS: Record<string, number> = {
  'autumn-semester-enrollment-now-open-r7avt': 214,
  'study-habits-vocabulary': 158,
  'real-chinese-greetings': 132,
  'new-hsk1-survival-course': 96,
}

async function main() {
  for (const [slug, image] of Object.entries(IMAGES)) {
    const exists = await prisma.post.findUnique({ where: { slug } })
    if (!exists) {
      console.log(`skip (not found): ${slug}`)
      continue
    }
    await prisma.post.update({
      where: { slug },
      data: { image, views: VIEWS[slug] ?? 0 },
    })
    console.log(`updated: ${slug} → ${image} (${VIEWS[slug]} views)`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
