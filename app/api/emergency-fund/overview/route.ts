import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { isSavingsTransaction } from '@/lib/savings/classify'

export const dynamic = 'force-dynamic'

const EF_NAME = /darurat|emergency/i

/** Transaction-derived balance per wallet (same basis as /api/wallets). */
async function walletBalances(userId: string, walletIds: string[]) {
  const rows = await prisma.transaction.groupBy({
    by: ['walletId', 'type'],
    where: { userId, walletId: { in: walletIds } },
    _sum: { amount: true },
  })
  const out = new Map<string, number>(walletIds.map((id) => [id, 0]))
  for (const r of rows) {
    const t = (r.type || '').toUpperCase()
    const v = r._sum.amount || 0
    out.set(r.walletId, (out.get(r.walletId) || 0) + (t === 'INCOME' ? v : t === 'EXPENSE' ? -v : 0))
  }
  return out
}

/** Average monthly consumption (savings transfers excluded) of the last 3 complete months. */
async function avgMonthlyConsumption(userId: string, spendingWalletIds: string[]) {
  if (!spendingWalletIds.length) return 0
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - 3, 1)
  const end = new Date(now.getFullYear(), now.getMonth(), 1)
  const txs = await prisma.transaction.findMany({
    where: { userId, walletId: { in: spendingWalletIds }, type: { in: ['expense', 'EXPENSE'] }, date: { gte: start, lt: end } },
    select: { amount: true, description: true, transferPairId: true, category: { select: { name: true, type: true } } },
  })
  const total = txs
    .filter((t) => !t.transferPairId && !isSavingsTransaction({ description: t.description, categoryName: t.category?.name, categoryType: t.category?.type }))
    .reduce((s, t) => s + Math.abs(t.amount || 0), 0)
  return Math.round(total / 3)
}

/**
 * GET /api/emergency-fund/overview
 * The user's emergency fund, independent of the dashboard's selected wallet.
 * Source: wallets the user explicitly marked (active WalletEmergencyFund);
 * otherwise a SAVINGS wallet named like "darurat/emergency" (auto).
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const [wallets, marked, userFund] = await Promise.all([
    prisma.wallet.findMany({ where: { userId }, select: { id: true, name: true, type: true } }),
    prisma.walletEmergencyFund.findMany({ where: { userId, isActive: true, targetAmount: { gt: 0 } } }),
    prisma.emergencyFund.findUnique({ where: { userId } }),
  ])
  const balances = await walletBalances(userId, wallets.map((w) => w.id))
  const typeOf = (w: { type: string | null }) => (w.type || 'MAIN').toUpperCase()

  const markedIds = new Set(marked.map((m) => m.walletId).filter((id) => wallets.some((w) => w.id === id)))
  const autoWallet = markedIds.size
    ? null
    : wallets.find((w) => typeOf(w) === 'SAVINGS' && EF_NAME.test(w.name)) ?? null
  const sourceWallets = markedIds.size ? wallets.filter((w) => markedIds.has(w.id)) : autoWallet ? [autoWallet] : []

  const spendingWalletIds = wallets.filter((w) => typeOf(w) === 'MAIN').map((w) => w.id)
  const monthlyConsumption = await avgMonthlyConsumption(userId, spendingWalletIds)

  const markedTarget = marked.filter((m) => markedIds.has(m.walletId)).reduce((s, m) => s + m.targetAmount, 0)
  const userTarget = userFund && userFund.targetAmount > 1 ? userFund.targetAmount : 0
  const suggestedTarget = monthlyConsumption * 3
  const targetAmount = markedTarget || userTarget || suggestedTarget
  const currentAmount = sourceWallets.reduce((s, w) => s + (balances.get(w.id) || 0), 0)

  const savingsWallets = wallets
    .filter((w) => typeOf(w) !== 'MAIN')
    .map((w) => ({ id: w.id, name: w.name, type: typeOf(w), balance: balances.get(w.id) || 0 }))
    .sort((a, b) => b.balance - a.balance)

  return NextResponse.json(
    {
      source: sourceWallets.length
        ? { mode: markedIds.size ? 'manual' : 'auto', wallets: sourceWallets.map((w) => ({ id: w.id, name: w.name, type: typeOf(w) })) }
        : null,
      // A spending (MAIN) wallet as emergency fund double-counts with Safe to spend.
      usesSpendingWallet: sourceWallets.some((w) => typeOf(w) === 'MAIN'),
      // Best candidate to switch to: the largest SAVINGS wallet named "darurat".
      recommendedWallet: wallets
        .filter((w) => typeOf(w) === 'SAVINGS' && EF_NAME.test(w.name) && !markedIds.has(w.id))
        .map((w) => ({ id: w.id, name: w.name, balance: balances.get(w.id) || 0 }))
        .sort((a, b) => b.balance - a.balance)[0] ?? null,
      targetAmount,
      targetSource: markedTarget ? 'wallet' : userTarget ? 'user' : 'suggested',
      currentAmount,
      percentage: targetAmount > 0 ? Math.min(999, (currentAmount / targetAmount) * 100) : null,
      monthlyConsumption,
      monthsCovered: monthlyConsumption > 0 ? currentAmount / monthlyConsumption : null,
      savingsWallets,
      totalSavings: savingsWallets.reduce((s, w) => s + w.balance, 0),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

/**
 * PUT /api/emergency-fund/overview  { walletId, targetAmount? }
 * Make `walletId` the (only) emergency-fund wallet. Keeps the current target
 * unless a new one is given.
 */
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const body = await req.json().catch(() => ({}))
  const walletId = typeof body?.walletId === 'string' ? body.walletId : null
  const rawTarget = body?.targetAmount
  const newTarget = rawTarget === undefined || rawTarget === null ? null : Number(rawTarget)
  if (!walletId) return NextResponse.json({ error: 'walletId wajib diisi' }, { status: 400 })
  if (newTarget !== null && (!Number.isFinite(newTarget) || newTarget <= 0 || newTarget > 1e12)) {
    return NextResponse.json({ error: 'Target tidak valid' }, { status: 400 })
  }

  const wallet = await prisma.wallet.findFirst({ where: { id: walletId, userId }, select: { id: true } })
  if (!wallet) return NextResponse.json({ error: 'Dompet tidak ditemukan' }, { status: 404 })

  const [active, userFund] = await Promise.all([
    prisma.walletEmergencyFund.findMany({ where: { userId, isActive: true, targetAmount: { gt: 0 } } }),
    prisma.emergencyFund.findUnique({ where: { userId } }),
  ])
  const carriedTarget =
    newTarget ??
    (active.reduce((s, m) => s + m.targetAmount, 0) || (userFund && userFund.targetAmount > 1 ? userFund.targetAmount : 0) || 5_000_000)

  await prisma.$transaction([
    prisma.walletEmergencyFund.updateMany({ where: { userId, walletId: { not: walletId } }, data: { isActive: false } }),
    prisma.walletEmergencyFund.upsert({
      where: { walletId },
      create: { walletId, userId, targetAmount: carriedTarget, isActive: true },
      update: { targetAmount: carriedTarget, isActive: true },
    }),
  ])

  return NextResponse.json({ success: true, walletId, targetAmount: carriedTarget })
}
