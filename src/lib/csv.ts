// ---------------------------------------------------------------------------
// 📄 خروجی CSV — ساخت امن فایل CSV سمت سرور (فاز ۵۳ — بند ۱۱)
//
// امنیت:
//  • محافظت CSV-injection: سلول‌هایی که با = + - @ شروع می‌شوند با «'» پیشوند
//    می‌گیرند تا در Excel/LibreOffice به‌عنوان فرمول اجرا نشوند
//  • کوتیشن‌گذاری استاندارد RFC 4180 — بدون نشت فرمت
// ---------------------------------------------------------------------------

/** پیشوند امن برای سلول‌های خطرناک + تبدیل امن به رشته */
function safeCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  let s: string
  if (value instanceof Date) s = value.toISOString()
  else s = String(value)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return s
}

export function toCsv(headers: string[], rows: Array<Array<unknown>>): string {
  const esc = (cell: string): string => {
    if (/[",\n\r]/.test(cell)) return `"${cell.replace(/"/g, '""')}"`
    return cell
  }
  const lines: string[] = [headers.map((h) => esc(safeCell(h))).join(',')]
  for (const row of rows) {
    lines.push(row.map((c) => esc(safeCell(c))).join(','))
  }
  // BOM تا Excel متن UTF-8 (مثل نام‌های غیرانگلیسی) را درست نشان دهد
  return '\uFEFF' + lines.join('\r\n') + '\r\n'
}

/** Content-Disposition امن — فقط حروف/عدد/خط‌تیره در نام فایل */
export function safeFilename(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]/g, '-').slice(0, 80)
}
