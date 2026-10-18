import prisma from '@/lib/prisma'

/**
 * Two-phase allocation state machine, ported from HFOS v2.
 *
 * Phase A (Debt Destroyer) runs while any debt is still outstanding: a fifth
 * of net income is routed to debt service, and the wealth buckets stay small.
 * Phase B (Wealth Acceleration) starts the month after the last debt closes:
 * the debt slice is re-split into emergency fund and child investment.
 *
 * The phase is DERIVED from live debt state, never stored. A stored flag would
 * drift the moment a user closes a card manually, or reopens one.
 */

export type AllocationPhase = 'A' | 'B'

export interface PhaseSplit {
  living: number
  debt: number
  emergency: number
  child: number
  guiltFree: number
}

/** Phase A: debt alive. 55 / 20 / 6.25 / 6.25 / 12.5 */
export const PHASE_A_SPLIT: PhaseSplit = {
  living: 0.55,
  debt: 0.2,
  emergency: 0.0625,
  child: 0.0625,
  guiltFree: 0.125,
}

/** Phase B: debt clear. Debt slice folds into emergency + child. */
export const PHASE_B_SPLIT: PhaseSplit = {
  living: 0.55,
  debt: 0,
  emergency: 0.15,
  child: 0.15,
  guiltFree: 0.15,
}

/**
 * Read live debt state and decide which phase the user is in.
 * `isActive` alone is not enough — a settled card can still carry a rounding
 * residue, so a balance below the tolerance counts as closed.
 */
const BALANCE_EPSILON = 1000 // Rp1.000 — below this a debt is functionally closed

export async function resolvePhase(userId: string): Promise<{
  phase: AllocationPhase
  outstandingDebts: number
  totalBalance: number
  split: PhaseSplit
}> {
  const debts = await prisma.debt.findMany({
    where: { userId, isActive: true },
    select: { id: true, name: true, currentBalance: true },
  })

  const live = debts.filter((d) => d.currentBalance > BALANCE_EPSILON)
  const totalBalance = live.reduce((sum, d) => sum + d.currentBalance, 0)
  const phase: AllocationPhase = live.length === 0 ? 'B' : 'A'

  return {
    phase,
    outstandingDebts: live.length,
    totalBalance,
    split: phase === 'A' ? PHASE_A_SPLIT : PHASE_B_SPLIT,
  }
}

/**
 * Turn a net income figure into concrete rupiah buckets.
 * Amounts are rounded to whole rupiah; the rounding residue is folded into
 * `living` so the parts always sum exactly to the input.
 */
export function splitIncome(netIncome: number, split: PhaseSplit) {
  const living = Math.floor(netIncome * split.living)
  const debt = Math.floor(netIncome * split.debt)
  const emergency = Math.floor(netIncome * split.emergency)
  const child = Math.floor(netIncome * split.child)
  const guiltFree = netIncome - living - debt - emergency - child

  return { living, debt, emergency, child, guiltFree, total: netIncome }
}

/**
 * Payday splitter: record the income, then return the bucket breakdown the
 * caller should write into budgets. Deliberately pure — budget writes stay in
 * the caller so this can be unit-tested without a database.
 */
export async function planPaydaySplit(userId: string, netIncome: number) {
  if (!Number.isFinite(netIncome) || netIncome <= 0) {
    throw new Error('Penghasilan bersih harus lebih dari 0.')
  }

  const { phase, outstandingDebts, totalBalance, split } = await resolvePhase(userId)
  const buckets = splitIncome(netIncome, split)

  const notes: string[] = []
  if (phase === 'A') {
    notes.push(
      `Fase A — ${outstandingDebts} utang aktif (total Rp${totalBalance.toLocaleString('id-ID')}). Rp${buckets.debt.toLocaleString('id-ID')} dialokasikan ke pelunasan.`
    )
    const covered = buckets.debt >= totalBalance
    if (covered) {
      notes.push('Alokasi bulan ini cukup menutup seluruh sisa utang — fase B menyusul bulan depan.')
    }
  } else {
    notes.push('Fase B — tidak ada utang aktif. Jatah utang dialihkan ke dana darurat dan investasi anak.')
  }

  return { phase, outstandingDebts, totalBalance, split, buckets, notes }
}