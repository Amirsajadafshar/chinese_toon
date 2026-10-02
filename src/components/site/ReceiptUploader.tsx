'use client'

// ---------------------------------------------------------------------------
// 🧾 آپلودر رسید پرداخت (فاز ۵۹)
//
// امکانات: انتخاب فایل + Drag & Drop + پیش‌نمایش تصویر + نام/حجم فایل +
// تغییر/حذف + نوار پیشرفت آپلود + خطاهای شفاف (نوع/حجم).
// اعتبارسنجی سمت کلاینت فقط «تجربهٔ کاربری» است — قاعدهٔ واقعی (magic bytes،
// سقف حجم، مالکیت، وضعیت سفارش) سمت سرور در /api/receipts اعمال می‌شود.
// آپلود با XMLHttpRequest برای نوار پیشرفت واقعی انجام می‌شود.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from 'react'
import { FileText, ImagePlus, Loader2, ShieldCheck, Trash2, UploadCloud } from 'lucide-react'
import { siteContent } from '@/content/site-content'

const p = siteContent.payments.ui

const MAX_BYTES = 5 * 1024 * 1024 // ۵MB — هماهنگ با سقف سرور
const ACCEPTED_EXT = ['jpg', 'jpeg', 'png', 'webp', 'pdf']

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface ReceiptUploaderProps {
  orderRef: string
  /** بعد از ارسال موفق — والد وضعیت سفارش را تازه می‌کند */
  onSubmitted: () => void
}

export function ReceiptUploader({ orderRef, onSubmitted }: ReceiptUploaderProps) {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const xhrRef = useRef<XMLHttpRequest | null>(null)

  // پاک‌سازی object URL پیش‌نمایش
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const pickFile = useCallback((f: File | null | undefined) => {
    setError('')
    if (!f) return
    const ext = (f.name.split('.').pop() || '').toLowerCase()
    if (!ACCEPTED_EXT.includes(ext)) {
      setError(p.fileTypeInvalid)
      return
    }
    if (f.size > MAX_BYTES) {
      setError(p.fileTooLarge)
      return
    }
    if (f.size <= 0) {
      setError(p.fileTypeInvalid)
      return
    }
    setFile(f)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(f.type.startsWith('image/') ? URL.createObjectURL(f) : null)
  }, [previewUrl])

  const clearFile = useCallback(() => {
    setFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setError('')
    setProgress(0)
    if (inputRef.current) inputRef.current.value = ''
  }, [previewUrl])

  const submit = useCallback(() => {
    if (!file || uploading) return
    setUploading(true)
    setProgress(0)
    setError('')

    const form = new FormData()
    form.append('ref', orderRef)
    form.append('file', file)

    const xhr = new XMLHttpRequest()
    xhrRef.current = xhr
    xhr.open('POST', '/api/receipts')
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      setUploading(false)
      xhrRef.current = null
      if (xhr.status >= 200 && xhr.status < 300) {
        clearFile()
        onSubmitted()
      } else {
        let msg = p.uploadFailed
        try {
          const data = JSON.parse(xhr.responseText) as { error?: string }
          if (data?.error) msg = data.error
        } catch {
          /* پیام عمومی */
        }
        setError(msg)
      }
    }
    xhr.onerror = () => {
      setUploading(false)
      xhrRef.current = null
      setError(p.uploadFailed)
    }
    xhr.send(form)
  }, [file, uploading, orderRef, onSubmitted, clearFile])

  const isPdf = file?.type === 'application/pdf' || file?.name.toLowerCase().endsWith('.pdf')

  return (
    <div className="bg-white rounded-3xl border border-sage-light/20 shadow-lg p-6 md:p-8 animate-ct-fadeInUp">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-sage-light/30 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5 text-sage-dark" />
        </div>
        <div>
          <h3 className="font-bold text-brown-dark">{p.uploadTitle}</h3>
          <p className="text-xs text-brown-light leading-relaxed">{p.uploadHint}</p>
        </div>
      </div>

      {!file ? (
        <div
          role="button"
          tabIndex={0}
          aria-label={p.uploadDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              if (!uploading) inputRef.current?.click()
            }
          }}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            if (!uploading) pickFile(e.dataTransfer.files?.[0])
          }}
          className={`mt-4 border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors min-h-[120px] flex flex-col items-center justify-center gap-2 ${
            dragOver ? 'border-sage-dark bg-sage-light/20' : 'border-sage-light/60 hover:border-sage bg-cream/40'
          }`}
        >
          <UploadCloud className="w-8 h-8 text-sage-dark" />
          <span className="text-sm font-semibold text-brown-dark">{p.uploadDrop}</span>
          <span className="text-[11px] text-brown-light">{p.uploadFormats}</span>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wider text-brown-light mb-2">{p.receiptPreviewTitle}</p>
          <div className="border border-sage-light/40 rounded-2xl p-3 bg-cream/30">
            <div className="flex items-start gap-3">
              {/* پیش‌نمایش — تصویر واقعی یا آیکن PDF */}
              <div className="w-24 h-24 rounded-xl overflow-hidden bg-white border border-sage-light/30 flex items-center justify-center shrink-0">
                {previewUrl ? (
                  <img src={previewUrl} alt={p.receiptPreviewTitle} className="w-full h-full object-cover" />
                ) : (
                  <FileText className="w-8 h-8 text-sage-dark" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-brown-dark truncate" dir="auto">{file.name}</p>
                <p className="text-xs text-brown-light mt-0.5">{formatSize(file.size)}{isPdf ? ' · PDF' : ''}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => !uploading && inputRef.current?.click()}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full border border-sage-light/60 text-brown hover:border-sage transition-colors cursor-pointer min-h-[32px]"
                  >
                    {p.changeReceipt}
                  </button>
                  <button
                    type="button"
                    onClick={() => !uploading && clearFile()}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full border border-peach/60 text-peach-dark hover:bg-peach/10 transition-colors cursor-pointer inline-flex items-center gap-1 min-h-[32px]"
                  >
                    <Trash2 className="w-3 h-3" /> {p.removeReceipt}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {uploading && (
            <div className="mt-3">
              <div className="h-2 rounded-full bg-sage-light/30 overflow-hidden">
                <div className="h-full bg-sage transition-all duration-200" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-[11px] text-brown-light mt-1 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> {p.submitting} {progress}%
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={uploading}
            className="mt-4 w-full bg-sage text-brown-dark py-3.5 rounded-2xl text-sm font-bold hover:bg-sage-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer inline-flex items-center justify-center gap-2 min-h-[48px]"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
            {uploading ? p.submitting : p.submitReceipt}
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-xs font-semibold text-peach-dark bg-peach/10 border border-peach/40 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={(e) => pickFile(e.target.files?.[0])}
      />
    </div>
  )
}
