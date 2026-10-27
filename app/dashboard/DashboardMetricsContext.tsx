'use client'

import { createContext, useContext } from 'react'
import type { DashboardPeriod, DateRange, FlowTotals, MonthlyFlow } from '@/lib/dashboard-metrics'
import type { Transaction } from '@/lib/hooks/useTransactions'

/**
 * The dashboard's numbers for the active scope + period, computed once in
 * DashboardContent and shared with widgets so every card agrees. null in
 * wallet-group mode (widgets fall back to their own group-aware fetches).
 */
export type DashboardMetrics = {
  period: DashboardPeriod
  periodLabel: string
  range: DateRange | null
  previousLabel: string
  flows: FlowTotals
  previousFlows: FlowTotals | null
  monthlyHistory: MonthlyFlow[]
  /** Transactions in scope + period, newest first. */
  transactions: Transaction[]
  /** Ids of savings-transfer transactions (shown as "Ditabung"). */
  savedIds: Set<string>
}

export const DashboardMetricsContext = createContext<DashboardMetrics | null>(null)

export function useDashboardMetrics(): DashboardMetrics | null {
  return useContext(DashboardMetricsContext)
}
