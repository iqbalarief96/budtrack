import prisma from '@/lib/prisma'
import { WalletGroupError, getGroupById } from './wallet-group-service'

/**
 * BillAggregationService - Aggregates bill data across wallet groups
 * Requirements: 11.1, 11.2, 11.3, 11.4
 */

// Types
export interface AggregatedBill {
  id: string
  name: string
  amount: number
  dueDate: Date
  status: 'upcoming' | 'overdue' | 'paid'
  isPaid: boolean
  paidDate: Date | null
  categoryId: string | null
  categoryName: string | null
  walletId: string
  walletName: string
  walletColor: string | null
  isRecurring: boolean
  frequency: string | null
  notes: string | null
}

export interface WalletBillSummary {
  walletId: string
  walletName: string
  walletColor: string | null
  bills: AggregatedBill[]
  totalAmount: number
  upcomingAmount: number
  overdueAmount: number
  paidAmount: number
  billCount: number
}

export interface BillStats {
  totalBills: number
  paidBills: number
  unpaidBills: number
  overdueBills: number
  upcomingBills: number
  paymentRate: number // percentage of paid bills
  averageBillAmount: number
}

export interface AggregatedBills {
  bills: AggregatedBill[]
  totalUpcoming: number
  totalOverdue: number
  totalPaid: number
  billsByWallet: WalletBillSummary[]
  stats: BillStats
}


/**
 * Get aggregated bills for a wallet group
 * Requirements: 11.1, 11.2, 11.3, 11.4
 * 
 * - 11.1: Display bills from all Linked_Wallets
 * - 11.2: Indicate which wallet each bill is associated with
 * - 11.3: Show total upcoming bill amounts across all Linked_Wallets
 * - 11.4: Display bill payment statistics from combined data
 */
export async function getAggregatedBills(
  groupId: string,
  userId: string
): Promise<AggregatedBills> {
  // Verify group ownership and get group with wallets
  const group = await getGroupById(groupId, userId)
  
  if (!group) {
    throw new WalletGroupError('Wallet group not found', 'GROUP_NOT_FOUND')
  }

  const walletIds = group.wallets.map((member) => member.walletId)

  if (walletIds.length === 0) {
    return {
      bills: [],
      totalUpcoming: 0,
      totalOverdue: 0,
      totalPaid: 0,
      billsByWallet: [],
      stats: {
        totalBills: 0,
        paidBills: 0,
        unpaidBills: 0,
        overdueBills: 0,
        upcomingBills: 0,
        paymentRate: 0,
        averageBillAmount: 0,
      },
    }
  }

  // Get all bills for wallets in the group (Requirement 11.1)
  const bills = await prisma.bill.findMany({
    where: {
      walletId: { in: walletIds },
      userId,
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
      wallet: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
    },
    orderBy: { dueDate: 'asc' },
  })

  const now = new Date()
  let totalUpcoming = 0
  let totalOverdue = 0
  let totalPaid = 0
  let paidBillsCount = 0
  let overdueBillsCount = 0
  let upcomingBillsCount = 0

  // Initialize wallet summaries
  const walletSummaryMap = new Map<string, WalletBillSummary>()
  for (const member of group.wallets) {
    walletSummaryMap.set(member.walletId, {
      walletId: member.walletId,
      walletName: member.wallet.name,
      walletColor: member.wallet.color || null,
      bills: [],
      totalAmount: 0,
      upcomingAmount: 0,
      overdueAmount: 0,
      paidAmount: 0,
      billCount: 0,
    })
  }

  // Process bills (Requirement 11.2 - include wallet info)
  const aggregatedBills: AggregatedBill[] = bills.map((bill) => {
    let status: 'upcoming' | 'overdue' | 'paid'
    
    if (bill.isPaid) {
      status = 'paid'
      totalPaid += bill.amount
      paidBillsCount++
    } else if (new Date(bill.dueDate) < now) {
      status = 'overdue'
      totalOverdue += bill.amount
      overdueBillsCount++
    } else {
      status = 'upcoming'
      totalUpcoming += bill.amount
      upcomingBillsCount++
    }

    const aggregatedBill: AggregatedBill = {
      id: bill.id,
      name: bill.name,
      amount: bill.amount,
      dueDate: bill.dueDate,
      status,
      isPaid: bill.isPaid,
      paidDate: bill.paidDate,
      categoryId: bill.categoryId,
      categoryName: bill.category?.name || null,
      walletId: bill.wallet.id,
      walletName: bill.wallet.name,
      walletColor: bill.wallet.color || null,
      isRecurring: bill.isRecurring,
      frequency: bill.frequency,
      notes: bill.notes,
    }

    // Update wallet summary
    const walletSummary = walletSummaryMap.get(bill.walletId)
    if (walletSummary) {
      walletSummary.bills.push(aggregatedBill)
      walletSummary.totalAmount += bill.amount
      walletSummary.billCount++
      
      if (bill.isPaid) {
        walletSummary.paidAmount += bill.amount
      } else if (new Date(bill.dueDate) < now) {
        walletSummary.overdueAmount += bill.amount
      } else {
        walletSummary.upcomingAmount += bill.amount
      }
    }

    return aggregatedBill
  })

  // Calculate stats (Requirement 11.4)
  const totalBills = bills.length
  const unpaidBills = totalBills - paidBillsCount
  const paymentRate = totalBills > 0 ? (paidBillsCount / totalBills) * 100 : 0
  const totalAmount = bills.reduce((sum, b) => sum + b.amount, 0)
  const averageBillAmount = totalBills > 0 ? totalAmount / totalBills : 0

  const stats: BillStats = {
    totalBills,
    paidBills: paidBillsCount,
    unpaidBills,
    overdueBills: overdueBillsCount,
    upcomingBills: upcomingBillsCount,
    paymentRate,
    averageBillAmount,
  }

  return {
    bills: aggregatedBills,
    totalUpcoming,
    totalOverdue,
    totalPaid,
    billsByWallet: Array.from(walletSummaryMap.values()).sort(
      (a, b) => b.totalAmount - a.totalAmount
    ),
    stats,
  }
}



// ============ Helper Functions for Property Testing ============

/**
 * Verify all bills have wallet attribution
 * Used for property testing - Property 18
 */
export function verifyAllBillsHaveWalletInfo(
  bills: AggregatedBill[]
): boolean {
  return bills.every(
    (bill) => bill.walletId && bill.walletId.length > 0 && bill.walletName && bill.walletName.length > 0
  )
}

/**
 * Verify total upcoming equals sum of upcoming bills
 * Used for property testing - Property 18
 */
export function verifyTotalUpcoming(
  bills: AggregatedBill[],
  totalUpcoming: number
): boolean {
  const calculatedUpcoming = bills
    .filter((b) => b.status === 'upcoming')
    .reduce((sum, b) => sum + b.amount, 0)
  return Math.abs(totalUpcoming - calculatedUpcoming) < 0.01
}

/**
 * Verify total overdue equals sum of overdue bills
 * Used for property testing - Property 18
 */
export function verifyTotalOverdue(
  bills: AggregatedBill[],
  totalOverdue: number
): boolean {
  const calculatedOverdue = bills
    .filter((b) => b.status === 'overdue')
    .reduce((sum, b) => sum + b.amount, 0)
  return Math.abs(totalOverdue - calculatedOverdue) < 0.01
}

/**
 * Verify total paid equals sum of paid bills
 * Used for property testing - Property 18
 */
export function verifyTotalPaid(
  bills: AggregatedBill[],
  totalPaid: number
): boolean {
  const calculatedPaid = bills
    .filter((b) => b.status === 'paid')
    .reduce((sum, b) => sum + b.amount, 0)
  return Math.abs(totalPaid - calculatedPaid) < 0.01
}

/**
 * Verify bill count matches wallet summaries
 * Used for property testing - Property 18
 */
export function verifyBillCountMatchesWalletSummaries(
  bills: AggregatedBill[],
  walletSummaries: WalletBillSummary[]
): boolean {
  // Count bills per wallet
  const walletCounts = new Map<string, number>()
  for (const bill of bills) {
    walletCounts.set(bill.walletId, (walletCounts.get(bill.walletId) || 0) + 1)
  }

  // Verify counts match summaries
  for (const summary of walletSummaries) {
    const expectedCount = walletCounts.get(summary.walletId) || 0
    if (summary.billCount !== expectedCount) {
      return false
    }
  }

  return true
}

/**
 * Verify stats calculations are correct
 * Used for property testing - Property 18
 */
export function verifyStatsCalculations(
  bills: AggregatedBill[],
  stats: BillStats
): boolean {
  const totalBills = bills.length
  const paidBills = bills.filter((b) => b.status === 'paid').length
  const overdueBills = bills.filter((b) => b.status === 'overdue').length
  const upcomingBills = bills.filter((b) => b.status === 'upcoming').length
  const unpaidBills = totalBills - paidBills
  const paymentRate = totalBills > 0 ? (paidBills / totalBills) * 100 : 0
  const totalAmount = bills.reduce((sum, b) => sum + b.amount, 0)
  const averageBillAmount = totalBills > 0 ? totalAmount / totalBills : 0

  return (
    stats.totalBills === totalBills &&
    stats.paidBills === paidBills &&
    stats.unpaidBills === unpaidBills &&
    stats.overdueBills === overdueBills &&
    stats.upcomingBills === upcomingBills &&
    Math.abs(stats.paymentRate - paymentRate) < 0.01 &&
    Math.abs(stats.averageBillAmount - averageBillAmount) < 0.01
  )
}

/**
 * Verify all wallets from group are represented in summaries
 * Used for property testing - Property 18
 */
export function verifyAllWalletsRepresented(
  walletIds: string[],
  walletSummaries: WalletBillSummary[]
): boolean {
  const summaryWalletIds = new Set(walletSummaries.map((w) => w.walletId))
  return walletIds.every((id) => summaryWalletIds.has(id))
}

/**
 * Calculate expected total bills from wallet summaries
 * Used for property testing - Property 18
 */
export function calculateExpectedTotalBills(
  walletSummaries: WalletBillSummary[]
): number {
  return walletSummaries.reduce((sum, w) => sum + w.billCount, 0)
}

/**
 * Verify wallet summary amounts are correct
 * Used for property testing - Property 18
 */
export function verifyWalletSummaryAmounts(
  walletSummary: WalletBillSummary
): boolean {
  const calculatedTotal = walletSummary.bills.reduce((sum, b) => sum + b.amount, 0)
  const calculatedUpcoming = walletSummary.bills
    .filter((b) => b.status === 'upcoming')
    .reduce((sum, b) => sum + b.amount, 0)
  const calculatedOverdue = walletSummary.bills
    .filter((b) => b.status === 'overdue')
    .reduce((sum, b) => sum + b.amount, 0)
  const calculatedPaid = walletSummary.bills
    .filter((b) => b.status === 'paid')
    .reduce((sum, b) => sum + b.amount, 0)

  return (
    Math.abs(walletSummary.totalAmount - calculatedTotal) < 0.01 &&
    Math.abs(walletSummary.upcomingAmount - calculatedUpcoming) < 0.01 &&
    Math.abs(walletSummary.overdueAmount - calculatedOverdue) < 0.01 &&
    Math.abs(walletSummary.paidAmount - calculatedPaid) < 0.01
  )
}
