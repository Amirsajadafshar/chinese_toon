import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { isAuthorized } from '@/lib/admin-auth'
import { getUserFromRequest } from '@/lib/user-auth'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { isValidTimezone } from '@/lib/timezones'
import { sanitizeDays, sanitizeTimes, MAX_PREFERRED_DAYS, MAX_PREFERRED_TIMES, WEEKDAY_KEYS } from '@/lib/schedule'

// ثبت درخواست ثبت‌نام از فرم صفحهٔ Register
// 🔐 فقط با حساب کاربری — مهمان رد می‌شود (۴۰۱)؛ نام/ایمیل/تلفن سمت سرور از
//     پروفایل تأییدشدهٔ کاربر خوانده می‌شود، نه از بدنهٔ درخواست.
// 🎂 تاریخ تولد اینجا گرفته نمی‌شود — در ثبت‌نام حساب کاربری اجباری است
//     (User.dateOfBirth) و سرور از روی آن محاسبه می‌کند.
// 🗓️ فاز ۴۷: ترجیحات برنامه ساخت‌یافته است — منطقهٔ زمانی IANA + حداکثر ۳ روز +
//     حداکثر ۲ بازهٔ ساعتی + روز در هفته + تأیید صریح «ترجیح است، نه برنامهٔ نهایی».
//     سرور همهٔ این‌ها را دوباره اعتبارسنجی می‌کند — بدون scheduleAck ثبت رد می‌شود.
const registrationSchema = z.object({
  level: z.string().trim().min(1).max(60),
  classType: z.string().trim().min(1).max(60).default('group'),
  // عنوان کلاس انتخاب‌شده (وقتی کاربر از دکمهٔ Register صفحهٔ کلاس‌ها/آزمون می‌آید)
  classTitle: z.string().trim().max(120).optional().or(z.literal('')),
  schedule: z.string().trim().max(120).optional().or(z.literal('')),
  goal: z.string().trim().max(300).optional().or(z.literal('')),
  message: z.string().trim().max(2000).optional().or(z.literal('')),
  // ---- 🗓️ ترجیحات ساخت‌یافته (فاز ۴۷) ----
  timezone: z.string().trim().max(60).default(''),
  preferredDays: z.array(z.string()).max(MAX_PREFERRED_DAYS).default([]),
  preferredTimes: z
    .array(z.object({ start: z.string(), end: z.string() }))
    .max(MAX_PREFERRED_TIMES)
    .default([]),
  daysPerWeek: z.number().int().min(1).max(MAX_PREFERRED_DAYS).nullable().optional(),
  scheduleAck: z.boolean().default(false),
})

export async function POST(req: NextRequest) {
  // ⛔️ ضداسپم: حداکثر ۶ ارسال در ۱۰ دقیقه برای هر IP
  const rl = await rateLimit('register', req, 6, 10 * 60, 10 * 60)
  if (!rl.ok) return tooManyRequests(rl)

  // 🔐 ثبت‌نام کلاس فقط با حساب کاربری — مهمان هرگز ثبت نمی‌شود
  // (هم‌راستا با POST /api/payments/orders؛ دروازهٔ UI در RegisterPage است)
  const viewer = await getUserFromRequest(req).catch(() => null)
  if (!viewer) {
    return NextResponse.json(
      { error: 'Please sign in to register for a class', code: 'AUTH_REQUIRED' },
      { status: 401 }
    )
  }

  // 👤 مشخصات تماس از پروفایل تأییدشدهٔ حساب می‌آید — نه از مرورگر
  const accountName =
    [viewer.firstName, viewer.lastName]
      .map((s) => (s || '').trim())
      .filter(Boolean)
      .join(' ') || viewer.email.split('@')[0]

  try {
    const body = await req.json()
    const parsed = registrationSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const d = parsed.data

    // ---- 🗓️ اعتبارسنجی سمت سرورِ ترجیحات برنامه (فاز ۴۷) — اجباری ----
    // جریان رسمی: منطقهٔ زمانی → روز → بازهٔ ساعتی → تأیید صریح.
    // هیچ‌کدام اختیاری نیست؛ دورزدن UI با API هم رد می‌شود.
    let timezone = ''
    let days: string[] = []
    let times: { start: string; end: string }[] = []
    let daysPerWeek: number | null = null

    {
      // منطقهٔ زمانی: باید IANA معتبر از فهرست مجاز باشد
      if (!d.timezone || !isValidTimezone(d.timezone)) {
        return NextResponse.json(
          { error: 'Invalid input', details: { fieldErrors: { timezone: ['Please select your time zone first'] } } },
          { status: 400 }
        )
      }
      timezone = d.timezone

      // روزها: حداکثر ۳، کلیدهای معتبر، بدون تکرار
      const checkedDays = sanitizeDays(d.preferredDays)
      if (!checkedDays) {
        return NextResponse.json(
          { error: 'Invalid input', details: { fieldErrors: { preferredDays: [`Pick between 1 and ${MAX_PREFERRED_DAYS} preferred days`] } } },
          { status: 400 }
        )
      }
      days = checkedDays

      // بازه‌ها: حداکثر ۲، قالب HH:MM نیم‌ساعتی، گذر نیمه‌شب مجاز، طول ۳۰دقیقه تا ۱۲ساعت
      const checkedTimes = sanitizeTimes(d.preferredTimes)
      if (!checkedTimes) {
        return NextResponse.json(
          { error: 'Invalid input', details: { fieldErrors: { preferredTimes: [`Pick between 1 and ${MAX_PREFERRED_TIMES} valid time ranges`] } } },
          { status: 400 }
        )
      }
      times = checkedTimes

      // روز در هفته: ۱ تا ۳ و ≤ تعداد روزهای انتخابی (ترکیب ناممکن ممنوع)
      daysPerWeek = d.daysPerWeek ?? null
      if (daysPerWeek !== null && (daysPerWeek < 1 || daysPerWeek > days.length)) {
        return NextResponse.json(
          { error: 'Invalid input', details: { fieldErrors: { daysPerWeek: ['Days per week cannot exceed your selected preferred days'] } } },
          { status: 400 }
        )
      }

      // ⛔ تأیید صریح — بدون آن ثبت رد می‌شود
      if (!d.scheduleAck) {
        return NextResponse.json(
          { error: 'Invalid input', details: { fieldErrors: { scheduleAck: ['You must acknowledge that these are preferences, not the final schedule'] } } },
          { status: 400 }
        )
      }
    }

    // 🛡️ ضد رکورد تکراری (بند ۵ و ۱۲ تسک پایداری) — کاربرِ واردشده: اگر برای
    // «همان کلاس» قبلاً رکورد ثبت‌نامِ معتبر داشته باشد، همان رکورد با ترجیحات
    // تازه به‌روز می‌شود و برگردانده می‌شود — هرگز رکورد دوم ساخته نمی‌شود
    // (یک دانش‌پذیر واقعی = یک رکورد پایدار برای هر کلاس، حتی بعد از redeploy).
    const sameClass = await db.registration.findFirst({
      where: {
        deletedAt: null,
        userId: viewer.id,
        level: d.level,
        classType: d.classType,
        ...(d.classTitle ? { classTitle: d.classTitle } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })
    if (sameClass) {
      // ♻️ استفادهٔ مجدد از رکورد موجود — ترجیحات/پیام تازه به‌روز می‌شود
      const updated = await db.registration.update({
        where: { id: sameClass.id },
        data: {
          name: accountName,
          email: viewer.email,
          phone: viewer.phone ?? null,
          goal: d.goal || null,
          message: d.message || null,
          timezone,
          preferredDays: JSON.stringify(days),
          preferredTimes: JSON.stringify(times),
          daysPerWeek,
          scheduleAck: d.scheduleAck === true,
        },
      })
      return NextResponse.json({ ok: true, id: updated.id, duplicate: true, reused: true }, { status: 200 })
    }

    const saved = await db.registration.create({
      data: {
        name: accountName,
        email: viewer.email,
        phone: viewer.phone ?? null,
        // 🔗 پیوند پایدار به حساب کاربری — زنجیرهٔ
        // User ↔ UniqueCode ↔ Registration ↔ Order ↔ Payment
        userId: viewer.id,
        level: d.level,
        classType: d.classType,
        classTitle: d.classTitle || null,
        schedule: d.schedule || null,
        goal: d.goal || null,
        message: d.message || null,
        timezone,
        preferredDays: JSON.stringify(days),
        preferredTimes: JSON.stringify(times),
        daysPerWeek,
        scheduleAck: d.scheduleAck === true,
      },
    })
    return NextResponse.json({ ok: true, id: saved.id }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/register] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// خواندن درخواست‌های ثبت‌نام (فقط با توکن مدیریت — برای پنل #/admin)
export async function GET(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    // 🗄️ فاز ۵۲ — بایگانی‌شده‌ها (حذف نرم) در فهرست ادمین نمی‌آیند؛
    // ?archived=1 = فقط بایگانی‌شده‌ها (هیچ‌وقت رکورد پاک نمی‌شود)
    const archivedOnly = new URL(req.url).searchParams.get('archived') === '1'
    const registrations = await db.registration.findMany({
      where: archivedOnly ? { NOT: { deletedAt: null } } : { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 1000, // 🛡️ سقف دفاعی — پاسخ هرگز بی‌کران نیست (فاز ۴۹)
      // 🔗 فاز ۶۰ — کد یکتای حسابِ پیوندشده (وقتی رکورد به کاربری وصال است)
      include: { user: { select: { uniqueCode: true, id: true } } },
    })
    const newCount = registrations.filter((r) => r.status === 'new').length
    return NextResponse.json({
      registrations,
      count: registrations.length,
      newCount,
    })
  } catch (err) {
    console.error('[GET /api/register] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
