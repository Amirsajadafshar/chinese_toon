import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
async function main() {
  const c = await db.courseClass.findUnique({ where: { slug: 'beginner-mandarin-plus' }, select: { title: true, status: true, packagePrice: true } })
  console.log('CLASS NOW:', JSON.stringify(c))
}
main().catch((e) => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
