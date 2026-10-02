// فاز ۶۹ — کارت بانکی نمایشی برای فعال‌شدن جریان پرداخت دستی
// ⚠️ شماره/نام/بانک «نمونه» است — مالک باید از پنل ادمین (Settings → Payment)
// شمارهٔ کارت واقعی را وارد کند. این اسکریپت فقط اگر کلید نبود یا خالی بود می‌نویسد.
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const DEMO = {
  enabled: true,
  cardNumber: '0000 0000 0000 0000',
  cardHolder: 'Chinese Toon',
  bankName: 'Sample Bank',
  instructions: [
    '1. Transfer the exact amount shown above to the card number.',
    '2. Keep your payment receipt (screenshot or photo).',
    '3. Upload the receipt on the payment page.',
    '4. Submit it for verification.',
    '5. Wait for admin confirmation — we review receipts as soon as possible.',
  ].join('\n'),
}

async function main() {
  const key = 'bankCardPayment'
  const existing = await db.siteSetting.findUnique({ where: { key } })
  if (existing) {
    try {
      const parsed = JSON.parse(existing.value) as { cardNumber?: string }
      const digits = (parsed.cardNumber ?? '').replace(/\D/g, '')
      if (digits.length >= 12) {
        console.log('bankCardPayment already configured — leaving untouched.')
        return
      }
    } catch {
      // مقدار خراب — بازنویسی می‌شود
    }
  }
  const value = JSON.stringify({ ...DEMO, updatedAt: new Date().toISOString() })
  await db.siteSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  })
  console.log('bankCardPayment seeded (DEMO card — owner must replace via admin panel).')
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
