/**
 * آیکون‌های برند (اینستاگرام، تلگرام، وچت) — به‌صورت SVG داخلی
 * چون کتابخانهٔ lucide آیکون برند ندارد.
 */
export function InstagramIcon({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  )
}

export function TelegramIcon({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M21.94 3.36a1.5 1.5 0 0 0-1.53-.26L2.7 10.36c-.75.3-.73 1.37.03 1.65l4.66 1.68 1.78 5.62c.11.36.42.62.79.66h.1c.34 0 .66-.16.87-.43l2.5-3.2 4.63 3.4c.26.19.58.28.9.22.5-.09.9-.47 1.01-.96l3.05-14.36a1.5 1.5 0 0 0-.47-1.43zM9.4 13.5l8.6-6.9-6.9 7.9c-.12.14-.2.31-.23.5l-.34 2.32-1.13-3.82z" />
    </svg>
  )
}

export function WeChatIcon({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M8.69 3.5C5.55 3.5 3 5.6 3 8.2c0 1.47.8 2.78 2.05 3.65l-.51 1.55 1.8-.9c.52.14 1.07.23 1.64.25a4.7 4.7 0 0 1-.14-1.12c0-2.6 2.55-4.7 5.69-4.7.18 0 .35 0 .52.02C13.5 5.06 11.32 3.5 8.69 3.5zM6.94 6.3a.72.72 0 1 1 0 1.44.72.72 0 0 1 0-1.44zm3.75 0a.72.72 0 1 1 0 1.44.72.72 0 0 1 0-1.44zM14.36 8C11.6 8 9.36 9.8 9.36 12c0 2.2 2.24 4 5 4 .4 0 .8-.04 1.17-.11l1.5.75-.43-1.3C17.68 14.55 18.36 13.34 18.36 12c0-2.2-2.24-4-4-4zm-1.86 2.02a.62.62 0 1 1 0 1.24.62.62 0 0 1 0-1.24zm3.25 0a.62.62 0 1 1 0 1.24.62.62 0 0 1 0-1.24z" />
    </svg>
  )
}
