// ---------------------------------------------------------------------------
// 🌍 فهرست مجاز منطقه‌های زمانی (فاز ۴۷)
//
// فقط شناسه‌های استاندارد IANA — هیچ متن آزاد یا آفست دستی ذخیره نمی‌شود.
// برچسب نمایشی + آفستِ زنده از Intl (پایگاه منطقهٔ زمانی مرورگر/نود) ساخته
// می‌شود؛ یعنی DST خودکار رعایت می‌شود و هیچ آفستی هاردکد نیست.
// فهرست سمت سرور اعتبارسنجی می‌شود (isValidTimezone) — مرورگر اعتماد نیست.
// ---------------------------------------------------------------------------

export interface TimezoneOption {
  tz: string // شناسهٔ IANA — چیزی که در DB ذخیره می‌شود
  city: string // برچسب دوستانه
  region: string // گروه‌بندی انتخابگر
}

/** منطقه‌های زمانی مجاز — مناطق خواسته‌شده (ایران/اندونزی/چین/روسیه/آمریکا/کره) + پوشش جهانی */
export const SUPPORTED_TIMEZONES: TimezoneOption[] = [
  // خاورمیانه / ایران
  { tz: 'Asia/Tehran', city: 'Tehran', region: 'Middle East' },
  { tz: 'Asia/Dubai', city: 'Dubai', region: 'Middle East' },
  { tz: 'Asia/Baghdad', city: 'Baghdad', region: 'Middle East' },
  { tz: 'Asia/Riyadh', city: 'Riyadh', region: 'Middle East' },
  { tz: 'Asia/Karachi', city: 'Karachi', region: 'Middle East' },
  { tz: 'Asia/Kabul', city: 'Kabul', region: 'Middle East' },
  { tz: 'Asia/Baku', city: 'Baku', region: 'Middle East' },
  { tz: 'Europe/Istanbul', city: 'Istanbul', region: 'Middle East' },
  // شرق آسیا
  { tz: 'Asia/Shanghai', city: 'China / Shanghai', region: 'East Asia' },
  { tz: 'Asia/Hong_Kong', city: 'Hong Kong', region: 'East Asia' },
  { tz: 'Asia/Taipei', city: 'Taipei', region: 'East Asia' },
  { tz: 'Asia/Seoul', city: 'South Korea / Seoul', region: 'East Asia' },
  { tz: 'Asia/Tokyo', city: 'Tokyo', region: 'East Asia' },
  { tz: 'Asia/Ulaanbaatar', city: 'Ulaanbaatar', region: 'East Asia' },
  // جنوب شرق آسیا
  { tz: 'Asia/Jakarta', city: 'Indonesia / Jakarta', region: 'Southeast Asia' },
  { tz: 'Asia/Makassar', city: 'Indonesia / Makassar', region: 'Southeast Asia' },
  { tz: 'Asia/Jayapura', city: 'Indonesia / Jayapura', region: 'Southeast Asia' },
  { tz: 'Asia/Singapore', city: 'Singapore', region: 'Southeast Asia' },
  { tz: 'Asia/Kuala_Lumpur', city: 'Kuala Lumpur', region: 'Southeast Asia' },
  { tz: 'Asia/Bangkok', city: 'Bangkok', region: 'Southeast Asia' },
  { tz: 'Asia/Ho_Chi_Minh', city: 'Ho Chi Minh City', region: 'Southeast Asia' },
  { tz: 'Asia/Manila', city: 'Manila', region: 'Southeast Asia' },
  // جنوب آسیا
  { tz: 'Asia/Kolkata', city: 'India / Kolkata', region: 'South Asia' },
  { tz: 'Asia/Dhaka', city: 'Dhaka', region: 'South Asia' },
  { tz: 'Asia/Kathmandu', city: 'Kathmandu', region: 'South Asia' },
  // آسیای مرکزی
  { tz: 'Asia/Tashkent', city: 'Tashkent', region: 'Central Asia' },
  { tz: 'Asia/Almaty', city: 'Almaty', region: 'Central Asia' },
  // روسیه
  { tz: 'Europe/Moscow', city: 'Russia / Moscow', region: 'Russia' },
  { tz: 'Europe/Samara', city: 'Russia / Samara', region: 'Russia' },
  { tz: 'Asia/Yekaterinburg', city: 'Russia / Yekaterinburg', region: 'Russia' },
  { tz: 'Asia/Novosibirsk', city: 'Russia / Novosibirsk', region: 'Russia' },
  { tz: 'Asia/Krasnoyarsk', city: 'Russia / Krasnoyarsk', region: 'Russia' },
  { tz: 'Asia/Irkutsk', city: 'Russia / Irkutsk', region: 'Russia' },
  { tz: 'Asia/Vladivostok', city: 'Russia / Vladivostok', region: 'Russia' },
  // اروپا
  { tz: 'Europe/London', city: 'London', region: 'Europe' },
  { tz: 'Europe/Paris', city: 'Paris', region: 'Europe' },
  { tz: 'Europe/Berlin', city: 'Berlin', region: 'Europe' },
  { tz: 'Europe/Rome', city: 'Rome', region: 'Europe' },
  { tz: 'Europe/Madrid', city: 'Madrid', region: 'Europe' },
  { tz: 'Europe/Amsterdam', city: 'Amsterdam', region: 'Europe' },
  { tz: 'Europe/Zurich', city: 'Zurich', region: 'Europe' },
  { tz: 'Europe/Stockholm', city: 'Stockholm', region: 'Europe' },
  { tz: 'Europe/Warsaw', city: 'Warsaw', region: 'Europe' },
  { tz: 'Europe/Kyiv', city: 'Kyiv', region: 'Europe' },
  // قارهٔ آمریکا
  { tz: 'America/New_York', city: 'US / New York', region: 'Americas' },
  { tz: 'America/Toronto', city: 'Canada / Toronto', region: 'Americas' },
  { tz: 'America/Chicago', city: 'US / Chicago', region: 'Americas' },
  { tz: 'America/Denver', city: 'US / Denver', region: 'Americas' },
  { tz: 'America/Phoenix', city: 'US / Phoenix (no DST)', region: 'Americas' },
  { tz: 'America/Los_Angeles', city: 'US / Los Angeles', region: 'Americas' },
  { tz: 'America/Vancouver', city: 'Canada / Vancouver', region: 'Americas' },
  { tz: 'America/Mexico_City', city: 'Mexico City', region: 'Americas' },
  { tz: 'America/Sao_Paulo', city: 'São Paulo', region: 'Americas' },
  { tz: 'America/Buenos_Aires', city: 'Buenos Aires', region: 'Americas' },
  // آفریقا
  { tz: 'Africa/Cairo', city: 'Cairo', region: 'Africa' },
  { tz: 'Africa/Lagos', city: 'Lagos', region: 'Africa' },
  { tz: 'Africa/Nairobi', city: 'Nairobi', region: 'Africa' },
  { tz: 'Africa/Johannesburg', city: 'Johannesburg', region: 'Africa' },
  // اقیانوسیه
  { tz: 'Australia/Sydney', city: 'Australia / Sydney', region: 'Oceania' },
  { tz: 'Australia/Melbourne', city: 'Australia / Melbourne', region: 'Oceania' },
  { tz: 'Australia/Perth', city: 'Australia / Perth', region: 'Oceania' },
  { tz: 'Pacific/Auckland', city: 'New Zealand / Auckland', region: 'Oceania' },
]

const TZ_SET = new Set(SUPPORTED_TIMEZONES.map((t) => t.tz))

/** اعتبارسنجی سمت سرور — فقط اعضای فهرست مجاز پذیرفته می‌شوند */
export function isValidTimezone(tz: string): boolean {
  return TZ_SET.has(tz)
}

/** آفست دقیقهٔ یک منطقه در یک لحظه — از Intl (پایگاه tz واقعی؛ DST خودکار) */
export function timezoneOffsetMinutes(tz: string, instant: Date = new Date()): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const p: Record<string, string> = {}
  for (const part of dtf.formatToParts(instant)) p[part.type] = part.value
  const asUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour),
    Number(p.minute),
    Number(p.second)
  )
  return Math.round((asUtc - instant.getTime()) / 60000)
}

function formatOffset(min: number): string {
  const sign = min < 0 ? '-' : '+'
  const abs = Math.abs(min)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return `UTC${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** برچسب کامل با آفست زندهٔ همین لحظه — مثل «Tehran (UTC+03:30)» (DST-aware) */
export function timezoneLabel(tz: string, instant: Date = new Date()): string {
  const opt = SUPPORTED_TIMEZONES.find((t) => t.tz === tz)
  const city = opt?.city ?? tz
  try {
    return `${city} (${formatOffset(timezoneOffsetMinutes(tz, instant))})`
  } catch {
    return city
  }
}

/** فقط شهر — برای فضاهای تنگ */
export function timezoneCity(tz: string): string {
  return SUPPORTED_TIMEZONES.find((t) => t.tz === tz)?.city ?? tz
}
