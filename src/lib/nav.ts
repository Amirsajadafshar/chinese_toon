// ---------------------------------------------------------------------------
// 🧭 ناوبری مرکزی — چون توابع سادهٔ خارج از کامپوننت (goToPost، goToLesson، …)
// به useRouter دسترسی ندارند، SiteChrome نمونهٔ router را اینجا ثبت می‌کند.
// تا قبل از ثبت (مثلاً در تست‌ها) fallback امن: تغییر مسیر کامل مرورگر.
// ---------------------------------------------------------------------------

type PushFn = (path: string, replace?: boolean) => void

let push: PushFn | null = null

export function setAppRouter(fn: PushFn | null) {
  push = fn
}

/** ناوبری درون‌برنامه‌ای — push پیش‌فرض، replace برای جایگزینی history */
export function appNavigate(path: string, replace = false) {
  const normalized = path.startsWith('/') ? path : `/${path}`
  if (push) {
    push(normalized, replace)
  } else if (typeof window !== 'undefined') {
    if (replace) window.location.replace(normalized)
    else window.location.assign(normalized)
  }
}
