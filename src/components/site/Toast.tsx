'use client'

import { CheckCircle2 } from 'lucide-react'

interface ToastProps {
  message: string
  show: boolean
}

export function Toast({ message, show }: ToastProps) {
  return (
    <div
      className={`ct-toast bg-white rounded-2xl shadow-xl px-6 py-4 flex items-center gap-3 max-w-sm ${
        show ? 'show' : ''
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="w-8 h-8 bg-sage rounded-full flex items-center justify-center flex-shrink-0">
        <CheckCircle2 className="w-[18px] h-[18px] text-brown-dark" />
      </div>
      <p className="text-sm text-brown font-medium">{message}</p>
    </div>
  )
}
