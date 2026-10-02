// ---------------------------------------------------------------------------
// 🚫 /api/payments/wallet — DISABLED.
//
// Cryptocurrency / TRON / USDT wallet functionality has been intentionally
// disabled. This endpoint previously imported `testnetWalletRisk` from
// `@/lib/payments/service`, which no longer exists and broke the Vercel build.
//
// All HTTP methods now return 404 with a clear message. No crypto code paths
// are reachable from this endpoint, and no broken imports remain.
//
// To re-enable crypto payments you would need to restore the original
// implementation AND restore the `testnetWalletRisk` export — which is NOT
// present in this codebase. Do NOT re-enable.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

function disabled() {
  return NextResponse.json(
    { error: "Crypto payments are currently disabled." },
    { status: 404 }
  )
}

export async function GET(_req: NextRequest) {
  return disabled()
}

export async function PUT(_req: NextRequest) {
  return disabled()
}

export async function DELETE(_req: NextRequest) {
  return disabled()
}
