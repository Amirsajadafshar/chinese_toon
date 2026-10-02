// ---------------------------------------------------------------------------
// ❤️ شناسهٔ پایدار بازدیدکننده برای سیستم لایک نظرات (فاز ۴۶)
//
// برای «هر بازدیدکننده فقط یک لایک به هر نظر»، سرور خودش از روی درخواست یک
// شناسهٔ پایدار می‌سازد: هش sha256 از (IP + User-Agent + نمک ثابت).
//  • هیچ ورودی کلاینت در آن دخیل نیست (ضد دست‌کاری)
//  • خودِ IP هرگز ذخیره نمی‌شود — فقط هش یک‌طرفه (حریم خصوصی)
//  • پسوند نسخه (v1) — اگر روزی فرمول عوض شد، لایک‌های قدیمی بی‌اعتبار
//    و شمارنده‌ها سازگار می‌مانند
// ---------------------------------------------------------------------------

import { createHash } from 'crypto'
import type { NextRequest } from 'next/server'
import { clientIp } from './rate-limit'

export function reviewVisitorId(req: NextRequest): string {
  const ip = clientIp(req)
  const ua = req.headers.get('user-agent') ?? ''
  return createHash('sha256').update(`${ip}|${ua}|ct-review-like-v1`).digest('hex')
}
