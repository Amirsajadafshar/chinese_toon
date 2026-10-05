// ---------------------------------------------------------------------------
// ✉️ زیرساخت ایمیل سایت — فاز ۴۰ (بازیابی رمز عبور با کد تأیید)
//
// بدون وابستگی جدید: اگر متغیرهای محیطی ارائه‌دهنده تنظیم شده باشند، ایمیل با
// HTTP API همان ارائه‌دهنده ارسال می‌شود؛ وگرنه در توسعه فقط در کنسول سرور
// لاگ می‌شود (بدون افشای چیزی در پاسخ API).
//
// پیکربندی (تمام اختیاری — در .env):
//   RESEND_API_KEY  — کلید API سرویس Resend (resend.com)؛ برای ارسال واقعی
//   MAIL_FROM       — فرستنده، مثل «Chinese Toon <noreply@chinesetoon.com>»
//                     (پیش‌فرض: onboarding@resend.dev تا قبل از دامنهٔ تأییدشده کار کند)
//
// اصول امنیتی:
//   • کد تأیید هرگز در پاسخ API تولیدی نمی‌آید (به‌جز حالت توسعهٔ بدون ارائه‌دهنده
//     برای تست محلی — هرگز در production) و در دیتابیس فقط sha256 آن ذخیره می‌شود.
//   • کلید API هرگز لاگ نمی‌شود؛ خطاها فقط به‌صورت پیام کوتاه ثبت می‌شوند.
// ---------------------------------------------------------------------------

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

export interface MailResult {
  /** آیا واقعاً ارسال شد (false = فقط لاگ شد چون ارائه‌دهنده تنظیم نشده) */
  sent: boolean
  provider: 'resend' | 'console'
}

/** آیا حالت «توسعهٔ بدون ارائه‌دهنده» فعال است؟ (فقط لوکال — هرگز production) */
export function isDevMailPreview(): boolean {
  return (
    !(process.env.RESEND_API_KEY ?? '').trim() && process.env.NODE_ENV !== 'production'
  )
}

function brandHtml(code: string, minutes: number): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f4ec;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4ec;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;border:1px solid #e4e0d0;overflow:hidden;">
        <tr><td style="background:#dfe8d8;padding:28px 32px;">
          <h1 style="margin:0;font-size:22px;color:#4a3f2e;">🧧 Chinese Toon</h1>
          <p style="margin:6px 0 0;font-size:13px;color:#6d6250;">Password reset verification code</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;font-size:15px;color:#4a3f2e;line-height:1.6;">
            Hello,<br/>
            We received a request to reset the password for your Chinese Toon account.
            Enter this verification code on the reset page to choose a new password:
          </p>
          <p style="margin:24px 0;text-align:center;">
            <span style="display:inline-block;background:#f0f4ea;border:1px solid #d8e2cc;border-radius:16px;padding:18px 32px;font-size:38px;font-weight:bold;letter-spacing:12px;color:#3d331f;font-family:'Courier New',monospace;">${code}</span>
          </p>
          <p style="margin:0 0 8px;font-size:13px;color:#6d6250;">
            ⏱️ This code expires in <strong>${minutes} minutes</strong> and can be used only <strong>once</strong>.
          </p>
          <p style="margin:0;font-size:13px;color:#6d6250;line-height:1.6;">
            🔒 Didn't request this? You can safely ignore this email — your password will stay unchanged.
            Never share this code with anyone.
          </p>
        </td></tr>
        <tr><td style="background:#faf8f0;padding:16px 32px;border-top:1px solid #eee9da;">
          <p style="margin:0;font-size:11px;color:#a39a86;">
            Chinese Toon — Professional Mandarin Chinese Learning · This is an automated message, please do not reply.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

function brandText(code: string, minutes: number): string {
  return [
    'Chinese Toon — Password Reset Verification Code',
    '',
    'We received a request to reset the password for your account.',
    'Your verification code is: ' + code,
    '',
    'Enter it on the reset page within ' + minutes + ' minutes. The code can be used only once.',
    "Didn't request this? You can safely ignore this email — your password will stay unchanged.",
    'Never share this code with anyone.',
  ].join('\n')
}

/**
 * ارسال ایمیل «کد تأیید بازیابی رمز عبور».
 * با RESEND_API_KEY واقعاً ارسال می‌شود؛ بدون آن فقط در کنسول سرور لاگ می‌شود
 * (توسعه/سندباکس). پاسخ API به کاربر هرگز بسته به نتیجهٔ این تابع تغییر نمی‌کند
 * (ضد افشای وجود/عدم‌وجود حساب).
 */
export async function sendPasswordResetCode(
  to: string,
  code: string,
  minutes: number
): Promise<MailResult> {
  const apiKey = (process.env.RESEND_API_KEY ?? '').trim()
  const from = (process.env.MAIL_FROM ?? '').trim() || 'Chinese Toon <onboarding@resend.dev>'

  if (!apiKey) {
    // بدون ارائه‌دهنده — فقط لاگ سروری (سندباکس/توسعه). کد خام فقط اینجاست.
    console.log(
      `[mail] RESEND_API_KEY not configured — password reset code for ${to} (console-only delivery):\n  code: ${code}`
    )
    return { sent: false, provider: 'console' }
  }

  try {
    const body = JSON.stringify({
      from,
      to: [to],
      subject: `Your Chinese Toon verification code: ${code}`,
      html: brandHtml(code, minutes),
      text: brandText(code, minutes),
    })

    // یک تلاش دوباره فقط برای خطاهای گذرا (تایم‌اوت/شبکه) — خطای پاسخِ
    // ارائه‌دهنده (۴xx/۵xx مثل کلید نامعتبر) retry نمی‌شود چون قطعی است.
    let lastError = ''
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await fetch(RESEND_ENDPOINT, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body,
          signal: AbortSignal.timeout(10_000),
        })
        if (res.ok) return { sent: true, provider: 'resend' }
        // هیچ‌وقت کلید یا بدنهٔ کامل پاسخ (که ممکن است sensitive باشد) لاگ نمی‌شود
        console.error(`[mail] provider rejected the send (status ${res.status})`)
        return { sent: false, provider: 'resend' }
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e)
        if (attempt < 2) await new Promise((r) => setTimeout(r, 1500))
      }
    }
    console.error('[mail] provider request failed:', lastError)
    return { sent: false, provider: 'resend' }
  } catch (e) {
    console.error('[mail] could not build/send the email:', e instanceof Error ? e.message : e)
    return { sent: false, provider: 'resend' }
  }
}
