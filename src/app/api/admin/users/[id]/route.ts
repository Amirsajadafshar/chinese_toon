// ---------------------------------------------------------------------------
// 👤 GET /api/admin/users/[id] — پروفایل کامل کاربر برای پنل ادمین (فاز ۳۰)
// شامل: مشخصات، تلگرام (یوزرنیم + شناسهٔ عددی اگر ثبت شده باشد)، کشور، تلفن،
// تاریخ ثبت‌نام/آخرین ورود، همهٔ سفارش‌ها با وضعیت واقعی + هش تراکنش + درخواست‌های
// کلاسِ هم‌ایمیل (تب Registrations).
// ⚠️ امنیت: فقط ادمین؛ passwordHash هرگز select و هرگز در پاسخ نیست.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isAuthorized } from '@/lib/admin-auth'
import { deriveOrderStatus, microToUsdString } from '@/lib/order-status'
import { toSafeUser } from '@/lib/user-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const user = await db.user.findUnique({
      where: { id },
      // ⚠️ passwordHash عمداً انتخاب نشده — حتی برای ادمین هم نمایش داده نمی‌شود
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        country: true,
        countryCode: true,
        phone: true,
        telegramUsername: true,
        telegramId: true,
        // 🆔 فاز ۶۰ — کد یکتا + تاریخ تولد (بند ۱۸: ادمین باید دادهٔ واقعیِ
        // ذخیره‌شده را ببیند — نه null/خالیِ نمایشی)
        uniqueCode: true,
        dateOfBirth: true,
        createdAt: true,
        lastLoginAt: true,
        updatedAt: true,
      },
    })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const orders = await db.usdtOrder.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 200, // 🛡️ سقف دفاعی — پاسخ هرگز بی‌کران نیست (فاز ۴۹)
    })

    // درخواست‌های ثبت‌نام کلاس (فرم صفحهٔ Register) این کاربر — برای پیگیری.
    // فاز ۶۰: پیوند userId (جدید) + هم‌ایمیلی (قدیمی)؛ بایگانی‌شده‌ها جدا
    // فیلتر نمی‌شوند چون تاریخچهٔ کامل باید بماند ولی همهٔ فیلدهای ذخیره‌شده
    // (هدف، پیام، ترجیحات برنامه) برگردانده می‌شوند (بند ۱۸)
    const leads = await db.registration.findMany({
      where: { OR: [{ userId: user.id }, { email: user.email }] },
      orderBy: { createdAt: 'desc' },
      take: 200, // 🛡️ سقف دفاعی — پاسخ هرگز بی‌کران نیست (فاز ۴۹)
      select: {
        id: true,
        name: true,
        level: true,
        classTitle: true,
        classType: true,
        status: true,
        deletedAt: true,
        phone: true,
        goal: true,
        message: true,
        timezone: true,
        preferredDays: true,
        preferredTimes: true,
        daysPerWeek: true,
        createdAt: true,
      },
    })

    const now = new Date()
    return NextResponse.json({
      // 🎂 فاز ۶۰ — تاریخ تولد جداگانه پیوست می‌شود (بند ۱۸: دادهٔ واقعی DB)
      user: { ...toSafeUser(user), dateOfBirth: user.dateOfBirth?.toISOString() ?? null },
      orders: orders.map((o) => ({
        ref: o.ref,
        productTitle: o.productTitle,
        productId: o.productId,
        paymentMode: o.paymentMode,
        paymentAddress: o.paymentAddress,
        amountUsd: microToUsdString(o.expectedMicro),
        paidUsd: o.txAmountMicro != null ? microToUsdString(o.txAmountMicro) : null,
        rawStatus: o.status,
        status: deriveOrderStatus(o, now), // وضعیت واقعی — PENDING منقضی = EXPIRED
        txHash: o.txHash,
        txFrom: o.txFrom,
        createdAt: o.createdAt.toISOString(),
        expiresAt: o.expiresAt.toISOString(),
        paidAt: o.paidAt?.toISOString() ?? null,
      })),
      leads: leads.map((l) => ({
        id: l.id,
        name: l.name,
        level: l.level,
        classTitle: l.classTitle,
        classType: l.classType,
        status: l.status,
        archived: l.deletedAt != null,
        phone: l.phone,
        goal: l.goal,
        message: l.message,
        timezone: l.timezone,
        preferredDays: l.preferredDays,
        preferredTimes: l.preferredTimes,
        daysPerWeek: l.daysPerWeek,
        createdAt: l.createdAt.toISOString(),
      })),
    })
  } catch (e) {
    console.error('[GET /api/admin/users/[id]] error:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Failed to load user' }, { status: 500 })
  }
}
