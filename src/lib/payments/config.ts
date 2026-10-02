// ---------------------------------------------------------------------------
// 🪙 پیکربندی پرداخت USDT (TRC20) — فقط سمت سرور
//
// منبع کیف پول (به ترتیب اولویت):
//   ۱) SiteSetting کلید paymentsWallet — از پنل ادمین (تب USDT → Connect wallet)
//      ذخیره می‌شود و «بدون ری‌استارت» با refreshWalletOverride() زنده می‌شود.
//      این ردیف حالت صریح ادمین را هم دارد (mode: "shared" | "hd"):
//      «Single USDT (TRC20) address» یا «HD xpub» — وقتی ادمین حالتی را انتخاب
//      کرده، هیچ منبع دیگری (از جمله env) حق دورزدن آن را ندارد (فاز ۳۵:
//      ریشهٔ باگ ناسازگاری آدرس همین بود که xpub همیشه برنده می‌شد).
//   ۲) متغیرهای محیطی (فقط وقتی پنل هیچ کیف‌پولی ذخیره نکرده باشد):
//      TRON_NETWORK        = shasta | nile | mainnet  ⬅ کلید مرکزی شبکه
//        (تنها منبع حقیقت شبکه؛ apiBase و قرارداد USDT به‌طور خودکار از روی
//         همین مقدار تعیین می‌شوند و بخش‌های مختلف برنامه حق انتخاب مستقل ندارند)
//      TRON_XPUB           = xpub حساب مسیر m/44'/195'/0' (حالت HD: آدرس یکتا)
//      TRON_WALLET_ADDRESS = یک آدرس ثابت TRON (حالت جایگزین: آدرس مشترک + مبلغ یکتا)
//      TRONGRID_API_KEY    = کلید رایگان TronGrid (اختیاری ولی توصیه‌شده)
//   USDT_TRC20_CONTRACT = override اختیاری قرارداد — «در برابر شبکهٔ فعال»
//      راستی‌آزمایی می‌شود؛ ناسازگاری (مثلاً قرارداد Mainnet روی Shasta) =
//      خطای صریح و غیرفعال‌شدن پرداخت، نه ادامهٔ خاموش
//   TRON_API_BASE       = override اختیاری API — دامنه‌اش باید متعلق به همان
//      شبکهٔ فعال باشد وگرنه fail-closed
//   PAYMENT_TTL_MINUTES = عمر سفارش پرداخت‌نخورده (پیش‌فرض ۴۵ دقیقه)
//
// ⛔ سیاست fail-closed: پیکربندی ناقص هرگز «نیمه‌فعال» اجرا نمی‌شود —
//    مشکل دقیق در configIssue توصیف می‌شود (فقط در پنل ادمین دیده می‌شود)
//    و تا رفع آن، ساخت سفارش با ۵۰۳ رد می‌شود.
//
// ⛔ xprv/seed/mnemonic هرگز مجاز نیست — فقط xpub؛ حتی در env هم اگر
//    چیزی شبیه کلید خصوصی ببینیم رد می‌شود و سیستم غیرفعال می‌ماند.
// ---------------------------------------------------------------------------

import { siteContent } from '@/content/site-content'
import { isValidTronAddress } from './tron-address'
import { validateXpub } from './hd-address'

// قرارداد رسمی USDT (Tether) روی اصلیمین‌نت TRON — TRC20
// راستی‌آزمایی‌شده روی زنجیره: symbol()=USDT ، decimals()=6 (نام: Tether USD)
// + مطابق مستندات رسمی TronLink (docs.tronlink.org/reference/networks)
export const USDT_MAINNET_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'

// ---------------------------------------------------------------------------
// 🌐 پیکربندی مرکزی شبکهٔ TRON — تنها منبع حقیقت شبکه در کل برنامه
//
// TRON_NETWORK (env) یکی از سه مقدار زیر را تعیین می‌کند و API/قرارداد
// به‌طور خودکار از همین جدول می‌آیند — هیچ ماژول دیگری حق انتخاب مستقل شبکه
// ندارد. قراردادهای تست‌نت «حدس زده نشده‌اند»:
//   • Shasta: مستندات رسمی توسعه‌دهندگان TRON (developers.tron.network →
//     «TRC-20 contract interaction» این قرارداد را صراحتاً «USDT contract on
//     the Shasta testnet» معرفی می‌کند) + راستی‌آزمایی زنجیره توسط ما:
//     symbol()=USDT ، decimals()=6 ، name()=TetherToken
//   • Nile: سایت رسمی تست‌نت Nile (nileex.io → Get 1000 test coins) + راستی‌
//     آزمایی زنجیره توسط ما: symbol()=USDT ، decimals()=6 ، name()=Tether USD
// ---------------------------------------------------------------------------
export type TronNetwork = 'shasta' | 'nile' | 'mainnet'

export interface TronNetworkInfo {
  key: TronNetwork
  apiBase: string
  usdtContract: string
  explorerBase: string
  /** نام نمایشی — مثل «Shasta Testnet» */
  label: string
  /** TESTNET | MAINNET — برای بنرهای هشدار و لاگ‌ها */
  envLabel: 'TESTNET' | 'MAINNET'
  isTestnet: boolean
}

export const TRON_NETWORKS: Record<TronNetwork, TronNetworkInfo> = {
  shasta: {
    key: 'shasta',
    apiBase: 'https://api.shasta.trongrid.io',
    usdtContract: 'TG3XXyExBkPp9nzdajDZsozEu4BkaSJozs',
    explorerBase: 'https://shasta.tronscan.org/#/transaction/',
    label: 'Shasta Testnet',
    envLabel: 'TESTNET',
    isTestnet: true,
  },
  nile: {
    key: 'nile',
    apiBase: 'https://api.nileex.io',
    usdtContract: 'TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf',
    explorerBase: 'https://nile.tronscan.org/#/transaction/',
    label: 'Nile Testnet',
    envLabel: 'TESTNET',
    isTestnet: true,
  },
  mainnet: {
    key: 'mainnet',
    apiBase: 'https://api.trongrid.io',
    usdtContract: USDT_MAINNET_CONTRACT,
    explorerBase: 'https://tronscan.org/#/transaction/',
    label: 'TRON Mainnet',
    envLabel: 'MAINNET',
    isTestnet: false,
  },
}

/** دامنهٔ API باید متعلق به همان شبکهٔ فعال باشد — ضد قاطی‌شدن Mainnet/Shasta */
function apiBaseMatchesNetwork(net: TronNetwork, apiBase: string): boolean {
  const h = apiBase.toLowerCase()
  if (net === 'mainnet') return h.startsWith('https://api.trongrid.io')
  if (net === 'shasta') return h.includes('shasta.trongrid.io')
  return h.includes('nileex.io') // nile — زیرساخت رسمی nileex.io
}

/**
 * خواندن TRON_NETWORK از env — مقدار نامعتبر = خطای صریح (fail-closed برای
 * پرداخت) نه ادامهٔ خاموش. مقدار خالی = mainnet (رفتار سازگار با قبل).
 */
export function resolveTronNetwork(): { network: TronNetwork; info: TronNetworkInfo; issue: string | null } {
  const raw = (process.env.TRON_NETWORK || '').trim().toLowerCase()
  if (!raw) {
    const info = TRON_NETWORKS.mainnet
    return { network: 'mainnet', info, issue: null }
  }
  if (raw === 'shasta' || raw === 'nile' || raw === 'mainnet') {
    const info = TRON_NETWORKS[raw]
    return { network: raw, info, issue: null }
  }
  return {
    network: 'mainnet',
    info: TRON_NETWORKS.mainnet,
    issue: `TRON_NETWORK="${raw}" is invalid — allowed values: shasta | nile | mainnet. Payments are DISABLED until this is fixed.`,
  }
}

/** اکسپلورر مناسب هر شبکهٔ ذخیره‌شدهٔ سفارش — مقدارهای قدیمی («TRON») = mainnet */
export function explorerBaseForNetwork(network: string | null | undefined): string | null {
  if (!network) return null
  const n = network.trim().toLowerCase()
  if (n === 'shasta') return TRON_NETWORKS.shasta.explorerBase
  if (n === 'nile') return TRON_NETWORKS.nile.explorerBase
  if (n === 'mainnet' || n === 'tron') return TRON_NETWORKS.mainnet.explorerBase
  return null
}

// امضای رویداد Transfer در استاندارد ERC20/TRC20 — برای راستی‌آزمایی لاگ قرارداد
export const TRANSFER_TOPIC = 'ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

// مقدار int در ABI همیشه ۳۲ بایت است (۶۴ رقم hex)
export const ABI_UINT_HEX_LEN = 64

export type PaymentMode = 'hd' | 'shared'

export interface PaymentsConfig {
  configured: boolean
  mode: PaymentMode | null
  /** اگر null نباشد، توضیح دقیق «چرا پرداخت فعلاً غیرفعال است» (متن امن، بدون راز) */
  configIssue: string | null
  /** شبکهٔ فعال — از TRON_NETWORK (env)؛ تنها منبع حقیقت شبکه */
  network: TronNetwork
  networkLabel: string
  isTestnet: boolean
  /** xpub حساب — فقط در حالت hd؛ هرگز به کلاینت نمی‌رود (پنل فقط اثرانگشت sha256 می‌بیند) */
  xpub: string
  /** آدرس ثابت دریافت — فقط در حالت shared */
  walletAddress: string
  contract: string
  apiBase: string
  explorerBase: string
  apiKey: string
  ttlMinutes: number
}

// اعتبارسنجی xpub سنگین است (مشتق‌سازی EC) — نتیجه برای هر xpub کش می‌شود
const g = globalThis as unknown as { __ctXpubValid?: Map<string, boolean> }
const xpubCache = (g.__ctXpubValid ??= new Map<string, boolean>())

function xpubIssue(xpub: string): string | null {
  if (xpubCache.has(xpub)) return xpubCache.get(xpub) ? null : 'TRON_XPUB is not a valid account-level xpub (expected path m/44\'/195\'/0\')'
  let issue: string | null = null
  if (!xpub.startsWith('xpub')) issue = "TRON_XPUB must start with 'xpub' (xprv/seed/mnemonic are never accepted)"
  else {
    const check = validateXpub(xpub)
    if (!check.ok) issue = `TRON_XPUB failed validation: ${check.error}`
  }
  xpubCache.set(xpub, issue === null)
  return issue
}

// ---------------------------------------------------------------------------
// 🎛️ کیف پول متصل از پنل ادمین — SiteSetting کلید paymentsWallet
// ساختار: { xpub?, walletAddress?, trongridApiKey? } — اعتبارسنجی نهایی همیشه
// همین‌جا در getPaymentsConfig انجام می‌شود (fail-closed حتی اگر دیتابیس خراب باشد)
// کش روی globalThis تا همهٔ نسخه‌های ماژول بعد از HMR یک منبع ببینند.
// ---------------------------------------------------------------------------

export interface WalletOverride {
  /** حالت صریح انتخابی ادمین — '' فقط برای ردیف‌های قدیمیِ قبل از افزودن انتخاب حالت */
  mode: 'hd' | 'shared' | ''
  xpub: string
  walletAddress: string
  trongridApiKey: string
}

export const WALLET_SETTING_KEY = 'paymentsWallet'

const gw = globalThis as unknown as { __ctWalletOverride?: WalletOverride | null }

export function getWalletOverride(): WalletOverride | null {
  return gw.__ctWalletOverride ?? null
}

export function setWalletOverride(o: WalletOverride | null): void {
  gw.__ctWalletOverride = o
}

/** خواندن تازهٔ کیف پول ذخیره‌شدهٔ پنل از دیتابیس — در ورودیِ همهٔ مسیرهای پرداختی صدا زده می‌شود */
export async function refreshWalletOverride(): Promise<void> {
  try {
    const { db } = await import('@/lib/db')
    const row = await db.siteSetting.findUnique({ where: { key: WALLET_SETTING_KEY } })
    if (!row) {
      gw.__ctWalletOverride = null
      return
    }
    const parsed = JSON.parse(row.value) as Partial<WalletOverride>
    const mode = parsed?.mode === 'hd' || parsed?.mode === 'shared' ? parsed.mode : ''
    gw.__ctWalletOverride = {
      mode,
      xpub: typeof parsed?.xpub === 'string' ? parsed.xpub.trim() : '',
      walletAddress: typeof parsed?.walletAddress === 'string' ? parsed.walletAddress.trim() : '',
      trongridApiKey: typeof parsed?.trongridApiKey === 'string' ? parsed.trongridApiKey.trim() : '',
    }
  } catch (e) {
    // دیتابیس موقتاً در دسترس نیست → آخرین مقدار معتبر حفظ می‌شود (fail-safe)
    console.error('[payments] wallet override refresh failed:', e instanceof Error ? e.message : e)
  }
}

export function getPaymentsConfig(): PaymentsConfig {
  // اولویت: کیف پول ذخیره‌شدهٔ پنل ادمین (با حالت صریح) ← متغیرهای محیطی
  const ov = getWalletOverride()
  const ttlRaw = Number(process.env.PAYMENT_TTL_MINUTES || '45')
  const ttlMinutes = Number.isFinite(ttlRaw) && ttlRaw >= 5 && ttlRaw <= 24 * 60 ? Math.floor(ttlRaw) : 45

  // 🌐 شبکهٔ فعال — از پیکربندی مرکزی؛ بخش‌های دیگر برنامه انتخاب مستقل ندارند
  const net = resolveTronNetwork()

  // فقط کلید «عمومی» توسعه‌یافته مجاز است؛ هر اثری از کلید خصوصی = رد کامل
  const xpubProblem = (candidate: string): string | null => {
    if (/^(xprv|zprv|yprv)/i.test(candidate)) {
      return 'The saved xpub looks like a PRIVATE key (xprv…) — for safety it is rejected. Use the account xpub only.'
    }
    return xpubIssue(candidate)
  }

  let mode: PaymentMode | null = null
  let xpub = ''
  let walletAddress = ''
  let configIssue: string | null = net.issue

  if (ov && ov.mode === 'shared') {
    // 🎯 فاز ۳۵ — حالت «Single USDT (TRC20) address» که ادمین صریحاً انتخاب کرده:
    // دقیقاً همان آدرس پیکربندی‌شده استفاده می‌شود (ساخت سفارش + نمایش + QR +
    // راستی‌آزمایی). env (حتی اگر TRON_XPUB داشته باشد) هرگز این انتخاب را
    // دور نمی‌زند — علت ریشه‌ای ناسازگاری آدرس گزارش‌شده همین اولویتِ اشتباه بود.
    mode = 'shared'
    walletAddress = ov.walletAddress
    if (!walletAddress) {
      configIssue = configIssue ?? 'Single-address mode is selected but no USDT TRC-20 address is saved — open Admin → USDT → “Connect your wallet” and paste your receiving address.'
    } else if (!isValidTronAddress(walletAddress)) {
      configIssue = configIssue ?? 'The saved TRON wallet address is not valid (Base58Check failed) — check for typos'
    }
  } else if (ov && ov.mode === 'hd') {
    // 🎯 حالت HD که ادمین صریحاً انتخاب کرده — فقط xpub ذخیره‌شدهٔ خود پنل
    mode = 'hd'
    xpub = ov.xpub
    if (!xpub) {
      configIssue = configIssue ?? 'HD (xpub) mode is selected but no account xpub is saved — open Admin → USDT → “Connect your wallet”.'
    } else {
      configIssue = configIssue ?? xpubProblem(xpub)
    }
  } else if (ov) {
    // ردیف قدیمی بدون انتخاب حالت — فقط از محتوای «خودِ ردیف پنل» استنتاج می‌شود؛
    // env هیچ‌وقت جای انتخاب ادمین را نمی‌گیرد (سازگاری با ردیف‌های قبل از فاز ۳۵)
    if (ov.xpub) {
      mode = 'hd'
      xpub = ov.xpub
      configIssue = configIssue ?? xpubProblem(xpub)
    } else if (ov.walletAddress) {
      mode = 'shared'
      walletAddress = ov.walletAddress
      if (!isValidTronAddress(walletAddress)) {
        configIssue = configIssue ?? 'The saved TRON wallet address is not valid (Base58Check failed) — check for typos'
      }
    } else {
      configIssue = configIssue ?? 'The saved panel wallet is empty — reconnect your wallet in Admin → USDT → “Connect your wallet”.'
    }
  } else {
    // بدون پنل — متغیرهای محیطی (اگر هر دو ست باشند xpub اولویت دارد؛ رفتار
    // مستند و سازگار با قبل. انتخاب ادمین در پنل همیشه بر env اولویت دارد)
    const envXpub = (process.env.TRON_XPUB || '').trim()
    const envAddress = (process.env.TRON_WALLET_ADDRESS || '').trim()
    if (envXpub) {
      mode = 'hd'
      xpub = envXpub
      configIssue = configIssue ?? xpubProblem(xpub)
    } else if (envAddress) {
      mode = 'shared'
      walletAddress = envAddress
      if (!isValidTronAddress(walletAddress)) {
        configIssue = configIssue ?? 'TRON_WALLET_ADDRESS is not a valid TRON address (Base58Check failed) — check for typos'
      }
    } else {
      configIssue = configIssue ?? 'No wallet connected yet — open Admin → USDT tab → “Connect your wallet”, choose “Single USDT (TRC20) address” or “HD xpub” and save your public receiving address'
    }
  }

  // ---------------------------------------------------------------------------
  // 🛡️ قرارداد USDT — همیشه هماهنگ با شبکهٔ فعال
  // پیش‌فرض = قرارداد رسمی همان شبکه از جدول مرکزی؛ env فقط override ای است که
  // «در برابر شبکه» راستی‌آزمایی می‌شود (ناسازگاری = fail-closed با پیام صریح).
  // اگر خودِ شبکه نامعتبر باشد، خطای شبکه اولویت دارد و overrideها بررسی نمی‌شوند.
  // ---------------------------------------------------------------------------
  let contract = net.info.usdtContract
  let apiBase = net.info.apiBase
  if (!net.issue) {
    const contractEnv = (process.env.USDT_TRC20_CONTRACT || '').trim()
    if (contractEnv) {
      contract = contractEnv
      if (contractEnv.toLowerCase() === USDT_MAINNET_CONTRACT.toLowerCase() && net.network !== 'mainnet') {
        configIssue = `CONFIG ERROR: USDT_TRC20_CONTRACT is the MAINNET USDT contract but TRON_NETWORK=${net.network} — the mainnet contract is never allowed on a testnet. Payments are DISABLED.`
      } else if (net.network === 'mainnet' && contractEnv !== USDT_MAINNET_CONTRACT) {
        configIssue = `CONFIG ERROR: TRON_NETWORK=mainnet must use the official USDT contract (${USDT_MAINNET_CONTRACT}). Payments are DISABLED.`
      } else if (!configIssue && !isValidTronAddress(contract)) {
        configIssue = 'USDT_TRC20_CONTRACT is not a valid TRON address (Base58Check failed) — refusing to accept payments'
      }
    } else if (!configIssue && !isValidTronAddress(contract)) {
      configIssue = 'The USDT contract for the active network is not a valid TRON address — refusing to accept payments'
    }

    // 🛡️ API base — پیش‌فرض = endpoint رسمی همان شبکه؛ override با دامنهٔ ناهماهنگ = fail-closed
    const apiEnv = (process.env.TRON_API_BASE || '').trim().replace(/\/+$/, '')
    if (apiEnv) {
      if (!apiBaseMatchesNetwork(net.network, apiEnv)) {
        configIssue = `CONFIG ERROR: TRON_API_BASE="${apiEnv}" does not belong to TRON_NETWORK=${net.network} (expected ${net.info.apiBase}). Payments are DISABLED.`
      } else {
        apiBase = apiEnv
      }
    }
  }

  return {
    configured: mode !== null && configIssue === null,
    mode,
    configIssue,
    network: net.network,
    networkLabel: net.info.label,
    isTestnet: net.info.isTestnet,
    // هر مقدار فقط در حالت خودش برمی‌گردد — هیچ نشتی/استفادهٔ تصادفی بین دو حالت
    xpub: mode === 'hd' ? xpub : '',
    walletAddress: mode === 'shared' ? walletAddress : '',
    contract,
    apiBase,
    explorerBase: net.info.explorerBase,
    apiKey: (ov?.trongridApiKey || process.env.TRONGRID_API_KEY || '').trim(),
    ttlMinutes,
  }
}

// ---------------------------------------------------------------------------
// 🔎 تشخیص پیکربندی هنگام بوت (یک‌بار برای هر پروسه) — همیشه مقادیر شبکهٔ
// واقعاً فعال گزارش می‌شود و هرگز مقدار Mainnet هنگام فعال‌بودن تست‌نت
// ---------------------------------------------------------------------------
const diag = globalThis as unknown as { __ctPayNetLogged?: boolean }
if (!diag.__ctPayNetLogged) {
  diag.__ctPayNetLogged = true
  try {
    const c = getPaymentsConfig()
    console.info(
      `[payments] Network: ${c.networkLabel} | Environment: ${c.isTestnet ? 'TESTNET' : 'MAINNET'} | API: ${c.apiBase} | USDT: ${c.contract}${c.configIssue ? ` | ⚠ ${c.configIssue}` : ''}`
    )
  } catch {
    // لاگ تشخیصی هرگز نباید بوت را بشکند
  }
}

// ---------------------------------------------------------------------------
// 📦 کاتالوگ محصولات — منبع حقیقت قیمت، همیشه سمت سرور
// قیمت هرگز از مرورگر پذیرفته نمی‌شود؛ فقط productId می‌آید و مبلغ از
// سکشن payments فایل محتوا خوانده می‌شود.
// ---------------------------------------------------------------------------

export interface PaymentProduct {
  id: string
  classTitle: string
  label: string
  amountUsd: number
}

export function getProducts(): PaymentProduct[] {
  const p = (siteContent as unknown as { payments?: { products?: PaymentProduct[] } }).payments
  const products = (p?.products ?? []).filter(
    (x): x is PaymentProduct =>
      typeof x?.id === 'string' &&
      typeof x?.label === 'string' &&
      typeof x?.amountUsd === 'number' &&
      Number.isFinite(x.amountUsd) &&
      x.amountUsd > 0 &&
      x.amountUsd <= 2000 // سقف ایمن: ۲۰۰۰ تتر (میکرو در Int جا می‌شود)
  )
  return products
}

export function findProduct(productId: string): PaymentProduct | null {
  return getProducts().find((p) => p.id === productId) ?? null
}

// ---------------------------------------------------------------------------
// 🎓 فاز ۴۲ — منبع حقیقت قیمت حالا جدول CourseClass است («محصول» = نمای
// مشتق‌شدهٔ کلاس: id=productId، amountUsd=packagePrice). فایل محتوا فقط در
// خطای خواندن DB استفاده می‌شود (getProducts بالا). جدولِ خالیِ عمدی ادمین
// دور زده نمی‌شود — یعنی اگر ادمین همهٔ کلاس‌ها را غیرفعال کند، پرداختِ آن‌ها
// واقعاً بسته می‌شود. هیچ مسیر دیگری حق تعریف/حدس قیمت ندارد.
// ---------------------------------------------------------------------------
export async function getActiveProductsAsync(): Promise<PaymentProduct[]> {
  const { getActiveProducts } = await import('@/lib/classes/store')
  return getActiveProducts()
}

export async function findProductAsync(productId: string): Promise<PaymentProduct | null> {
  const products = await getActiveProductsAsync()
  return products.find((p) => p.id === productId) ?? null
}

// ۱ تتر = ۱٬۰۰۰٬۰۰۰ میکرو (USDT روی ترون دقیقاً ۶ رقم اعشار دارد)
export const MICRO_PER_USDT = 1_000_000
// ۱ سنت = ۱۰٬۰۰۰ میکرو — همهٔ محاسبات اسلات با این اعداد «صحیح» انجام می‌شود
export const MICRO_PER_CENT = 10_000

/**
 * دلار → میکرو-تتر. منبع حقیقت همان عدد صحیح میکروست؛ ضرب اعشاری فقط
 * یک‌بار و بلافاصله گرد می‌شود و نتیجه باید عدد صحیحِ امن باشد وگرنه throw.
 * (برای مبالغ ≤ ۹٬۰۰۰٬۰۰۰ تتر، 1e6×n دقیقاً در محدودهٔ double امن است.)
 */
export function usdToMicro(amountUsd: number): number {
  const micro = Math.round(amountUsd * MICRO_PER_USDT)
  if (!Number.isSafeInteger(micro) || micro <= 0) {
    throw new Error(`Invalid product amount: ${amountUsd}`)
  }
  return micro
}

/** میکرو → رشتهٔ نمایشی دو اعشار (فقط برای نمایش؛ منطق همیشه با میکروی صحیح است) */
export function microToDisplay(micro: number): string {
  return (micro / MICRO_PER_USDT).toFixed(2)
}

// برای سازگاری با کدهای قبلی، اعتبارسنجی کامل آدرس از ماژول اختصاصی re-export می‌شود
export { isValidTronAddress } from './tron-address'
