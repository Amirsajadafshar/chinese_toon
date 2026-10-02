// ---------------------------------------------------------------------------
// 🧾 Audit Log ادمین — ثبت append-only اقدامات مدیریتی (فاز ۵۳ — بند ۱۴)
//
// اصول:
//  • رکوردها هرگز ویرایش/حذف نمی‌شوند (فقط INSERT)
//  • actor = نام کاربری ادمین از سشن — هرگز توکن/هش
//  • meta فقط متادیتای امن (کد/عنوان/وضعیت قبل-بعد) — هرگز راز/کلید/رمز
//  • fire-and-forget: شکست audit هرگز اکشن اصلی را رد نمی‌کند
// ---------------------------------------------------------------------------

import { db } from '@/lib/db'

export interface AuditInput {
  /** نام کاربری ادمین (پیش‌فرض admin) */
  actor?: string | null
  action: string
  targetType: string
  targetId?: string | null
  /** متادیتای امن — مقادیر طولانی بریده می‌شوند */
  meta?: Record<string, string | number | boolean | null | undefined>
}

function sanitizeMeta(meta: AuditInput['meta']): string {
  if (!meta) return ''
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(meta)) {
    if (v === undefined || v === null) continue
    out[k.slice(0, 40)] = String(v).slice(0, 120)
  }
  return JSON.stringify(out).slice(0, 900)
}

/** ثبت یک اقدام ادمین — هرگز throw نمی‌کند */
export function logAdminAction(input: AuditInput): void {
  void db.auditLog
    .create({
      data: {
        actor: (input.actor || 'admin').slice(0, 60),
        action: input.action.slice(0, 60),
        targetType: input.targetType.slice(0, 40),
        targetId: (input.targetId ?? '').slice(0, 80),
        meta: sanitizeMeta(input.meta),
      },
    })
    .catch((e: unknown) => {
      console.error('[audit] write failed:', e instanceof Error ? e.message : e)
    })
}
