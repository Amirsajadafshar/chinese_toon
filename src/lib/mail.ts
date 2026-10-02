// ---------------------------------------------------------------------------
// ✉️ زیرساخت ایمیل سایت — فاز ۴۰ (بازیابی رمز عبور)
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
//   • رمز عبور هرگز در ایمیل/لاگ/پاسخ نمی‌رود — فقط لینک یک‌بارمصرف ۶۰ دقیقه‌ای.
//   • کلید API هرگز لاگ نمی‌شود؛ خطاها فقط به‌صورت پیام کوتاه ثبت می‌شوند.
// ---------------------------------------------------------------------------

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

export interface MailResult {
  /** آیا واقعاً ارسال شد (false = فقط لاگ شد چون ارائه‌دهنده تنظیم نشده) */
  sent: boolean
  provider: 'resend' | 'console'
}

function brandHtml(resetUrl: string, minutes: number): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f4ec;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4ec;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;border:1px solid #e4e0d0;overflow:hidden;">
        <tr><td style="background:#dfe8d8;padding:28px 32px;">
          <h1 style="margin:0;font-size:22px;color:#4a3f2e;">🧧 Chinese Toon</h1>
          <p style="margin:6px 0 0;font-size:13px;color:#6d6250;">Reset your password</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;font-size:15px;color:#4a3f2e;line-height:1.6;">
            Hello,<br/>
            We received a request to reset the password for your Chinese Toon account.
            Click the button below to choose a new password:
          </p>
          <p style="margin:24px 0;text-align:center;">
            <a href="${resetUrl}" style="display:inline-block;background:#b8cf9f;color:#3d331f;text-decoration:none;font-weight:bold;font-size:15px;padding:14px 28px;border-radius:999px;">
              Reset Password
            </a>
          </p>
          <p style="margin:0 0 12px;font-size:13px;color:#6d6250;line-height:1.6;">
            Or copy this link into your browser:<br/>
            <span style="color:#8a7f68;word-break:break-all;">${resetUrl}</span>
          </p>
          <p style="margin:0 0 8px;font-size:13px;color:#6d6250;">
            ⏱️ This link expires in <strong>${minutes} minutes</strong> and can be used only <strong>once</strong>.
          </p>
          <p style="margin:0;font-size:13px;color:#6d6250;line-height:1.6;">
            🔒 Didn't request this? You can safely ignore this email — your password will stay unchanged.
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

function brandText(resetUrl: string, minutes: number): string {
  return [
    'Chinese Toon — Password Reset',
    '',
    'We received a request to reset the password for your account.',
    'Open this one-time link (valid for ' + minutes + ' minutes) to choose a new password:',
    resetUrl,
    '',
    "Didn't request this? You can safely ignore this email — your password will stay unchanged.",
  ].join('\n')
}

/**
 * ارسال ایمیل «بازیابی رمز عبور».
 * با RESEND_API_KEY واقعاً ارسال می‌شود؛ بدون آن فقط در کنسول سرور لاگ می‌شود
 * (توسعه/سندباکس). پاسخ API به کاربر هرگز بسته به نتیجهٔ این تابع تغییر نمی‌کند
 * (ضد افشای وجود/عدم‌وجود حساب).
 */
export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
  minutes: number
): Promise<MailResult> {
  const apiKey = (process.env.RESEND_API_KEY ?? '').trim()
  const from = (process.env.MAIL_FROM ?? '').trim() || 'Chinese Toon <onboarding@resend.dev>'

  if (!apiKey) {
    // بدون ارائه‌دهنده — فقط لاگ سروری (سندباکس/توسعه). توکن خام فقط اینجاست.
    console.log(
      `[mail] RESEND_API_KEY not configured — password reset link for ${to} (console-only delivery):\n${resetUrl}`
    )
    return { sent: false, provider: 'console' }
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: 'Reset your Chinese Toon password',
        html: brandHtml(resetUrl, minutes),
        text: brandText(resetUrl, minutes),
      }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) {
      // هیچ‌وقت کلید یا بدنهٔ کامل پاسخ (که ممکن است sensitive باشد) لاگ نمی‌شود
      console.error(`[mail] provider rejected the send (status ${res.status})`)
      return { sent: false, provider: 'resend' }
    }
    return { sent: true, provider: 'resend' }
  } catch (e) {
    console.error('[mail] provider request failed:', e instanceof Error ? e.message : e)
    return { sent: false, provider: 'resend' }
  }
}
