import { NextRequest, NextResponse } from 'next/server'
import { revokeAdminSession } from '@/lib/admin-auth'

// 🚪 خروج از پنل مدیریت — سشن سمت سرور باطل می‌شود
// (حتی اگر توکن کپی شده باشد، دیگر قبول نیست)
export async function POST(req: NextRequest) {
  const token = req.headers.get('x-admin-key')
  await revokeAdminSession(token)
  return NextResponse.json({ ok: true })
}
