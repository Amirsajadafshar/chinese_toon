// ---------------------------------------------------------------------------
// 🌐 کلاینت TronGrid — تنها نقطهٔ تماس با بلاکچین ترون (سمت سرور)
//
// چرا TronGrid؟
//  • سرویس رسمی بنیاد ترون؛ بدون KYC و بدون شرکت واسط
//  • پلن رایگان با کلید API (سقف کافی برای فروشگاه کوچک/متوسط)
//  • نکته: TronGrid «وبهوک» ندارد → معماری ما polling است
//    (اسکن دوره‌ای تراکنش‌های ورودی + راستی‌آزمایی دوباره روی نود Solidity)
//
// نکات امنیتی پیاده‌سازی:
//  • هر پاسخ API «دادهٔ خارجیِ غیرقابل‌اعتماد» است و فیلد‌به‌فیلد اعتبارسنجی می‌شود
//  • همهٔ درخواست‌ها timeout دارند (AbortController)
//  • خطاهای 429/5xx/timeout = خطای «موقت» → هرگز وضعیت سفارش را خراب نمی‌کنند
//  • صفحه‌بندی کامل: تازه‌ترین تراکنش‌ها «همیشه» اول دیده می‌شوند (ترتیب نزولی)
//    و تا سقف امن صفحات عقب می‌رویم — چیزی بین دو دور polling گم نمی‌شود
//  • تأیید نهایی فقط روی نود Solidity و فقط با وضعیت SUCCESS صریح انجام می‌شود
//  • کلید API فقط از env خوانده می‌شود و در لاگ‌ها ظاهر نمی‌شود
// ---------------------------------------------------------------------------

import { getPaymentsConfig, TRANSFER_TOPIC } from './config'
import { logAddressToTronAddress, topicToTronAddress } from './tron-address'

const REQUEST_TIMEOUT_MS = 10_000
// صفحه‌بندی: ۲۰۰ آیتم در هر صفحه، حداکثر ۱۰ صفحه (۲۰۰۰ تراکنش) در هر اسکن
const PAGE_SIZE = 200
const MAX_PAGES = 10

/** خطای موقت API (timeout/429/5xx) — وضعیت سفارش‌ها را نباید تغییر داد، فقط بعداً دوباره تلاش شود */
export class TronApiUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TronApiUnavailableError'
  }
}

async function tronFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const cfg = getPaymentsConfig()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const headers: Record<string, string> = { accept: 'application/json' }
    if (cfg.apiKey) headers['TRON-PRO-API-KEY'] = cfg.apiKey // هرگز در لاگ نمی‌رود
    const res = await fetch(`${cfg.apiBase}${path}`, { ...init, headers, signal: controller.signal, cache: 'no-store' })
    if (res.status === 429 || res.status >= 500) {
      throw new TronApiUnavailableError(`TronGrid temporarily unavailable (HTTP ${res.status})`)
    }
    if (!res.ok) throw new TronApiUnavailableError(`TronGrid HTTP ${res.status}`)
    return (await res.json()) as T
  } catch (e) {
    if (e instanceof TronApiUnavailableError) throw e
    if (e instanceof Error && (e.name === 'AbortError' || e.name === 'TimeoutError')) {
      throw new TronApiUnavailableError('TronGrid request timed out')
    }
    throw new TronApiUnavailableError(`TronGrid request failed: ${e instanceof Error ? e.message : 'unknown'}`)
  } finally {
    clearTimeout(timer)
  }
}

// ---------------------------------------------------------------------------
// تراکنش‌های TRC20 ورودی یک آدرس — فقط تأییدشده (only_confirmed) و فقط ورودی
// ---------------------------------------------------------------------------

export interface Trc20Transfer {
  txHash: string
  from: string
  to: string
  /** مبلغ به میکرو-USDT (عدد صحیحِ امن — از BigInt تبدیل و بررسی‌شده) */
  amountMicro: number
  contract: string
  blockTimestamp: number
}

interface TronGridTrc20Response {
  success?: boolean
  error?: string
  data?: Array<{
    transaction_id?: string
    from?: string
    to?: string
    type?: string
    value?: string
    block_timestamp?: number
    token_info?: { address?: string; decimals?: number; symbol?: string }
  }>
}

const HEX64_RE = /^[0-9a-f]{64}$/i

/** decode مقدار uint256 ABI به میکرو — بازگشت null اگر خارج از محدودهٔ امن باشد */
function abiUintHexToMicro(hex: string): number | null {
  const clean = hex.toLowerCase().replace(/^0x/, '')
  if (clean.length !== 64 || !/^[0-9a-f]+$/.test(clean)) return null
  const big = BigInt(`0x${clean}`)
  if (big === BigInt(0) || big > BigInt(Number.MAX_SAFE_INTEGER)) return null
  return Number(big)
}

export interface FetchTransfersResult {
  transfers: Trc20Transfer[]
  /** true = به سقف صفحات خوردیم و ممکن است تراکنش‌های قدیمی‌ترِ پنجره دیده نشده باشند */
  truncated: boolean
}

/**
 * تراکنش‌های TRC20 ورودی آدرس از sinceMs به بعد.
 *
 * صفحه‌بندی ضد-گم‌شدن: نتایج «نزولی» گرفته می‌شود (تازه‌ترین اول). حتی اگر
 * پنجرهٔ اسکن پر از تراکنش باشد و به سقف صفحات برسیم، آن‌چه جا می‌ماند
 * «قدیمی‌ترین‌ها» هستند نه تازه‌ها — پس پرداختِ تازه هرگز پنهان نمی‌شود.
 * (سقف: ۱۰ صفحه × ۲۰۰ = ۲۰۰۰ تراکنش تأییدشده در پنجره؛ عملاً دست‌نیافتنی است
 * چون پنجرهٔ اسکن فقط از ساختِ قدیمی‌ترین سفارشِ فعال شروع می‌شود.)
 */
export async function fetchIncomingTransfers(address: string, sinceMs: number): Promise<FetchTransfersResult> {
  const cfg = getPaymentsConfig()
  if (!isValidAddressShape(address)) throw new TronApiUnavailableError('Refusing to query a malformed address')

  const out: Trc20Transfer[] = []
  const seen = new Set<string>() // ضد تکرار بین صفحات (صفحهٔ بعدی ۱ms هم‌پوشانی دارد)
  let minTimestamp = Math.max(0, Math.floor(sinceMs))
  let truncated = false

  for (let page = 0; page < MAX_PAGES; page++) {
    const params = new URLSearchParams({
      only_to: 'true',
      only_confirmed: 'true',
      limit: String(PAGE_SIZE),
      min_timestamp: String(minTimestamp),
      contract_address: cfg.contract, // فقط قرارداد USDTِ تنظیم‌شده — توکن دیگر از همین اول فیلتر می‌شود
      order_by: 'block_timestamp,desc', // ⬅ نزولی: تازه‌ترین‌ها همیشه اول
    })
    const json = await tronFetch<TronGridTrc20Response>(`/v1/accounts/${address}/transactions/trc20?${params}`)
    if (!json || json.success !== true || !Array.isArray(json.data)) {
      throw new TronApiUnavailableError('Malformed TronGrid response (missing success/data)')
    }

    const data = json.data
    for (const t of data) {
      // راستی‌آزمایی ساختار هر آیتم — دادهٔ خارجیِ غیرقابل‌اعتماد
      if (!t.transaction_id || !HEX64_RE.test(t.transaction_id)) continue
      if (t.type !== 'Transfer' || !t.from || !t.to || !t.value || !t.token_info?.address) continue
      if (t.token_info.address.toLowerCase() !== cfg.contract.toLowerCase()) continue
      // ⛔ به قرارداد اعتماد نمی‌کنیم چون خودش را گفت؛ فیلتر بالا با قراردادِ
      // env مقایسه شده و decimals/symbol فقط به‌عنوان همخوانی دوباره چک می‌شوند
      if (t.token_info.decimals !== 6 || t.token_info.symbol !== 'USDT') continue
      const amountMicro = abiUintHexToMicro(t.value)
      if (amountMicro === null) continue
      const ts = typeof t.block_timestamp === 'number' && t.block_timestamp > 0 ? t.block_timestamp : 0
      if (!ts) continue
      if (ts < sinceMs) continue
      if (seen.has(t.transaction_id)) continue
      seen.add(t.transaction_id)
      out.push({
        txHash: t.transaction_id,
        from: t.from,
        to: t.to,
        amountMicro,
        contract: cfg.contract,
        blockTimestamp: ts,
      })
    }

    if (data.length < PAGE_SIZE) break // صفحهٔ آخر — همه‌چیز خوانده شد
    const oldestTs = data[data.length - 1]?.block_timestamp
    if (typeof oldestTs !== 'number' || oldestTs <= sinceMs) break // به ابتدای پنجره رسیدیم
    minTimestamp = oldestTs // هم‌پوشانی ۱ نقطه‌ای — تکرارها با seen حذف می‌شوند
  }

  if (out.length >= MAX_PAGES * PAGE_SIZE) truncated = true // فقط تئوریک؛ برای صداقت گزارش می‌شود
  return { transfers: out, truncated }
}

/** شکل ظاهری آدرس قبل از کوئری زدن — آدرس واقعی هم بعداً با Base58Check کامل چک می‌شود */
function isValidAddressShape(addr: string): boolean {
  return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(addr)
}

// ---------------------------------------------------------------------------
// راستی‌آزمایی دوم روی نود Solidity (نود تثبیت‌شده) — لایهٔ finality
// فقط تراکنشی «پرداخت» است که:
//   ۱) هشش ۶۴-hex معتبر باشد            ۲) روی نود Solidity وجود داشته باشد (تثبیت‌شده)
//   ۳) blockNumber معتبر داشته باشد      ۴) وضعیت اجرای آن «صریحاً» SUCCESS باشد
//   ۵) لاگ Transfer از «قرارداد USDTِ env» باشد (امضای topic هم چک می‌شود)
//   ۶) گیرنده دقیقاً آدرس سفارش باشد     ۷) مبلغ دقیقاً برابر مبلغ انتظار باشد
// ارسال‌کننده «در صورت لزوم» قابل بررسی است — در این سیستم فرستندهٔ مورد انتظار
// نداریم (هر کیف‌پولی می‌تواند بپردازد)، پس sender فقط برای ممیزی ذخیره می‌شود.
// ---------------------------------------------------------------------------

interface SolidityTxInfo {
  id?: string
  ret?: Array<{ contractRet?: string }>
  receipt?: { result?: string }
  log?: Array<{ address?: string; topics?: string[]; data?: string }>
  blockNumber?: number
  blockTimeStamp?: number
}

export interface VerifiedTx {
  txHash: string
  to: string
  amountMicro: number
  contract: string
}

export async function verifyTxOnSolidityNode(txHash: string, expectedTo: string, expectedAmountMicro: number): Promise<VerifiedTx | null> {
  const cfg = getPaymentsConfig()
  if (!HEX64_RE.test(txHash)) return null
  if (!Number.isSafeInteger(expectedAmountMicro) || expectedAmountMicro <= 0) return null

  const info = await tronFetch<SolidityTxInfo>(`/walletsolidity/gettransactioninfobyid?value=${txHash}&visible=false`)

  // نود Solidity این تراکنش را نمی‌شناسد → هنوز تثبیت نشده (finality نامعلوم → رد)
  if (!info || !info.id) return null
  // بلاک معتبر — تراکنشِ بی‌بلاک قابل تأیید نیست
  if (typeof info.blockNumber !== 'number' || info.blockNumber <= 0) return null

  // وضعیت اجرا باید «صریحاً» SUCCESS باشد.
  // TronGrid در پاسخِ این endpoint موفقیت را در ret[0].contractRet می‌گذارد
  // (و گاهی receipt.result) — غایب بودن هر دو = ناموفق/نامعلوم → رد، نه عبور!
  const contractRet = info.ret?.[0]?.contractRet ?? info.receipt?.result
  if (contractRet !== 'SUCCESS') return null

  // جستجوی لاگ Transfer قرارداد USDT
  const logs = Array.isArray(info.log) ? info.log : []
  for (const log of logs) {
    if (!log.address || !Array.isArray(log.topics) || log.topics.length < 3 || !log.data) continue
    if (log.topics[0]?.toLowerCase() !== TRANSFER_TOPIC) continue // امضای رویداد Transfer

    // آدرس قرارداد در لاگ hex است — فرمت واقعی TronGrid «۴۰ کاراکتر بدون پیشوند 41»
    // است (گاهی ۶۴ کاراکتر padding-شده) → نرمال‌سازی + پریفیکس/طول سخت‌گیرانه
    let logContract = ''
    try {
      logContract = logAddressToTronAddress(log.address)
    } catch {
      continue // دادهٔ مشکوک — این لاگ نادیده گرفته می‌شود
    }
    if (logContract !== cfg.contract) continue

    // topics[2] = گیرنده (۳۲ بایتِ صفر-پد شده)؛ data = amount (uint256)
    let to = ''
    try {
      to = topicToTronAddress(log.topics[2])
    } catch {
      continue
    }
    if (to !== expectedTo) continue

    const amountBig = abiUintHexToBigint(log.data)
    if (amountBig === null) continue
    // مقایسهٔ مبلغ به‌صورت BigInt — هیچ خطای اعشاری در زنجیرهٔ تصمیم نیست
    if (amountBig !== BigInt(expectedAmountMicro)) {
      // مبلغ لاگ با فهرست trc20 نمی‌خواند → مشکوک؛ این تراکنش تأیید نمی‌شود
      return null
    }
    return { txHash, to, amountMicro: expectedAmountMicro, contract: cfg.contract }
  }
  return null
}

function abiUintHexToBigint(hex: string): bigint | null {
  const clean = hex.toLowerCase().replace(/^0x/, '')
  if (clean.length !== 64 || !/^[0-9a-f]+$/.test(clean)) return null
  const big = BigInt(`0x${clean}`)
  if (big === BigInt(0)) return null
  return big
}

/** تست سلامت اتصال به ترون — برای نمایش وضعیت در پنل ادمین */
export async function pingTronApi(): Promise<{ ok: boolean; latencyMs: number; error?: string; blockHeight?: number }> {
  const start = Date.now()
  try {
    const block = await tronFetch<{ block_header?: { raw_data?: { number?: number } } }>('/wallet/getnowblock')
    const height = block?.block_header?.raw_data?.number
    return { ok: true, latencyMs: Date.now() - start, blockHeight: typeof height === 'number' ? height : undefined }
  } catch (e) {
    return { ok: false, latencyMs: Date.now() - start, error: e instanceof Error ? e.message : 'unknown' }
  }
}
