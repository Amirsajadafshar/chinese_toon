'use client'

// ---------------------------------------------------------------------------
// 🧪 تسک ۸۲ — پنل تلاش‌های آزمون تعیین سطح (سرنخ‌ها) در تب Quiz ادمین
// فهرست ۲۰۰ تلاش آخر + ایمیل ثبت‌شده + باند و نمرهٔ سمت سرور.
// صادقانه: حالت‌های لودینگ/خطا/خالی واقعی — بدون دادهٔ قلابی.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, ListChecks, Loader2, RefreshCw } from 'lucide-react'

interface QuizAttemptRow {
  id: string
  score: number
  maxScore: number
  band: string
  email: string | null
  createdAt: string
}

const BAND_STYLES: Record<string, string> = {
  beginner: 'bg-butter/40 text-brown',
  elementary: 'bg-sage-light/40 text-sage-dark',
  intermediate: 'bg-peach/40 text-brown-dark',
}

const BAND_LABELS: Record<string, string> = {
  beginner: 'Beginner',
  elementary: 'Elementary',
  intermediate: 'Intermediate',
}

export function QuizLeadsPanel({ token }: { token: string | null }) {
  const [attempts, setAttempts] = useState<QuizAttemptRow[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const load = useCallback(() => {
    if (!token) return
    fetch('/api/learn/quiz/attempts', { headers: { 'x-admin-key': token }, cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then((data) => {
        setAttempts(Array.isArray(data.attempts) ? data.attempts : [])
        setFailed(false)
        setLoading(false)
      })
      .catch(() => {
        setFailed(true)
        setLoading(false)
      })
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  // بازخوانی دستی — setState در event handler مجاز است
  const refresh = () => {
    setLoading(true)
    load()
  }

  const withEmail = attempts.filter((a) => a.email).length

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-bold text-brown-dark flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-sage-dark" aria-hidden="true" />
            Placement Test Results
          </h3>
          <p className="text-xs text-brown-light mt-0.5">
            {attempts.length} attempt{attempts.length === 1 ? '' : 's'} · {withEmail} with email · newest first
          </p>
        </div>
        <button
          onClick={refresh}
          className="bg-white border border-sage-light/40 text-brown px-3.5 py-2 rounded-xl text-xs font-medium hover:border-sage transition-all cursor-pointer inline-flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5 text-sage-dark" aria-hidden="true" />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 bg-white rounded-2xl border border-sage-light/20" aria-busy="true">
          <Loader2 className="w-6 h-6 mx-auto text-sage-dark animate-spin" aria-hidden="true" />
          <p className="text-xs text-brown-light mt-2">Loading…</p>
        </div>
      ) : failed ? (
        <div className="text-center py-10 bg-white rounded-2xl border border-sage-light/20">
          <AlertCircle className="w-6 h-6 mx-auto text-peach" aria-hidden="true" />
          <p className="text-xs text-brown-light mt-2 mb-3">Couldn&apos;t load results — check your connection.</p>
          <button
            onClick={refresh}
            className="bg-sage-light/30 text-brown-dark px-4 py-2 rounded-full text-xs font-semibold hover:bg-sage-light/50 transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : attempts.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-sage-light/50">
          <ListChecks className="w-8 h-8 mx-auto mb-2 text-brown-light/50" aria-hidden="true" />
          <p className="text-xs text-brown-light">No test attempts yet — they will appear here as soon as someone finishes the quiz.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {attempts.map((at) => (
            <div
              key={at.id}
              className="bg-white rounded-xl border border-sage-light/20 px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 hover:border-sage/40 transition-colors"
            >
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                  BAND_STYLES[at.band] ?? 'bg-cream text-brown'
                }`}
              >
                {BAND_LABELS[at.band] ?? at.band}
              </span>
              <span className="text-xs font-bold text-brown-dark tabular-nums">
                {at.score}/{at.maxScore}
              </span>
              <span className="text-xs text-brown-light truncate flex-1 min-w-[140px]">
                {at.email ?? <span className="italic opacity-60">no email</span>}
              </span>
              <time className="text-[11px] text-brown-light/80 tabular-nums" dateTime={at.createdAt}>
                {new Date(at.createdAt).toLocaleString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </time>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
