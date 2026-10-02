'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Mail,
  RefreshCw,
  User,
  GraduationCap,
  Clock,
  Users,
  UsersRound,
  CalendarDays,
  ArrowLeft,
  Inbox,
  ShieldCheck,
  Lock,
  LogOut,
  Newspaper,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Send,
  X,
  Download,
  Copy,
  ImagePlus,
  Pencil,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  MessageSquareQuote,
  Star,
  Layers,
  ListChecks,
  UserRound,
  BookOpen,
  SlidersHorizontal,
  School,
  Check,
  Bell,
  CreditCard,
  Heart,
  HelpCircle,
  Archive,
  RotateCcw,
  TicketPercent,
  LayoutDashboard,
  DatabaseBackup,
  ScrollText,
} from 'lucide-react'
import { ClassesAdminTab } from '../admin/ClassesAdminTab'
import { FaqAdminTab, type AdminFaqItem } from '../admin/FaqAdminTab'
import { DiscountsAdminTab, type DiscountItem } from '../admin/DiscountsAdminTab'
import { SchedulingAdminTab } from '../admin/SchedulingAdminTab'
import { PaymentsAdminTab } from '../admin/PaymentsAdminTab'
import { PaymentSettingsCard, type BankSettingsState } from '../admin/PaymentSettingsCard'
import { DashboardAdminTab } from '../admin/DashboardAdminTab'
import { BackupAdminTab } from '../admin/BackupAdminTab'
import { LogsAdminTab } from '../admin/LogsAdminTab'
import { QuizLeadsPanel } from '../QuizLeadsPanel'
import { AdminGlobalSearch, type SearchTarget } from '../admin/AdminGlobalSearch'
import { ScheduleMatchesPanel, RegistrationSchedulingLines, type RegistrationRow } from '../admin/SchedulePrefsPanel'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { siteContent } from '@/content/site-content'
import { useCloseOnNavigate } from '../use-nav-close'
import { TeacherSample } from '../TeacherProfileModal'

const a = siteContent.admin

interface SupportMsg {
  id: string
  name: string
  email: string
  topic: string
  message: string
  status: string
  createdAt: string
}

interface Registration {
  id: string
  name: string
  email: string
  phone: string | null
  age: number | null
  level: string
  classType: string
  classTitle?: string | null
  schedule: string | null
  goal: string | null
  message: string | null
  status: string
  // 🗓️ ترجیحات برنامه (فاز ۴۷)
  timezone: string
  preferredDays: string
  preferredTimes: string
  daysPerWeek: number | null
  scheduleAck: boolean
  createdAt: string
}

interface Subscriber {
  id: string
  email: string
  createdAt: string
}

interface AdminPost {
  id: string
  title: string
  slug: string
  tag: string
  emoji: string
  color: string
  image: string | null
  views: number
  excerpt: string
  content: string
  published: boolean
  createdAt: string
}

interface DashStats {
  messages: { total: number; new: number; inProgress: number; resolved: number }
  registrations: { total: number; new: number; contacted: number; enrolled: number }
  subscribers: { total: number }
  posts: { total: number; published: number; totalViews: number }
  reviews?: { total: number; pending: number; approved: number }
  learn?: { cards: number; quiz: number }
}

// 👥 تب Students (فاز ۳۰) — کاربر ثبت‌نام‌شده با وضعیت خرید واقعی از سفارش‌ها
// ⚠️ passwordHash هیچ‌وقت در پاسخ API نیست و هیچ فیلدی هم در UI به آن اشاره نمی‌کند
type StudentFilter =
  | 'all'
  | 'new'
  | 'no-purchase'
  | 'unpaid'
  | 'paid'
  | 'underpaid'
  | 'expired'
  | 'cancelled'

type PurchaseStatus =
  | 'NO_PURCHASE'
  | 'UNPAID'
  | 'PAID'
  | 'UNDERPAID'
  | 'EXPIRED'
  | 'CANCELLED'

interface AdminStudent {
  id: string
  firstName: string
  lastName: string
  email: string
  country: string
  countryCode: string
  phone: string | null
  telegramUsername: string | null
  telegramId: string | null
  // 🆔 فاز ۶۰ — کد یکتای پایدار دانش‌پذیر (از DB)
  uniqueCode: string | null
  createdAt: string
  lastLoginAt: string | null
  isNew: boolean
  orderCount: number
  paidCount: number
  purchaseStatus: PurchaseStatus
  orderRefs: string[]
  activeOrder: {
    ref: string
    productTitle: string
    amountUsd: string
    status: string
    createdAt: string
    expiresAt: string
  } | null
}

interface AdminStudentsResp {
  users: AdminStudent[]
  total: number
  counts: {
    all: number
    new: number
    noPurchase: number
    unpaid: number
    paid: number
    underpaid: number
    expired: number
    cancelled: number
  }
}

interface StudentOrder {
  ref: string
  productTitle: string
  productId: string
  paymentMode: string
  paymentAddress: string
  amountUsd: string
  paidUsd: string | null
  rawStatus: string
  status: string // وضعیت واقعی — PENDING منقضی = EXPIRED
  txHash: string | null
  txFrom: string | null
  createdAt: string
  expiresAt: string
  paidAt: string | null
}

interface StudentLead {
  id: string
  name: string
  level: string
  classTitle: string | null
  classType: string
  status: string
  // 📋 فاز ۶۰ (بند ۱۸) — همهٔ داده‌های واقعاً ذخیره‌شدهٔ فرم
  archived?: boolean
  phone?: string | null
  goal?: string | null
  message?: string | null
  timezone?: string
  preferredDays?: string
  preferredTimes?: string
  daysPerWeek?: number | null
  createdAt: string
}

interface StudentDetail {
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
    country: string
    countryCode: string
    phone: string | null
    telegramUsername: string | null
    telegramId: string | null
    // 🆔 فاز ۶۰ — کد یکتا + تاریخ تولد (دادهٔ واقعی DB)
    uniqueCode: string | null
    dateOfBirth?: string | null
    createdAt: string
    lastLoginAt: string | null
  }
  orders: StudentOrder[]
  leads: StudentLead[]
}

interface AdminReview {
  id: string
  name: string
  role: string | null
  rating: number
  text: string
  status: string // pending | approved | rejected
  featured: boolean // ⭐ نظر منتخب مالک (کاروسل خانه + بخش Testimonials صفحهٔ نظرات)
  likeCount: number // ❤️ تعداد لایک — از سرور (فاز ۴۶)
  createdAt: string
}
interface AdminWord {
  id: string
  chinese: string
  pinyin: string
  meaning: string
  example: string | null
  sortOrder: number
  published: boolean
  createdAt: string
}

interface AdminQuiz {
  id: string
  question: string
  options: { text: string; score: number }[]
  sortOrder: number
  published: boolean
}

interface AdminTeacher {
  id: string
  name: string
  role: string
  bio: string
  tag: string
  langs: string
  image: string | null
  // 🆕 رزومه و نمونه‌های تدریس (samples = JSON string از دیتابیس)
  resume: string
  experienceYears: number
  studentsTaught: number
  certificates: string
  samples: string
  sortOrder: number
  published: boolean
}

interface LessonWordRow {
  chinese: string
  pinyin: string
  meaning: string
  example?: string
}

interface AdminLesson {
  id: string
  slug: string
  title: string
  text: string
  subtitle: string
  big: string
  small: string
  tag: string
  category: string
  color: string
  action: string
  isVideo: boolean
  words: LessonWordRow[]
  sortOrder: number
  published: boolean
}

interface AdminAnnouncement {
  enabled: boolean
  id: string
  emoji: string
  text: string
  ctaLabel: string
  ctaPage: string
}

interface AdminStatItem {
  value: number
  suffix: string
  label: string
}

const STORAGE_KEY = 'ct-admin-token'

const inputSoft =
  'w-full px-4 py-2.5 rounded-xl border border-sage-light/40 bg-cream/50 text-brown text-sm focus:outline-none focus:border-sage focus:ring-[3px] focus:ring-sage/20'

const cardCls =
  'bg-white rounded-2xl border border-sage-light/20 p-5 hover:border-sage/40 transition-colors'

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

// ---------------------------------------------------------------------
//  ⬇️ ساخت و دانلود فایل CSV از ردیف‌های جدول
//  با BOM ↪ پس اکسل فارسی/انگلیسی را درست باز می‌کند؛ مقادیر دارای
//  کاما/گیومه/خط جدید به‌طور امن کوتیشن می‌شوند
// ---------------------------------------------------------------------
function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => {
    const s = v == null ? '' : String(v)
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = rows.map((r) => r.map(esc).join(',')).join('\r\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

// 🏳️ پرچم ایموجی از کد ISO کشور — نسخهٔ سبک سمت مرورگر (Regional Indicator یونیکد)
function flagOf(code: string): string {
  if (!/^[A-Za-z]{2}$/.test(code)) return ''
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
}

// ✂️ نمایش وسط‌بریدهٔ هش/آدرس‌های طولانی — نسخهٔ کامل با title دیده می‌شود
function midTrunc(s: string, head = 12, tail = 6): string {
  return s.length > head + tail + 3 ? `${s.slice(0, head)}…${s.slice(-tail)}` : s
}

function NewBadge({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <span className="inline-flex items-center bg-sage text-brown-dark text-[10px] font-bold px-2 py-0.5 rounded-full">
      {a.newBadge}
    </span>
  )
}

// ---------------------------------------------------------------------
//  🔢 صفحه‌بندی لیست‌های داشبورد — وقتی آیتم‌ها زیاد شدند
//  فقط وقتی بیش از یک صفحه باشد نمایش داده می‌شود
// ---------------------------------------------------------------------
function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number
  totalPages: number
  onPage: (p: number) => void
}) {
  if (totalPages <= 1) return null
  const btnCls =
    'inline-flex items-center gap-1 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all cursor-pointer min-h-[36px] disabled:opacity-40 disabled:cursor-not-allowed'
  return (
    <nav
      className="flex items-center justify-center gap-3 pt-4 pb-1"
      aria-label="Pagination"
    >
      <button
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        className={`${btnCls} bg-white border border-sage-light/40 text-brown hover:border-sage`}
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        {a.prevPage}
      </button>
      <span
        className="text-xs font-semibold text-brown-light tabular-nums"
        aria-current="page"
      >
        {a.pageLabel} {page} {a.pageOf} {totalPages}
      </span>
      <button
        onClick={() => onPage(page + 1)}
        disabled={page >= totalPages}
        className={`${btnCls} bg-white border border-sage-light/40 text-brown hover:border-sage`}
      >
        {a.nextPage}
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </nav>
  )
}

// بَج وضعیت با رنگ هماهنگ برند
function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    new: 'bg-sage text-brown-dark',
    'in-progress': 'bg-butter text-brown',
    resolved: 'bg-sage-light/50 text-sage-dark',
    contacted: 'bg-butter text-brown',
    enrolled: 'bg-sage text-brown-dark',
  }
  const label =
    a.statusNew === undefined
      ? status
      : status === 'new'
        ? a.statusNew
        : status === 'in-progress'
          ? a.statusInProgress
          : status === 'resolved'
            ? a.statusResolved
            : status === 'contacted'
              ? a.statusContacted
              : status === 'enrolled'
                ? a.statusEnrolled
                : status
  return (
    <span
      className={`inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full ${map[status] ?? 'bg-sage-light/30 text-brown'}`}
    >
      {label}
    </span>
  )
}

// 🏷️ برچسب + رنگ بَج وضعیت خرید — هماهنگ با بَج‌های سفارش‌ها (PAID سبز، UNPAID کهربایی، UNDERPAID نارنجی، EXPIRED قرمز ملایم، بقیه خاکستری)
function purchaseStatusBadge(s: string): { label: string; cls: string } {
  switch (s) {
    case 'PAID':
      return { label: a.students.stPaid, cls: 'bg-sage text-brown-dark' }
    case 'UNPAID':
      return { label: a.students.stUnpaid, cls: 'bg-butter/50 text-brown' }
    case 'UNDERPAID':
      return { label: a.students.stUnderpaid, cls: 'bg-peach-light/60 text-brown' }
    case 'EXPIRED':
      return { label: a.students.stExpired, cls: 'bg-red-100/70 text-red-600/80' }
    case 'CANCELLED':
      return { label: a.students.stCancelled, cls: 'bg-neutral-100 text-brown-light' }
    case 'NO_PURCHASE':
      return { label: a.students.stNoPurchase, cls: 'bg-neutral-100 text-brown-light' }
    case 'PENDING':
      return { label: a.statusPending, cls: 'bg-butter/50 text-brown' }
    // 💳 فاز ۵۹ — وضعیت‌های جریان پرداخت دستی (رسید + تأیید/ردّ)
    case 'RECEIPT_SUBMITTED':
      return { label: a.statusReceiptSubmitted, cls: 'bg-sage-light/40 text-sage-dark' }
    case 'REJECTED':
      return { label: a.statusRejected, cls: 'bg-peach-light/60 text-brown' }
    default:
      return { label: s, cls: 'bg-neutral-100 text-brown-light' }
  }
}

// 👥 وضعیت خرید تجمیعیِ کاربر در دیالوگ جزئیات — همان اولویت‌بندی derivePurchaseStatus سمت سرور
//  (پاسخ جزئیات status هر سفارش را از قبل واقعی‌سازی‌شده برمی‌گرداند؛ PENDING منقضی = EXPIRED)
function detailPurchaseStatus(orders: StudentOrder[]): PurchaseStatus {
  const s = orders.map((o) => o.status)
  if (s.includes('PENDING')) return 'UNPAID'
  if (s.includes('UNDERPAID')) return 'UNDERPAID'
  if (s.includes('PAID')) return 'PAID'
  if (s.includes('EXPIRED')) return 'EXPIRED'
  if (s.includes('CANCELLED')) return 'CANCELLED'
  return 'NO_PURCHASE'
}

// گروه کوچک تغییر وضعیت (۳ دکمه)
function StatusSwitch({
  value,
  options,
  onChange,
}: {
  value: string
  options: { key: string; label: string }[]
  onChange: (key: string) => void
}) {
  return (
    <div
      className="inline-flex rounded-full border border-sage-light/40 bg-cream/60 p-0.5 gap-0.5"
      role="group"
      aria-label={a.statusLabel}
    >
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          aria-pressed={value === o.key}
          className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
            value === o.key
              ? 'bg-sage text-brown-dark shadow-sm'
              : 'text-brown-light hover:text-brown-dark'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// دکمهٔ حذف با تأیید دومرحله‌ای
function DeleteButton({ onConfirm, label }: { onConfirm: () => void; label: string }) {
  const [arm, setArm] = useState(false)
  if (!arm) {
    return (
      <button
        onClick={() => setArm(true)}
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-brown-light hover:text-red-500 transition-colors cursor-pointer px-2 py-1.5 rounded-lg hover:bg-red-50"
        aria-label={label}
      >
        <Trash2 className="w-3.5 h-3.5" />
        {label}
      </button>
    )
  }
  return (
    <span className="inline-flex items-center gap-1">
      <button
        onClick={() => {
          setArm(false)
          onConfirm()
        }}
        className="text-[11px] font-bold text-red-500 bg-red-50 px-2.5 py-1.5 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
      >
        Sure?
      </button>
      <button
        onClick={() => setArm(false)}
        className="text-[11px] font-semibold text-brown-light px-2 py-1.5 rounded-lg hover:bg-sage-light/20 transition-colors cursor-pointer"
        aria-label="Cancel delete"
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  )
}

// سلول کوچک پروفایل در دیالوگ جزئیات کاربر (برچسب + مقدار)
function ProfileCell({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-sage-light/20 px-3.5 py-2.5 min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wider text-brown-light mb-0.5">{label}</p>
      <p className={`text-sm text-brown-dark break-words ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  )
}

// بدنهٔ دیالوگ جزئیات کاربر — پروفایل + سفارش‌ها/پرداخت‌ها + درخواست‌های کلاس
// ⚠️ هیچ فیلدی مربوط به رمز عبور اینجا وجود ندارد (در API هم نیست)
function StudentDetailBody({ detail, onClose }: { detail: StudentDetail; onClose: () => void }) {
  const u = detail.user
  const pb = purchaseStatusBadge(detailPurchaseStatus(detail.orders))
  const flag = flagOf(u.countryCode)
  return (
    <div className="space-y-5">
      {/* پروفایل — همهٔ د* برچسب‌ها؛ مقدار ناموجود با — یا پیام مخصوص */}
      <div className="grid sm:grid-cols-2 gap-3">
        {/* 🆔 فاز ۶۰ — کد یکتای پایدار دانش‌پذیر (همیشه اول — شناسهٔ پایدار) */}
        <div className="bg-sage-light/25 rounded-xl border border-sage/30 px-3.5 py-2.5 sm:col-span-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-sage-dark mb-0.5">{a.students.dUniqueCode}</p>
          <p className="font-mono text-lg font-extrabold text-brown-dark tracking-wider">{u.uniqueCode ?? a.students.dNotProvided}</p>
        </div>
        <ProfileCell label={a.students.dFirstName} value={u.firstName || a.students.dNotProvided} />
        <ProfileCell label={a.students.dLastName} value={u.lastName || a.students.dNotProvided} />
        <ProfileCell label={a.students.dEmail} value={u.email} />
        <ProfileCell
          label={a.students.dTelegram}
          value={u.telegramUsername ? `@${u.telegramUsername}` : a.students.dNotProvided}
        />
        <ProfileCell
          label={a.students.dTelegramId}
          value={u.telegramId ?? a.students.dTelegramIdNone}
          mono={!!u.telegramId}
        />
        <ProfileCell
          label={a.students.dCountry}
          value={`${flag ? `${flag} ` : ''}${u.country || u.countryCode || a.students.dNotProvided}`}
        />
        <ProfileCell label={a.students.dPhone} value={u.phone ?? a.students.dNotProvided} />
        <ProfileCell
          label={a.students.dDob}
          value={(() => {
            if (!u.dateOfBirth) return a.students.dNotProvided
            // 🎂 تاریخ تولد — فقط تاریخ (بدون ساعت)، با سال
            try {
              return new Date(u.dateOfBirth).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                timeZone: 'UTC',
              })
            } catch {
              return a.students.dNotProvided
            }
          })()}
        />
        <ProfileCell label={a.students.dRegistered} value={fmtDate(u.createdAt)} />
        <ProfileCell label={a.students.dLastLogin} value={u.lastLoginAt ? fmtDate(u.lastLoginAt) : a.students.dNever} />
        {/* وضعیت خرید — بَج هماهنگ با جدول */}
        <div className="bg-white rounded-xl border border-sage-light/20 px-3.5 py-2.5 sm:col-span-2 flex flex-wrap items-center gap-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-brown-light">
            {a.students.dPurchaseStatus}
          </p>
          <span className={`inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full ${pb.cls}`}>
            {pb.label}
          </span>
        </div>
      </div>

      {/* سفارش‌ها و پرداخت‌ها — خالی = ثبت‌نام کرده اما هیچ خریدی ندارد (با جعبهٔ متفاوت برجسته می‌شود) */}
      <div>
        <p className="text-sm font-bold text-brown-dark mb-2">{a.students.dOrdersTitle}</p>
        {detail.orders.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-peach/60">
            <Inbox className="w-8 h-8 mx-auto mb-2 text-brown-light/50" />
            <p className="text-xs text-brown font-medium max-w-xs mx-auto leading-relaxed">
              {a.students.dOrdersEmpty}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {detail.orders.map((o) => {
              const ob = purchaseStatusBadge(o.status)
              return (
                <div key={o.ref} className="bg-white rounded-2xl border border-sage-light/20 p-4">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-2">
                    <span className="font-mono text-sm font-bold text-brown-dark">{o.ref}</span>
                    <span
                      className={`inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${ob.cls}`}
                    >
                      {ob.label}
                    </span>
                    <span className="text-sm text-brown font-semibold flex-1 min-w-32 truncate">{o.productTitle}</span>
                    <span className="text-sm font-bold text-sage-dark tabular-nums whitespace-nowrap">
                      ${o.amountUsd} USD
                    </span>
                  </div>
                  {o.status === 'UNDERPAID' && o.paidUsd && (
                    <p className="text-xs font-semibold text-brown bg-peach-light/50 rounded-lg px-3 py-1.5 mb-2 inline-block">
                      Paid {o.paidUsd} of {o.amountUsd} USD
                    </p>
                  )}
                  <div className="grid sm:grid-cols-3 gap-x-4 gap-y-1.5 text-[11px] text-brown-light">
                    <p>
                      <span className="font-bold text-brown">{a.students.dOrderCreated}:</span> {fmtDate(o.createdAt)}
                    </p>
                    <p>
                      <span className="font-bold text-brown">{a.students.dOrderExpires}:</span> {fmtDate(o.expiresAt)}
                    </p>
                    {o.paidAt && (
                      <p>
                        <span className="font-bold text-brown">{a.students.dOrderPaidOn}:</span> {fmtDate(o.paidAt)}
                      </p>
                    )}
                  </div>
                  <div className="mt-2 space-y-1 text-[11px] text-brown-light min-w-0">
                    <p className="truncate">
                      <span className="font-bold text-brown">{a.students.dOrderAddress}:</span>{' '}
                      <span className="font-mono" title={o.paymentAddress}>
                        {midTrunc(o.paymentAddress)}
                      </span>
                    </p>
                    {o.txHash && (
                      <p className="truncate">
                        <span className="font-bold text-brown">{a.students.dOrderTx}:</span>{' '}
                        <a
                          href={`https://tronscan.org/#/transaction/${o.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={o.txHash}
                          className="font-mono text-sage-dark hover:underline inline-flex items-center gap-1"
                        >
                          {midTrunc(o.txHash, 10, 8)}
                          <ExternalLink className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                        </a>
                      </p>
                    )}
                    {o.txFrom && (
                      <p className="truncate">
                        <span className="font-bold text-brown">{a.students.dOrderFrom}:</span>{' '}
                        <span className="font-mono" title={o.txFrom}>
                          {midTrunc(o.txFrom)}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* درخواست‌های کلاس (فرم ثبت‌نام) با همین ایمیل */}
      <div>
        <p className="text-sm font-bold text-brown-dark mb-2">{a.students.dLeadsTitle}</p>
        {detail.leads.length === 0 ? (
          <p className="text-xs text-brown-light/80">{a.students.dLeadsEmpty}</p>
        ) : (
          <div className="bg-white rounded-2xl border border-sage-light/20 overflow-hidden">
            {detail.leads.map((l, i) => (
              <div
                key={l.id}
                className={`px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs ${
                  i !== detail.leads.length - 1 ? 'border-b border-sage-light/15' : ''
                }`}
              >
                <span className="font-semibold text-brown-dark">{l.name}</span>
                <span className="text-brown-light">
                  <span className="font-bold text-brown">{a.students.dLeadLevel}:</span> {l.level}
                </span>
                <span className="text-brown-light">
                  <span className="font-bold text-brown">{a.students.dLeadClass}:</span>{' '}
                  {l.classTitle || l.classType || a.students.dNotProvided}
                </span>
                <span className="text-brown-light">
                  <span className="font-bold text-brown">{a.students.dLeadType}:</span> {l.classType}
                </span>
                <span className="ml-auto inline-flex items-center gap-2">
                  {l.archived && (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-neutral-100 text-brown-light border border-neutral-200">
                      {a.students.dLeadArchived}
                    </span>
                  )}
                  <StatusPill status={l.status} />
                  <span className="text-brown-light/70">{fmtDate(l.createdAt)}</span>
                </span>
                {/* 📋 فاز ۶۰ (بند ۱۸) — داده‌های واقعی ذخیره‌شده: هدف/پیام/ترجیحات برنامه */}
                {(l.goal || l.message || (l.preferredDays && l.preferredDays !== '[]')) && (
                  <div className="w-full grid sm:grid-cols-2 gap-2 mt-1">
                    {l.goal && (
                      <p className="text-brown-light sm:col-span-2">
                        <span className="font-bold text-brown">{a.students.dLeadGoal}:</span>{' '}
                        <span dir="auto">{l.goal}</span>
                      </p>
                    )}
                    {l.message && (
                      <p className="text-brown-light sm:col-span-2">
                        <span className="font-bold text-brown">{a.students.dLeadMessage}:</span>{' '}
                        <span dir="auto">{l.message}</span>
                      </p>
                    )}
                    {l.timezone && l.preferredDays && l.preferredDays !== '[]' && (
                      <p className="text-brown-light sm:col-span-2">
                        <span className="font-bold text-brown">{a.students.dLeadSchedule}:</span>{' '}
                        <span dir="ltr">
                          {(() => {
                            try {
                              const days = JSON.parse(l.preferredDays) as string[]
                              const times = l.preferredTimes
                                ? (JSON.parse(l.preferredTimes) as Array<{ start: string; end: string }>)
                                : []
                              const t = times.map((x) => `${x.start}–${x.end}`).join(', ')
                              return `${days.join(', ')}${t ? ` · ${t}` : ''}${l.daysPerWeek ? ` · ${l.daysPerWeek}d/wk` : ''} · ${l.timezone}`
                            } catch {
                              return l.preferredDays
                            }
                          })()}
                        </span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end pt-1">
        <button
          onClick={onClose}
          className="bg-sage text-brown-dark px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-sage-dark transition-colors cursor-pointer min-h-[44px]"
        >
          {a.students.close}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------
//  فرم ساخت مقالهٔ جدید (دیالوگ)
// ---------------------------------------------------------------------
function NewPostForm({
  token,
  onDone,
  onToast,
  initial,
  mode = 'create',
}: {
  token: string
  onDone: () => void
  onToast: (m: string) => void
  initial?: AdminPost | null // با رونوشت یا ویرایش پر می‌شود
  mode?: 'create' | 'edit' // در حالت edit تغییرات با PATCH روی همان مقاله ذخیره می‌شود
}) {
  const editing = mode === 'edit' && !!initial
  const [title, setTitle] = useState(
    initial ? (editing ? initial.title : `${initial.title} ${a.duplicateSuffix}`) : ''
  )
  const [tag, setTag] = useState(initial?.tag ?? 'news')
  const [emoji, setEmoji] = useState(initial?.emoji ?? '📝')
  const [color, setColor] = useState(initial?.color ?? 'sage')
  const [image, setImage] = useState(initial?.image ?? '')
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? '')
  const [content, setContent] = useState(initial?.content ?? '')
  const [publish, setPublish] = useState(initial?.published ?? true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // 🖼️ آپلود تصویر از رایانه — فایل بلافاصله به /api/admin/upload می‌رود
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const pickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f || uploading) return
    setUploading(true)
    setUploadErr('')
    try {
      const fd = new FormData()
      fd.append('file', f)
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'x-admin-key': token },
        body: fd,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.url) {
        setUploadErr(a.postImageUploadError)
        return
      }
      setImage(data.url)
      onToast(a.postImageUploadedToast)
    } catch {
      setUploadErr(a.postImageUploadError)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = '' // انتخاب دوبارهٔ همان فایل ممکن شود
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      // ویرایش: PATCH روی همان مقاله — ساخت: POST مقالهٔ جدید
      const res = await fetch(editing ? `/api/posts/${initial!.id}` : '/api/posts', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': token },
        body: JSON.stringify({ title, tag, emoji, color, image, excerpt, content, published: publish }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.error === 'Invalid input' ? 'Please fill all fields correctly.' : 'Something went wrong.')
        return
      }
      onToast(editing ? a.postUpdatedToast : a.postCreatedToast)
      onDone()
    } catch {
      setError('Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const swatches = [
    { key: 'sage', cls: 'bg-sage' },
    { key: 'butter', cls: 'bg-butter' },
    { key: 'peach', cls: 'bg-peach' },
  ]

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="np-title" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
          {a.postTitleLabel}
        </label>
        <input
          id="np-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={a.postTitlePlaceholder}
          required
          minLength={3}
          className={inputSoft}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="np-tag" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
            {a.postTagLabel}
          </label>
          <select
            id="np-tag"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className={inputSoft}
          >
            {siteContent.blog.tags
              .filter((t) => t.key !== 'all')
              .map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
          </select>
        </div>
        <div>
          <label htmlFor="np-emoji" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
            {a.postEmojiLabel}
          </label>
          <input
            id="np-emoji"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            maxLength={4}
            className={inputSoft}
          />
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
            {a.postColorLabel}
          </span>
          <div className="flex gap-2 pt-1">
            {swatches.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setColor(s.key)}
                aria-label={s.key}
                aria-pressed={color === s.key}
                className={`w-9 h-9 rounded-xl ${s.cls} cursor-pointer transition-all ${
                  color === s.key
                    ? 'ring-2 ring-brown/60 ring-offset-2 ring-offset-cream scale-105'
                    : 'opacity-60 hover:opacity-90'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
      <div>
        <label htmlFor="np-image" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
          {a.postImageLabel}
        </label>
        <div className="flex items-start gap-3">
          {/* پیش‌نمایش زندهٔ تصویر (یا گرادیان برند وقتی خالی است) */}
          <span className="w-24 h-14 rounded-xl overflow-hidden border border-sage-light/30 bg-gradient-to-br from-sage-light/60 to-butter/40 flex items-center justify-center text-2xl flex-shrink-0">
            {image.trim() ? (
              <img
                src={image.trim()}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            ) : (
              emoji
            )}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {/* 🖼️ آپلود فایل از رایانه */}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 bg-sage-light/30 text-brown px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-sage-light/50 transition-colors cursor-pointer disabled:opacity-60 min-h-[36px]"
              >
                {uploading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ImagePlus className="w-3.5 h-3.5 text-sage-dark" />
                )}
                {uploading ? a.postImageUploading : a.postImageUpload}
              </button>
              {/* ✕ پاک کردن تصویر انتخاب‌شده */}
              {image.trim() && (
                <button
                  type="button"
                  onClick={() => setImage('')}
                  className="inline-flex items-center gap-1 text-brown-light hover:text-red-500 text-xs font-semibold transition-colors cursor-pointer min-h-[36px] px-2"
                >
                  <X className="w-3.5 h-3.5" /> {a.postImageRemove}
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={pickFile}
                className="sr-only"
                aria-label={a.postImageUpload}
              />
            </div>
            <input
              id="np-image"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder={a.postImagePlaceholder}
              className={inputSoft}
            />
            <p className="text-[11px] text-brown-light mt-1.5">{a.postImageHint}</p>
            {uploadErr && (
              <p className="text-[11px] text-red-500 mt-1.5" role="alert">
                {uploadErr}
              </p>
            )}
          </div>
        </div>
      </div>
      <div>
        <label htmlFor="np-excerpt" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
          {a.postExcerptLabel}
        </label>
        <textarea
          id="np-excerpt"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder={a.postExcerptPlaceholder}
          required
          minLength={10}
          maxLength={300}
          rows={2}
          className={`${inputSoft} resize-y`}
        />
      </div>
      <div>
        <label htmlFor="np-content" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
          {a.postContentLabel}
        </label>
        <textarea
          id="np-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={a.postContentPlaceholder}
          required
          minLength={20}
          rows={7}
          className={`${inputSoft} resize-y min-h-36`}
        />
      </div>
      <label className="flex items-center gap-2.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={publish}
          onChange={(e) => setPublish(e.target.checked)}
          className="w-4 h-4 accent-[#a8c9a0]"
        />
        <span className="text-sm text-brown">{a.publishToggleLabel}</span>
      </label>
      {error && (
        <p className="text-xs text-red-500" role="alert">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onDone}
          className="bg-white border border-sage-light/50 text-brown px-5 py-2.5 rounded-xl text-sm font-semibold hover:border-sage transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy}
          className="bg-sage text-brown-dark px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-sage-dark transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
        >
          {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {busy
            ? editing
              ? a.savingButton
              : a.creatingButton
            : editing
              ? a.saveChangesButton
              : a.createPostButton}
        </button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------
//  🃏 فرم ساخت/ویرایش واژهٔ فلش‌کارت (دیالوگ) — LearnPage از دیتابیس می‌خواند
// ---------------------------------------------------------------------
function WordForm({
  token,
  onDone,
  onToast,
  initial,
}: {
  token: string
  onDone: () => void
  onToast: (m: string) => void
  initial: AdminWord | null
}) {
  const editing = !!initial
  const [chinese, setChinese] = useState(initial?.chinese ?? '')
  const [pinyin, setPinyin] = useState(initial?.pinyin ?? '')
  const [meaning, setMeaning] = useState(initial?.meaning ?? '')
  const [example, setExample] = useState(initial?.example ?? '')
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? 0)
  const [published, setPublished] = useState(initial?.published ?? true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/learn/cards', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': token },
        body: JSON.stringify({
          ...(editing ? { id: initial!.id } : {}),
          chinese,
          pinyin,
          meaning,
          example,
          sortOrder,
          published,
        }),
      })
      if (!res.ok) throw new Error()
      onToast(editing ? a.wordUpdatedToast : a.wordCreatedToast)
      onDone()
    } catch {
      setError('Could not save — check the fields and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="wf-chinese" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
            {a.wordChineseLabel} *
          </label>
          <input
            id="wf-chinese"
            required
            maxLength={20}
            value={chinese}
            onChange={(e) => setChinese(e.target.value)}
            placeholder={a.wordChinesePlaceholder}
            className={`${inputSoft} font-serif text-lg`}
          />
        </div>
        <div>
          <label htmlFor="wf-pinyin" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
            {a.wordPinyinLabel} *
          </label>
          <input
            id="wf-pinyin"
            required
            maxLength={80}
            value={pinyin}
            onChange={(e) => setPinyin(e.target.value)}
            placeholder={a.wordPinyinPlaceholder}
            className={inputSoft}
          />
        </div>
      </div>
      <div>
        <label htmlFor="wf-meaning" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
          {a.wordMeaningLabel} *
        </label>
        <input
          id="wf-meaning"
          required
          maxLength={200}
          value={meaning}
          onChange={(e) => setMeaning(e.target.value)}
          placeholder={a.wordMeaningPlaceholder}
          className={inputSoft}
        />
      </div>
      <div>
        <label htmlFor="wf-example" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
          {a.wordExampleLabel}
        </label>
        <input
          id="wf-example"
          maxLength={300}
          value={example ?? ''}
          onChange={(e) => setExample(e.target.value)}
          placeholder={a.wordExamplePlaceholder}
          className={inputSoft}
        />
      </div>
      <div className="flex items-end gap-4">
        <div className="w-32">
          <label htmlFor="wf-order" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
            {a.wordOrderLabel}
          </label>
          <input
            id="wf-order"
            type="number"
            min={0}
            max={9999}
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
            className={inputSoft}
          />
        </div>
        <label className="flex items-center gap-2.5 cursor-pointer select-none pb-2.5">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
            className="w-4 h-4 accent-[#a8c9a0]"
          />
          <span className="text-sm text-brown">{a.publishToggleLabel}</span>
        </label>
      </div>
      {error && (
        <p className="text-xs text-red-500" role="alert">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onDone}
          className="bg-white border border-sage-light/50 text-brown px-5 py-2.5 rounded-xl text-sm font-semibold hover:border-sage transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy}
          className="bg-sage text-brown-dark px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-sage-dark transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
        >
          {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {busy ? a.savingButton : editing ? a.saveChangesButton : a.newWordButton.replace('+ ', 'Add ')}
        </button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------
//  🧩 فرم ساخت/ویرایش سؤال آزمون تعیین سطح (دیالوگ) — ۲ تا ۶ گزینه با امتیاز
// ---------------------------------------------------------------------
function QuizForm({
  token,
  onDone,
  onToast,
  initial,
}: {
  token: string
  onDone: () => void
  onToast: (m: string) => void
  initial: AdminQuiz | null
}) {
  const editing = !!initial
  const [question, setQuestion] = useState(initial?.question ?? '')
  const [options, setOptions] = useState<{ text: string; score: number }[]>(
    initial?.options ?? [
      { text: '', score: 1 },
      { text: '', score: 2 },
      { text: '', score: 3 },
      { text: '', score: 4 },
    ]
  )
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? 0)
  const [published, setPublished] = useState(initial?.published ?? true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const setOption = (i: number, patch: Partial<{ text: string; score: number }>) => {
    setOptions((prev) => prev.map((o, j) => (j === i ? { ...o, ...patch } : o)))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const valid = options.filter((o) => o.text.trim().length > 0)
      if (valid.length < 2) throw new Error('need-2-options')
      const res = await fetch('/api/learn/quiz', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': token },
        body: JSON.stringify({
          ...(editing ? { id: initial!.id } : {}),
          question,
          options: valid,
          sortOrder,
          published,
        }),
      })
      if (!res.ok) throw new Error()
      onToast(editing ? a.quizUpdatedToast : a.quizCreatedToast)
      onDone()
    } catch {
      setError('Could not save — at least 2 options with text are needed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="qf-question" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
          {a.quizQuestionLabel} *
        </label>
        <input
          id="qf-question"
          required
          minLength={3}
          maxLength={300}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={a.quizQuestionPlaceholder}
          className={inputSoft}
        />
      </div>
      <div>
        <span className="block text-xs font-semibold uppercase tracking-wider text-brown mb-2">
          {a.quizOptionsLabel} *
        </span>
        <div className="space-y-2.5">
          {options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-sage-light/30 text-sage-dark text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                {String.fromCharCode(65 + i)}
              </span>
              <input
                value={o.text}
                onChange={(e) => setOption(i, { text: e.target.value })}
                placeholder={a.quizOptionTextPlaceholder}
                maxLength={200}
                className={inputSoft}
                aria-label={`Option ${i + 1} text`}
              />
              <input
                type="number"
                min={0}
                max={100}
                value={o.score}
                onChange={(e) => setOption(i, { score: Number(e.target.value) || 0 })}
                className="w-20 flex-shrink-0 px-3 py-2.5 rounded-xl border border-sage-light/40 bg-cream/50 text-brown text-sm focus:outline-none focus:border-sage focus:ring-[3px] focus:ring-sage/20 text-center"
                aria-label={`Option ${i + 1} score`}
              />
              {options.length > 2 && (
                <button
                  type="button"
                  onClick={() => setOptions((prev) => prev.filter((_, j) => j !== i))}
                  title={a.quizRemoveOption}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-brown-light hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer flex-shrink-0"
                  aria-label={`${a.quizRemoveOption} ${i + 1}`}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        {options.length < 6 && (
          <button
            type="button"
            onClick={() => setOptions((prev) => [...prev, { text: '', score: 1 }])}
            className="mt-2.5 text-xs font-semibold text-sage-dark hover:text-brown transition-colors cursor-pointer inline-flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> {a.quizAddOption}
          </button>
        )}
      </div>
      <div className="flex items-end gap-4">
        <div className="w-32">
          <label htmlFor="qf-order" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
            {a.wordOrderLabel}
          </label>
          <input
            id="qf-order"
            type="number"
            min={0}
            max={9999}
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
            className={inputSoft}
          />
        </div>
        <label className="flex items-center gap-2.5 cursor-pointer select-none pb-2.5">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
            className="w-4 h-4 accent-[#a8c9a0]"
          />
          <span className="text-sm text-brown">{a.publishToggleLabel}</span>
        </label>
      </div>
      {error && (
        <p className="text-xs text-red-500" role="alert">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onDone}
          className="bg-white border border-sage-light/50 text-brown px-5 py-2.5 rounded-xl text-sm font-semibold hover:border-sage transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy}
          className="bg-sage text-brown-dark px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-sage-dark transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
        >
          {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {busy ? a.savingButton : editing ? a.saveChangesButton : a.newQuizButton.replace('+ ', 'Add ')}
        </button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------
//  صفحهٔ ورود — نام کاربری + رمز درست نشود داده‌ای نمایش داده نمی‌شود
//  (لینک ادمین از فوتر حذف شده؛ ورود فقط با آدرس مستقیم #/admin)
// ---------------------------------------------------------------------
// ---------------------------------------------------------------------
//  👩‍🏫 فرم ساخت/ویرایش معلم (دیالوگ) — تیم صفحهٔ About
// ---------------------------------------------------------------------
function TeacherForm({
  token,
  onDone,
  onToast,
  initial,
}: {
  token: string
  onDone: () => void
  onToast: (m: string) => void
  initial: AdminTeacher | null
}) {
  const editing = !!initial
  const [name, setName] = useState(initial?.name ?? '')
  const [role, setRole] = useState(initial?.role ?? '')
  const [bio, setBio] = useState(initial?.bio ?? '')
  const [tag, setTag] = useState(initial?.tag ?? '')
  const [langs, setLangs] = useState(initial?.langs ?? 'Chinese, English')
  const [image, setImage] = useState(initial?.image ?? '')
  // 🆕 رزومه و نمونه‌های تدریس
  const [resume, setResume] = useState(initial?.resume ?? '')
  const [experienceYears, setExperienceYears] = useState(initial?.experienceYears ?? 0)
  const [studentsTaught, setStudentsTaught] = useState(initial?.studentsTaught ?? 0)
  const [certificates, setCertificates] = useState(initial?.certificates ?? '')
  const [samples, setSamples] = useState<TeacherSample[]>(() => {
    try {
      const arr = JSON.parse(initial?.samples ?? '[]')
      return Array.isArray(arr) ? arr : []
    } catch {
      return []
    }
  })
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? 0)
  const [published, setPublished] = useState(initial?.published ?? true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const updateSample = (idx: number, patch: Partial<TeacherSample>) =>
    setSamples((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)))
  const addSample = () =>
    setSamples((prev) => [...prev, { kind: 'text', title: '', url: '', desc: '' }])
  const removeSample = (idx: number) => setSamples((prev) => prev.filter((_, i) => i !== idx))

  // 🖼️ آپلود عکس معلم از رایانه — همان مسیر آپلود مقاله
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const pickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f || uploading) return
    setUploading(true)
    setUploadErr('')
    try {
      const fd = new FormData()
      fd.append('file', f)
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'x-admin-key': token },
        body: fd,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.url) {
        setUploadErr(a.postImageUploadError)
        return
      }
      setImage(data.url)
      onToast(a.postImageUploadedToast)
    } catch {
      setUploadErr(a.postImageUploadError)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/teachers', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': token },
        body: JSON.stringify({
          ...(editing ? { id: initial!.id } : {}),
          name,
          role,
          bio,
          tag,
          langs,
          image,
          resume,
          experienceYears,
          studentsTaught,
          certificates,
          samples,
          sortOrder,
          published,
        }),
      })
      if (!res.ok) throw new Error()
      onToast(editing ? a.teacherUpdatedToast : a.teacherCreatedToast)
      onDone()
    } catch {
      setError('Could not save — check the fields and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="tf-name" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
            {a.teacherNameLabel} *
          </label>
          <input
            id="tf-name"
            required
            minLength={2}
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={a.teacherNamePlaceholder}
            className={inputSoft}
          />
        </div>
        <div>
          <label htmlFor="tf-role" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
            {a.teacherRoleLabel} *
          </label>
          <input
            id="tf-role"
            required
            minLength={2}
            maxLength={160}
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder={a.teacherRolePlaceholder}
            className={inputSoft}
          />
        </div>
      </div>
      <div>
        <label htmlFor="tf-bio" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
          {a.teacherBioLabel}
        </label>
        <textarea
          id="tf-bio"
          rows={3}
          maxLength={1000}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder={a.teacherBioPlaceholder}
          className={`${inputSoft} resize-none`}
        />
      </div>
      {/* 🆕 رزومهٔ کامل — در مودال پروفایل استاد نمایش داده می‌شود */}
      <div>
        <label htmlFor="tf-resume" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
          {a.teacherResumeLabel}
        </label>
        <textarea
          id="tf-resume"
          rows={4}
          maxLength={4000}
          value={resume}
          onChange={(e) => setResume(e.target.value)}
          placeholder={a.teacherResumePlaceholder}
          className={`${inputSoft} resize-y`}
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="tf-exp" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
            {a.teacherExpLabel}
          </label>
          <input
            id="tf-exp"
            type="number"
            min={0}
            max={60}
            value={experienceYears}
            onChange={(e) => setExperienceYears(Number(e.target.value) || 0)}
            className={inputSoft}
          />
        </div>
        <div>
          <label htmlFor="tf-students" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
            {a.teacherStudentsLabel}
          </label>
          <input
            id="tf-students"
            type="number"
            min={0}
            max={100000}
            value={studentsTaught}
            onChange={(e) => setStudentsTaught(Number(e.target.value) || 0)}
            className={inputSoft}
          />
        </div>
      </div>
      <div>
        <label htmlFor="tf-certs" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
          {a.teacherCertsLabel}
        </label>
        <textarea
          id="tf-certs"
          rows={3}
          maxLength={1000}
          value={certificates}
          onChange={(e) => setCertificates(e.target.value)}
          placeholder={a.teacherCertsPlaceholder}
          className={`${inputSoft} resize-y`}
        />
      </div>
      {/* 🆕 ویرایشگر نمونه‌های تدریس — ویدیو/صدا لینک، متن/دیالوگ محتوا */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
          {a.teacherSamplesLabel}
        </label>
        <div className="space-y-3">
          {samples.map((s, idx) => (
            <div key={idx} className="bg-cream/40 border border-sage-light/30 rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center gap-2">
                <select
                  value={s.kind}
                  onChange={(e) => updateSample(idx, { kind: e.target.value as TeacherSample['kind'] })}
                  aria-label={a.sampleKindLabel}
                  className={`${inputSoft} flex-1 cursor-pointer`}
                >
                  <option value="video">▶ {a.sampleKindVideo}</option>
                  <option value="audio">🎧 {a.sampleKindAudio}</option>
                  <option value="text">📝 {a.sampleKindText}</option>
                  <option value="dialog">💬 {a.sampleKindDialog}</option>
                </select>
                <button
                  type="button"
                  onClick={() => removeSample(idx)}
                  aria-label="Remove sample"
                  className="flex-shrink-0 w-9 h-9 rounded-xl bg-white border border-sage-light/40 text-brown-light flex items-center justify-center hover:text-red-400 hover:border-red-200 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <input
                value={s.title}
                maxLength={120}
                onChange={(e) => updateSample(idx, { title: e.target.value })}
                placeholder={a.sampleTitlePlaceholder}
                aria-label={a.sampleTitleLabel}
                className={inputSoft}
              />
              {(s.kind === 'video' || s.kind === 'audio') && (
                <input
                  value={s.url ?? ''}
                  maxLength={500}
                  onChange={(e) => updateSample(idx, { url: e.target.value })}
                  placeholder={a.sampleUrlPlaceholder}
                  aria-label={a.sampleUrlLabel}
                  className={inputSoft}
                />
              )}
              {(s.kind === 'text' || s.kind === 'dialog') && (
                <div>
                  <textarea
                    rows={s.kind === 'dialog' ? 4 : 3}
                    maxLength={2000}
                    value={s.desc}
                    onChange={(e) => updateSample(idx, { desc: e.target.value })}
                    placeholder={a.sampleDescPlaceholder}
                    aria-label={a.sampleDescLabel}
                    className={`${inputSoft} resize-y`}
                  />
                  {s.kind === 'dialog' && (
                    <p className="text-[11px] text-brown-light/80 mt-1">
                      你好 | nǐ hǎo | Hello
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addSample}
          disabled={samples.length >= 12}
          className="mt-2.5 inline-flex items-center gap-1.5 bg-white border border-dashed border-sage/50 text-sage-dark px-4 py-2 rounded-xl text-xs font-bold hover:bg-sage-light/15 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          {a.addSampleButton}
        </button>
        <p className="text-[11px] text-brown-light/80 mt-1.5">{a.teacherSamplesHint}</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="tf-tag" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
            {a.teacherTagLabel}
          </label>
          <input
            id="tf-tag"
            maxLength={60}
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder={a.teacherTagPlaceholder}
            className={inputSoft}
          />
        </div>
        <div>
          <label htmlFor="tf-langs" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
            {a.teacherLangsLabel}
          </label>
          <input
            id="tf-langs"
            maxLength={200}
            value={langs}
            onChange={(e) => setLangs(e.target.value)}
            placeholder={a.teacherLangsPlaceholder}
            className={inputSoft}
          />
        </div>
      </div>
      {/* عکس — آپلود یا لینک */}
      <div>
        <label htmlFor="tf-image" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
          {a.teacherImageLabel}
        </label>
        <div className="flex gap-2">
          <input
            id="tf-image"
            maxLength={500}
            value={image ?? ''}
            onChange={(e) => setImage(e.target.value)}
            placeholder={a.teacherImagePlaceholder}
            className={`${inputSoft} flex-1`}
          />
          <input ref={fileRef} type="file" accept="image/*" onChange={pickFile} className="hidden" aria-hidden="true" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex-shrink-0 bg-white border border-sage-light/40 text-brown px-3.5 py-2.5 rounded-xl text-xs font-semibold hover:border-sage transition-colors cursor-pointer disabled:opacity-60 inline-flex items-center gap-1.5"
          >
            {uploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5 text-sage-dark" />}
            {uploading ? a.postImageUploading : a.teacherImageUpload}
          </button>
          {image && (
            <button
              type="button"
              onClick={() => setImage('')}
              className="flex-shrink-0 bg-white border border-sage-light/40 text-brown-light px-3 py-2.5 rounded-xl text-xs font-semibold hover:text-red-400 hover:border-red-200 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <p className="text-[11px] text-brown-light/80 mt-1.5">{a.teacherImageHint}</p>
        {uploadErr && (
          <p className="text-xs text-red-500 mt-1" role="alert">
            {uploadErr}
          </p>
        )}
      </div>
      <div className="flex items-end gap-4">
        <div className="w-32">
          <label htmlFor="tf-order" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
            {a.wordOrderLabel}
          </label>
          <input
            id="tf-order"
            type="number"
            min={0}
            max={9999}
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
            className={inputSoft}
          />
        </div>
        <label className="flex items-center gap-2.5 cursor-pointer select-none pb-2.5">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
            className="w-4 h-4 accent-[#a8c9a0]"
          />
          <span className="text-sm text-brown">{a.publishToggleLabel}</span>
        </label>
      </div>
      {error && (
        <p className="text-xs text-red-500" role="alert">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onDone}
          className="bg-white border border-sage-light/50 text-brown px-5 py-2.5 rounded-xl text-sm font-semibold hover:border-sage transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy}
          className="bg-sage text-brown-dark px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-sage-dark transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
        >
          {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {busy ? a.savingButton : editing ? a.saveChangesButton : a.newTeacherButton.replace('+ ', 'Add ')}
        </button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------
//  📚 فرم ساخت/ویرایش درس — کارت Learn + واژه‌های داخل مودال درس
// ---------------------------------------------------------------------
// ⭐ فرم ساخت/ویرایش نظر — نظرات منتخب کاروسل خانه و هر نظر کاربری از اینجا ویرایش می‌شود
function ReviewForm({
  token,
  onDone,
  onToast,
  initial,
}: {
  token: string
  onDone: () => void
  onToast: (m: string) => void
  initial: AdminReview | null
}) {
  const editing = !!initial
  const [name, setName] = useState(initial?.name ?? '')
  const [role, setRole] = useState(initial?.role ?? '')
  const [rating, setRating] = useState(initial?.rating ?? 5)
  const [text, setText] = useState(initial?.text ?? '')
  const [status, setStatus] = useState(initial?.status ?? 'approved')
  const [featured, setFeatured] = useState(initial?.featured ?? false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/testimonials', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': token },
        body: JSON.stringify({
          ...(editing ? { id: initial!.id } : {}),
          name,
          role,
          rating,
          text,
          status,
          featured,
        }),
      })
      if (!res.ok) throw new Error()
      onToast(a.reviewSavedToast)
      onDone()
    } catch {
      setError('Could not save — check the fields and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="rf-name" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
            {a.reviewNameLabel}
          </label>
          <input
            id="rf-name"
            required
            minLength={2}
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={a.reviewNamePlaceholder}
            className={inputSoft}
          />
        </div>
        <div>
          <label htmlFor="rf-role" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
            {a.reviewRoleLabel}
          </label>
          <input
            id="rf-role"
            maxLength={80}
            value={role ?? ''}
            onChange={(e) => setRole(e.target.value)}
            placeholder={a.reviewRolePlaceholder}
            className={inputSoft}
          />
        </div>
      </div>
      <div>
        <span className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">{a.reviewRatingLabel}</span>
        <div className="flex items-center gap-1" role="radiogroup" aria-label={a.reviewRatingLabel}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              onClick={() => setRating(n)}
              className="p-1 cursor-pointer"
              aria-label={`${n} stars`}
            >
              <Star className={`w-6 h-6 transition-colors ${n <= rating ? 'fill-butter text-butter' : 'text-brown-light/40'}`} />
            </button>
          ))}
          <span className="text-xs text-brown-light ml-2">{rating} / 5</span>
        </div>
      </div>
      <div>
        <label htmlFor="rf-text" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
          {a.reviewTextLabel}
        </label>
        <textarea
          id="rf-text"
          rows={4}
          required
          minLength={10}
          maxLength={1000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={a.reviewTextPlaceholder}
          className={inputSoft}
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="rf-status" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
            {a.reviewStatusLabel}
          </label>
          <select id="rf-status" value={status} onChange={(e) => setStatus(e.target.value)} className={inputSoft}>
            <option value="approved">{a.reviewApproved}</option>
            <option value="pending">{a.reviewPending}</option>
            <option value="rejected">{a.reviewRejected}</option>
          </select>
        </div>
        <label className="flex items-end gap-2.5 cursor-pointer select-none pb-2">
          <input
            type="checkbox"
            checked={featured}
            onChange={(e) => setFeatured(e.target.checked)}
            className="w-4 h-4 accent-[#a8c9a0]"
          />
          <span className="text-xs text-brown flex items-center gap-1.5">
            <Star className={`w-3.5 h-3.5 ${featured ? 'fill-butter text-butter' : 'text-brown-light/50'}`} />
            {a.reviewFeaturedLabel}
          </span>
        </label>
      </div>
      {error && <p className="text-xs text-red-500 bg-red-50 rounded-xl px-4 py-2.5">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="w-full bg-sage text-brown-dark py-3 rounded-xl text-sm font-bold hover:bg-sage-dark transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
      >
        {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        {busy ? 'Saving…' : a.saveButton}
      </button>
    </form>
  )
}

function LessonForm({
  token,
  onDone,
  onToast,
  initial,
}: {
  token: string
  onDone: () => void
  onToast: (m: string) => void
  initial: AdminLesson | null
}) {
  const editing = !!initial
  const [slug, setSlug] = useState(initial?.slug ?? '')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [text, setText] = useState(initial?.text ?? '')
  const [subtitle, setSubtitle] = useState(initial?.subtitle ?? '')
  const [big, setBig] = useState(initial?.big ?? '')
  const [small, setSmall] = useState(initial?.small ?? '')
  const [tag, setTag] = useState(initial?.tag ?? '')
  const [category, setCategory] = useState(initial?.category ?? 'vocabulary')
  const [color, setColor] = useState(initial?.color ?? 'sage')
  const [action, setAction] = useState(initial?.action ?? 'Learn')
  const [isVideo, setIsVideo] = useState(initial?.isVideo ?? false)
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? 0)
  const [published, setPublished] = useState(initial?.published ?? true)
  // ✏️ واژه‌های درس — ردیف‌های داینامیک
  const [words, setWords] = useState<LessonWordRow[]>(
    initial?.words?.length
      ? initial.words
      : [{ chinese: '', pinyin: '', meaning: '', example: '' }]
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const updateWord = (i: number, patch: Partial<LessonWordRow>) => {
    setWords((prev) => prev.map((w, idx) => (idx === i ? { ...w, ...patch } : w)))
  }
  const addWord = () => setWords((prev) => [...prev, { chinese: '', pinyin: '', meaning: '', example: '' }])
  const removeWord = (i: number) => setWords((prev) => prev.filter((_, idx) => idx !== i))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      // فقط واژه‌های کامل نگه داشته شوند
      const cleanWords = words
        .map((w) => ({
          chinese: w.chinese.trim(),
          pinyin: w.pinyin.trim(),
          meaning: w.meaning.trim(),
          example: w.example?.trim() ?? '',
        }))
        .filter((w) => w.chinese && w.pinyin && w.meaning)
      const res = await fetch('/api/learn/lessons', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': token },
        body: JSON.stringify({
          ...(editing ? { id: initial!.id } : {}),
          slug: slug.trim().toLowerCase(),
          title,
          text,
          subtitle,
          big,
          small,
          tag,
          category: category.trim() || 'vocabulary',
          color,
          action: action.trim() || 'Learn',
          isVideo,
          words: cleanWords,
          sortOrder,
          published,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.error || 'Could not save — check the fields and try again.')
        return
      }
      onToast(editing ? a.lessonUpdatedToast : a.lessonCreatedToast)
      onDone()
    } catch {
      setError('Could not save — check the fields and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* هویت درس و لینک */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="lf-slug" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
            {a.lessonLinkLabel}
          </label>
          <input
            id="lf-slug"
            required
            pattern="[a-z0-9-]+"
            maxLength={60}
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            placeholder={a.lessonLinkPlaceholder}
            className={`${inputSoft} font-mono`}
          />
          <p className="text-[11px] text-brown-light mt-1">{a.lessonLinkHint}</p>
        </div>
        <div>
          <label htmlFor="lf-title" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
            {a.lessonTitleLabel}
          </label>
          <input
            id="lf-title"
            required
            minLength={2}
            maxLength={160}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={a.lessonTitlePlaceholder}
            className={inputSoft}
          />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="lf-text" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
            {a.lessonCardTextLabel}
          </label>
          <textarea
            id="lf-text"
            rows={2}
            maxLength={400}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={a.lessonCardTextPlaceholder}
            className={inputSoft}
          />
        </div>
        <div>
          <label htmlFor="lf-subtitle" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
            {a.lessonSubtitleLabel}
          </label>
          <textarea
            id="lf-subtitle"
            rows={2}
            maxLength={400}
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder={a.lessonSubtitlePlaceholder}
            className={inputSoft}
          />
        </div>
      </div>

      {/* ظاهر کارت */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label htmlFor="lf-big" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
            {a.lessonBigLabel}
          </label>
          <input
            id="lf-big"
            maxLength={20}
            value={big}
            onChange={(e) => setBig(e.target.value)}
            placeholder={a.lessonBigPlaceholder}
            className={`${inputSoft} font-serif`}
          />
        </div>
        <div>
          <label htmlFor="lf-small" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
            {a.lessonSmallLabel}
          </label>
          <input
            id="lf-small"
            maxLength={80}
            value={small}
            onChange={(e) => setSmall(e.target.value)}
            placeholder={a.lessonSmallPlaceholder}
            className={inputSoft}
          />
        </div>
        <div>
          <label htmlFor="lf-tag" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
            {a.lessonTagLabel}
          </label>
          <input
            id="lf-tag"
            maxLength={60}
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder={a.lessonTagPlaceholder}
            className={inputSoft}
          />
        </div>
        <div>
          <label htmlFor="lf-color" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
            {a.lessonColorLabel}
          </label>
          <select id="lf-color" value={color} onChange={(e) => setColor(e.target.value)} className={inputSoft}>
            <option value="sage">sage</option>
            <option value="butter">butter</option>
            <option value="peach">peach</option>
            <option value="cream">cream</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
        <div className="col-span-2">
          <label htmlFor="lf-category" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
            {a.lessonCategoryLabel}
          </label>
          <input
            id="lf-category"
            maxLength={80}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputSoft}
          />
          <p className="text-[11px] text-brown-light mt-1">{a.lessonCategoryHint}</p>
        </div>
        <div>
          <label htmlFor="lf-action" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
            {a.lessonActionLabel}
          </label>
          <input
            id="lf-action"
            maxLength={30}
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder={a.lessonActionPlaceholder}
            className={inputSoft}
          />
        </div>
        <div>
          <label htmlFor="lf-order" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
            {a.lessonOrderLabel}
          </label>
          <input
            id="lf-order"
            type="number"
            min={0}
            max={9999}
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
            className={inputSoft}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-5">
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isVideo}
            onChange={(e) => setIsVideo(e.target.checked)}
            className="w-4 h-4 accent-[#a8c9a0]"
          />
          <span className="text-sm text-brown">{a.lessonVideoLabel}</span>
        </label>
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
            className="w-4 h-4 accent-[#a8c9a0]"
          />
          <span className="text-sm text-brown">{a.publishToggleLabel}</span>
        </label>
      </div>

      {/* واژه‌های درس */}
      <div className="border-t border-sage-light/30 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold uppercase tracking-widest text-sage-dark">{a.lessonWordsLabel}</h4>
          <button
            type="button"
            onClick={addWord}
            className="bg-sage-light/30 text-sage-dark px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-sage-light/50 transition-colors cursor-pointer"
          >
            {a.lessonAddWord}
          </button>
        </div>
        <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
          {words.map((w, i) => (
            <div key={i} className="bg-white rounded-xl border border-sage-light/30 p-3 grid grid-cols-2 sm:grid-cols-[1fr_1fr_1.2fr_auto] gap-2">
              <input
                value={w.chinese}
                onChange={(e) => updateWord(i, { chinese: e.target.value })}
                placeholder={a.lessonWordChinese}
                maxLength={30}
                className={`${inputSoft} font-serif`}
                aria-label={`${a.lessonWordChinese} ${i + 1}`}
              />
              <input
                value={w.pinyin}
                onChange={(e) => updateWord(i, { pinyin: e.target.value })}
                placeholder={a.lessonWordPinyin}
                maxLength={120}
                className={inputSoft}
                aria-label={`${a.lessonWordPinyin} ${i + 1}`}
              />
              <input
                value={w.meaning}
                onChange={(e) => updateWord(i, { meaning: e.target.value })}
                placeholder={a.lessonWordMeaning}
                maxLength={200}
                className={inputSoft}
                aria-label={`${a.lessonWordMeaning} ${i + 1}`}
              />
              <div className="flex items-center gap-2">
                <input
                  value={w.example ?? ''}
                  onChange={(e) => updateWord(i, { example: e.target.value })}
                  placeholder={a.lessonWordExample}
                  maxLength={300}
                  className={`${inputSoft} col-span-2 sm:col-span-1`}
                  aria-label={`${a.lessonWordExample} ${i + 1}`}
                />
                <button
                  type="button"
                  onClick={() => removeWord(i)}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-brown-light hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer flex-shrink-0"
                  aria-label={`${a.lessonRemoveWord} ${i + 1}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {words.length === 0 && (
            <p className="text-xs text-brown-light py-3 text-center">{a.lessonWordsLabel} — 0</p>
          )}
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-500 bg-red-50 rounded-xl px-4 py-2.5">{error}</p>
      )}
      <div>
        <button
          type="submit"
          disabled={busy}
          className="bg-sage text-brown-dark px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-sage-dark transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
        >
          {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {busy ? a.savingButton : editing ? a.saveChangesButton : a.newLessonButton.replace('+ ', 'Add ')}
        </button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------
//  ⚙️ فرم تنظیمات — نوار اعلان بالای سایت + آمار داشبورد صفحهٔ اول
//  هر دو بخش با یک دکمه ذخیره می‌شوند (PUT /api/settings)
// ---------------------------------------------------------------------
type AdminHero = {
  badge: string
  titleTop: string
  titleMiddle: string
  titleHighlight: string
  subtitle: string
}

function SettingsForm({
  token,
  initialAnnouncement,
  initialStats,
  initialHero,
  onToast,
}: {
  token: string
  initialAnnouncement: AdminAnnouncement | null
  initialStats: AdminStatItem[] | null
  initialHero: AdminHero | null
  onToast: (m: string) => void
}) {
  const [ann, setAnn] = useState<AdminAnnouncement>(
    initialAnnouncement ?? {
      enabled: siteContent.announcement.enabled,
      id: siteContent.announcement.id,
      emoji: siteContent.announcement.emoji,
      text: siteContent.announcement.text,
      ctaLabel: siteContent.announcement.ctaLabel,
      ctaPage: siteContent.announcement.ctaPage,
    }
  )
  const [rows, setRows] = useState<AdminStatItem[]>(
    initialStats ?? siteContent.stats.items.map((s) => ({ ...s }))
  )
  // ✏️ متن‌های هیروی خانه — پیش‌فرض فایل محتوا، بازنویسی‌شده از دیتابیس
  const [hero, setHero] = useState<AdminHero>(initialHero ?? { ...siteContent.home.hero })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const updateRow = (i: number, patch: Partial<AdminStatItem>) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }
  const addRow = () => setRows((prev) => [...prev, { value: 100, suffix: '+', label: 'New Stat' }])
  const removeRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      // 🔄 خودکارسازی Version id: اگر محتوای اعلان عوض شده ولی id همان قبلی است،
      // پسوند نسخه اضافه می‌شود تا نوار برای کسانی که اعلان قبلی را بسته‌اند دوباره ظاهر شود
      // (رفع باگ «نوار اعلان نمایش داده نمی‌شود» — بستن همیشگی با id ثابت)
      const base = initialAnnouncement ?? {
        enabled: siteContent.announcement.enabled,
        id: siteContent.announcement.id,
        emoji: siteContent.announcement.emoji,
        text: siteContent.announcement.text,
        ctaLabel: siteContent.announcement.ctaLabel,
        ctaPage: siteContent.announcement.ctaPage,
      }
      const trimmedId = ann.id.trim() || 'announcement-1'
      const contentChanged =
        base.text !== ann.text ||
        base.emoji !== ann.emoji ||
        base.ctaLabel !== ann.ctaLabel ||
        base.ctaPage !== ann.ctaPage ||
        base.enabled !== ann.enabled
      const finalAnn: AdminAnnouncement =
        contentChanged && base.id === trimmedId
          ? { ...ann, id: `${trimmedId}-v${Date.now().toString(36)}` }
          : { ...ann, id: trimmedId }
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': token },
        body: JSON.stringify({
          announcement: finalAnn,
          homeStats: rows.map((r) => ({ value: Number(r.value) || 0, suffix: r.suffix, label: r.label })),
          hero: {
            badge: hero.badge.trim(),
            titleTop: hero.titleTop.trim(),
            titleMiddle: hero.titleMiddle.trim(),
            titleHighlight: hero.titleHighlight.trim(),
            subtitle: hero.subtitle.trim(),
          },
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.error || 'Could not save — check the fields and try again.')
        return
      }
      setAnn(finalAnn) // id نهایی (اگر bump شده) در فرم بماند تا ذخیرهٔ بعدی دوباره bump نکند
      onToast(a.settingsSavedToast)
    } catch {
      setError('Could not save — check the fields and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
    <form onSubmit={submit} className="space-y-6">
      {/* 📣 نوار اعلان */}
      <div className="bg-white rounded-2xl border border-sage-light/20 p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-bold text-brown-dark flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-sage-dark" /> {a.settingsAnnounceTitle}
          </h3>
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={ann.enabled}
              onChange={(e) => setAnn({ ...ann, enabled: e.target.checked })}
              className="w-4 h-4 accent-[#a8c9a0]"
            />
            <span className="text-xs text-brown">{a.settingsAnnounceEnabled}</span>
          </label>
        </div>
        <p className="text-xs text-brown-light bg-butter/20 rounded-xl px-4 py-2.5 mb-4">
          {a.settingsAnnounceHint}
        </p>
        <div className="grid sm:grid-cols-[1fr_2fr] gap-4 mb-4">
          <div>
            <label htmlFor="sf-ann-id" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
              {a.settingsAnnounceIdLabel}
            </label>
            <input
              id="sf-ann-id"
              value={ann.id}
              onChange={(e) => setAnn({ ...ann, id: e.target.value })}
              className={`${inputSoft} font-mono`}
            />
            <p className="text-[11px] text-brown-light mt-1">{a.settingsAnnounceIdHint}</p>
          </div>
          <div>
            <label htmlFor="sf-ann-emoji" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
              {a.settingsAnnounceEmojiLabel}
            </label>
            <input
              id="sf-ann-emoji"
              maxLength={8}
              value={ann.emoji}
              onChange={(e) => setAnn({ ...ann, emoji: e.target.value })}
              className={inputSoft}
            />
          </div>
        </div>
        <div className="mb-4">
          <label htmlFor="sf-ann-text" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
            {a.settingsAnnounceTextLabel}
          </label>
          <textarea
            id="sf-ann-text"
            rows={2}
            maxLength={300}
            required
            value={ann.text}
            onChange={(e) => setAnn({ ...ann, text: e.target.value })}
            placeholder={a.settingsAnnounceTextPlaceholder}
            className={inputSoft}
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="sf-ann-cta" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
              {a.settingsAnnounceCtaLabel}
            </label>
            <input
              id="sf-ann-cta"
              maxLength={60}
              value={ann.ctaLabel}
              onChange={(e) => setAnn({ ...ann, ctaLabel: e.target.value })}
              className={inputSoft}
            />
          </div>
          <div>
            <label htmlFor="sf-ann-page" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
              {a.settingsAnnounceCtaPageLabel}
            </label>
            <select
              id="sf-ann-page"
              value={ann.ctaPage}
              onChange={(e) => setAnn({ ...ann, ctaPage: e.target.value })}
              className={inputSoft}
            >
              {siteContent.navigation.map((n) => (
                <option key={n.key} value={n.key}>
                  {n.label}
                </option>
              ))}
              <option value="register">Register</option>
            </select>
          </div>
        </div>
      </div>

      {/* ✏️ متن‌های هیروی صفحهٔ خانه (فاز ۲۲) */}
      <div className="bg-white rounded-2xl border border-sage-light/20 p-5">
        <h3 className="text-sm font-bold text-brown-dark flex items-center gap-2 mb-4">
          <SlidersHorizontal className="w-4 h-4 text-sage-dark" /> {a.settingsHeroTitle}
        </h3>
        <p className="text-xs text-brown-light bg-butter/20 rounded-xl px-4 py-2.5 mb-4">
          {a.settingsHeroHint}
        </p>
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="sf-hero-badge" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
              {a.settingsHeroBadgeLabel}
            </label>
            <input
              id="sf-hero-badge"
              value={hero.badge}
              maxLength={60}
              onChange={(e) => setHero({ ...hero, badge: e.target.value })}
              className={inputSoft}
            />
          </div>
          <div>
            <label htmlFor="sf-hero-ttop" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
              {a.settingsHeroTitleTopLabel}
            </label>
            <input
              id="sf-hero-ttop"
              value={hero.titleTop}
              maxLength={80}
              onChange={(e) => setHero({ ...hero, titleTop: e.target.value })}
              className={inputSoft}
            />
          </div>
          <div>
            <label htmlFor="sf-hero-tmid" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
              {a.settingsHeroTitleMiddleLabel}
            </label>
            <input
              id="sf-hero-tmid"
              value={hero.titleMiddle}
              maxLength={80}
              onChange={(e) => setHero({ ...hero, titleMiddle: e.target.value })}
              className={inputSoft}
            />
          </div>
          <div>
            <label htmlFor="sf-hero-thl" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
              {a.settingsHeroTitleHighlightLabel}
            </label>
            <input
              id="sf-hero-thl"
              value={hero.titleHighlight}
              maxLength={80}
              onChange={(e) => setHero({ ...hero, titleHighlight: e.target.value })}
              className={inputSoft}
            />
            <p className="text-[11px] text-brown-light mt-1">{a.settingsHeroTitleHighlightHint}</p>
          </div>
        </div>
        <div>
          <label htmlFor="sf-hero-sub" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
            {a.settingsHeroSubtitleLabel}
          </label>
          <textarea
            id="sf-hero-sub"
            value={hero.subtitle}
            maxLength={300}
            rows={2}
            onChange={(e) => setHero({ ...hero, subtitle: e.target.value })}
            className={`${inputSoft} resize-none`}
          />
        </div>
      </div>

      {/* 📊 آمار صفحهٔ اول */}
      <div className="bg-white rounded-2xl border border-sage-light/20 p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-bold text-brown-dark flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-sage-dark" /> {a.settingsStatsTitle}
          </h3>
          <button
            type="button"
            onClick={addRow}
            disabled={rows.length >= 8}
            className="bg-sage-light/30 text-sage-dark px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-sage-light/50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {a.settingsAddStat}
          </button>
        </div>
        <p className="text-xs text-brown-light bg-butter/20 rounded-xl px-4 py-2.5 mb-4">
          {a.settingsStatsHint}
        </p>
        <div className="space-y-2.5">
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-[80px_64px_1fr_auto] gap-2 items-center bg-cream/40 rounded-xl p-2.5">
              <div>
                <input
                  type="number"
                  min={0}
                  value={r.value}
                  onChange={(e) => updateRow(i, { value: Number(e.target.value) || 0 })}
                  className={inputSoft}
                  aria-label={`${a.settingsStatValueLabel} ${i + 1}`}
                />
                <p className="text-[10px] text-brown-light mt-0.5 px-1">{a.settingsStatValueLabel}</p>
              </div>
              <div>
                <input
                  maxLength={8}
                  value={r.suffix}
                  onChange={(e) => updateRow(i, { suffix: e.target.value })}
                  placeholder={a.settingsStatSuffixPlaceholder}
                  className={inputSoft}
                  aria-label={`${a.settingsStatSuffixLabel} ${i + 1}`}
                />
                <p className="text-[10px] text-brown-light mt-0.5 px-1">{a.settingsStatSuffixLabel}</p>
              </div>
              <div>
                <input
                  maxLength={80}
                  value={r.label}
                  onChange={(e) => updateRow(i, { label: e.target.value })}
                  placeholder={a.settingsStatLabelPlaceholder}
                  className={inputSoft}
                  aria-label={`${a.settingsStatLabelLabel} ${i + 1}`}
                />
                <p className="text-[10px] text-brown-light mt-0.5 px-1">{a.settingsStatLabelLabel}</p>
              </div>
              <button
                type="button"
                onClick={() => removeRow(i)}
                disabled={rows.length <= 2}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-brown-light hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label={`${a.settingsRemoveStat} ${i + 1}`}
                title={a.settingsRemoveStat}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-500 bg-red-50 rounded-xl px-4 py-2.5">{error}</p>
      )}
      <div>
        <button
          type="submit"
          disabled={busy}
          className="bg-sage text-brown-dark px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-sage-dark transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
        >
          {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {busy ? a.settingsSavingButton : a.settingsSaveButton}
        </button>
      </div>
    </form>

    {/* 🔑 کارت مستقل «Panel access» — تغییر نام کاربری/رمز پنل */}
    <PanelAccessCard token={token} onToast={onToast} />
    </>
  )
}

// ---------------------------------------------------------------------------
// 🔑 کارت «Panel access» — تغییر نام کاربری/رمز پنل از تب Settings
//    فرمی جدا از فرم تنظیمات: با رمز فعلی تأیید می‌شود؛ بعد از موفقیت همهٔ
//    سشن‌ها باطل می‌شوند (ورود دوباره با اعتبارنامهٔ جدید — رفتار عمدی امنیتی)
// ---------------------------------------------------------------------------
function PanelAccessCard({ token, onToast }: { token: string; onToast: (m: string) => void }) {
  const [username, setUsername] = useState('')
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [custom, setCustom] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  // نام کاربری مؤثر فعلی + اینکه اعتبارنامهٔ سفارشی ذخیره شده یا پیش‌فرض env است
  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/credentials', { headers: { 'x-admin-key': token } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return
        setUsername(d.username ?? '')
        setCustom(Boolean(d.custom))
      })
      .catch(() => {
        // بی‌اهمیت — فرم با فیلدهای خالی کار می‌کند
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const submit = async () => {
    if (busy || done) return
    setError('')
    if (next || confirm) {
      if (next !== confirm) {
        setError(a.credMismatchError)
        return
      }
      if (next && next.length < 8) {
        setError(a.credNewHint)
        return
      }
    }
    setBusy(true)
    try {
      const res = await fetch('/api/admin/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': token },
        body: JSON.stringify({
          currentPassword: current,
          username: username.trim() || undefined,
          newPassword: next || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || a.settingsErrorToast)
        return
      }
      setDone(true)
      setCustom(true)
      setCurrent('')
      setNext('')
      setConfirm('')
      onToast(a.credDoneToast)
      // 🔒 همهٔ سشن‌ها باطل شده‌اند — برگشت خودکار به صفحهٔ ورود
      setTimeout(() => window.location.reload(), 1800)
    } catch {
      setError(a.settingsErrorToast)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-sage-light/20 p-5 mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="text-sm font-bold text-brown-dark flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-sage-dark" /> {a.credTitle}
        </h3>
        {custom !== null && (
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
              custom ? 'bg-sage-light/40 text-sage-dark' : 'bg-peach-light/60 text-brown'
            }`}
          >
            {custom ? a.credCustomBadge : a.credDefaultBadge}
          </span>
        )}
      </div>
      <p className="text-xs text-brown-light bg-butter/20 rounded-xl px-4 py-2.5 mb-4">
        {a.credHint}
      </p>

      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="cred-username" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
              {a.credUsernameLabel}
            </label>
            <input
              id="cred-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className={inputSoft}
            />
            <p className="text-[11px] text-brown-light mt-1">{a.credUsernameHint}</p>
          </div>
          <div>
            <label htmlFor="cred-current" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
              {a.credCurrentLabel}
            </label>
            <input
              id="cred-current"
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              className={inputSoft}
            />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="cred-next" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
              {a.credNewLabel}
            </label>
            <input
              id="cred-next"
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              className={inputSoft}
            />
            <p className="text-[11px] text-brown-light mt-1">{a.credNewHint}</p>
          </div>
          <div>
            <label htmlFor="cred-confirm" className="block text-xs font-semibold uppercase tracking-wider text-brown mb-1.5">
              {a.credConfirmLabel}
            </label>
            <input
              id="cred-confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              className={inputSoft}
            />
          </div>
        </div>
      </div>

      {error && <p className="text-xs text-red-500 bg-red-50 rounded-xl px-4 py-2.5 mt-4">{error}</p>}
      {done && (
        <p className="text-xs text-sage-dark bg-sage-light/30 rounded-xl px-4 py-2.5 mt-4">
          {a.credDoneToast}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={busy || done || !current}
        className="mt-4 bg-sage text-brown-dark px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-sage-dark transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
      >
        {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
        {busy ? a.credSavingButton : a.credSaveButton}
      </button>
    </div>
  )
}

function LoginGate({ onLogin }: { onLogin: (token: string) => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [lockMsg, setLockMsg] = useState('') // پیام قفل موقت (۴۲۹ — تلاش بیش از حد)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password || busy) return
    setBusy(true)
    setError(false)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (res.status === 429) {
        // ⛔️ قفل موقت ورود — پیام با زمان پیشنهادی سرور
        const data = await res.json().catch(() => null)
        const mins = Math.max(1, Math.ceil(Number(data?.retryAfter ?? 600) / 60))
        setLockMsg(`Too many attempts — try again in ~${mins} min.`)
        return
      }
      if (!res.ok) throw new Error('unauthorized')
      const data = await res.json()
      sessionStorage.setItem(STORAGE_KEY, data.token)
      onLogin(data.token)
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div id="page-admin" className="pt-32 pb-24 md:pt-40 flex items-start justify-center">
      <div className="w-full max-w-md px-6">
        <div className="bg-white rounded-3xl border border-sage-light/20 shadow-sm p-8 animate-ct-fadeInUp">
          <div className="w-14 h-14 bg-sage-light/30 rounded-2xl flex items-center justify-center mx-auto mb-5 animate-ct-floatSlow">
            <Lock className="w-6 h-6 text-sage-dark" />
          </div>
          <h1 className="text-2xl font-bold text-brown-dark text-center mb-2">
            {a.login.title}
          </h1>
          <p className="text-sm text-brown-light text-center mb-7 leading-relaxed">
            {a.login.subtitle}
          </p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label
                htmlFor="admin-username"
                className="block text-xs font-semibold uppercase tracking-wider text-brown mb-2"
              >
                {a.login.usernameLabel}
              </label>
              <input
                id="admin-username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value)
                  setError(false)
                }}
                placeholder={a.login.usernamePlaceholder}
                autoFocus
                autoComplete="username"
                className={`${inputSoft} ${error ? 'border-red-300 ring-2 ring-red-100' : ''}`}
              />
            </div>
            <div>
              <label
                htmlFor="admin-password"
                className="block text-xs font-semibold uppercase tracking-wider text-brown mb-2"
              >
                {a.login.passwordLabel}
              </label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError(false)
                }}
                placeholder={a.login.passwordPlaceholder}
                autoComplete="current-password"
                className={`${inputSoft} ${error ? 'border-red-300 ring-2 ring-red-100' : ''}`}
              />
              {error && (
                <p className="text-xs text-red-500 mt-2 flex items-center gap-1" role="alert">
                  <ShieldCheck className="w-3.5 h-3.5" /> {a.login.error}
                </p>
              )}
              {lockMsg && (
                <p className="text-xs font-semibold text-red-600 bg-red-50 rounded-xl px-4 py-2.5 mt-3" role="alert">
                  🔒 {lockMsg}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={busy || !username || !password}
              className="w-full bg-sage text-brown-dark py-3 rounded-xl text-sm font-bold hover:bg-sage-dark transition-all btn-lift disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer inline-flex items-center justify-center gap-2"
            >
              {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowLeft className="w-4 h-4 rotate-180" />}
              {a.login.submit}
            </button>
          </form>
        </div>
        <p className="text-[11px] text-brown-light/70 text-center mt-4">{a.login.hint}</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------
//  خودِ داشبورد
// ---------------------------------------------------------------------
export function AdminPage({ onToast }: { onToast?: (m: string) => void }) {
  const [token, setToken] = useState<string | null>(null)
  const [checked, setChecked] = useState(false)
  const [tab, setTab] = useState<
    'dashboard' | 'classes' | 'messages' | 'registrations' | 'scheduling' | 'students' | 'orders' | 'newsletter' | 'blog' | 'reviews' | 'faq' | 'discounts' | 'lessons' | 'words' | 'quiz' | 'teachers' | 'settings' | 'backup' | 'logs'
  >('dashboard')
  const [messages, setMessages] = useState<SupportMsg[]>([])
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [posts, setPosts] = useState<AdminPost[]>([])
  const [reviews, setReviews] = useState<AdminReview[]>([])
  const [faqs, setFaqs] = useState<AdminFaqItem[]>([])
  // 🗄️ بایگانی (حذف نرم) — بازگردانی بدون پاک‌شدن همیشگی (فاز ۵۵)
  const [archivedReviews, setArchivedReviews] = useState<AdminReview[]>([])
  const [archivedFaqs, setArchivedFaqs] = useState<AdminFaqItem[]>([])
  const [discounts, setDiscounts] = useState<DiscountItem[]>([])
  const [learnCards, setLearnCards] = useState<AdminWord[]>([])
  const [quizQuestions, setQuizQuestions] = useState<AdminQuiz[]>([])
  const [teachers, setTeachers] = useState<AdminTeacher[]>([])
  const [lessons, setLessons] = useState<AdminLesson[]>([])
  // 💳 فاز ۵۹ — پرداخت دستی کارت بانکی: تنظیمات + شمارنده‌ها + فیلتر ورودی تب Payments
  const [bankSettings, setBankSettings] = useState<BankSettingsState | null>(null)
  const [payCounts, setPayCounts] = useState<{
    pendingReview: number
    approved: number
    rejected: number
    unpaid: number
    cancelled: number
  } | null>(null)
  const [payInitialFilter, setPayInitialFilter] = useState<string>('receipt_submitted')
  // 👥 تب Students — فهرست کاربران با وضعیت خرید واقعی (واکشی تنبل با اولین فعال‌سازی تب)
  const [students, setStudents] = useState<AdminStudent[]>([])
  // شمارنده‌های چیپ‌ها + جمع کل — از سرور، مستقل از فیلتر فعلی
  const [studentsMeta, setStudentsMeta] = useState<{ total: number; counts: AdminStudentsResp['counts'] } | null>(null)
  const [studentsFilter, setStudentsFilter] = useState<StudentFilter>('all')
  const [studentsQuery, setStudentsQuery] = useState('') // ورودی جست‌وجو — همین‌جا نمایش داده می‌شود
  const [studentsDebounced, setStudentsDebounced] = useState('') // نسخهٔ تأخیرشدهٔ ۳۰۰ms که به API می‌رود
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [studentsError, setStudentsError] = useState(false)
  // 👤 جزئیات یک کاربر (دیالوگ)
  const [studentDetailOpen, setStudentDetailOpen] = useState(false)
  const [studentDetailLoading, setStudentDetailLoading] = useState(false)
  const [studentDetail, setStudentDetail] = useState<StudentDetail | null>(null)
  const [settings, setSettings] = useState<{
    announcement: AdminAnnouncement | null
    homeStats: AdminStatItem[] | null
    hero: AdminHero | null
  }>({
    announcement: null,
    homeStats: null,
    hero: null,
  })
  const [stats, setStats] = useState<DashStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [newPostOpen, setNewPostOpen] = useState(false)
  const [postSeed, setPostSeed] = useState<AdminPost | null>(null) // مقالهٔ مبنا (رونوشت یا ویرایش)
  const [editMode, setEditMode] = useState(false) // true = ویرایش همان مقاله، false = ساخت/رونوشت
  // دیالوگ‌های واژه و سؤال آزمون
  const [wordOpen, setWordOpen] = useState(false)
  const [wordSeed, setWordSeed] = useState<AdminWord | null>(null)
  const [quizOpen, setQuizOpen] = useState(false)
  const [quizSeed, setQuizSeed] = useState<AdminQuiz | null>(null)
  // دیالوگ معلم‌ها
  const [teacherOpen, setTeacherOpen] = useState(false)
  const [teacherSeed, setTeacherSeed] = useState<AdminTeacher | null>(null)
  // دیالوگ درس‌ها (کارت + واژه‌های بخش Learn)
  const [lessonOpen, setLessonOpen] = useState(false)
  const [lessonSeed, setLessonSeed] = useState<AdminLesson | null>(null)
  // دیالوگ نظرها (ساخت/ویرایش نظر منتخب و نظرهای کاربران)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewSeed, setReviewSeed] = useState<AdminReview | null>(null)

  // 🔔 فیدبک «بررسی همین حالا» — فلاش کوتاه روی تب مقصد + اسکرول نرم به نوار تب‌ها
  //  (قبلاً کلیک روی همین تبِ فعال هیچ بازخوردی نمی‌داد و دکمه «کار نمی‌کند» به نظر می‌رسید)
  const tabsRef = useRef<HTMLDivElement>(null)
  const [flashTab, setFlashTab] = useState<string | null>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 🔢 صفحهٔ فعلی هر لیست — با تغییر تب یا جستجو به صفحهٔ ۱ برمی‌گردد
  const PER_PAGE = 6 // لیست‌های کارتی (پیام‌ها/ثبت‌نام‌ها/خبرنامه)
  const POSTS_PER_PAGE = 8 // ردیف‌های فشردهٔ وبلاگ
  const [page, setPage] = useState(1)
  const [prevListKey, setPrevListKey] = useState('')
  const listKey = `${tab}|${search.trim().toLowerCase()}`
  // الگوی رسمی ریکت: تنظیم state هنگام رندر (بدون effect)
  if (prevListKey !== listKey) {
    setPrevListKey(listKey)
    setPage(1)
  }

  // با ناوبری به صفحهٔ دیگر، فرم مقالهٔ جدید بسته شود
  useCloseOnNavigate(useCallback(() => setNewPostOpen(false), []))

  // توکن ذخیره‌شده در این تب مرورگر خوانده شود (sessionStorage)
  useEffect(() => {
    setToken(sessionStorage.getItem(STORAGE_KEY))
    setChecked(true)
  }, [])

  // پاک‌سازی تایمر فلاش هنگام خروج
  useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current)
    },
    []
  )

  /** پرش به تب مقصد با بازخورد واضح: پاک‌کردن جست‌وجو (تا موارد در انتظار پنهان نباشند)،
   *  فلاش روی تب فعال و اسکرول نرم به نوار تب‌ها — حتی اگر همین تب از قبل فعال باشد */
  const goToPending = useCallback((t: 'messages' | 'registrations' | 'reviews') => {
    setTab(t)
    setSearch('')
    setFlashTab(t)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlashTab(null), 1900)
    requestAnimationFrame(() => {
      tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [])

  // 🔎 فاز ۵۲ — باز کردن نتیجهٔ جست‌وجوی سراسری در تب مربوطه (صفحهٔ جزئیات موجود)
  const handleSearchOpen = useCallback((target: SearchTarget, q: string) => {
    if (target === 'users') {
      setTab('students')
      setStudentsQuery(q)
      setStudentsDebounced(q)
    } else if (target === 'orders' || target === 'payments') {
      setTab('orders')
      setSearch(q)
    } else if (target === 'classes') {
      setTab('classes')
      setSearch(q)
    } else if (target === 'discounts') {
      setTab('discounts')
      setSearch(q)
    }
  }, [])

  const logout = useCallback(() => {
    // سشن سمت سرور هم باطل می‌شود — حتی اگر توکن جایی کپی شده باشد
    const t = sessionStorage.getItem(STORAGE_KEY)
    if (t) fetch('/api/admin/logout', { method: 'POST', headers: { 'x-admin-key': t } }).catch(() => {})
    sessionStorage.removeItem(STORAGE_KEY)
    setToken(null)
  }, [])

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const headers = { 'x-admin-key': token }
      // اگر هر API برگشت 401 داد (مثلاً بعد از عوض‌کردن رمز)، برگرد به صفحهٔ ورود
      const get = async (url: string) => {
        const res = await fetch(url, { headers })
        if (res.status === 401) return { unauthorized: true as const }
        return res.ok ? res.json() : {}
      }
      const [m, r, n, p, s, rev, wc, qq, tc, ls, st, ps, fd, dc, reva, fda] = await Promise.all([
        get('/api/support'),
        get('/api/register'),
        get('/api/newsletter'),
        get('/api/posts'),
        get('/api/admin/stats'),
        get('/api/testimonials'),
        get('/api/learn/cards'),
        get('/api/learn/quiz'),
        get('/api/teachers'),
        get('/api/learn/lessons'),
        get('/api/settings'),
        get('/api/payment-settings'),
        get('/api/faq'),
        get('/api/discounts'),
        get('/api/testimonials?archived=1'),
        get('/api/faq?archived=1'),
      ])
      if (
        'unauthorized' in m ||
        'unauthorized' in r ||
        'unauthorized' in n ||
        'unauthorized' in p ||
        'unauthorized' in s ||
        'unauthorized' in fd
      ) {
        // توکن ذخیره‌شده دیگر معتبر نیست → خروج و نمایش صفحهٔ ورود
        sessionStorage.removeItem(STORAGE_KEY)
        setToken(null)
        return
      }
      setMessages(m.messages ?? [])
      setRegistrations(r.registrations ?? [])
      setSubscribers(n.subscribers ?? [])
      setPosts(p.posts ?? [])
      setReviews(rev.testimonials ?? [])
      setFaqs(fd.faqs ?? [])
      setArchivedReviews(reva?.testimonials ?? [])
      setArchivedFaqs(fda?.faqs ?? [])
      setDiscounts(dc.discounts ?? [])
      setLearnCards(wc.cards ?? [])
      setQuizQuestions(qq.questions ?? [])
      setTeachers(tc.teachers ?? [])
      setLessons(ls.lessons ?? [])
      setBankSettings(ps?.settings ?? null)
      setSettings({
        announcement: st?.settings?.announcement ?? null,
        homeStats: st?.settings?.homeStats ?? null,
        hero: st?.settings?.hero ?? null,
      })
      setStats(s)
    } catch {
      // خطاها بی‌صدا — UI خالی نشان داده می‌شود
    } finally {
      setLoading(false)
    }
  }, [token])

  // بار اول + با هر تغییر تب، داده‌ها تازه واکشی شوند
  useEffect(() => {
    load()
  }, [tab, load])

  // ----- عملیات وضعیت/حذف -----
  const setMsgStatus = useCallback(
    async (id: string, status: string) => {
      if (!token) return
      await fetch(`/api/support/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': token },
        body: JSON.stringify({ status }),
      })
      load()
    },
    [token, load]
  )

  const setRegStatus = useCallback(
    async (id: string, status: string) => {
      if (!token) return
      await fetch(`/api/register/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': token },
        body: JSON.stringify({ status }),
      })
      load()
    },
    [token, load]
  )

  const deleteItem = useCallback(
    async (kind: 'support' | 'register' | 'newsletter' | 'posts', id: string) => {
      if (!token) return
      await fetch(`/api/${kind}/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': token },
      })
      load()
    },
    [token, load]
  )

  const togglePost = useCallback(
    async (id: string, published: boolean) => {
      if (!token) return
      await fetch('/api/posts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': token },
        body: JSON.stringify({ id, published }),
      })
      load()
    },
    [token, load]
  )

  // ----- عملیات نظرات کاربران (تأیید/رد/حذف) -----
  const setReviewStatus = useCallback(
    async (id: string, status: string, toast?: string) => {
      if (!token) return
      await fetch('/api/testimonials', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': token },
        body: JSON.stringify({ id, status }),
      })
      if (toast) onToast?.(toast)
      load()
    },
    [token, load, onToast]
  )

  // ----- ⭐ تاگل نظر منتخب (featured) — نمایش در کاروسل خانه و بخش Testimonials صفحهٔ نظرات
  const toggleReviewFeatured = useCallback(
    async (id: string, featured: boolean) => {
      if (!token) return
      await fetch('/api/testimonials', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': token },
        body: JSON.stringify({ id, featured }),
      })
      onToast?.(featured ? a.reviewFeaturedToast : a.reviewUnfeaturedToast)
      load()
    },
    [token, load, onToast]
  )

  // ----- 🗄️ بازگردانی از بایگانی (حذف نرم نظرات/سؤالات — فاز ۵۵)
  const restoreArchived = useCallback(
    async (kind: 'testimonial' | 'faq', id: string) => {
      if (!token) return
      const url = kind === 'testimonial' ? '/api/testimonials' : '/api/faq'
      await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': token },
        body: JSON.stringify({ id, restore: true }),
      })
      onToast?.(a.restoreSuccessToast)
      load()
    },
    [token, load, onToast]
  )

  // ----- 📥 درون‌ریزی پیش‌فرض‌های فایل محتوا (درس‌ها/واژه‌ها/سؤالات) -----
  const seedDefaults = useCallback(
    async (kind: 'lessons' | 'words' | 'quiz' | 'teachers' | 'testimonials') => {
      if (!token) return
      try {
        const res = await fetch('/api/learn/seed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-key': token },
          body: JSON.stringify({ kind }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          onToast?.(a.seedError)
          return
        }
        if ((data.inserted ?? 0) === 0) onToast?.(a.seedNothing)
        else if (kind === 'lessons') onToast?.(a.lessonsImportedToast)
        else if (kind === 'teachers') onToast?.(a.seedTeachersDone)
        else if (kind === 'testimonials') onToast?.(a.seedTestimonialsDone)
        else onToast?.(kind === 'words' ? a.seedWordsDone : a.seedQuizDone)
        load()
      } catch {
        onToast?.(a.seedError)
      }
    },
    [token, load, onToast]
  )

  // 👥 جست‌وجوی تب Students با تأخیر ۳۰۰ms — تایپ روان بماند و API کمتر صدا زده شود
  useEffect(() => {
    const t = setTimeout(() => setStudentsDebounced(studentsQuery.trim()), 300)
    return () => clearTimeout(t)
  }, [studentsQuery])

  // 👥 واکشی فهرست کاربران — فقط وقتی تب فعال است (تنبل) و با تغییر فیلتر/جست‌وجو دوباره
  const loadStudents = useCallback(async () => {
    if (!token) return
    setStudentsLoading(true)
    setStudentsError(false)
    try {
      const params = new URLSearchParams({ filter: studentsFilter })
      if (studentsDebounced) params.set('q', studentsDebounced)
      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        headers: { 'x-admin-key': token }, // همان گارد بقیهٔ APIهای ادمین
      })
      if (res.status === 401) {
        // توکن دیگر معتبر نیست — همان رفتار بقیهٔ تب‌ها: بازگشت به صفحهٔ ورود
        sessionStorage.removeItem(STORAGE_KEY)
        setToken(null)
        return
      }
      if (!res.ok) throw new Error('load users failed')
      const data = (await res.json()) as AdminStudentsResp
      setStudents(data.users ?? [])
      setStudentsMeta({ total: data.total ?? 0, counts: data.counts })
    } catch {
      setStudentsError(true)
    } finally {
      setStudentsLoading(false)
    }
  }, [token, studentsFilter, studentsDebounced])

  useEffect(() => {
    if (tab === 'students') loadStudents()
  }, [tab, loadStudents])

  // 👤 باز کردن دیالوگ جزئیات کاربر — پروفایل + سفارش‌ها + درخواست‌های کلاس
  const openStudentDetail = useCallback(
    async (id: string) => {
      if (!token) return
      setStudentDetailOpen(true)
      setStudentDetailLoading(true)
      setStudentDetail(null)
      try {
        const res = await fetch(`/api/admin/users/${encodeURIComponent(id)}`, {
          headers: { 'x-admin-key': token },
        })
        if (res.status === 401) {
          sessionStorage.removeItem(STORAGE_KEY)
          setToken(null)
          setStudentDetailOpen(false)
          return
        }
        if (!res.ok) throw new Error('load user failed')
        setStudentDetail((await res.json()) as StudentDetail)
      } catch {
        setStudentDetailOpen(false)
        onToast?.(a.students.loadError)
      } finally {
        setStudentDetailLoading(false)
      }
    },
    [token, onToast]
  )

  const closeStudentDetail = useCallback(() => {
    setStudentDetailOpen(false)
    setStudentDetail(null)
  }, [])

  if (!checked) return <div id="page-admin" className="pt-40" />

  if (!token) return <LoginGate onLogin={setToken} />

  const q = search.trim().toLowerCase()
  const filteredMessages = messages.filter(
    (m) =>
      !q ||
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.message.toLowerCase().includes(q)
  )
  const filteredRegistrations = registrations.filter(
    (r) => !q || r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)
  )
  const filteredPosts = posts.filter((p) => !q || p.title.toLowerCase().includes(q))
  const filteredReviews = reviews.filter(
    (t) => !q || t.name.toLowerCase().includes(q) || t.text.toLowerCase().includes(q)
  )
  const filteredWords = learnCards.filter(
    (w) =>
      !q ||
      w.chinese.toLowerCase().includes(q) ||
      w.pinyin.toLowerCase().includes(q) ||
      w.meaning.toLowerCase().includes(q)
  )
  const filteredQuiz = quizQuestions.filter(
    (item) => !q || item.question.toLowerCase().includes(q)
  )
  const filteredTeachers = teachers.filter(
    (t) => !q || t.name.toLowerCase().includes(q) || t.role.toLowerCase().includes(q)
  )
  const filteredLessons = lessons.filter(
    (l) => !q || l.title.toLowerCase().includes(q) || l.slug.toLowerCase().includes(q)
  )

  // 🔢 برش صفحهٔ فعلی برای لیست‌های صفحه‌بندی‌شده
  //  اگر با حذف/جستجو آیتم‌های صفحهٔ فعلی کم شوند، به آخرین صفحهٔ معتبر برمی‌گردیم
  //  ردیف‌های وبلاگ کوتاه‌تر از کارت‌ها هستند → اندازهٔ صفحهٔ مخصوص خودش را دارد
  const clampPage = (total: number, per: number = PER_PAGE) =>
    Math.min(page, Math.max(1, Math.ceil(total / per)))
  const msgPage = clampPage(filteredMessages.length)
  const regPage = clampPage(filteredRegistrations.length)
  const subPage = clampPage(subscribers.length)
  const postPage = clampPage(filteredPosts.length, POSTS_PER_PAGE)
  const pagedMessages = filteredMessages.slice((msgPage - 1) * PER_PAGE, msgPage * PER_PAGE)
  const pagedRegistrations = filteredRegistrations.slice(
    (regPage - 1) * PER_PAGE,
    regPage * PER_PAGE
  )
  const pagedSubscribers = subscribers.slice((subPage - 1) * PER_PAGE, subPage * PER_PAGE)
  const pagedPosts = filteredPosts.slice((postPage - 1) * POSTS_PER_PAGE, postPage * POSTS_PER_PAGE)
  const revPage = clampPage(filteredReviews.length)
  const wordPage = clampPage(filteredWords.length, POSTS_PER_PAGE)
  const quizPage = clampPage(filteredQuiz.length, POSTS_PER_PAGE)
  const teacherPage = clampPage(filteredTeachers.length, POSTS_PER_PAGE)
  const lessonPage = clampPage(filteredLessons.length, POSTS_PER_PAGE)
  const pagedReviews = filteredReviews.slice((revPage - 1) * PER_PAGE, revPage * PER_PAGE)
  const pagedWords = filteredWords.slice((wordPage - 1) * POSTS_PER_PAGE, wordPage * POSTS_PER_PAGE)
  const pagedQuiz = filteredQuiz.slice((quizPage - 1) * POSTS_PER_PAGE, quizPage * POSTS_PER_PAGE)
  const pagedTeachers = filteredTeachers.slice((teacherPage - 1) * POSTS_PER_PAGE, teacherPage * POSTS_PER_PAGE)
  const pagedLessons = filteredLessons.slice((lessonPage - 1) * POSTS_PER_PAGE, lessonPage * POSTS_PER_PAGE)
  const totalMessagePages = Math.max(1, Math.ceil(filteredMessages.length / PER_PAGE))
  const totalRegistrationPages = Math.max(1, Math.ceil(filteredRegistrations.length / PER_PAGE))
  const totalSubscriberPages = Math.max(1, Math.ceil(subscribers.length / PER_PAGE))
  const totalPostPages = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE))
  const totalReviewPages = Math.max(1, Math.ceil(filteredReviews.length / PER_PAGE))
  const totalWordPages = Math.max(1, Math.ceil(filteredWords.length / POSTS_PER_PAGE))
  const totalQuizPages = Math.max(1, Math.ceil(filteredQuiz.length / POSTS_PER_PAGE))
  const totalTeacherPages = Math.max(1, Math.ceil(filteredTeachers.length / POSTS_PER_PAGE))
  const totalLessonPages = Math.max(1, Math.ceil(filteredLessons.length / POSTS_PER_PAGE))

  const statCards = stats
    ? [
        {
          icon: Mail,
          label: a.statMessages,
          total: stats.messages.total,
          alert: stats.messages.new,
          iconCls: 'bg-sage-light/40 text-sage-dark',
        },
        {
          icon: GraduationCap,
          label: a.statRegistrations,
          total: stats.registrations.total,
          alert: stats.registrations.new,
          iconCls: 'bg-butter/40 text-brown',
        },
        {
          icon: Users,
          label: a.statSubscribers,
          total: stats.subscribers.total,
          alert: 0,
          iconCls: 'bg-peach-light/50 text-brown',
        },
        {
          icon: Newspaper,
          label: a.statPosts,
          total: stats.posts.total,
          alert: 0,
          sub: stats.posts.totalViews > 0 ? `${stats.posts.totalViews} ${a.postViewsLabel}` : undefined,
          iconCls: 'bg-sage-light/40 text-sage-dark',
        },
        // 💬 نظرات کاربران — عدد alert = نظرهای در انتظار بررسی
        {
          icon: MessageSquareQuote,
          label: a.statReviews,
          total: stats.reviews?.total ?? 0,
          alert: stats.reviews?.pending ?? 0,
          iconCls: 'bg-peach-light/50 text-brown',
        },
      ]
    : []

  // 🔔 شمارندهٔ موارد در انتظار بررسی — از روی لیست‌های واقعی (پیام/ثبت‌نام جدید، نظر در انتظار تأیید)
  const pendingMessages = messages.filter((m) => m.status === 'new').length
  const pendingRegistrations = registrations.filter((r) => r.status === 'new').length
  const pendingReviews = reviews.filter((r) => r.status === 'pending').length
  const pendingTotal = pendingMessages + pendingRegistrations + pendingReviews

  // 👥 چیپ‌های فیلتر تب Students — شمارنده‌ها از سرور می‌آیند و روی کل کاربران حساب شده‌اند
  //  (مستقل از فیلتر فعلی)، پس با عوض‌کردن فیلتر هم درست می‌مانند؛ چیپ Unpaid لهجهٔ کهربایی دارد
  const studentsChips: { key: StudentFilter; label: string; count: number; amber?: boolean }[] = [
    { key: 'all', label: a.students.filterAll, count: studentsMeta?.counts.all ?? 0 },
    { key: 'new', label: a.students.filterNew, count: studentsMeta?.counts.new ?? 0 },
    { key: 'no-purchase', label: a.students.filterNoPurchase, count: studentsMeta?.counts.noPurchase ?? 0 },
    { key: 'unpaid', label: a.students.filterUnpaid, count: studentsMeta?.counts.unpaid ?? 0, amber: true },
    { key: 'paid', label: a.students.filterPaid, count: studentsMeta?.counts.paid ?? 0 },
    { key: 'underpaid', label: a.students.filterUnderpaid, count: studentsMeta?.counts.underpaid ?? 0 },
    { key: 'expired', label: a.students.filterExpired, count: studentsMeta?.counts.expired ?? 0 },
    { key: 'cancelled', label: a.students.filterCancelled, count: studentsMeta?.counts.cancelled ?? 0 },
  ]

  const tabs = [
    // 📊 فاز ۵۲ — داشبورد واقعی، تب پیش‌فرض پنل
    { key: 'dashboard' as const, label: a.tabDashboard, count: 0, alert: 0, icon: LayoutDashboard },
    { key: 'classes' as const, label: a.tabClasses, count: 0, alert: 0, icon: School },
    { key: 'messages' as const, label: a.tabMessages, count: messages.length, alert: pendingMessages, icon: Mail },
    { key: 'registrations' as const, label: a.tabRegistrations, count: registrations.length, alert: pendingRegistrations, icon: GraduationCap },
    { key: 'scheduling' as const, label: a.tabSchedule, count: 0, alert: 0, icon: CalendarDays },
    { key: 'students' as const, label: a.tabStudents, count: studentsMeta?.total ?? 0, alert: studentsMeta?.counts.unpaid ?? 0, icon: UsersRound },
    { key: 'orders' as const, label: a.tabOrders, count: 0, alert: payCounts?.pendingReview ?? 0, icon: CreditCard },
    { key: 'reviews' as const, label: a.tabReviews, count: reviews.length, alert: pendingReviews, icon: MessageSquareQuote },
    { key: 'faq' as const, label: a.tabFaq, count: faqs.length, alert: 0, icon: HelpCircle },
    { key: 'discounts' as const, label: a.tabDiscounts, count: discounts.length, alert: 0, icon: TicketPercent },
    { key: 'blog' as const, label: a.tabBlog, count: posts.length, alert: 0, icon: Newspaper },
    { key: 'lessons' as const, label: a.tabLessons, count: lessons.length, alert: 0, icon: BookOpen },
    { key: 'words' as const, label: a.tabWords, count: learnCards.length, alert: 0, icon: Layers },
    { key: 'quiz' as const, label: a.tabQuiz, count: quizQuestions.length, alert: 0, icon: ListChecks },
    { key: 'teachers' as const, label: a.tabTeachers, count: teachers.length, alert: 0, icon: UserRound },
    { key: 'newsletter' as const, label: a.tabNewsletter, count: subscribers.length, alert: 0, icon: Users },
    // 💾 فاز ۵۲ — پشتیبان‌گیری/بازیابی دیتابیس
    { key: 'backup' as const, label: a.tabBackup, count: 0, alert: 0, icon: DatabaseBackup },
    // 🧾 فاز ۵۳ — خروجی داده + Audit Log + خطاهای سرور
    { key: 'logs' as const, label: a.tabLogs, count: 0, alert: 0, icon: ScrollText },
    { key: 'settings' as const, label: a.tabSettings, count: 0, alert: 0, icon: SlidersHorizontal },
  ]

  return (
    <div id="page-admin">
      <section className="pt-32 pb-10 md:pt-40">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div>
              <span className="inline-flex items-center gap-1.5 bg-sage-light/40 rounded-full px-4 py-1.5 mb-3 text-xs font-semibold uppercase tracking-widest text-sage-dark">
                <ShieldCheck className="w-3.5 h-3.5" />
                Internal
              </span>
              <h1 className="text-3xl md:text-4xl font-bold text-brown-dark mb-1">{a.title}</h1>
              <p className="text-brown-light text-sm">{a.subtitle}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={load}
                className="bg-white border border-sage-light/40 text-brown px-4 py-2.5 rounded-xl text-sm font-medium hover:border-sage transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {a.refresh}
              </button>
              <button
                onClick={logout}
                title={a.logout}
                className="bg-white border border-sage-light/40 text-brown px-4 py-2.5 rounded-xl text-sm font-medium hover:border-red-200 hover:text-red-500 transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                {a.logout}
              </button>
              <a
                href="#/home"
                className="bg-sage text-brown-dark px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-sage-dark transition-colors inline-flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                {a.backToSite}
              </a>
            </div>
          </div>

          {/* 🔎 جست‌وجوی سراسری پنل — کوئری سمت سرور/دیتابیس (فاز ۵۲ — بند ۸) */}
          <div className="mb-6 flex justify-end">
            <AdminGlobalSearch token={token} onOpen={handleSearchOpen} />
          </div>

          {/* 🔔 نوار اعلان — مواردی که منتظر بررسی‌اند (کلیک روی هر چیپ = پرش به همان تب) */}
          {pendingTotal > 0 && (
            <div
              className="mb-6 bg-white/85 border border-peach/60 rounded-2xl px-5 py-4 flex flex-wrap items-center gap-3 shadow-sm"
              role="status"
            >
              <span className="relative flex h-2.5 w-2.5 flex-shrink-0" aria-hidden="true">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-peach opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-peach-dark/70"></span>
              </span>
              <p className="text-sm font-semibold text-brown-dark flex-1 min-w-48">
                <span className="tabular-nums">{pendingTotal}</span> {a.attentionBanner}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {pendingMessages > 0 && (
                  <button
                    onClick={() => goToPending('messages')}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white border border-sage-light/50 text-brown hover:border-sage transition-all cursor-pointer min-h-[32px]"
                  >
                    {a.tabMessages} · <span className="tabular-nums">{pendingMessages}</span>
                  </button>
                )}
                {pendingRegistrations > 0 && (
                  <button
                    onClick={() => goToPending('registrations')}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white border border-sage-light/50 text-brown hover:border-sage transition-all cursor-pointer min-h-[32px]"
                  >
                    {a.tabRegistrations} · <span className="tabular-nums">{pendingRegistrations}</span>
                  </button>
                )}
                {pendingReviews > 0 && (
                  <button
                    onClick={() => goToPending('reviews')}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white border border-sage-light/50 text-brown hover:border-sage transition-all cursor-pointer min-h-[32px]"
                  >
                    {a.tabReviews} · <span className="tabular-nums">{pendingReviews}</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    if (pendingMessages > 0) goToPending('messages')
                    else if (pendingRegistrations > 0) goToPending('registrations')
                    else goToPending('reviews')
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-full bg-sage text-brown-dark hover:bg-sage-dark transition-all cursor-pointer min-h-[32px]"
                >
                  <Bell className="w-3.5 h-3.5" aria-hidden="true" />
                  {a.attentionGo}
                </button>
              </div>
            </div>
          )}

          {/* 📊 کارت‌های آمار */}
          {statCards.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {statCards.map((s) => {
                const Icon = s.icon
                return (
                  <div
                    key={s.label}
                    className="bg-white rounded-2xl border border-sage-light/20 p-4 flex items-center gap-3"
                  >
                    <span className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${s.iconCls}`}>
                      <Icon className="w-5 h-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-2xl font-bold text-brown-dark leading-none">{s.total}</p>
                      <p className="text-[11px] font-semibold text-brown-light mt-1 truncate">
                        {s.label}
                        {s.alert > 0 && (
                          <span className="text-sage-dark font-bold"> · {s.alert} {a.needAttention}</span>
                        )}
                      </p>
                      {'sub' in s && s.sub && (
                        <p className="text-[10px] text-brown-light/80 truncate">{s.sub}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* تب‌ها */}
          <div ref={tabsRef} className="flex flex-wrap gap-3 mb-6 scroll-mt-32">
            {tabs.map((t) => {
              const Icon = t.icon
              const active = tab === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`filter-btn px-5 py-2.5 rounded-full text-sm font-medium inline-flex items-center gap-2 transition-all cursor-pointer ${
                    active ? 'active' : 'bg-sage-light/30 text-brown'
                  } ${active && flashTab === t.key ? 'ct-tab-flash' : ''}`}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                  <span className="bg-white/70 text-brown-dark text-xs font-bold px-2 py-0.5 rounded-full">
                    {t.count}
                  </span>
                  {t.alert > 0 && (
                    <span
                      title={a.needAttention}
                      className="inline-flex items-center gap-1 bg-peach text-brown-dark text-xs font-bold px-2 py-0.5 rounded-full"
                    >
                      <Bell className="w-3 h-3" aria-hidden="true" />
                      {t.alert}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* جستجو + خروجی CSV + دکمهٔ مقالهٔ جدید */}
          <div className="flex flex-wrap gap-3 mb-6">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              aria-label="Search admin items"
              className={`${inputSoft} flex-1 min-w-48`}
            />
            {/* ⬇️ خروجی CSV هر تب — فقط ردیف‌های فیلترشدهٔ فعلی */}
            {tab === 'messages' && filteredMessages.length > 0 && (
              <button
                onClick={() =>
                  downloadCsv(a.exportCsvMessages, [
                    ['Name', 'Email', 'Topic', 'Status', 'Date', 'Message'],
                    ...filteredMessages.map((m) => [
                      m.name,
                      m.email,
                      m.topic,
                      m.status,
                      m.createdAt,
                      m.message,
                    ]),
                  ])
                }
                className="flex-shrink-0 bg-white border border-sage-light/40 text-brown px-4 py-2.5 rounded-xl text-sm font-medium hover:border-sage transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <Download className="w-4 h-4 text-sage-dark" />
                {a.exportCsv}
              </button>
            )}
            {tab === 'registrations' && filteredRegistrations.length > 0 && (
              <button
                onClick={() =>
                  downloadCsv(a.exportCsvRegistrations, [
                    ['Name', 'Email', 'Phone', 'Level', 'Type', 'Class', 'Schedule', 'Status', 'Date', 'Goal', 'Message'],
                    ...filteredRegistrations.map((r) => [
                      r.name,
                      r.email,
                      r.phone,
                      r.level,
                      r.classType,
                      r.classTitle ?? '',
                      r.schedule,
                      r.status,
                      r.createdAt,
                      r.goal,
                      r.message,
                    ]),
                  ])
                }
                className="flex-shrink-0 bg-white border border-sage-light/40 text-brown px-4 py-2.5 rounded-xl text-sm font-medium hover:border-sage transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <Download className="w-4 h-4 text-sage-dark" />
                {a.exportCsv}
              </button>
            )}
            {tab === 'newsletter' && subscribers.length > 0 && (
              <button
                onClick={() =>
                  downloadCsv(a.exportCsvNewsletter, [
                    ['Email', 'Subscribed At'],
                    ...subscribers.map((s) => [s.email, s.createdAt]),
                  ])
                }
                className="flex-shrink-0 bg-white border border-sage-light/40 text-brown px-4 py-2.5 rounded-xl text-sm font-medium hover:border-sage transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <Download className="w-4 h-4 text-sage-dark" />
                {a.exportCsv}
              </button>
            )}
            {/* ⬇️ خروجی CSV نظرات کاربران */}
            {tab === 'reviews' && reviews.length > 0 && (
              <button
                onClick={() =>
                  downloadCsv(a.exportCsvReviews, [
                    ['Name', 'Role', 'Rating', 'Status', 'Featured', 'Date', 'Review'],
                    ...reviews.map((r) => [
                      r.name,
                      r.role ?? '',
                      String(r.rating),
                      r.status,
                      r.featured ? 'yes' : 'no',
                      r.createdAt,
                      r.text,
                    ]),
                  ])
                }
                className="flex-shrink-0 bg-white border border-sage-light/40 text-brown px-4 py-2.5 rounded-xl text-sm font-medium hover:border-sage transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <Download className="w-4 h-4 text-sage-dark" />
                {a.exportCsv}
              </button>
            )}
            {tab === 'blog' && (
              <button
                onClick={() => {
                  setPostSeed(null)
                  setEditMode(false)
                  setNewPostOpen(true)
                }}
                className="flex-shrink-0 bg-sage text-brown-dark px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-sage-dark transition-colors cursor-pointer inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {a.newPostButton}
              </button>
            )}
            {tab === 'words' && (
              <>
                {/* 📥 درون‌ریزی پیش‌فرض‌ها — لغاتی که در Learn دیده می‌شود به پنل بیاید */}
                <button
                  onClick={() => seedDefaults('words')}
                  title={a.seedWordsButton}
                  className="flex-shrink-0 bg-white border border-sage-light/40 text-brown px-4 py-2.5 rounded-xl text-sm font-medium hover:border-sage transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <Download className="w-4 h-4 text-sage-dark" />
                  {a.seedWordsButton}
                </button>
                <button
                  onClick={() => {
                    setWordSeed(null)
                    setWordOpen(true)
                  }}
                  className="flex-shrink-0 bg-sage text-brown-dark px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-sage-dark transition-colors cursor-pointer inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {a.newWordButton}
                </button>
              </>
            )}
            {tab === 'quiz' && (
              <>
                <button
                  onClick={() => seedDefaults('quiz')}
                  title={a.seedQuizButton}
                  className="flex-shrink-0 bg-white border border-sage-light/40 text-brown px-4 py-2.5 rounded-xl text-sm font-medium hover:border-sage transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <Download className="w-4 h-4 text-sage-dark" />
                  {a.seedQuizButton}
                </button>
                <button
                  onClick={() => {
                    setQuizSeed(null)
                    setQuizOpen(true)
                  }}
                  className="flex-shrink-0 bg-sage text-brown-dark px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-sage-dark transition-colors cursor-pointer inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {a.newQuizButton}
                </button>
              </>
            )}
            {tab === 'teachers' && (
              <button
                onClick={() => {
                  setTeacherSeed(null)
                  setTeacherOpen(true)
                }}
                className="flex-shrink-0 bg-sage text-brown-dark px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-sage-dark transition-colors cursor-pointer inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {a.newTeacherButton}
              </button>
            )}
          </div>

          {/* محتوای تب‌ها */}
          {loading ? (
            <div className="text-center py-20 text-brown-light">
              <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin text-sage-dark" />
              <p className="text-sm">Loading...</p>
            </div>
          ) : (
            <>
              {/* پیام‌های پشتیبانی */}
              {tab === 'messages' && (
                <div>
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                    {filteredMessages.length === 0 && (
                      <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-sage-light/50">
                        <Inbox className="w-10 h-10 mx-auto mb-3 text-brown-light/50" />
                        <p className="text-sm text-brown-light">{a.emptyMessages}</p>
                      </div>
                    )}
                    {pagedMessages.map((m) => (
                      <div key={m.id} className={cardCls}>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="w-9 h-9 bg-sage-light/30 rounded-xl flex items-center justify-center">
                            <User className="w-4.5 h-4.5 text-sage-dark" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-brown-dark flex items-center gap-2">
                              {m.name} <NewBadge show={m.status === 'new'} />
                            </p>
                            <a
                              href={`mailto:${m.email}`}
                              className="text-xs text-sage-dark hover:underline"
                            >
                              {m.email}
                            </a>
                          </div>
                          <span className="ml-auto text-xs text-brown-light inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {fmtDate(m.createdAt)}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="inline-block bg-butter/25 text-brown text-xs font-medium px-3 py-1 rounded-full">
                            {m.topic}
                          </span>
                          <StatusPill status={m.status} />
                        </div>
                        <p className="text-sm text-brown-light leading-relaxed whitespace-pre-line mb-3">
                          {m.message}
                        </p>
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-sage-light/15">
                          <StatusSwitch
                            value={m.status}
                            options={[
                              { key: 'new', label: a.statusNew },
                              { key: 'in-progress', label: a.statusInProgress },
                              { key: 'resolved', label: a.statusResolved },
                            ]}
                            onChange={(k) => setMsgStatus(m.id, k)}
                          />
                          <DeleteButton
                            label={a.deleteButton}
                            onConfirm={() => deleteItem('support', m.id)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <Pagination
                    page={msgPage}
                    totalPages={totalMessagePages}
                    onPage={setPage}
                  />
                </div>
              )}

              {/* ثبت‌نام‌ها */}
              {tab === 'registrations' && (
                <div>
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                    {filteredRegistrations.length === 0 && (
                      <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-sage-light/50">
                        <Inbox className="w-10 h-10 mx-auto mb-3 text-brown-light/50" />
                        <p className="text-sm text-brown-light">{a.emptyRegistrations}</p>
                      </div>
                    )}
                    {pagedRegistrations.map((r) => (
                      <div key={r.id} className={cardCls}>
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <span className="w-9 h-9 bg-butter/25 rounded-xl flex items-center justify-center">
                            <GraduationCap className="w-5 h-5 text-brown" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-brown-dark flex items-center gap-2">
                              {r.name} <NewBadge show={r.status === 'new'} />
                            </p>
                            <a
                              href={`mailto:${r.email}`}
                              className="text-xs text-sage-dark hover:underline"
                            >
                              {r.email}
                            </a>
                            {r.phone && (
                              <span className="text-xs text-brown-light block">{r.phone}</span>
                            )}
                          </div>
                          <span className="ml-auto text-xs text-brown-light inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {fmtDate(r.createdAt)}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <span className="bg-sage/20 text-sage-dark text-xs font-medium px-3 py-1 rounded-full">
                            {r.level}
                          </span>
                          <span className="bg-butter/25 text-brown text-xs font-medium px-3 py-1 rounded-full">
                            {r.classType}
                          </span>
                          {r.schedule && (
                            <span className="bg-peach-light/40 text-brown text-xs font-medium px-3 py-1 rounded-full">
                              {r.schedule}
                            </span>
                          )}
                          <StatusPill status={r.status} />
                        </div>
                        {r.goal && (
                          <p className="text-sm text-brown-light mb-1">
                            <span className="font-semibold text-brown-dark">Goal: </span>
                            {r.goal}
                          </p>
                        )}
                        {r.message && (
                          <p className="text-sm text-brown-light whitespace-pre-line mb-3">{r.message}</p>
                        )}
                        {/* 🗓️ ترجیحات برنامه — اصلی کاربر + معادل تهران (فاز ۴۷) */}
                        <RegistrationSchedulingLines reg={r} />
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-sage-light/15">
                          <StatusSwitch
                            value={r.status}
                            options={[
                              { key: 'new', label: a.statusNew },
                              { key: 'contacted', label: a.statusContacted },
                              { key: 'enrolled', label: a.statusEnrolled },
                            ]}
                            onChange={(k) => setRegStatus(r.id, k)}
                          />
                          <DeleteButton
                            label={a.deleteButton}
                            onConfirm={() => deleteItem('register', r.id)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <Pagination
                    page={regPage}
                    totalPages={totalRegistrationPages}
                    onPage={setPage}
                  />
                  {/* 🗓️ هم‌پوشانی ترجیحات + گروه‌بندی کلاس/مشتری (فاز ۴۷) */}
                  <ScheduleMatchesPanel registrations={registrations} />
                </div>
              )}

              {/* 👥 Students — کاربران ثبت‌نام‌شده با وضعیت خرید واقعی (ثبت‌نام ≠ پرداخت) */}
              {tab === 'students' && (
                <div>
                  <p className="text-xs text-brown-light bg-butter/20 rounded-xl px-4 py-2.5 mb-4">
                    {a.students.subtitle}
                  </p>

                  {/* چیپ‌های فیلتر — چیپ Unpaid با لهجهٔ کهربایی برجسته می‌شود */}
                  <div className="flex flex-wrap items-center gap-2 mb-4" role="group" aria-label={a.students.dPurchaseStatus}>
                    {studentsChips.map((c) => {
                      const active = studentsFilter === c.key
                      return (
                        <button
                          key={c.key}
                          onClick={() => setStudentsFilter(c.key)}
                          aria-pressed={active}
                          className={`filter-btn px-3.5 py-2 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 border transition-all cursor-pointer min-h-[36px] ${
                            active
                              ? `active border-transparent ${c.amber ? 'ring-2 ring-butter/80' : ''}`
                              : c.amber
                                ? 'bg-butter/30 text-brown border-butter/60 hover:bg-butter/50'
                                : 'bg-white text-brown border-sage-light/40 hover:border-sage'
                          }`}
                        >
                          {c.label}
                          <span className={`tabular-nums ${active ? 'text-brown-dark' : 'text-brown-light'}`}>
                            {c.count}
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  {/* جست‌وجو — با تأخیر ۳۰۰ms به سرور می‌رود (q) */}
                  <input
                    type="text"
                    value={studentsQuery}
                    onChange={(e) => setStudentsQuery(e.target.value)}
                    placeholder={a.students.searchPlaceholder}
                    aria-label={a.students.searchPlaceholder}
                    className={`${inputSoft} mb-4`}
                  />

                  {studentsError ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-red-200">
                      <p className="text-sm font-semibold text-red-500">{a.students.loadError}</p>
                    </div>
                  ) : studentsLoading && students.length === 0 ? (
                    <div className="text-center py-16 text-brown-light">
                      <RefreshCw className="w-6 h-6 mx-auto mb-3 animate-spin text-sage-dark" />
                    </div>
                  ) : students.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-sage-light/50">
                      <UsersRound className="w-10 h-10 mx-auto mb-3 text-brown-light/50" />
                      <p className="text-sm text-brown-light">{a.students.empty}</p>
                    </div>
                  ) : (
                    <div className={`bg-white rounded-2xl border border-sage-light/20 overflow-hidden transition-opacity ${studentsLoading ? 'opacity-60' : ''}`}>
                      <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                        <table className="w-full min-w-[860px] text-left">
                          <thead>
                            <tr className="border-b border-sage-light/15">
                              {[
                                a.students.thUser,
                                a.students.thEmail,
                                a.students.thCode,
                                a.students.thTelegram,
                                a.students.thCountry,
                                a.students.thOrders,
                                a.students.thStatus,
                                a.students.thRegistered,
                              ].map((h) => (
                                <th
                                  key={h}
                                  scope="col"
                                  className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-brown-light whitespace-nowrap"
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {students.map((u) => {
                              const badge = purchaseStatusBadge(u.purchaseStatus)
                              const flag = flagOf(u.countryCode)
                              return (
                                <tr
                                  key={u.id}
                                  onClick={() => openStudentDetail(u.id)}
                                  className="border-b border-sage-light/15 last:border-b-0 hover:bg-sage-light/10 transition-colors cursor-pointer"
                                >
                                  <td className="px-4 py-3">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        openStudentDetail(u.id)
                                      }}
                                      className="text-sm font-semibold text-brown-dark hover:text-sage-dark transition-colors cursor-pointer text-left inline-flex items-center gap-2"
                                    >
                                      {u.firstName} {u.lastName}
                                      <NewBadge show={u.isNew} />
                                    </button>
                                  </td>
                                  <td className="px-4 py-3">
                                    <a
                                      href={`mailto:${u.email}`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-xs text-sage-dark hover:underline break-all"
                                    >
                                      {u.email}
                                    </a>
                                  </td>
                                  {/* 🆔 فاز ۶۰ — کد یکتای پایدار؛ خالی = کاربر قدیمی بدون کد */}
                                  <td className="px-4 py-3 text-xs font-mono font-bold text-brown-dark whitespace-nowrap">
                                    {u.uniqueCode ?? a.students.dNotProvided}
                                  </td>
                                  <td className="px-4 py-3 text-xs text-brown whitespace-nowrap">
                                    {u.telegramUsername ? `@${u.telegramUsername}` : a.students.dNotProvided}
                                  </td>
                                  <td className="px-4 py-3 text-xs text-brown whitespace-nowrap">
                                    {flag && <span aria-hidden="true">{flag} </span>}
                                    {u.country || u.countryCode}
                                  </td>
                                  <td className="px-4 py-3 text-xs text-brown tabular-nums whitespace-nowrap">
                                    {u.orderCount}
                                    {u.orderCount > 0 ? ` (${u.paidCount} paid)` : ''}
                                  </td>
                                  <td className="px-4 py-3">
                                    <span
                                      className={`inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${badge.cls}`}
                                    >
                                      {badge.label}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-xs text-brown-light whitespace-nowrap">
                                    {fmtDate(u.createdAt)}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 🎓 کلاس‌ها — مدیریت کامل منبع حقیقت کلاس‌ها و قیمت‌ها (فاز ۴۲) */}
              {tab === 'classes' && (
                <div>
                  <ClassesAdminTab token={token!} onToast={onToast} />
                </div>
              )}

              {/* وبلاگ */}
              {tab === 'blog' && (
                <div>
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                  {filteredPosts.length === 0 && (
                    <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-sage-light/50">
                      <Newspaper className="w-10 h-10 mx-auto mb-3 text-brown-light/50" />
                      <p className="text-sm text-brown-light">{a.emptyPosts}</p>
                    </div>
                  )}
                  {pagedPosts.map((p) => (
                    <div
                      key={p.id}
                      className="bg-white rounded-2xl border border-sage-light/20 p-4 flex items-center gap-4 hover:border-sage/40 transition-colors"
                    >
                      {/* تصویر کاور یا ایموجی */}
                      <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-sage-light/60 to-butter/40 flex items-center justify-center text-2xl flex-shrink-0 select-none overflow-hidden">
                        {p.image ? (
                          <img
                            src={p.image}
                            alt=""
                            loading="lazy"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              ;(e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                        ) : (
                          p.emoji
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-brown-dark truncate">{p.title}</p>
                        <p className="text-xs text-brown-light mt-0.5 flex items-center gap-2 flex-wrap">
                          <span className="bg-sage-light/30 text-sage-dark font-semibold px-2 py-0.5 rounded-full">
                            {p.tag}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {fmtDate(p.createdAt)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Eye className="w-3 h-3" /> {p.views} {a.postViewsLabel}
                          </span>
                        </p>
                      </div>
                      <span
                        className={`hidden sm:inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          p.published ? 'bg-sage text-brown-dark' : 'bg-butter/50 text-brown'
                        }`}
                      >
                        {p.published ? a.publishLabel : a.unpublishLabel}
                      </span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* 👁 مشاهدهٔ مقاله در تب جدید */}
                        <a
                          href={`#/blog/${p.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={a.viewPost}
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-brown-light hover:text-sage-dark hover:bg-sage-light/20 transition-colors"
                          aria-label={`${a.viewPost} — ${p.title}`}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        {/* ✏️ ویرایش: همان فرم، ذخیره روی همین مقاله */}
                        <button
                          onClick={() => {
                            setPostSeed(p)
                            setEditMode(true)
                            setNewPostOpen(true)
                          }}
                          title={a.editPost}
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-brown-light hover:text-sage-dark hover:bg-sage-light/20 transition-colors cursor-pointer"
                          aria-label={`${a.editPost} — ${p.title}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {/* 📄 رونوشت: فرم مقالهٔ جدید با محتوای همین مقاله پر می‌شود */}
                        <button
                          onClick={() => {
                            setPostSeed(p)
                            setEditMode(false)
                            setNewPostOpen(true)
                          }}
                          title={a.duplicatePost}
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-brown-light hover:text-sage-dark hover:bg-sage-light/20 transition-colors cursor-pointer"
                          aria-label={`${a.duplicatePost} — ${p.title}`}
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => togglePost(p.id, !p.published)}
                          title={p.published ? a.unpublishLabel : a.publishLabel}
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-brown-light hover:text-sage-dark hover:bg-sage-light/20 transition-colors cursor-pointer"
                          aria-label={p.published ? a.unpublishLabel : a.publishLabel}
                        >
                          {p.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        <DeleteButton
                          label=""
                          onConfirm={() => {
                            if (window.confirm(a.confirmDeletePost)) deleteItem('posts', p.id)
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  </div>
                  <Pagination
                    page={postPage}
                    totalPages={totalPostPages}
                    onPage={setPage}
                  />
                </div>
              )}

              {/* 💬 نظرات کاربران — تأیید/رد */}
              {tab === 'reviews' && (
                <div>
                  {/* 📥 نظرهای منتخب و نظرهای ثابت هم از اینجا مدیریت می‌شوند */}
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <p className="text-xs text-brown-light bg-butter/20 rounded-xl px-4 py-2.5 flex-1 min-w-[240px]">
                      {a.reviewsAdminHint}
                    </p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => seedDefaults('testimonials')}
                        className="bg-white border border-sage-light/40 text-brown px-4 py-2.5 rounded-xl text-xs font-semibold hover:border-sage transition-all cursor-pointer"
                      >
                        {a.importTestimonialsButton}
                      </button>
                      <button
                        onClick={() => {
                          setReviewSeed(null)
                          setReviewOpen(true)
                        }}
                        className="bg-sage text-brown-dark px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-sage-dark transition-all cursor-pointer"
                      >
                        {a.newReviewButton}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                    {filteredReviews.length === 0 && (
                      <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-sage-light/50">
                        <MessageSquareQuote className="w-10 h-10 mx-auto mb-3 text-brown-light/50" />
                        <p className="text-sm text-brown-light">{a.emptyReviews}</p>
                      </div>
                    )}
                    {pagedReviews.map((rv) => (
                      <div key={rv.id} className={cardCls}>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="w-9 h-9 bg-peach-light/40 rounded-xl flex items-center justify-center">
                            <User className="w-5 h-5 text-brown" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-brown-dark flex items-center gap-2">
                              {rv.name}
                              {rv.featured && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-butter/40 text-brown px-2 py-0.5 rounded-full">
                                  <Star className="w-3 h-3 fill-butter text-brown" /> {a.featuredBadge}
                                </span>
                              )}
                            </p>
                            {rv.role && (
                              <p className="text-xs text-sage-dark font-medium">{rv.role}</p>
                            )}
                          </div>
                          {/* ستاره‌ها */}
                          <span className="flex gap-0.5 ml-2" aria-label={`${rv.rating} of 5`}>
                            {Array.from({ length: rv.rating }, (_, i) => (
                              <Star key={i} className="w-3.5 h-3.5 fill-butter text-butter" />
                            ))}
                          </span>
                          {/* ❤️ تعداد لایک — از دیتابیس (فاز ۴۶) */}
                          <span
                            className="inline-flex items-center gap-1 text-xs text-brown-light"
                            title={`${rv.likeCount ?? 0} like(s)`}
                            aria-label={`${rv.likeCount ?? 0} likes`}
                          >
                            <Heart
                              className={`w-3.5 h-3.5 ${(rv.likeCount ?? 0) > 0 ? 'fill-peach text-peach' : ''}`}
                              aria-hidden="true"
                            />
                            {rv.likeCount ?? 0}
                          </span>
                          <span className="ml-auto text-xs text-brown-light inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {fmtDate(rv.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-brown-light leading-relaxed mb-3">“{rv.text}”</p>
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-sage-light/15">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* بَج وضعیت فعلی */}
                            <span
                              className={`inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full ${
                                rv.status === 'approved'
                                  ? 'bg-sage text-brown-dark'
                                  : rv.status === 'rejected'
                                    ? 'bg-peach-light/60 text-brown'
                                    : 'bg-butter text-brown'
                              }`}
                            >
                              {rv.status === 'approved'
                                ? a.reviewApproved
                                : rv.status === 'rejected'
                                  ? a.reviewRejected
                                  : a.reviewPending}
                            </span>
                            {rv.status !== 'approved' && (
                              <button
                                onClick={() => setReviewStatus(rv.id, 'approved', a.reviewApproveToast)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-brown-dark bg-sage px-3 py-1.5 rounded-lg hover:bg-sage-dark transition-colors cursor-pointer"
                              >
                                <Star className="w-3 h-3" /> {a.reviewApprove}
                              </button>
                            )}
                            {rv.status !== 'rejected' && (
                              <button
                                onClick={() => setReviewStatus(rv.id, 'rejected', a.reviewRejectedToast)}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-brown-light hover:text-brown bg-butter/30 hover:bg-butter/50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                              >
                                <EyeOff className="w-3 h-3" /> {a.reviewReject}
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => toggleReviewFeatured(rv.id, !rv.featured)}
                              title={a.featuredToggleTitle}
                              aria-pressed={rv.featured}
                              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                                rv.featured
                                  ? 'text-butter bg-butter/20 hover:bg-butter/30'
                                  : 'text-brown-light/50 hover:text-butter hover:bg-butter/10'
                              }`}
                            >
                              <Star className={`w-4 h-4 ${rv.featured ? 'fill-butter' : ''}`} />
                            </button>
                            <button
                              onClick={() => {
                                setReviewSeed(rv)
                                setReviewOpen(true)
                              }}
                              title={a.editPost}
                              className="w-9 h-9 rounded-lg flex items-center justify-center text-brown-light hover:text-sage-dark hover:bg-sage-light/20 transition-colors cursor-pointer"
                              aria-label={`${a.editPost} — ${rv.name}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <DeleteButton
                              label=""
                              onConfirm={() =>
                                window.confirm(a.confirmDeleteReview) &&
                                fetch('/api/testimonials', {
                                  method: 'DELETE',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    'x-admin-key': token!,
                                  },
                                  body: JSON.stringify({ id: rv.id }),
                                }).then(load)
                              }
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Pagination
                    page={revPage}
                    totalPages={totalReviewPages}
                    onPage={setPage}
                  />

                  {/* ---------- 🗄️ بایگانی نظرات (حذف نرم) — بازگردانی بدون پاک‌شدن همیشگی ---------- */}
                  {archivedReviews.length > 0 && (
                    <details className="mt-5 bg-cream/60 rounded-2xl border border-sage-light/20">
                      <summary className="flex items-center gap-2 px-4 py-3 text-xs font-bold text-brown cursor-pointer select-none">
                        <Archive className="w-4 h-4" aria-hidden="true" />
                        {a.archiveTitle} · <span className="tabular-nums">{archivedReviews.length}</span>
                      </summary>
                      <div className="px-4 pb-4 space-y-2">
                        <p className="text-[11px] text-brown-light">{a.archiveHint}</p>
                        {archivedReviews.map((rv) => (
                          <div
                            key={rv.id}
                            className="bg-white rounded-xl border border-sage-light/20 px-3.5 py-2.5 flex items-center gap-3"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-brown-dark truncate">
                                {rv.name} · <span className="font-normal text-brown-light">“{rv.text.slice(0, 70)}”</span>
                              </p>
                              <p className="text-[10px] text-brown-light mt-0.5">{rv.status} · {fmtDate(rv.createdAt)}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => restoreArchived('testimonial', rv.id)}
                              className="inline-flex items-center gap-1.5 bg-sage text-brown-dark px-3 py-1.5 rounded-lg text-[11px] font-bold hover:bg-sage-dark transition-colors cursor-pointer min-h-[32px] flex-shrink-0"
                            >
                              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" /> {a.restoreButton}
                            </button>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}

              {/* ❓ FAQ — مدیریت سؤالات متداول (فاز ۴۶) — تنها منبع حقیقت صفحهٔ Support */}
              {tab === 'faq' && (
                <FaqAdminTab
                  items={faqs}
                  archived={archivedFaqs}
                  token={token!}
                  onToast={onToast}
                  onChanged={load}
                />
              )}

              {/* 🗓️ Scheduling — برنامهٔ واقعی جلسات (فاز ۴۸) */}
              {tab === 'scheduling' && <SchedulingAdminTab token={token!} onToast={onToast} />}

              {/* 🎟️ Discounts — کدهای تخفیف + پله‌های خودکار بسته (فاز ۴۷) */}
              {tab === 'discounts' && (
                <DiscountsAdminTab items={discounts} token={token!} onToast={onToast} onChanged={load} />
              )}

              {/* 📚 درس‌ها — کارت‌ها + واژه‌های داخل هر درس (کل بخش Learn) */}
              {tab === 'lessons' && (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <p className="text-xs text-brown-light bg-butter/20 rounded-xl px-4 py-2.5 flex-1 min-w-[240px]">
                      {a.lessonsDbHint}
                    </p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => seedDefaults('lessons')}
                        className="bg-white border border-sage-light/40 text-brown px-4 py-2.5 rounded-xl text-xs font-semibold hover:border-sage transition-all cursor-pointer"
                      >
                        {a.importLessonsButton}
                      </button>
                      <button
                        onClick={() => {
                          setLessonSeed(null)
                          setLessonOpen(true)
                        }}
                        className="bg-sage text-brown-dark px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-sage-dark transition-all cursor-pointer"
                      >
                        {a.newLessonButton}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                    {filteredLessons.length === 0 && (
                      <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-sage-light/50">
                        <BookOpen className="w-10 h-10 mx-auto mb-3 text-brown-light/50" />
                        <p className="text-sm text-brown-light">{a.emptyLessons}</p>
                      </div>
                    )}
                    {pagedLessons.map((l) => (
                      <div
                        key={l.id}
                        className="bg-white rounded-2xl border border-sage-light/20 p-4 flex items-center gap-4 hover:border-sage/40 transition-colors"
                      >
                        <span className="w-12 h-12 rounded-xl bg-gradient-to-br from-sage-light/60 to-peach-light/40 flex items-center justify-center text-xl font-serif text-brown-dark flex-shrink-0 select-none">
                          {l.big ? l.big.slice(0, 2) : <BookOpen className="w-5 h-5 text-sage-dark/70" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-brown-dark truncate">
                            {l.title}
                            <span className="ml-2 text-[10px] font-mono text-brown-light align-middle bg-cream px-1.5 py-0.5 rounded">
                              /lesson/{l.slug}
                            </span>
                          </p>
                          <p className="text-xs text-brown-light mt-0.5 truncate">
                            {l.words.length} words
                            {l.tag && <span className="ml-2 text-[10px] bg-sage-light/30 text-sage-dark px-2 py-0.5 rounded-full">{l.tag}</span>}
                          </p>
                        </div>
                        <span
                          className={`hidden sm:inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                            l.published ? 'bg-sage text-brown-dark' : 'bg-butter/50 text-brown'
                          }`}
                        >
                          {l.published ? a.publishLabel : a.unpublishLabel}
                        </span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => {
                              setLessonSeed(l)
                              setLessonOpen(true)
                            }}
                            title={a.editPost}
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-brown-light hover:text-sage-dark hover:bg-sage-light/20 transition-colors cursor-pointer"
                            aria-label={`${a.editPost} — ${l.title}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              fetch('/api/learn/lessons', {
                                method: 'PATCH',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'x-admin-key': token!,
                                },
                                body: JSON.stringify({ id: l.id, published: !l.published }),
                              }).then(load)
                            }
                            title={l.published ? a.unpublishLabel : a.publishLabel}
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-brown-light hover:text-sage-dark hover:bg-sage-light/20 transition-colors cursor-pointer"
                            aria-label={l.published ? a.unpublishLabel : a.publishLabel}
                          >
                            {l.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                          <DeleteButton
                            label=""
                            onConfirm={() => {
                              if (window.confirm(a.confirmDeleteLesson))
                                fetch('/api/learn/lessons', {
                                  method: 'DELETE',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    'x-admin-key': token!,
                                  },
                                  body: JSON.stringify({ id: l.id }),
                                }).then(load)
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <Pagination
                    page={lessonPage}
                    totalPages={totalLessonPages}
                    onPage={setPage}
                  />
                </div>
              )}

              {/* 🃏 واژه‌ها — فلش‌کارت‌های صفحهٔ Learn */}
              {tab === 'words' && (
                <div>
                  <p className="text-xs text-brown-light mb-4 bg-butter/20 rounded-xl px-4 py-2.5">
                    {a.learnDbHint}
                  </p>
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                    {filteredWords.length === 0 && (
                      <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-sage-light/50">
                        <Layers className="w-10 h-10 mx-auto mb-3 text-brown-light/50" />
                        <p className="text-sm text-brown-light">{a.emptyWords}</p>
                      </div>
                    )}
                    {pagedWords.map((w) => (
                      <div
                        key={w.id}
                        className="bg-white rounded-2xl border border-sage-light/20 p-4 flex items-center gap-4 hover:border-sage/40 transition-colors"
                      >
                        <span className="w-12 h-12 rounded-xl bg-gradient-to-br from-sage-light/60 to-butter/40 flex items-center justify-center text-2xl font-serif text-brown-dark flex-shrink-0 select-none">
                          {w.chinese.slice(0, 2)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-brown-dark truncate">
                            {w.chinese}
                            <span className="ml-2 font-normal text-brown-light">{w.pinyin}</span>
                          </p>
                          <p className="text-xs text-brown-light mt-0.5 truncate">
                            {w.meaning}
                            <span className="text-[10px] text-brown-light/70 ml-2">#{w.sortOrder}</span>
                          </p>
                        </div>
                        <span
                          className={`hidden sm:inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full ${
                            w.published ? 'bg-sage text-brown-dark' : 'bg-butter/50 text-brown'
                          }`}
                        >
                          {w.published ? a.publishLabel : a.unpublishLabel}
                        </span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => {
                              setWordSeed(w)
                              setWordOpen(true)
                            }}
                            title={a.editPost}
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-brown-light hover:text-sage-dark hover:bg-sage-light/20 transition-colors cursor-pointer"
                            aria-label={`${a.editPost} — ${w.chinese}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              fetch('/api/learn/cards', {
                                method: 'PATCH',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'x-admin-key': token!,
                                },
                                body: JSON.stringify({ id: w.id, published: !w.published }),
                              }).then(load)
                            }
                            title={w.published ? a.unpublishLabel : a.publishLabel}
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-brown-light hover:text-sage-dark hover:bg-sage-light/20 transition-colors cursor-pointer"
                            aria-label={w.published ? a.unpublishLabel : a.publishLabel}
                          >
                            {w.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                          <DeleteButton
                            label=""
                            onConfirm={() => {
                              if (window.confirm(a.confirmDeleteWord))
                                fetch('/api/learn/cards', {
                                  method: 'DELETE',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    'x-admin-key': token!,
                                  },
                                  body: JSON.stringify({ id: w.id }),
                                }).then(load)
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <Pagination
                    page={wordPage}
                    totalPages={totalWordPages}
                    onPage={setPage}
                  />
                </div>
              )}

              {/* 🧩 سؤالات آزمون تعیین سطح */}
              {tab === 'quiz' && (
                <div>
                  <p className="text-xs text-brown-light mb-4 bg-butter/20 rounded-xl px-4 py-2.5">
                    {a.learnDbHint}
                  </p>
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                    {filteredQuiz.length === 0 && (
                      <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-sage-light/50">
                        <ListChecks className="w-10 h-10 mx-auto mb-3 text-brown-light/50" />
                        <p className="text-sm text-brown-light">{a.emptyQuiz}</p>
                      </div>
                    )}
                    {pagedQuiz.map((qq) => (
                      <div
                        key={qq.id}
                        className="bg-white rounded-2xl border border-sage-light/20 p-4 hover:border-sage/40 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <span className="w-9 h-9 rounded-xl bg-sage-light/30 flex items-center justify-center flex-shrink-0">
                            <ListChecks className="w-5 h-5 text-sage-dark" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-brown-dark">{qq.question}</p>
                            <p className="text-xs text-brown-light mt-1 leading-relaxed">
                              {qq.options
                                .map((o) => `${o.text} (${o.score})`)
                                .join(' · ')}
                            </p>
                          </div>
                          <span
                            className={`hidden sm:inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                              qq.published ? 'bg-sage text-brown-dark' : 'bg-butter/50 text-brown'
                            }`}
                          >
                            {qq.published ? a.publishLabel : a.unpublishLabel}
                          </span>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => {
                                setQuizSeed(qq)
                                setQuizOpen(true)
                              }}
                              title={a.editPost}
                              className="w-9 h-9 rounded-lg flex items-center justify-center text-brown-light hover:text-sage-dark hover:bg-sage-light/20 transition-colors cursor-pointer"
                              aria-label={`${a.editPost} — ${qq.question}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                fetch('/api/learn/quiz', {
                                  method: 'PATCH',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    'x-admin-key': token!,
                                  },
                                  body: JSON.stringify({ id: qq.id, published: !qq.published }),
                                }).then(load)
                              }
                              title={qq.published ? a.unpublishLabel : a.publishLabel}
                              className="w-9 h-9 rounded-lg flex items-center justify-center text-brown-light hover:text-sage-dark hover:bg-sage-light/20 transition-colors cursor-pointer"
                              aria-label={qq.published ? a.unpublishLabel : a.publishLabel}
                            >
                              {qq.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </button>
                            <DeleteButton
                              label=""
                              onConfirm={() => {
                                if (window.confirm(a.confirmDeleteQuiz))
                                  fetch('/api/learn/quiz', {
                                    method: 'DELETE',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'x-admin-key': token!,
                                    },
                                    body: JSON.stringify({ id: qq.id }),
                                  }).then(load)
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Pagination
                    page={quizPage}
                    totalPages={totalQuizPages}
                    onPage={setPage}
                  />
                  {/* 🧪 تسک ۸۲ — نتایج/سرنخ‌های آزمون تعیین سطح */}
                  <QuizLeadsPanel token={token} />
                </div>
              )}

              {/* 👩‍🏫 معلم‌ها — تیم صفحهٔ About */}
              {tab === 'teachers' && (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <p className="text-xs text-brown-light bg-butter/20 rounded-xl px-4 py-2.5 flex-1 min-w-[240px]">
                      {a.teachersDbHint}
                    </p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => seedDefaults('teachers')}
                        className="bg-white border border-sage-light/40 text-brown px-4 py-2.5 rounded-xl text-xs font-semibold hover:border-sage transition-all cursor-pointer"
                      >
                        {a.importTeachersButton}
                      </button>
                      <button
                        onClick={() => {
                          setTeacherSeed(null)
                          setTeacherOpen(true)
                        }}
                        className="bg-sage text-brown-dark px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-sage-dark transition-all cursor-pointer"
                      >
                        {a.newTeacherButton}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                    {filteredTeachers.length === 0 && (
                      <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-sage-light/50">
                        <UserRound className="w-10 h-10 mx-auto mb-3 text-brown-light/50" />
                        <p className="text-sm text-brown-light">{a.emptyTeachers}</p>
                      </div>
                    )}
                    {pagedTeachers.map((t) => (
                      <div
                        key={t.id}
                        className="bg-white rounded-2xl border border-sage-light/20 p-4 flex items-center gap-4 hover:border-sage/40 transition-colors"
                      >
                        {/* پرترهٔ کوچک */}
                        <span className="w-12 h-12 rounded-xl bg-gradient-to-br from-sage-light/60 to-peach-light/50 overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {t.image ? (
                            <img src={t.image} alt="" className="w-full h-full object-cover object-top" />
                          ) : (
                            <UserRound className="w-6 h-6 text-sage-dark/70" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-brown-dark truncate">
                            {t.name}
                            {t.tag && (
                              <span className="ml-2 text-[10px] font-bold bg-sage-light/30 text-sage-dark px-2 py-0.5 rounded-full align-middle">
                                {t.tag}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-brown-light mt-0.5 truncate">{t.role}</p>
                          {t.bio && <p className="text-[11px] text-brown-light/80 mt-0.5 line-clamp-1">{t.bio}</p>}
                        </div>
                        <span
                          className={`hidden sm:inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                            t.published ? 'bg-sage text-brown-dark' : 'bg-butter/50 text-brown'
                          }`}
                        >
                          {t.published ? a.publishLabel : a.unpublishLabel}
                        </span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => {
                              setTeacherSeed(t)
                              setTeacherOpen(true)
                            }}
                            title={a.editPost}
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-brown-light hover:text-sage-dark hover:bg-sage-light/20 transition-colors cursor-pointer"
                            aria-label={`${a.editPost} — ${t.name}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              fetch('/api/teachers', {
                                method: 'PATCH',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'x-admin-key': token!,
                                },
                                body: JSON.stringify({ id: t.id, published: !t.published }),
                              }).then(load)
                            }
                            title={t.published ? a.unpublishLabel : a.publishLabel}
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-brown-light hover:text-sage-dark hover:bg-sage-light/20 transition-colors cursor-pointer"
                            aria-label={t.published ? a.unpublishLabel : a.publishLabel}
                          >
                            {t.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                          <DeleteButton
                            label=""
                            onConfirm={() => {
                              if (window.confirm(a.confirmDeleteTeacher))
                                fetch('/api/teachers', {
                                  method: 'DELETE',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    'x-admin-key': token!,
                                  },
                                  body: JSON.stringify({ id: t.id }),
                                }).then(load)
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <Pagination
                    page={teacherPage}
                    totalPages={totalTeacherPages}
                    onPage={setPage}
                  />
                </div>
              )}

              {/* خبرنامه */}
              {tab === 'newsletter' && (
                <div>
                  <p className="text-sm text-brown-light mb-4">
                    {subscribers.length} {a.subscribersCount}
                  </p>
                  {subscribers.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-sage-light/50">
                      <Inbox className="w-10 h-10 mx-auto mb-3 text-brown-light/50" />
                      <p className="text-sm text-brown-light">{a.emptyNewsletter}</p>
                    </div>
                  ) : (
                    <>
                      <div className="bg-white rounded-2xl border border-sage-light/20 overflow-hidden max-h-[60vh] overflow-y-auto">
                        {pagedSubscribers.map((s, i) => (
                          <div
                            key={s.id}
                            className={`flex items-center justify-between px-5 py-3 gap-3 ${
                              i !== pagedSubscribers.length - 1 ? 'border-b border-sage-light/15' : ''
                            }`}
                          >
                            <span className="text-sm text-brown font-medium truncate">{s.email}</span>
                            <span className="flex items-center gap-3 flex-shrink-0">
                              <span className="text-xs text-brown-light hidden sm:inline">{fmtDate(s.createdAt)}</span>
                              <DeleteButton
                                label=""
                                onConfirm={() => deleteItem('newsletter', s.id)}
                              />
                            </span>
                          </div>
                        ))}
                      </div>
                      <Pagination
                        page={subPage}
                        totalPages={totalSubscriberPages}
                        onPage={setPage}
                      />
                    </>
                  )}
                </div>
              )}

              {/* 📊 داشبورد واقعی — همهٔ اعداد از دیتابیس (فاز ۵۲ — بند ۷) */}
              {/* 💳 فاز ۵۹ — کلیک روی کارت‌های خلاصهٔ پرداخت = باز شدن تب Payments با فیلتر مقصد */}
              {tab === 'dashboard' && (
                <DashboardAdminTab
                  token={token!}
                  onOpenPayments={(f) => {
                    setPayInitialFilter(f)
                    setTab('orders')
                  }}
                />
              )}

              {/* 💾 پشتیبان‌گیری/بازیابی دیتابیس (فاز ۵۲ — بند ۱۰) */}
              {tab === 'backup' && <BackupAdminTab token={token!} onToast={onToast} />}

              {/* 🧾 خروجی CSV + Audit + خطاهای سرور (فاز ۵۳ — بندهای ۱۱/۱۲/۱۴) */}
              {tab === 'logs' && <LogsAdminTab token={token!} onToast={onToast} />}

              {/* 💳 تب Payments (فاز ۵۹) — تنظیمات کارت بانکی + مدیریت رسیدها و تأیید/ردّ دستی */}
              {tab === 'orders' && (
                <div>
                  {/* 💳 تنظیمات پرداخت دستی — کارت بانکی */}
                  <PaymentSettingsCard
                    token={token!}
                    settings={bankSettings}
                    onSaved={(s) => setBankSettings(s)}
                    onToast={(m) => onToast?.(m)}
                  />
                  {/* 📋 مدیریت پرداخت‌ها — فهرست + جزئیات + تأیید/ردّ رسید */}
                  <PaymentsAdminTab
                    token={token!}
                    onToast={(m) => onToast?.(m)}
                    initialFilter={payInitialFilter}
                    onCounts={setPayCounts}
                    onChanged={load}
                  />
                </div>
              )}

              {/* ⚙️ تنظیمات — نوار اعلان بالای سایت + آمار داشبورد صفحهٔ اول */}
              {tab === 'settings' && (
                <SettingsForm
                  token={token}
                  initialAnnouncement={settings.announcement}
                  initialStats={settings.homeStats}
                  initialHero={settings.hero}
                  onToast={(m) => onToast?.(m)}
                />
              )}
            </>
          )}
        </div>
      </section>

      {/* دیالوگ ساخت/رونوشت/ویرایش مقاله */}
      <Dialog
        open={newPostOpen}
        onOpenChange={(open) => {
          if (!open) {
            setNewPostOpen(false)
            setPostSeed(null)
            setEditMode(false)
          }
        }}
      >
        <DialogContent className="bg-cream max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-brown-dark text-left">
              {editMode ? a.editPostDialogTitle : postSeed ? a.duplicatePost : a.newPostButton}
            </DialogTitle>
            <DialogDescription className="text-brown-light text-left">
              {editMode
                ? postSeed?.title
                : postSeed
                  ? `${postSeed.title} → ${a.duplicateSuffix}`
                  : a.postContentPlaceholder}
            </DialogDescription>
          </DialogHeader>
          <NewPostForm
            key={`${postSeed?.id ?? 'new'}-${editMode ? 'edit' : 'copy'}`} /* با هر باز شدن، فرم تازه ساز شود */
            token={token}
            initial={postSeed}
            mode={editMode ? 'edit' : 'create'}
            onToast={(m) => onToast?.(m)}
            onDone={() => {
              setNewPostOpen(false)
              setPostSeed(null)
              setEditMode(false)
              load()
            }}
          />
        </DialogContent>
      </Dialog>

      {/* دیالوگ ساخت/ویرایش واژهٔ فلش‌کارت */}
      <Dialog
        open={wordOpen}
        onOpenChange={(open) => {
          if (!open) {
            setWordOpen(false)
            setWordSeed(null)
          }
        }}
      >
        <DialogContent className="bg-cream max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-brown-dark text-left">
              {wordSeed ? a.editWordDialogTitle : a.newWordButton}
            </DialogTitle>
            <DialogDescription className="text-brown-light text-left">
              {wordSeed ? wordSeed.chinese : a.learnDbHint}
            </DialogDescription>
          </DialogHeader>
          <WordForm
            key={wordSeed?.id ?? 'new-word'} /* با هر باز شدن، فرم تازه ساز شود */
            token={token}
            initial={wordSeed}
            onToast={(m) => onToast?.(m)}
            onDone={() => {
              setWordOpen(false)
              setWordSeed(null)
              load()
            }}
          />
        </DialogContent>
      </Dialog>

      {/* دیالوگ ساخت/ویرایش سؤال آزمون */}
      <Dialog
        open={quizOpen}
        onOpenChange={(open) => {
          if (!open) {
            setQuizOpen(false)
            setQuizSeed(null)
          }
        }}
      >
        <DialogContent className="bg-cream max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-brown-dark text-left">
              {quizSeed ? a.editQuizDialogTitle : a.newQuizButton}
            </DialogTitle>
            <DialogDescription className="text-brown-light text-left">
              {quizSeed ? quizSeed.question : a.quizOptionsLabel}
            </DialogDescription>
          </DialogHeader>
          <QuizForm
            key={quizSeed?.id ?? 'new-quiz'} /* با هر باز شدن، فرم تازه ساز شود */
            token={token}
            initial={quizSeed}
            onToast={(m) => onToast?.(m)}
            onDone={() => {
              setQuizOpen(false)
              setQuizSeed(null)
              load()
            }}
          />
        </DialogContent>
      </Dialog>

      {/* دیالوگ ساخت/ویرایش معلم */}
      <Dialog
        open={teacherOpen}
        onOpenChange={(open) => {
          if (!open) {
            setTeacherOpen(false)
            setTeacherSeed(null)
          }
        }}
      >
        <DialogContent className="bg-cream max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-brown-dark text-left">
              {teacherSeed ? a.editTeacherDialogTitle : a.newTeacherButton}
            </DialogTitle>
            <DialogDescription className="text-brown-light text-left">
              {teacherSeed ? teacherSeed.name : a.teachersDbHint}
            </DialogDescription>
          </DialogHeader>
          <TeacherForm
            key={teacherSeed?.id ?? 'new-teacher'} /* با هر باز شدن، فرم تازه ساز شود */
            token={token}
            initial={teacherSeed}
            onToast={(m) => onToast?.(m)}
            onDone={() => {
              setTeacherOpen(false)
              setTeacherSeed(null)
              load()
            }}
          />
        </DialogContent>
      </Dialog>

      {/* دیالوگ ساخت/ویرایش درس (کارت + واژه‌های بخش Learn) */}
      <Dialog
        open={lessonOpen}
        onOpenChange={(open) => {
          if (!open) {
            setLessonOpen(false)
            setLessonSeed(null)
          }
        }}
      >
        <DialogContent className="bg-cream max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-brown-dark text-left">
              {lessonSeed ? a.editLessonDialogTitle : a.newLessonButton}
            </DialogTitle>
            <DialogDescription className="text-brown-light text-left">
              {lessonSeed ? `/lesson/${lessonSeed.slug}` : a.lessonsDbHint}
            </DialogDescription>
          </DialogHeader>
          <LessonForm
            key={lessonSeed?.id ?? 'new-lesson'} /* با هر باز شدن، فرم تازه ساز شود */
            token={token}
            initial={lessonSeed}
            onToast={(m) => onToast?.(m)}
            onDone={() => {
              setLessonOpen(false)
              setLessonSeed(null)
              load()
            }}
          />
        </DialogContent>
      </Dialog>

      {/* دیالوگ ساخت/ویرایش نظر (نظرات منتخب + نظرات کاربران) */}
      <Dialog
        open={reviewOpen}
        onOpenChange={(open) => {
          if (!open) {
            setReviewOpen(false)
            setReviewSeed(null)
          }
        }}
      >
        <DialogContent className="bg-cream max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-brown-dark text-left">
              {reviewSeed ? a.editReviewDialogTitle : a.newReviewDialogTitle}
            </DialogTitle>
            <DialogDescription className="text-brown-light text-left">
              {reviewSeed ? reviewSeed.name : a.reviewTextPlaceholder}
            </DialogDescription>
          </DialogHeader>
          <ReviewForm
            key={reviewSeed?.id ?? 'new-review'} /* با هر باز شدن، فرم تازه ساز شود */
            token={token}
            initial={reviewSeed}
            onToast={(m) => onToast?.(m)}
            onDone={() => {
              setReviewOpen(false)
              setReviewSeed(null)
              load()
            }}
          />
        </DialogContent>
      </Dialog>

      {/* 👤 دیالوگ جزئیات دانش‌پژوه — پروفایل + سفارش‌ها و پرداخت‌ها + درخواست‌های کلاس */}
      <Dialog
        open={studentDetailOpen}
        onOpenChange={(open) => {
          if (!open) closeStudentDetail()
        }}
      >
        <DialogContent className="bg-cream max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-brown-dark text-left">{a.students.detailTitle}</DialogTitle>
            <DialogDescription className="text-brown-light text-left">
              {studentDetail
                ? `${studentDetail.user.firstName} ${studentDetail.user.lastName} · ${studentDetail.user.email}`
                : a.students.subtitle}
            </DialogDescription>
          </DialogHeader>

          {studentDetailLoading || !studentDetail ? (
            <div className="text-center py-12 text-brown-light">
              <RefreshCw className="w-6 h-6 mx-auto mb-3 animate-spin text-sage-dark" />
            </div>
          ) : (
            <StudentDetailBody detail={studentDetail} onClose={closeStudentDetail} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
