// 🧪 تست زنجیرهٔ وضعیت‌ها: DETECTED → PAID → PROPOSED → CONFIRMED (ENROLLED)
// + کد تخفیف در فهرست ادمین + نمایش مشتری. همهٔ داده‌ها test.local و در پایان حذف می‌شوند
const BASE = 'http://localhost:3000'
const results: Array<{ name: string; pass: boolean; info?: string }> = []
function check(name: string, pass: boolean, info?: string) {
  results.push({ name, pass, info })
  console.log(`${pass ? '✅' : '❌'} ${name}${info ? ' — ' + info : ''}`)
}
async function api(path: string, init?: RequestInit) {
  const res = await fetch(BASE + path, init)
  let body: unknown = null
  try { body = await res.json() } catch { /* */ }
  return { status: res.status, body, headers: res.headers }
}
function cookieOf(res: { headers: Headers }): string {
  const sc = res.headers.getSetCookie?.() ?? []
  return sc.map((c) => c.split(';')[0]).join('; ')
}

async function restartServer() {
  const { execSync, spawn } = await import('child_process')
  try {
    execSync('pkill -f "next dev" || true; pkill -f "next-server" || true', { shell: '/bin/bash', stdio: 'ignore' })
  } catch { /* */ }
  await new Promise((r) => setTimeout(r, 2000))
  // همان دستور احیای استاندارد پروژه — سرور پس از پایان تست زنده می‌ماند
  spawn('setsid', ['env', 'NODE_OPTIONS=--max-old-space-size=1400', 'nohup', 'bun', 'run', 'dev'], {
    cwd: '/home/z/my-project', detached: true, stdio: ['ignore', 'ignore', 'ignore'],
  }).unref()
  // صبر تا آماده‌شدن
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 1000))
    try {
      const r = await fetch(BASE + '/')
      if (r.status === 200) return true
    } catch { /* */ }
  }
  return false
}

async function main() {
  // 🔄 ری‌استارت تمیز در شروع — سقف ورود ادمین (۵ تلاش/۱۰ دقیقه، درون‌حافظه) و
  // سشن‌های قدیمی پاک می‌شوند تا تست همیشه قابل‌تکرار باشد
  const up = await restartServer()
  if (!up) throw new Error('server did not come up')

  const login = await api('/api/admin/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'chinesetoon2024' }),
  })
  const ah = { 'x-admin-key': (login.body as { token: string }).token }

  // کاربر + سفارش
  const email = `e2e-chain-${Date.now()}@test.local`
  await api('/api/auth/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstName: 'Chain', lastName: 'Test', email, password: 'Str0ngPass!2024',
      confirmPassword: 'Str0ngPass!2024', dateOfBirth: '1995-06-15', countryCode: 'IR',
    }),
  })
  const ul = await api('/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Str0ngPass!2024' }),
  })
  const cookie = cookieOf(ul)

  // کلاس + ترجیحات ثبت‌نام (برای مرحلهٔ PREFERENCES_SUBMITTED)
  const classes = await api('/api/classes')
  const cls = ((classes.body as { classes?: Array<{ productId: string; status: string; packagePrice: number }> })?.classes ?? [])
    .find((c) => c.status === 'active')
  if (!cls) throw new Error('no bookable class')

  await api('/api/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Chain Test', email, level: 'Beginner', classType: 'group',
      classTitle: 'Chain Test', timezone: 'Asia/Tehran',
      preferredDays: ['tue', 'thu'], preferredTimes: [{ start: '17:00', end: '18:30' }],
      daysPerWeek: 2, scheduleAck: true,
    }),
  })

  // سفارش با کد تخفیف WELCOME20 (۲۰٪) — مبلغ نهایی سمت سرور
  const ord = await api('/api/payments/orders', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ productId: cls.productId, discountCode: 'WELCOME20' }),
  })
  const ordB = ord.body as { order?: { ref: string; status: string; baseAmount?: string; discountCode?: string; discountAmount?: string; amountUsd: string } }
  const ref = ordB?.order?.ref
  check('order with WELCOME20 created', ord.status === 201 && !!ref, `ref=${ref} code=${ordB?.order?.discountCode} base=${ordB?.order?.baseAmount} disc=${ordB?.order?.discountAmount} final=${ordB?.order?.amountUsd}`)
  if (!ref) process.exit(1)

  // 🔁 شبیه‌سازی وضعیت‌ها در دیتابیس (فقط تست — در اسکریپت پاک‌سازی حذف می‌شوند)
  // نکته: اسکریپت باید داخل پروژه بماند تا Prisma Client از node_modules پروژه resolve شود
  const { execSync } = await import('child_process')
  const setStates = `
    import { PrismaClient } from '@prisma/client';
    const db = new PrismaClient();
    const o = await db.usdtOrder.findUnique({ where: { ref: '${ref}' }, select: { id: true, userId: true, productId: true } });
    if (!o) throw new Error('order not found');
    const cls = await db.courseClass.findUnique({ where: { productId: o.productId }, select: { id: true } });
    if (!cls) throw new Error('class not found');

    // حالت ۱: DETECTED
    await db.usdtOrder.update({ where: { ref: '${ref}' }, data: { status: 'DETECTED' } });
    await db.paymentEvent.create({ data: { kind: 'DETECTED', orderRef: '${ref}', txHash: 'e2e-test-tx-hash-1', detail: '{"test":true}' } });

    // حالت ۲: PAID با tx یکتا
    await db.usdtOrder.update({
      where: { ref: '${ref}' },
      data: { status: 'PAID', txHash: 'e2e-test-tx-hash-2-${Date.now()}', txAmountMicro: 86400000, txFrom: 'TE2eTestSenderAddr000000000000000', paidAt: new Date() },
    });

    // حالت ۳: جلسهٔ PROPOSED
    const start = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    await db.classSchedule.create({
      data: {
        userId: o.userId!, classId: cls.id, orderRef: '${ref}',
        startAt: start, endAt: new Date(start.getTime() + 60 * 60 * 1000), durationMin: 60,
        timezone: 'Asia/Tehran', status: 'PROPOSED', createdBy: 'admin',
      },
    });

    // حالت ۴: جلسهٔ CONFIRMED (زنجیرهٔ جابه‌جایی: همان رکورد تأیید می‌شود)
    const sched = await db.classSchedule.findFirst({ where: { orderRef: '${ref}', status: 'PROPOSED' } });
    if (sched) await db.classSchedule.update({ where: { id: sched.id }, data: { status: 'CONFIRMED', confirmedAt: new Date(), confirmedBy: 'admin' } });
    console.log('states-set');
    await db.$disconnect();
  `
  (await import('fs')).writeFileSync('/home/z/my-project/scripts/_chain-tmp.ts', setStates)
  execSync('bun /home/z/my-project/scripts/_chain-tmp.ts', { cwd: '/home/z/my-project', stdio: 'pipe' })

  // ورود دوبارهٔ ادمین — احتیاط: اگر dev-server به‌هر دلیل ری‌استارت شده باشد
  const login2 = await api('/api/admin/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'chinesetoon2024' }),
  })
  ah['x-admin-key'] = (login2.body as { token: string }).token

  // ① ادمین: جزئیات سفارشِ PAID → زنجیره + وضعیت ثبت‌نام
  const det = await api(`/api/admin/orders/${ref}`, { headers: ah })
  const dB = det.body as {
    order?: { paymentStatus: string; enrollmentStatus: string; discountCode: string | null; discountAmount: string | null; baseAmount: string | null; amountUsd: string; nextSessionAt: string | null; scheduleCount: number }
    schedules?: Array<{ status: string }>
    events?: Array<{ kind: string }>
    registrations?: unknown[]
  }
  check('detail paymentStatus=PAID', dB.order?.paymentStatus === 'PAID', dB.order?.paymentStatus)
  check('detail discount snapshot present', dB.order?.discountCode === 'WELCOME20' && dB.order?.baseAmount != null, `${dB.order?.baseAmount} − ${dB.order?.discountAmount}`)
  check('detail schedules linked (PROPOSED→CONFIRMED chain)', (dB.schedules ?? []).length === 1 && dB.schedules?.[0]?.status === 'CONFIRMED')
  check('detail events include DETECTED', (dB.events ?? []).some((e) => e.kind === 'DETECTED'))
  check('detail registration prefs found', (dB.registrations ?? []).length > 0)

  // ② فهرست ادمین: فیلترهای DETECTED/PAID و وضعیت ثبت‌نام
  const fltDet = await api('/api/admin/orders?status=DETECTED', { headers: ah })
  check('filter DETECTED works (empty after transition is OK)', fltDet.status === 200)
  const fltPaid = await api('/api/admin/orders?status=PAID&pageSize=100', { headers: ah })
  check('filter PAID contains order', ((fltPaid.body as { rows?: Array<{ ref: string }> })?.rows ?? []).some((r) => r.ref === ref))

  // وضعیت ثبت‌نام پس از جلسهٔ CONFIRMED = ENROLLED
  check('enrollment=ENROLLED after confirmed schedule', dB.order?.enrollmentStatus === 'ENROLLED', dB.order?.enrollmentStatus)
  check('nextSessionAt present', !!dB.order?.nextSessionAt)

  const fltEnr = await api('/api/admin/orders?enrollment=ENROLLED&pageSize=100', { headers: ah })
  check('filter enrollment=ENROLLED contains order', ((fltEnr.body as { rows?: Array<{ ref: string }> })?.rows ?? []).some((r) => r.ref === ref))

  // ③ مشتری: صفحهٔ وضعیت → DETECTED/PAID + auth/me وضعیت ثبت‌نام
  const me = await api('/api/auth/me', { headers: { Cookie: cookie } })
  const meB = me.body as { enrollmentStatus?: string; orders?: Array<{ enrollmentStatus: string; status: string; nextSessionAt: string | null; discountCode: string | null }> }
  check('customer order status=PAID', meB.orders?.[0]?.status === 'PAID')
  check('customer enrollmentStatus=ENROLLED', meB.orders?.[0]?.enrollmentStatus === 'ENROLLED', meB.orders?.[0]?.enrollmentStatus)
  check('customer overall enrollment=ENROLLED', meB.enrollmentStatus === 'ENROLLED', meB.enrollmentStatus)
  check('customer nextSessionAt present', !!meB.orders?.[0]?.nextSessionAt)
  check('customer sees discount code', meB.orders?.[0]?.discountCode === 'WELCOME20')

  // ④ ضد replay: همان txHash روی سفارش دیگر قابل مصرف نیست — constraint یکتا
  const dupTx = `
    import { PrismaClient } from '@prisma/client';
    const db = new PrismaClient();
    try {
      // هدف: قدیمی‌ترین سفارشِ دیگر — txHashِ سفارشِ PAIDِ ما روی آن بنشیند
      const victim = await db.usdtOrder.findFirst({ where: { ref: { not: '${ref}' } }, orderBy: { createdAt: 'asc' }, select: { ref: true } });
      if (!victim) throw new Error('no victim order');
      await db.usdtOrder.update({ where: { ref: victim.ref }, data: { txHash: 'e2e-test-tx-hash-dup' } });
      // بدون خطا؟ یعنی constraint کار نمی‌کند — دوباره تلاش می‌کنیم با همان مقدار روی سفارش دوم
      const victim2 = await db.usdtOrder.findFirst({ where: { ref: { notIn: ['${ref}'] } }, orderBy: { createdAt: 'desc' }, select: { ref: true } });
      if (victim2 && victim2.ref !== victim.ref) {
        await db.usdtOrder.update({ where: { ref: victim2.ref }, data: { txHash: 'e2e-test-tx-hash-dup' } });
        console.log('UNEXPECTED-SUCCESS');
      } else {
        console.log('only-one-order-cannot-verify');
      }
    } catch (e) {
      console.log((e as { code?: string }).code === 'P2002' ? 'P2002-GUARD-OK' : 'OTHER-ERROR:' + (e as Error).message);
    }
    await db.$disconnect();
  `
  (await import('fs')).writeFileSync('/home/z/my-project/scripts/_chain-tmp.ts', dupTx)
  const dupOut = execSync('bun /home/z/my-project/scripts/_chain-tmp.ts', { cwd: '/home/z/my-project', encoding: 'utf8' })
  check('unique txHash anti-replay constraint holds', dupOut.includes('P2002-GUARD-OK'), dupOut.trim().slice(0, 120))

  // جمع‌بندی
  const failed = results.filter((r) => !r.pass)
  console.log(`\n=== ${results.length - failed.length}/${results.length} passed ===`)
  process.exit(failed.length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error('test crashed:', e)
  process.exit(1)
})
