// ---------------------------------------------------------------------------
// 🚨 لاگ خطای سرور — تنها نقطهٔ ثبت خطاهای مهم (فاز ۵۳ — بند ۱۲)
//
// اصول:
//  • fire-and-forget: خطای لاگ‌گیری هرگز جریان اصلی را نمی‌شکند
//  • پیام «امن»: کوتاه، بدون stack کامل و بدون هیچ راز — اگر الگوی راز در
//    پیام باشد، پیام عمومی جایگزین می‌شود
//  • context فقط کلیدهای مجاز مسیر/متد/نوع‌route را نگه می‌دارد (بدون PII)
// هرگز در این لاگ ذخیره نمی‌شود: رمز، هش رمز، توکن سشن، کلید API، xprv،
// seed، mnemonic و محتوای حساس پرداخت.
// ---------------------------------------------------------------------------

import { db } from '@/lib/db'

export type ErrorCategory =
  | 'API'
  | 'DATABASE'
  | 'PAYMENT'
  | 'ORDER'
  | 'AUTH'
  | 'BACKUP'
  | 'RESTORE'
  | 'SERVER'
  | 'VALIDATION'

/** الگوهای نشانهٔ راز — اگر پیام خطا چنین چیزی داشته باشد، عمداً عمومی می‌شود */
const SECRET_HINTS =
  /password|passwd|secret|token|apikey|api[_-]?key|authorization|cookie|x-admin-key|seed|mnemonic|xprv|private[_-]?key|credential/i

/** پیام امن برای ذخیره/نمایش — بدون stack، بدون راز، حداکثر ۳۰۰ کاراکتر */
export function safeMessage(e: unknown, fallback = 'Unexpected server error'): string {
  let msg = ''
  if (e instanceof Error) msg = e.message
  else if (typeof e === 'string') msg = e
  else if (e && typeof e === 'object' && 'message' in e && typeof (e as { message?: unknown }).message === 'string') {
    msg = (e as { message: string }).message
  }
  msg = msg.replace(/\s+/g, ' ').trim().slice(0, 300)
  if (!msg) return fallback
  if (SECRET_HINTS.test(msg)) return fallback
  return msg
}

export interface AppErrorInput {
  category: ErrorCategory
  error: unknown
  /** پیام جایگزین وقتی پیام اصلی ناامن/خالی است */
  fallback?: string
  /** فقط کلیدهای مجاز: path، method، routeKind، route، note */
  context?: Record<string, string | number | boolean | undefined | null>
  statusCode?: number
  /** شناسهٔ رکورد مرتبط (orderRef، backupId و…) — بدون دادهٔ حساس */
  refId?: string | null
}

function sanitizeContext(ctx: Record<string, string | number | boolean | undefined | null> | undefined): string {
  if (!ctx) return ''
  const allow = ['path', 'method', 'routeKind', 'route', 'note'] as const
  const out: Record<string, string> = {}
  for (const key of allow) {
    const v = ctx[key]
    if (v !== undefined && v !== null) out[key] = String(v).slice(0, 160)
  }
  return JSON.stringify(out)
}

/** ثبت خطا — هرگز throw نمی‌کند و هرگز منتظر نمی‌ماند */
export function logAppError(input: AppErrorInput): void {
  const row = {
    category: input.category,
    message: safeMessage(input.error, input.fallback),
    context: sanitizeContext(input.context),
    statusCode: typeof input.statusCode === 'number' ? Math.trunc(input.statusCode) : null,
    refId: input.refId ? input.refId.slice(0, 80) : null,
  }
  void db.errorLog
    .create({ data: row })
    .catch((e: unknown) => {
      // حتی شکست لاگ‌گیری هم فقط کنسول — هیچ مسیر اصلی‌ای نمی‌شکند
      console.error('[error-log] write failed:', e instanceof Error ? e.message : e)
    })
}
