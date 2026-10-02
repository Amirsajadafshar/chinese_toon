'use client'

// ---------------------------------------------------------------------------
// 💳 کارت تنظیمات پرداخت دستی — شماره کارت بانکی + راهنمای واریز (فاز ۵۹)
//
// • GET/PUT /api/payment-settings با هدر x-admin-key
// • تنظیمات در دیتابیس ذخیره می‌شود؛ کش سمت سرور با هر ذخیره بی‌اعتبار می‌شود
//   و مشتری بلافاصله کارتِ جدید را در صفحهٔ پرداخت می‌بیند.
// • شمارهٔ کارت هنگام تایپ خودکار چهاررقمی گروه‌بندی می‌شود (dir=ltr).
// ---------------------------------------------------------------------------

import { useEffect, useState } from 'react'
import { CreditCard, Loader2, Landmark } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { siteContent } from '@/content/site-content'

const a = siteContent.admin

export interface BankSettingsState {
  enabled: boolean
  cardNumber: string
  cardHolder: string
  bankName: string
  instructions: string
  ready?: boolean
  updatedAt?: string
}

const inputCls =
  'w-full bg-white border border-sage-light/40 rounded-xl px-3.5 py-2.5 text-sm text-brown-dark placeholder:text-brown-light/60 focus:outline-none focus:ring-2 focus:ring-sage/40 focus:border-sage transition-colors'

// گروه‌بندی رقم‌های شمارهٔ کارت چهاربه‌چهار (حداکثر ۲۳ رقم — اعتبارسنجی سمت سرور)
function groupCardDigits(v: string): string {
  const digits = v.replace(/\D/g, '').slice(0, 23)
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ')
}

export function PaymentSettingsCard({
  token,
  settings,
  onSaved,
  onToast,
}: {
  token: string
  settings: BankSettingsState | null
  onSaved: (s: BankSettingsState) => void
  onToast?: (m: string) => void
}) {
  const [enabled, setEnabled] = useState(settings?.enabled ?? false)
  const [cardNumber, setCardNumber] = useState(settings?.cardNumber ?? '')
  const [cardHolder, setCardHolder] = useState(settings?.cardHolder ?? '')
  const [bankName, setBankName] = useState(settings?.bankName ?? '')
  const [instructions, setInstructions] = useState(settings?.instructions ?? '')
  const [busy, setBusy] = useState(false)
  const [topError, setTopError] = useState('')

  // هم‌گام‌سازی فرم با تنظیمات ذخیره‌شده (بعد از هر ذخیره/بارگذاری مجدد صفحه)
  useEffect(() => {
    setEnabled(settings?.enabled ?? false)
    setCardNumber(settings?.cardNumber ?? '')
    setCardHolder(settings?.cardHolder ?? '')
    setBankName(settings?.bankName ?? '')
    setInstructions(settings?.instructions ?? '')
  }, [settings])

  const save = async () => {
    if (busy) return
    setBusy(true)
    setTopError('')
    try {
      const res = await fetch('/api/payment-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': token },
        body: JSON.stringify({
          enabled,
          cardNumber: cardNumber.trim(),
          cardHolder: cardHolder.trim(),
          bankName: bankName.trim(),
          instructions: instructions.trim(),
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; settings?: BankSettingsState; error?: string }
      if (!res.ok || !data.settings) {
        setTopError(data.error || a.paySettingsError)
        onToast?.(data.error || a.paySettingsError)
        return
      }
      onSaved(data.settings)
      onToast?.(a.paySettingsSaved)
    } catch {
      setTopError(a.paySettingsError)
      onToast?.(a.paySettingsError)
    } finally {
      setBusy(false)
    }
  }

  const savedEnabled = settings?.enabled ?? false
  const savedCard = settings?.cardNumber ?? ''

  return (
    <section className="bg-white rounded-2xl border border-sage-light/25 p-6 mb-6" aria-label={a.paySettingsTitle}>
      {/* سرصفحه */}
      <div className="flex flex-wrap items-center gap-3 mb-2">
        <span className="w-9 h-9 rounded-xl bg-sage-light/30 flex items-center justify-center flex-shrink-0">
          <CreditCard className="w-4.5 h-4.5 text-sage-dark" aria-hidden="true" />
        </span>
        <h3 className="text-base font-bold text-brown-dark">{a.paySettingsTitle}</h3>
        {savedEnabled ? (
          <span className="text-[10px] font-bold bg-sage text-brown-dark px-2.5 py-1 rounded-full">ON</span>
        ) : (
          <span className="text-[10px] font-bold bg-neutral-200 text-neutral-600 px-2.5 py-1 rounded-full">OFF</span>
        )}
      </div>
      <p className="text-xs text-brown-light leading-relaxed mb-4">{a.paySettingsDesc}</p>

      {/* بنر وضعیت فعلی (بر اساس تنظیمات ذخیره‌شده، نه پیش‌نویس فرم) */}
      {savedEnabled ? (
        <div className="bg-sage-light/25 border border-sage/40 text-sage-dark text-xs font-semibold rounded-xl px-4 py-3 mb-4" role="status">
          {a.paySettingsEnabledNote}
        </div>
      ) : (
        <div className="bg-butter/30 border border-peach/40 text-brown-dark text-xs font-semibold rounded-xl px-4 py-3 mb-4" role="alert">
          {a.paySettingsDisabledNote}
        </div>
      )}

      {/* فرم */}
      <div className="grid gap-4">
        {/* سوییچ فعال‌سازی */}
        <div className="flex items-center justify-between bg-cream rounded-xl px-4 py-3">
          <div>
            <p className="text-xs font-bold text-brown-dark">{a.paySettingsEnable}</p>
            <p className="text-[11px] text-brown-light mt-0.5 leading-relaxed">
              {savedEnabled ? a.paySettingsEnabledNote : a.paySettingsDisabledNote}
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} aria-label={a.paySettingsEnable} />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="pay-card-number" className="block text-xs font-bold text-brown-dark mb-1.5">
              {a.paySettingsCardNumber}
            </label>
            <input
              id="pay-card-number"
              type="text"
              inputMode="numeric"
              dir="ltr"
              value={cardNumber}
              onChange={(e) => setCardNumber(groupCardDigits(e.target.value))}
              placeholder={a.paySettingsCardPlaceholder}
              autoComplete="off"
              spellCheck={false}
              className={`${inputCls} font-mono tracking-wider`}
            />
          </div>
          <div>
            <label htmlFor="pay-card-holder" className="block text-xs font-bold text-brown-dark mb-1.5">
              {a.paySettingsCardHolder}
            </label>
            <input
              id="pay-card-holder"
              type="text"
              dir="ltr"
              value={cardHolder}
              onChange={(e) => setCardHolder(e.target.value)}
              placeholder={a.paySettingsCardHolderPlaceholder}
              autoComplete="off"
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label htmlFor="pay-bank" className="block text-xs font-bold text-brown-dark mb-1.5">
            {a.paySettingsBank}
          </label>
          <input
            id="pay-bank"
            type="text"
            dir="ltr"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            placeholder={a.paySettingsBankPlaceholder}
            autoComplete="off"
            className={inputCls}
          />
        </div>

        <div>
          <label htmlFor="pay-instructions" className="block text-xs font-bold text-brown-dark mb-1.5">
            {a.paySettingsInstructions}
          </label>
          <textarea
            id="pay-instructions"
            rows={3}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder={a.paySettingsInstructionsPlaceholder}
            className={`${inputCls} resize-none`}
          />
        </div>
      </div>

      {topError && (
        <p role="alert" className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5 mt-3 leading-relaxed">
          {topError}
        </p>
      )}

      {/* خلاصهٔ چیزی که مشتری الان می‌بیند */}
      {savedEnabled && savedCard !== '' && (
        <div className="bg-cream/70 border border-sage-light/25 rounded-xl px-4 py-3.5 mt-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-brown-light mb-2">{a.paySettingsCurrent}</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
            <span className="font-mono font-bold text-brown-dark tracking-wider" dir="ltr">
              {groupCardDigits(savedCard)}
            </span>
            {(settings?.cardHolder ?? '') !== '' && (
              <span className="text-xs text-brown font-semibold inline-flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-sage-dark" aria-hidden="true" />
                {settings?.cardHolder}
              </span>
            )}
            {(settings?.bankName ?? '') !== '' && (
              <span className="text-xs text-brown font-semibold inline-flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5 text-sage-dark" aria-hidden="true" />
                {settings?.bankName}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ذخیره + زمان آخرین به‌روزرسانی */}
      <div className="flex flex-wrap items-center gap-3 mt-4">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="bg-sage text-brown-dark px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-sage-dark transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2 min-h-[44px]"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
          {busy ? a.paySettingsSaving : a.paySettingsSave}
        </button>
        {settings?.updatedAt && (
          <span className="text-[11px] text-brown-light">
            {a.paySettingsLastUpdated}: {new Date(settings.updatedAt).toLocaleString()}
          </span>
        )}
      </div>
    </section>
  )
}
