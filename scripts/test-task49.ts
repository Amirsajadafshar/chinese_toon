// 🧪 تست بند ۱–۵ — فلو کامل: ثبت‌نام → سفارش → تخفیف → وضعیت‌ها → ادمین
// داده‌های تست با ایمیل e2e-task49@test.local مشخص‌اند و در اسکریپت پاک‌سازی حذف می‌شوند
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

async function main() {
  // ⓪ اطمینان از سلامت سرور + احیای خودکار در صورت قطعی (داخل همان فراخوانی)
  let root = await api('/')
  if (root.status !== 200) {
    console.log('⚠️ server down — reviving inside script')
    const { spawn } = await import('child_process')
    spawn('setsid', ['env', 'NODE_OPTIONS=--max-old-space-size=1400', 'nohup', 'bun', 'run', 'dev'], {
      cwd: '/home/z/my-project',
      detached: true,
      stdio: ['ignore', 'ignore', 'ignore'],
    }).unref()
    await new Promise((r) => setTimeout(r, 9000))
    root = await api('/')
  }
  check('server root 200', root.status === 200)

  // ① ورود ادمین
  const login = await api('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'chinesetoon2024' }),
  })
  const adminToken = (login.body as { token?: string })?.token
  check('admin login', login.status === 200 && !!adminToken)
  const ah = { 'x-admin-key': adminToken! }

  // ② فهرست سفارش‌ها (بدون فیلتر) — ساختار پاسخ
  const list1 = await api('/api/admin/orders', { headers: ah })
  const b1 = list1.body as { rows?: unknown[]; meta?: { total: number; page: number; pages: number; counts: Record<string, number> } }
  check('GET /api/admin/orders list', list1.status === 200 && Array.isArray(b1.rows) && !!b1.meta?.counts, `total=${b1.meta?.total}`)
  check('meta.counts has all key', typeof b1.meta?.counts?.all === 'number')

  // فیلترها
  const listPaid = await api('/api/admin/orders?status=PAID', { headers: ah })
  check('filter status=PAID', listPaid.status === 200 && (listPaid.body as { rows: unknown[] }).rows.every((r) => (r as { paymentStatus: string }).paymentStatus === 'PAID'))
  const listExp = await api('/api/admin/orders?status=EXPIRED', { headers: ah })
  check('filter status=EXPIRED (derived)', listExp.status === 200)

  // ③ ثبت‌نام کاربر تست
  const email = `e2e-task49-${Date.now()}@test.local`
  const reg = await api('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstName: 'E2E', lastName: 'Task49', email, password: 'Str0ngPass!2024',
      confirmPassword: 'Str0ngPass!2024', dateOfBirth: '1995-06-15', countryCode: 'IR',
    }),
  })
  check('user register', reg.status === 201 || reg.status === 200, `status=${reg.status} body=${JSON.stringify(reg.body).slice(0, 200)}`)

  const ulogin = await api('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Str0ngPass!2024' }),
  })
  const userCookie = cookieOf(ulogin)
  check('user login', ulogin.status === 200 && !!userCookie)

  // ④ کلاس موجود برای سفارش
  const classes = await api('/api/classes')
  const clsList = (classes.body as { classes?: Array<{ productId: string; packagePrice: number; status: string }> })?.classes ?? []
  const bookable = clsList.find((c) => c.status === 'active' && c.productId)
  check('a bookable class exists', !!bookable, bookable?.productId)

  if (bookable) {
    const { execSync } = await import('child_process')
    // ⑤ ضد ارسال تکراری: دو درخواست پشت‌سرهم → همان ref
    const o1 = await api('/api/payments/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: userCookie },
      body: JSON.stringify({ productId: bookable.productId }),
    })
    const ref1 = (o1.body as { order?: { ref: string } })?.order?.ref
    check('create order #1', o1.status === 201 && !!ref1, `ref=${ref1}`)
    const o2 = await api('/api/payments/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: userCookie },
      body: JSON.stringify({ productId: bookable.productId }),
    })
    const ref2 = (o2.body as { order?: { ref: string } })?.order?.ref
    check('duplicate submit returns same order (idempotency)', o2.status === 201 && ref2 === ref1, `ref1=${ref1} ref2=${ref2}`)

    // ⑥ سفارش در فهرست ادمین — وضعیت ثبت‌نام ORDERED و زنجیرهٔ کاربر
    const q = await api(`/api/admin/orders?q=${ref1}`, { headers: ah })
    const qrow = (q.body as { rows?: Array<{ ref: string; paymentStatus: string; enrollmentStatus: string; customer: { hasAccount: boolean; email: string }; classSlug: string | null; amountUsd: string }> })?.rows?.[0]
    check('admin list finds order by q', !!qrow && qrow.ref === ref1)
    check('enrollment=ORDERED for unpaid', qrow?.enrollmentStatus === 'ORDERED', qrow?.enrollmentStatus)
    check('customer from User record', !!qrow && qrow.customer.hasAccount && qrow.customer.email === email)
    check('class joined via productId', !!qrow && typeof qrow.classSlug === 'string', qrow?.classSlug ?? 'null')

    // ⑦ جزئیات سفارش در ادمین — زنجیرهٔ کامل
    const det = await api(`/api/admin/orders/${ref1}`, { headers: ah })
    const db1 = det.body as { order?: { enrollmentStatus: string; paymentStatus: string }; events?: unknown[]; class?: unknown; schedules?: unknown[] }
    check('admin detail 200', det.status === 200 && !!db1.order)
    check('detail has class + events + schedules', Array.isArray(db1.events) && Array.isArray(db1.schedules) && !!db1.class)

    // ⑧ فیلتر وضعیت ثبت‌نام
    const ef = await api('/api/admin/orders?enrollment=ORDERED&pageSize=100', { headers: ah })
    const efRows = (ef.body as { rows?: Array<{ ref: string }> })?.rows ?? []
    check('filter enrollment=ORDERED contains order', efRows.some((r) => r.ref === ref1))

    // ⑨ انقضا سمت سرور: expiresAt گذشته → نمایش EXPIRED + قابل پرداخت نیست
    const expireScript = `
      import { PrismaClient } from '@prisma/client';
      const db = new PrismaClient();
      await db.usdtOrder.update({ where: { ref: '${ref1}' }, data: { expiresAt: new Date(Date.now() - 60_000) } });
      console.log('expired-set');
      await db.$disconnect();
    `
    // اسکریپت داخل پروژه — Prisma Client از node_modules پروژه resolve می‌شود
    await import('fs').then((fs) => fs.writeFileSync('/home/z/my-project/scripts/_expire-tmp.ts', expireScript))
    execSync('bun /home/z/my-project/scripts/_expire-tmp.ts', { cwd: '/home/z/my-project', stdio: 'pipe' })
    // اگر ری‌استارتی رخ داده باشد، ادمین دوباره وارد می‌شود
    const relogin = await api('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'chinesetoon2024' }),
    })
    ah['x-admin-key'] = (relogin.body as { token: string }).token
    const st = await api(`/api/payments/orders/${ref1}`, { headers: { Cookie: userCookie } })
    check('expired order shows EXPIRED to customer', st.status === 200 && (st.body as { order: { status: string } }).order.status === 'EXPIRED', (st.body as { order?: { status: string } })?.order?.status)
    const stAdmin = await api(`/api/admin/orders?status=EXPIRED&pageSize=100`, { headers: ah })
    const stAdminRows = (stAdmin.body as { rows?: Array<{ ref: string }> })?.rows ?? []
    check('expired order in EXPIRED filter (server-derived)', stAdminRows.some((r) => r.ref === ref1))
  }

  // ⑩ ضد ارسال تکراری فرم ثبت‌نام — دو ارسال یکسان در ۶۰ ثانیه
  const rbody = JSON.stringify({
    name: 'E2E Dup Test', email: `e2e-dup-${Date.now()}@test.local`, level: 'Beginner',
    classType: 'group', classTitle: 'Dup Test Class', timezone: 'Asia/Tehran',
    preferredDays: ['mon', 'wed'], preferredTimes: [{ start: '18:00', end: '19:00' }],
    daysPerWeek: 2, scheduleAck: true,
  })
  const r1x = await api('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: rbody })
  const r2x = await api('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: rbody })
  check('registration #1 created', r1x.status === 201 && !(r1x.body as { duplicate?: boolean }).duplicate)
  check('registration #2 deduped (same id, no new row)', r2x.status === 200 && (r2x.body as { duplicate?: boolean }).duplicate === true && (r1x.body as { id?: string }).id === (r2x.body as { id?: string }).id)

  // ⑪ /api/auth/me — وضعیت ثبت‌نام برای صفحهٔ حساب
  if (userCookie) {
    const me = await api('/api/auth/me', { headers: { Cookie: userCookie } })
    const meB = me.body as { enrollmentStatus?: string; orders?: Array<{ enrollmentStatus?: string; nextSessionAt?: string | null }> }
    check('auth/me exposes enrollmentStatus', me.status === 200 && !!meB.enrollmentStatus, meB.enrollmentStatus)
    check('per-order enrollment present', Array.isArray(meB.orders) && meB.orders.every((o) => typeof o.enrollmentStatus === 'string'))
  }

  // جمع‌بندی
  const failed = results.filter((r) => !r.pass)
  console.log(`\n=== ${results.length - failed.length}/${results.length} passed ===`)
  if (failed.length > 0) process.exit(1)
  process.exit(0)
}

main().catch((e) => {
  console.error('test crashed:', e)
  process.exit(1)
})
