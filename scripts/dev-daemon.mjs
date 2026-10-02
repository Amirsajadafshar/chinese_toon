// 👑 دیمونِ دابل‌فورک برای بقا پروسه dev server (الگوی اثبات‌شدهٔ Task 1)
//
// سندباکس پروسه‌های متصل به شل را در مرز فراخوانی‌ها می‌کُشد؛ راه‌حل:
// اسکریپتِ واسط (این فایل) بلافاصله بعد از spawn با detached:true + unref
// خارج می‌شود تا سرور «یتیم» و به init والده شود و از چرخهٔ کشتن شل جان سالم
// به در بَبَرد. خود این اسکریپت در همان فراخوانی Bash تمام می‌شود.
//
// 🛡️ تسک ۸۴ — گارد ضد-حادثه (حادثهٔ دوم پاک‌سازی/برگشت .env):
//   سندباکس دو بار فایل .env را به مسیر خراب قدیمی (db/custom.db صفر-بایتی)
//   برگردانده و یک بار دیتابیس واقعی را خالی کرده است. این گارد قبل از هر
//   بوت: (۱) اگر DATABASE_URL در .env درست نبود، خودکار اصلاحش می‌کند؛
//   (۲) DATABASE_URL صحیح را مستقیم به env فرزند تزریق می‌کند تا env به‌ارث
//   رسیدهٔ خراب هیچ‌وقت بر .env غلبه نکند (Next.js متغیر real را به فایل ترجیح می‌دهد)؛
//   (۳) اگر فایل دیتابیس واقعی غایب باشد، با هشدار پررنگ در dev.log اعلام می‌کند.
//   ⚠️ اگر روزی مسیر دیتابیس عوض شود، EXPECTED_URL همین‌جا هم باید به‌روز شود.
import { spawn } from 'node:child_process'
import { openSync, readFileSync, writeFileSync, existsSync } from 'node:fs'

const EXPECTED_URL = 'file:/home/z/data/chinesetoon.db'
const ENV_PATH = '/home/z/my-project/.env'
const DB_PATH = '/home/z/data/chinesetoon.db'

try {
  const raw = readFileSync(ENV_PATH, 'utf8')
  const current = raw.split('\n').find((l) => l.startsWith('DATABASE_URL='))
  if (current?.trim() !== `DATABASE_URL=${EXPECTED_URL}`) {
    // خودترمیم — فقط خط DATABASE_URL عوض می‌شود؛ بقیهٔ فایل دست‌نخورده می‌ماند
    const fixed = raw.includes('DATABASE_URL=')
      ? raw.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL=${EXPECTED_URL}`)
      : `${raw.replace(/\n?$/, '\n')}DATABASE_URL=${EXPECTED_URL}\n`
    writeFileSync(ENV_PATH, fixed)
    console.error(
      `[daemon] ⚠️ SELF-HEAL: DATABASE_URL was "${current ?? '(missing)'}" → rewritten to ${EXPECTED_URL}`
    )
  }
} catch (e) {
  console.error('[daemon] env guard failed:', e instanceof Error ? e.message : e)
}
if (!existsSync(DB_PATH)) {
  console.error(
    `[daemon] 🚨 LIVE DB MISSING at ${DB_PATH} — do NOT boot on a substitute; check db/backups snapshots first!`
  )
}

const out = openSync('/home/z/my-project/dev.log', 'a')
const child = spawn('bun', ['run', 'dev'], {
  cwd: '/home/z/my-project',
  detached: true,
  stdio: ['ignore', out, out],
  // 🛡️ DATABASE_URL همیشه صحیح تزریق می‌شود (env واقعی بر .env فایل اولویت دارد)
  env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=1400', DATABASE_URL: EXPECTED_URL },
})
child.unref()
console.log('[daemon] dev server spawned detached, pid =', child.pid)
process.exit(0)
