// 🧰 عملیاتی فاز ۵۲ — بازرسی وضعیت BackupLog و سفارش تستی (یک‌بارمصرف)
import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
const rows = await db.backupLog.findMany({ where: { status: 'SUCCESS' }, orderBy: { startedAt: 'desc' }, select: { filename: true, trigger: true, startedAt: true } })
for (const r of rows) console.log(r.startedAt.toISOString(), r.trigger, r.filename)
const o = await db.usdtOrder.findUnique({ where: { ref: 'CT-RH6CGEDR' }, select: { status: true, expiresAt: true } })
console.log('CT-RH6CGEDR raw status:', o?.status, 'expires:', o?.expiresAt?.toISOString())
await db.$disconnect()
