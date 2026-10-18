import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { planPaydaySplit } from '@/lib/allocation/phase-machine'
import { createQuickCaptureTransaction } from '@/lib/quick-capture'

/**
 * Payday splitter endpoint.
 *
 * Records the salary as an INCOME transaction, then returns the phase-aware
 * bucket breakdown so the UI can offer "apply to budgets" in one click.
 *
 * Auth: session user, OR the shared quick-capture API key for the iOS
 * Shortcut / Telegram path. Never unauthenticated.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key') ?? ''
  const expectedKey = process.env.QUICK_CAPTURE_API_KEY ?? ''

  let userId: string | null = null
  if (expectedKey && apiKey && apiKey === expectedKey) {
    userId = process.env.QUICK_CAPTURE_DEFAULT_USER ?? null
  } else {
    const { getServerSession } = await import('next-auth')
    const { authOptions } = await import('@/lib/auth')
    const session = await getServerSession(authOptions)
    userId = session?.user?.id ?? null
  }

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'body bukan JSON valid' }, { status: 400 })
  }

  const netIncome = Number(body.netIncome)
  const walletName = typeof body.walletName === 'string' ? body.walletName : undefined
  const record = body.record !== false && !body.dryRun // support dryRun or record: false

  if (!Number.isFinite(netIncome) || netIncome <= 0) {
    return NextResponse.json({ error: 'netIncome harus angka > 0' }, { status: 400 })
  }

  try {
    const plan = await planPaydaySplit(userId, netIncome)

    let transactionId: string | null = null
    if (record) {
      const tx = await createQuickCaptureTransaction(userId, `Gaji masuk ${netIncome}`, {
        categoryName: 'Salary',
        walletName,
        amount: netIncome,
        description: `[Payday] Penghasilan bersih`,
        date: new Date(),
        forceType: 'INCOME',
      })
      transactionId = tx.data.id
    }

    return NextResponse.json({
      success: true,
      transactionId,
      phase: plan.phase,
      outstandingDebts: plan.outstandingDebts,
      totalDebtBalance: plan.totalBalance,
      split: plan.split,
      buckets: plan.buckets,
      notes: plan.notes,
    })
  } catch (err: any) {
    console.error('[payday-split] gagal:', err?.message)
    return NextResponse.json({ error: err?.message ?? 'gagal menghitung alokasi' }, { status: 500 })
  }
}

export async function GET() {
  const { getServerSession } = await import('next-auth')
  const { authOptions } = await import('@/lib/auth')
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { resolvePhase } = await import('@/lib/allocation/phase-machine')
  const state = await resolvePhase(session.user.id)
  return NextResponse.json(state)
}