'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Award,
  BookOpenText,
  GraduationCap,
  Headphones,
  Info,
  Mic2,
  PlayCircle,
  ScrollText,
  Sparkles,
  Volume2,
  X,
} from 'lucide-react'
import { siteContent, PageKey } from '@/content/site-content'

const tm = siteContent.about.teachers.modal

// ---------------------------------------------------------------------
//  👩‍🏫 مودال پروفایل استاد — با کلیک روی «Resume & Teaching Samples»
//  شامل: رزومهٔ کامل + گواهینامه‌ها + نمونه‌های تدریس (ویدیو/صدا/متن/دیالوگ)
//  دیالوگ‌ها دکمهٔ پخش تلفظ (صدای چینی دستگاه) دارند — همان الگوی LessonModal
//  با Esc یا کلیک روی پس‌زمینه بسته می‌شود؛ جلوی اسکرول پس‌زمینه هم گرفته می‌شود
// ---------------------------------------------------------------------

export interface TeacherSample {
  kind: 'video' | 'audio' | 'text' | 'dialog'
  title: string
  url?: string // فقط برای video/audio — در تب جدید باز می‌شود (CSP اجازهٔ iframe خارجی نمی‌دهد)
  desc: string
}

export interface TeacherProfile {
  name: string
  role: string
  bio: string
  tag: string
  langs: string[]
  image: string | null
  resume: string
  experienceYears: number
  studentsTaught: number
  certificates: string[]
  samples: TeacherSample[]
}

// خطوط دیالوگ در پنل ادمین با فرمت «汉字 | pinyin | معنی» در هر خط وارد می‌شوند
function parseDialogLines(desc: string): { zh: string; py: string; fa: string }[] {
  return desc
    .split('\n')
    .map((line) => line.split('|').map((s) => s.trim()))
    .filter((parts) => parts.length >= 2 && parts[0])
    .map((parts) => ({ zh: parts[0], py: parts[1] ?? '', fa: parts[2] ?? '' }))
}

function SampleIcon({ kind }: { kind: TeacherSample['kind'] }) {
  const cls = 'w-5 h-5'
  if (kind === 'video') return <PlayCircle className={cls} aria-hidden="true" />
  if (kind === 'audio') return <Headphones className={cls} aria-hidden="true" />
  if (kind === 'dialog') return <Mic2 className={cls} aria-hidden="true" />
  return <BookOpenText className={cls} aria-hidden="true" />
}

export function TeacherProfileModal({
  teacher,
  onClose,
  onNavigate,
}: {
  teacher: TeacherProfile
  onClose: () => void
  onNavigate: (page: PageKey) => void
}) {
  // 🔊 پخش تلفظ خطوط دیالوگ با صدای چینی دستگاه
  const [speaking, setSpeaking] = useState<string | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  const speak = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'zh-CN'
    u.rate = 0.85
    u.onstart = () => setSpeaking(text)
    u.onend = () => setSpeaking(null)
    u.onerror = () => setSpeaking(null)
    window.speechSynthesis.speak(u)
  }

  // بستن با Esc + فوکوس روی دکمهٔ بستن + قفل اسکرول پس‌زمینه
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
    }
  }, [onClose])

  const resumeParagraphs = teacher.resume
    .split('\n')
    .map((p) => p.trim())
    .filter(Boolean)

  const hasSamples = teacher.samples.length > 0
  const hasStats = teacher.experienceYears > 0 || teacher.studentsTaught > 0

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`${teacher.name} — ${tm.badge}`}
    >
      {/* پس‌زمینهٔ تار — کلیک = بستن */}
      <button
        aria-label={tm.close}
        onClick={onClose}
        className="absolute inset-0 bg-brown-dark/40 backdrop-blur-sm cursor-pointer"
        tabIndex={-1}
      />

      {/* کارت پروفایل */}
      <div className="relative bg-cream w-full sm:max-w-2xl max-h-[88vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl animate-ct-pop ct-scrollbar">
        {/* نوار گرادیانی برند */}
        <div className="h-2.5 bg-gradient-to-r from-sage via-butter to-peach sticky top-0 z-10" aria-hidden="true" />

        <div className="p-6 md:p-8">
          {/* سربرگ + دکمهٔ بستن */}
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex items-start gap-4 min-w-0">
              {/* آواتار — عکس یا گرادیان برند */}
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-sage-light/50 via-butter/40 to-peach-light/50 ring-4 ring-white/70 flex items-center justify-center">
                {teacher.image ? (
                  <img
                    src={teacher.image}
                    alt={teacher.name}
                    className="w-full h-full object-cover object-top"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                ) : (
                  <Sparkles className="w-8 h-8 text-sage-dark/60" aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1.5 bg-sage-light/30 rounded-full px-3 py-1 mb-2 text-[11px] font-semibold uppercase tracking-widest text-sage-dark">
                  <GraduationCap className="w-3.5 h-3.5" aria-hidden="true" /> {tm.badge}
                </span>
                <h2 className="text-2xl md:text-3xl font-bold text-brown-dark leading-snug truncate">
                  {teacher.name}
                </h2>
                <p className="text-sm text-sage-dark font-semibold mt-1">{teacher.role}</p>
                {teacher.tag && (
                  <span className="inline-block mt-2 bg-white border border-sage-light/40 text-sage-dark text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                    {teacher.tag}
                  </span>
                )}
              </div>
            </div>
            <button
              ref={closeRef}
              onClick={onClose}
              aria-label={tm.close}
              className="w-10 h-10 flex-shrink-0 rounded-xl bg-white border border-sage-light/40 text-brown flex items-center justify-center hover:border-sage hover:text-sage-dark transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* آمار سابقه و دانش‌پذیران */}
          {hasStats && (
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-white rounded-2xl border border-sage-light/20 p-4 text-center">
                <p className="text-2xl font-bold text-brown-dark">{teacher.experienceYears}</p>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-brown-light mt-0.5">
                  {tm.experience}
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-sage-light/20 p-4 text-center">
                <p className="text-2xl font-bold text-brown-dark">{teacher.studentsTaught.toLocaleString()}</p>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-brown-light mt-0.5">
                  {tm.students}
                </p>
              </div>
            </div>
          )}

          {/* رزومهٔ کامل */}
          <h3 className="text-xs font-bold uppercase tracking-widest text-sage-dark mb-3 inline-flex items-center gap-1.5">
            <ScrollText className="w-4 h-4" aria-hidden="true" /> {tm.resumeTitle}
          </h3>
          {resumeParagraphs.length > 0 ? (
            <div className="bg-white rounded-2xl border border-sage-light/20 p-5 mb-6 space-y-3">
              {resumeParagraphs.map((p, i) => (
                <p key={i} className="text-sm text-brown leading-relaxed">
                  {p}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-sm text-brown-light italic mb-6">{tm.resumeEmpty}</p>
          )}

          {/* گواهینامه‌ها */}
          {teacher.certificates.length > 0 && (
            <>
              <h3 className="text-xs font-bold uppercase tracking-widest text-sage-dark mb-3 inline-flex items-center gap-1.5">
                <Award className="w-4 h-4" aria-hidden="true" /> {tm.certsTitle}
              </h3>
              <ul className="grid sm:grid-cols-2 gap-2 mb-6">
                {teacher.certificates.map((cert, i) => (
                  <li
                    key={i}
                    className="bg-white rounded-xl border border-sage-light/20 px-3.5 py-2.5 text-xs text-brown font-medium flex items-start gap-2"
                  >
                    <Award className="w-3.5 h-3.5 text-butter flex-shrink-0 mt-0.5" aria-hidden="true" />
                    {cert}
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* نمونه‌های تدریس */}
          <h3 className="text-xs font-bold uppercase tracking-widest text-sage-dark mb-3 inline-flex items-center gap-1.5">
            <PlayCircle className="w-4 h-4" aria-hidden="true" /> {tm.samplesTitle}
          </h3>
          {!hasSamples && <p className="text-sm text-brown-light italic mb-6">{tm.samplesEmpty}</p>}
          <div className="space-y-3 mb-6">
            {teacher.samples.map((sample, i) => {
              // ویدیو / صدا → کارت لینک (چون CSP اجازهٔ iframe خارجی نمی‌دهد، در تب جدید باز می‌شود)
              if (sample.kind === 'video' || sample.kind === 'audio') {
                const label = sample.kind === 'video' ? tm.watchVideo : tm.listenAudio
                return (
                  <a
                    key={i}
                    href={sample.url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-white rounded-2xl border border-sage-light/20 p-4 hover:border-sage transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-11 h-11 rounded-full bg-gradient-to-br from-sage-light/60 via-butter/50 to-peach-light/60 flex items-center justify-center flex-shrink-0 text-brown-dark group-hover:scale-105 transition-transform">
                        <SampleIcon kind={sample.kind} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-brown-dark">{sample.title}</span>
                        <span className="block text-xs text-sage-dark font-semibold mt-0.5">{label} ↗</span>
                      </span>
                    </div>
                  </a>
                )
              }

              // متن → کارت توضیحی ساده
              if (sample.kind === 'text') {
                return (
                  <div key={i} className="bg-white rounded-2xl border border-sage-light/20 p-4">
                    <p className="text-sm font-bold text-brown-dark mb-1.5 flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-cream text-sage-dark flex items-center justify-center flex-shrink-0">
                        <SampleIcon kind={sample.kind} />
                      </span>
                      {sample.title}
                    </p>
                    <p className="text-xs text-brown-light leading-relaxed">{sample.desc}</p>
                  </div>
                )
              }

              // دیالوگ → مینی‌درس با دکمهٔ تلفظ هر خط
              const lines = parseDialogLines(sample.desc)
              return (
                <div key={i} className="bg-white rounded-2xl border border-sage-light/20 p-4">
                  <p className="text-sm font-bold text-brown-dark mb-1 flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-cream text-sage-dark flex items-center justify-center flex-shrink-0">
                      <SampleIcon kind={sample.kind} />
                    </span>
                    {sample.title}
                  </p>
                  <p className="text-[11px] text-brown-light mb-3 ml-9 inline-flex items-center gap-1">
                    <Info className="w-3 h-3" aria-hidden="true" /> {tm.dialogNote}
                  </p>
                  <ul className="space-y-2">
                    {lines.map((line) => (
                      <li
                        key={line.zh}
                        className="bg-cream rounded-xl px-3.5 py-2.5 flex items-center gap-3 hover:bg-sage-light/15 transition-colors"
                      >
                        <span className="font-serif text-xl font-bold text-brown-dark flex-shrink-0 select-none">
                          {line.zh}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-semibold text-sage-dark">{line.py}</span>
                          <span className="block text-xs text-brown-light">{line.fa}</span>
                        </span>
                        <button
                          onClick={() => speak(line.zh)}
                          aria-label={`Play: ${line.fa}`}
                          className={`w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                            speaking === line.zh
                              ? 'bg-sage text-brown-dark scale-105'
                              : 'bg-white text-brown-light hover:text-sage-dark hover:bg-sage-light/20'
                          }`}
                        >
                          <Volume2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>

          {/* دعوت به ثبت‌نام */}
          <div className="bg-white/70 rounded-2xl border border-dashed border-sage/40 p-4 flex flex-col sm:flex-row items-center gap-3">
            <p className="text-xs text-brown-light flex-1 text-center sm:text-left">{tm.registerNote}</p>
            <button
              onClick={() => {
                onClose()
                onNavigate('register')
              }}
              className="bg-sage text-brown-dark px-5 py-2.5 rounded-full text-sm font-bold inline-flex items-center gap-2 hover:bg-sage-dark transition-colors cursor-pointer flex-shrink-0 min-h-[44px]"
            >
              <GraduationCap className="w-4 h-4" aria-hidden="true" /> {tm.registerCta}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
