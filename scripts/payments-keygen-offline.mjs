#!/usr/bin/env bun
// ===========================================================================
// 🔐 ابزار «آفلاین» ساخت کلید پرداخت ترون — Chinese Toon
//
// ⚠️⚠️⚠️  خیلی مهم — قبل از اجرا بخوانید:
//  • این اسکریپت را فقط روی یک کامپیوتر «آفلاین» اجرا کنید (اینترنت قطع،
//    پوشهٔ node_modules همین پروژه را کپی کنید).
//  • عبارت بازیابی (mnemonic ۲۴ کلمه‌ای) را روی کاغذ بنویسید و جایی
//    دیجیتالی ذخیره نکنید. هر کسی که آن را داشته باشد، پول شما را دارد.
//  • فقط XPUB به سرور سایت می‌رود — با xpub «هیچ‌کس نمی‌تواند» خرج کند.
//  • هیچ‌وقت mnemonic یا کلید خصوصی را در .env یا کد یا چت ننویسید!
//
// کارها:
//   ۱) ساخت هویت جدید (mnemonic + xpub + ۳ آدرس اول):
//        bun scripts/payments-keygen-offline.mjs
//   ۲) ساخت xpub از mnemonic موجود:
//        bun scripts/payments-keygen-offline.mjs --mnemonic "کلمه‌ها ..."
//   ۳) بیرون‌کشی کلید خصوصی یک آدرس برای جمع‌کردن موجودی (sweep) —
//      فقط آفلاین و فقط وقتی لازم شد:
//        bun scripts/payments-keygen-offline.mjs --mnemonic "..." --export-index 0
//        (خروجی: کلید خصوصی hex → در TronLink/کیف‌پول import و منتقل کنید)
//
// مسیر استاندارد: m/44'/195'/0'/0/<i>  (195 = کویین‌تایپ ترون)
// مقداری که در .env سرور می‌گذارید فقط همین xpub است:
//   TRON_XPUB=xpub....
// ===========================================================================

import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'
import { HDKey } from '@scure/bip32'
import { keccak_256 } from '@noble/hashes/sha3.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { createBase58check } from '@scure/base'
import { secp256k1 } from '@noble/curves/secp256k1.js'

const b58c = createBase58check(sha256)
const ACCOUNT_PATH = "m/44'/195'/0'"

function toTronAddress(compressedPub) {
  const point = secp256k1.Point.fromBytes(compressedPub)
  const uncompressed = point.toBytes(false)
  const hash = keccak_256(uncompressed.slice(1))
  const payload = new Uint8Array(21)
  payload[0] = 0x41
  payload.set(hash.slice(12), 1)
  return b58c.encode(payload)
}

function printAccount(account, opts) {
  console.log('\n──────────────────────────────────────────────────────')
  console.log('XPUB (فقط همین به سرور می‌رود → .env: TRON_XPUB=…):')
  console.log(account.publicExtendedKey)
  console.log('──────────────────────────────────────────────────────')
  console.log('۳ آدرس اول (' + ACCOUNT_PATH + '/0/i):')
  for (let i = 0; i < 3; i++) {
    console.log(`  #${i}: ${toTronAddress(account.derive(`m/0/${i}`).publicKey)}`)
  }
  console.log('──────────────────────────────────────────────────────\n')
  if (opts.exportIndex !== undefined) {
    const child = HDKey.fromMasterSeed(mnemonicToSeedSync(opts.mnemonic)).derive(`${ACCOUNT_PATH}/0/${opts.exportIndex}`)
    if (!child.privateKey) throw new Error('Failed to derive private key')
    console.log(`🔑 کلید خصوصی آدرس #${opts.exportIndex} (فقط برای sweep — روی کاغذ/حافظهٔ موقت، هرگز در فایل!):`)
    console.log(Buffer.from(child.privateKey).toString('hex'))
    console.log('')
  }
}

const args = process.argv.slice(2)
const getFlag = (name) => {
  const i = args.indexOf(name)
  return i >= 0 && args[i + 1] ? args[i + 1] : undefined
}

const mnemonicArg = getFlag('--mnemonic')
const exportIndex = getFlag('--export-index')

if (mnemonicArg) {
  if (!validateMnemonic(mnemonicArg.trim().toLowerCase(), wordlist)) {
    console.error('❌ mnemonic نامعتبر است.')
    process.exit(1)
  }
  const seed = mnemonicToSeedSync(mnemonicArg.trim().toLowerCase())
  const account = HDKey.fromMasterSeed(seed).derive(ACCOUNT_PATH)
  printAccount(account, { mnemonic: mnemonicArg.trim().toLowerCase(), exportIndex: exportIndex !== undefined ? Number(exportIndex) : undefined })
} else {
  console.log('🎲 ساخت هویت پرداخت جدید (آفلاین!) …')
  const mnemonic = generateMnemonic(wordlist, 256)
  const words = mnemonic.split(' ')
  console.log('\n✍️  عبارت بازیابی ۲۴ کلمه‌ای را همین حالا «روی کاغذ» بنویسید و برنامه را ببندید:')
  for (let r = 0; r < 4; r++) console.log(`  ${words.slice(r * 6, r * 6 + 6).join(' ')}`)
  const seed = mnemonicToSeedSync(mnemonic)
  const account = HDKey.fromMasterSeed(seed).derive(ACCOUNT_PATH)
  printAccount(account, { mnemonic })
}
