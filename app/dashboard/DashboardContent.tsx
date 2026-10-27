'use client'

import React, { useEffect, useState, useRef } from 'react'
import { FiArrowUpRight, FiArrowDownLeft, FiDollarSign, FiTrendingUp, FiAlertCircle, FiCalendar, FiEye } from 'react-icons/fi'
import { useWallet } from '../providers/WalletProvider'
import WalletSelector from '../components/WalletSelector'
import type { Budget } from '@/app/types/budget'
import type { Category } from '@/app/types/category'
import type { Wallet } from '@/app/types/wallet'
import BudgetProgress from '@/components/budget/BudgetProgress'
import EmergencyFundCard from '@/app/components/dashboard/EmergencyFundCard'
import { Chart as ChartJS, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js'
import { Bar } from 'react-chartjs-2'
import TransactionModal from '@/app/components/TransactionModal'
import { useRouter } from 'next/navigation'
import CustomizableTabContent from '../components/dashboard/CustomizableTabContent'
import WalletContributionChart from '@/app/components/dashboard/WalletContributionChart'
import { WalletTypeTabs } from '@/components/WalletTypeTabs'
import { useTransactions, type Transaction } from '@/lib/hooks/useTransactions'
import { calculateTrend, type TrendResult } from '@/lib/trend'
import {
  averageMonthlySurplus,
  buildTransferIndex,
  computeFlowTotals,
  computeHealthScore,
  monthlyFlows,
  PERIOD_LABEL,
  PERIOD_OPTIONS,
  periodRange,
  previousPeriodLabel,
  previousPeriodRange,
  type DashboardPeriod,
  type FlowTx,
} from '@/lib/dashboard-metrics'
import { useBudgets, type Budget as BudgetType } from '@/lib/hooks/useBudgets'
import { useGoals } from '@/lib/hooks/useGoals'
import { useEmergencyFund } from '@/lib/hooks/useEmergencyFund'

import SpendingAnomalyBanner from '@/app/components/dashboard/SpendingAnomalyBanner'

const CATEGORY_COLORS = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#8AC926', '#1982C4', '#6A4C93', '#FF595E']
const PERIOD_STORAGE_KEY = 'dashboardPeriod'

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

type BudgetWithRelations = BudgetType & {
  category?: Category
  wallet?: Wallet
}

type SubscriptionAlert = {
  id: string
  type: string
  severity: 'low' | 'medium' | 'high'
  title: string
  dueAt: string
  daysLeft: number
  subscription: {
    id: string
    name: string
    amount: number
    currencyCode: string
    billingCycle: string
    wallet?: { name: string } | null
  }
}

function TrendBadge({ trend, invert, label }: { trend: TrendResult; invert?: boolean; label?: string }) {
  if (trend.direction === 'none' || trend.pct === null) {
    return <span className="mt-2 inline-block text-[10px] text-blue-200/60">— belum ada data</span>
  }
  const isGood = invert ? trend.direction === 'down' : trend.direction === 'up'
  const arrow = trend.direction === 'up' ? '▲' : trend.direction === 'down' ? '▼' : '•'
  const sign = trend.pct > 0 ? '+' : ''
  return (
    <span
      className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        isGood ? 'bg-emerald-500/20 text-emerald-200' : 'bg-red-500/20 text-red-200'
      }`}
    >
      {arrow} {sign}{trend.pct.toFixed(1)}%
      {label ? <span className="font-normal opacity-70">vs {label}</span> : null}
    </span>
  )
}

interface Props {
  budgets: BudgetWithRelations[];
}

const DashboardContent = ({ budgets = [] }: Props) => {
  const { wallets, selectedWallet, refreshWallets, selectedGroup, isGroupSelected, dashboardScope, dashboardScopeWalletIds, dashboardScopeLabel } = useWallet()

  // "Semua" (all wallets) must use the endpoint's all-wallets path so wallet-less
  // obligations are included; a proper subset passes explicit walletIds.
  const isAllWalletsScope = dashboardScope?.kind === 'type' && dashboardScope.type === 'ALL'

  // Non-group dashboard scope: a set of wallet ids (one wallet, or all wallets
  // of a type). `scopeKey` is a stable primitive for effect dependencies.
  const scopeWalletIds = dashboardScopeWalletIds
  const scopeKey = scopeWalletIds.join(',')
  const scopeSet = React.useMemo(() => new Set(scopeWalletIds), [scopeKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // React Query hooks for data fetching
  // Default "Bulan Ini"; the user's last choice is remembered.
  const [selectedPeriod, setSelectedPeriodState] = useState<DashboardPeriod>('monthly')
  useEffect(() => {
    const saved = localStorage.getItem(PERIOD_STORAGE_KEY) as DashboardPeriod | null
    if (saved && PERIOD_OPTIONS.some((o) => o.value === saved)) setSelectedPeriodState(saved)
  }, [])
  const setSelectedPeriod = (p: DashboardPeriod) => {
    setSelectedPeriodState(p)
    localStorage.setItem(PERIOD_STORAGE_KEY, p)
  }
  const { data: allTransactions = [], isLoading: isLoadingTransactions } = useTransactions()
  const { data: allBudgets = [], isLoading: isLoadingBudgets } = useBudgets()
  const { data: goals = [] } = useGoals(isGroupSelected ? undefined : selectedWallet?.id)
  const { data: savingsData, isLoading: isLoadingSavings } = useEmergencyFund(selectedWallet?.id)

  // Group-specific data
  const [groupDashboardData, setGroupDashboardData] = useState<any>(null)
  const [isLoadingGroupData, setIsLoadingGroupData] = useState(false)

  const [summary, setSummary] = useState({ total: 0, income: 0, expense: 0 })
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([])
  const [chartData, setChartData] = useState({ income: 0, expense: 0 })
  const [recentBudgets, setRecentBudgets] = useState<BudgetWithRelations[]>([])
  const [showAllTransactions, setShowAllTransactions] = useState(false)
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false)
  const [transactionType, setTransactionType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE')
  // State for dashboard items
  const [showTips, setShowTips] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [transactionHistory, setTransactionHistory] = useState<Array<{
    month: string;
    year: number;
    income: number;
    expense: number;
  }>>([])
  const [spendingByCategory, setSpendingByCategory] = useState<{ name: string; amount: number; color: string }[]>([])
  const [financialTips, setFinancialTips] = useState<{ id: number; title: string; description: string }[]>([
    { id: 1, title: 'Tabungan Darurat', description: 'Sisihkan 20% penghasilan setiap bulan untuk dana darurat' },
    { id: 2, title: 'Atur Budget', description: 'Tentukan batas maksimal untuk kategori pengeluaran non-esensial' },
    { id: 3, title: 'Lacak Pengeluaran', description: 'Catat semua pengeluaran untuk identifikasi area yang bisa dihemat' },
  ])
  const [subscriptionAlerts, setSubscriptionAlerts] = useState<SubscriptionAlert[]>([])
  const [isLoadingSubscriptionAlerts, setIsLoadingSubscriptionAlerts] = useState(false)
  const [sharedBillsSummary, setSharedBillsSummary] = useState({ outstandingAmount: 0, openCount: 0 })
  type SafeToSpendData = {
    safeToSpend: number
    balance: number
    expectedIncome: number
    goalReserve: number
    buffer: number
    obligations: { bills: number; recurring: number; subscriptions: number; creditCards: number; sharedBills: number; total: number }
    confidence: 'low' | 'medium' | 'high'
    perDay?: number
    daysLeft?: number
  }
  const [safeToSpendData, setSafeToSpendData] = useState<SafeToSpendData | null>(null)

  const router = useRouter()

  // Auto-sync recurring transactions on dashboard load
  const syncCalledRef = useRef(false)

  useEffect(() => {
    // Prevent double execution in StrictMode
    if (syncCalledRef.current) {
      console.log('[AUTO-SYNC] Already called, skipping duplicate')
      return
    }
    syncCalledRef.current = true

    const autoSyncRecurring = async () => {
      try {
        // Throttle: only sync once per 5 minutes to avoid spam
        const lastSyncTime = localStorage.getItem('lastRecurringSyncTime')
        const now = Date.now()
        const fiveMinutes = 5 * 60 * 1000

        if (lastSyncTime && (now - parseInt(lastSyncTime)) < fiveMinutes) {
          console.log('[AUTO-SYNC] Throttled, last sync was less than 5 minutes ago')
          return
        }

        // Set timestamp BEFORE API call to prevent race condition
        localStorage.setItem('lastRecurringSyncTime', now.toString())

        console.log('[AUTO-SYNC] Checking for due recurring transactions...')
        const response = await fetch('/api/recurring/sync', { method: 'POST' })

        if (response.ok) {
          const result = await response.json()

          if (result.processed > 0) {
            console.log(`[AUTO-SYNC] Processed ${result.processed} recurring transactions`)
            // Refresh wallet balances after sync
            refreshWallets()
          } else {
            console.log('[AUTO-SYNC] No due recurring transactions to process')
          }
        }
      } catch (error) {
        console.error('[AUTO-SYNC] Error syncing recurring:', error)
      }
    }

    autoSyncRecurring()
  }, []) // Run once on mount

  useEffect(() => {
    const fetchSubscriptionAlerts = async () => {
      setIsLoadingSubscriptionAlerts(true)
      try {
        const response = await fetch('/api/subscription-trackers/upcoming?days=14')
        if (!response.ok) return
        const data = await response.json()
        setSubscriptionAlerts(data.alerts || [])
      } catch (error) {
        console.error('Error loading subscription alerts:', error)
      } finally {
        setIsLoadingSubscriptionAlerts(false)
      }
    }

    fetchSubscriptionAlerts()
  }, [])

  useEffect(() => {
    const fetchSharedBillsSummary = async () => {
      try {
        // Empty resolved type scope: no outstanding bills, skip the all-wallets call.
        if (!isGroupSelected && !isAllWalletsScope && dashboardScope?.kind === 'type' && scopeWalletIds.length === 0) {
          setSharedBillsSummary({ outstandingAmount: 0, openCount: 0 })
          return
        }
        const params = new URLSearchParams()
        if (isGroupSelected && selectedGroup?.id) params.set('walletGroupId', selectedGroup.id)
        else if (dashboardScope?.kind === 'wallet') params.set('walletId', dashboardScope.walletId)
        else if (isAllWalletsScope) { /* no param → all wallets (includes wallet-less bills) */ }
        else if (scopeWalletIds.length > 0) params.set('walletIds', scopeWalletIds.join(','))

        const response = await fetch(`/api/shared-bills?${params.toString()}`)
        if (!response.ok) return
        const data = await response.json()
        setSharedBillsSummary({
          outstandingAmount: data.summary?.outstandingAmount || 0,
          openCount: data.summary?.openCount || 0,
        })
      } catch (error) {
        console.error('Error loading shared bills summary:', error)
      }
    }

    fetchSharedBillsSummary()
  }, [isGroupSelected, selectedGroup?.id, scopeKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Safe to spend is computed server-side (it needs bills/recurring/credit-card
  // data the dashboard doesn't load) so the number stays consistent everywhere.
  useEffect(() => {
    const fetchSafeToSpend = async () => {
      try {
        // Empty resolved type scope (e.g. "Investasi (0)"): no data, and do NOT
        // fall through to the param-less all-wallets endpoint.
        if (!isGroupSelected && !isAllWalletsScope && dashboardScope?.kind === 'type' && scopeWalletIds.length === 0) {
          setSafeToSpendData(null)
          return
        }
        const params = new URLSearchParams()
        if (isGroupSelected && selectedGroup?.id) params.set('walletGroupId', selectedGroup.id)
        else if (dashboardScope?.kind === 'wallet') params.set('walletId', dashboardScope.walletId)
        else if (isAllWalletsScope) { /* no param → all wallets (includes wallet-less obligations) */ }
        else if (scopeWalletIds.length > 0) params.set('walletIds', scopeWalletIds.join(','))

        const response = await fetch(`/api/safe-to-spend/breakdown?${params.toString()}`)
        if (!response.ok) {
          setSafeToSpendData(null)
          return
        }
        setSafeToSpendData(await response.json())
      } catch (error) {
        console.error('Error loading safe-to-spend:', error)
        setSafeToSpendData(null)
      }
    }

    fetchSafeToSpend()
  }, [isGroupSelected, selectedGroup?.id, scopeKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load saved widget state from localStorage on component initialization
  const getSavedWidgets = () => {
    if (typeof window !== 'undefined') {
      try {
        const savedWidgetsStr = localStorage.getItem('ringkasanWidgets');
        console.log('Debug - Loading from localStorage:', savedWidgetsStr);

        if (savedWidgetsStr) {
          const parsedWidgets = JSON.parse(savedWidgetsStr);
          console.log('Debug - Parsed widgets:', parsedWidgets);
          return parsedWidgets;
        }
      } catch (error) {
        console.error('Error loading saved widgets from localStorage:', error);
      }
    }
    console.log('Debug - No widgets found in localStorage, returning empty array');
    return [];
  };

  const [isEditModeRingkasan, setIsEditModeRingkasan] = useState(false);
  const [ringkasanWidgets, setRingkasanWidgets] = useState<any[]>(getSavedWidgets());
  const [widgetsInitialized, setWidgetsInitialized] = useState(false);

  // Update localStorage whenever widgets change
  useEffect(() => {
    if (ringkasanWidgets.length > 0) {
      console.log('Debug - Saving to localStorage:', ringkasanWidgets);
      localStorage.setItem('ringkasanWidgets', JSON.stringify(ringkasanWidgets));
    }
  }, [ringkasanWidgets]);

  // Helper function to calculate date range from period
  const getDateRangeFromPeriod = (period: string): { startDate?: Date; endDate?: Date } => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    switch (period) {
      case 'daily':
        return { startDate: today, endDate: now }
      case 'weekly':
        const weekAgo = new Date(today)
        weekAgo.setDate(today.getDate() - 7)
        return { startDate: weekAgo, endDate: now }
      case 'monthly':
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
        return { startDate: startOfMonth, endDate: now }
      case 'quarterly':
        const threeMonthsAgo = new Date(today)
        threeMonthsAgo.setMonth(today.getMonth() - 3)
        return { startDate: threeMonthsAgo, endDate: now }
      case 'yearly':
        const startOfYear = new Date(today.getFullYear(), 0, 1)
        return { startDate: startOfYear, endDate: now }
      default:
        return {} // 'all' - no date filter
    }
  }

  // Fetch group dashboard data when a group is selected
  useEffect(() => {
    const fetchGroupDashboard = async () => {
      if (!isGroupSelected || !selectedGroup || !selectedGroup.id) {
        setGroupDashboardData(null)
        return
      }

      try {
        setIsLoadingGroupData(true)
        // Clear individual wallet data when viewing group
        setFilteredTransactions([])
        console.log('[DashboardContent] Fetching group dashboard for:', selectedGroup.id, 'period:', selectedPeriod)

        // Build URL with date range parameters
        const dateRange = getDateRangeFromPeriod(selectedPeriod)
        const params = new URLSearchParams()
        if (dateRange.startDate) {
          params.set('startDate', dateRange.startDate.toISOString())
        }
        if (dateRange.endDate) {
          params.set('endDate', dateRange.endDate.toISOString())
        }
        const queryString = params.toString()
        const url = `/api/wallet-groups/${selectedGroup.id}/dashboard${queryString ? `?${queryString}` : ''}`

        const response = await fetch(url)
        console.log('[DashboardContent] Response status:', response.status)
        if (response.ok) {
          const responseData = await response.json()
          console.log('[DashboardContent] Raw API response:', responseData)
          // API returns { success: true, data: {...} } format
          const data = responseData.data || responseData
          console.log('[DashboardContent] Parsed data:', data)
          console.log('[DashboardContent] totalBalance:', data.totalBalance, 'totalIncome:', data.totalIncome, 'totalExpense:', data.totalExpense)
          setGroupDashboardData(data)

          // Update summary from group data
          setSummary({
            total: data.totalBalance || 0,
            income: data.totalIncome || 0,
            expense: data.totalExpense || 0,
          })
          console.log('[DashboardContent] Summary updated:', { total: data.totalBalance || 0, income: data.totalIncome || 0, expense: data.totalExpense || 0 })

          // Update spending by category from group data
          if (data.spendingByCategory && data.spendingByCategory.length > 0) {
            console.log('[DashboardContent] Group spendingByCategory from API:', data.spendingByCategory.length, 'categories')
            const colors = [
              '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
              '#FF9F40', '#8AC926', '#1982C4', '#6A4C93', '#FF595E'
            ]
            const categoryData = data.spendingByCategory.map((cat: any, index: number) => ({
              name: cat.categoryName || cat.name,
              amount: cat.amount,
              color: colors[index % colors.length]
            }))
            console.log('[DashboardContent] Setting spendingByCategory for group:', categoryData.length, 'Total:', categoryData.reduce((sum: number, c: any) => sum + c.amount, 0))
            setSpendingByCategory(categoryData.sort((a: any, b: any) => b.amount - a.amount))
          } else {
            console.log('[DashboardContent] No spendingByCategory from group API, clearing')
            // Clear spending by category if no data for this period
            setSpendingByCategory([])
          }

          // Update transaction history from group data if available
          if (data.transactionHistory && data.transactionHistory.length > 0) {
            setTransactionHistory(data.transactionHistory)
          } else {
            // Clear transaction history for groups (API doesn't return it)
            setTransactionHistory([])
          }
        }
      } catch (error) {
        console.error('Error fetching group dashboard:', error)
      } finally {
        setIsLoadingGroupData(false)
      }
    }

    fetchGroupDashboard()
  }, [isGroupSelected, selectedGroup, selectedPeriod])

  // Filtered transactions and budgets
  const filteredBudgets = React.useMemo(() => {
    if (isGroupSelected && selectedGroup && selectedGroup.wallets) {
      // For groups, filter budgets that belong to any wallet in the group
      const groupWalletIds = selectedGroup.wallets.map(w => w.walletId)
      return allBudgets?.filter(budget => groupWalletIds.includes(budget.walletId)) || []
    }
    // Non-group: always scope to the active wallet set. An empty set (e.g. an
    // empty type tab) returns no budgets instead of leaking every wallet's.
    return (allBudgets || []).filter(budget => scopeSet.has(budget.walletId))
  }, [isGroupSelected, selectedGroup, scopeKey, allBudgets]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Money flows (non-group scope) ---------------------------------------
  // Moving money into savings is NOT spending; see lib/dashboard-metrics.ts.
  const transferIndex = React.useMemo(() => buildTransferIndex(allTransactions as FlowTx[]), [allTransactions])
  const currentRange = React.useMemo(() => periodRange(selectedPeriod), [selectedPeriod])
  const flows = React.useMemo(
    () => computeFlowTotals(allTransactions as FlowTx[], scopeSet, transferIndex, currentRange),
    [allTransactions, scopeSet, transferIndex, currentRange]
  )
  const previousFlows = React.useMemo(() => {
    const range = previousPeriodRange(selectedPeriod)
    return range ? computeFlowTotals(allTransactions as FlowTx[], scopeSet, transferIndex, range) : null
  }, [allTransactions, scopeSet, transferIndex, selectedPeriod])
  const monthlyHistory = React.useMemo(
    () => monthlyFlows(allTransactions as FlowTx[], scopeSet, transferIndex, 6),
    [allTransactions, scopeSet, transferIndex]
  )

  // Push the non-group flows into the state the JSX (and group mode) share.
  useEffect(() => {
    if (isGroupSelected || !dashboardScope) return
    setFilteredTransactions(
      allTransactions.filter((tx) => {
        if (!scopeSet.has(tx.walletId)) return false
        if (!currentRange) return true
        const d = new Date(tx.date)
        return d >= currentRange.start && d <= currentRange.end
      })
    )
    setSummary({ total: flows.net, income: flows.income, expense: flows.expense })
    setChartData({ income: flows.income, expense: flows.expense })
    setSpendingByCategory(flows.byCategory.map((c, i) => ({ ...c, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] })))
    setTransactionHistory(
      monthlyHistory.map((m) => ({ month: m.label, year: Number(m.key.slice(0, 4)), income: m.income, expense: m.expense }))
    )
  }, [isGroupSelected, dashboardScope, allTransactions, scopeSet, currentRange, flows, monthlyHistory])

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
    }).format(date);
  }

  const handleBudgetUpdate = async (budget: BudgetWithRelations) => {
    // Budget data will automatically refresh via React Query
    // No manual fetch needed
  };

  // ---- Derived numbers -----------------------------------------------------
  // Group mode still uses the server aggregate (not transfer-aware yet).
  const groupSavingsRate = summary.income > 0 ? ((summary.income - summary.expense) / summary.income) * 100 : null
  const savingsRate: number | null = isGroupSelected ? groupSavingsRate : flows.savingsRate
  const savedThisPeriod: number | null = isGroupSelected ? null : flows.saved

  const calculateFinancialStats = () => {
    if (scopeWalletIds.length === 0 && !isGroupSelected) return { savingsRate: 0, expenseRatio: 0, topCategory: null }
    const expenseRatio = summary.income > 0 ? (summary.expense / summary.income) * 100 : 0
    const topCategory = spendingByCategory.length > 0 ? spendingByCategory[0] : null
    return { savingsRate: savingsRate ?? 0, expenseRatio, topCategory }
  }
  const stats = calculateFinancialStats()

  // Source-of-truth balance: actual wallet/group balance, not period cashflow.
  const displayBalance = isGroupSelected
    ? (groupDashboardData?.totalBalance ?? summary.total)
    : wallets.filter((w) => scopeSet.has(w.id)).reduce((s, w) => s + (w.balance ?? 0), 0)
  // Change of the scope's balance over the period: savings moved within the
  // scope don't count, savings moved out of it do.
  const netCashflow = isGroupSelected ? summary.income - summary.expense : flows.net
  const periodLabel = PERIOD_LABEL[selectedPeriod] || 'Semua Waktu'
  const groupWalletIdSet = new Set((selectedGroup?.wallets || []).map((m) => m.walletId))
  const negativeWallets = wallets.filter(
    (wallet) => wallet.balance < 0 && (isGroupSelected ? groupWalletIdSet.has(wallet.id) : scopeSet.has(wallet.id))
  )
  const transactionCount = filteredTransactions.length
  const budgetUsage = filteredBudgets.length
    ? Math.round(filteredBudgets.reduce((sum, budget) => sum + ((budget.spent || 0) / Math.max(budget.amount || 1, 1)), 0) / filteredBudgets.length * 100)
    : 0
  const dataQualityScore = Math.min(100, Math.round((Math.min(transactionCount, 20) / 20) * 70 + (filteredBudgets.length ? 15 : 0) + (scopeWalletIds.length ? 15 : 0)))
  const health = computeHealthScore({
    savingsRate,
    net: netCashflow,
    negativeWallets: negativeWallets.length,
    budgetUsage: filteredBudgets.length ? budgetUsage : null,
    txCount: transactionCount,
  })
  const healthScore = health.score
  const todayAction = negativeWallets.length
    ? { title: 'Beresin saldo negatif', description: `${negativeWallets[0].name} perlu dicek/reconcile.`, href: '/wallets' }
    : !filteredBudgets.length
      ? { title: 'Buat budget pertama', description: 'Budget bikin dashboard lebih akurat.', href: '/budgets' }
      : transactionCount < 5
        ? { title: 'Tambah data transaksi', description: `Baru ${transactionCount} transaksi. Butuh 5+ buat insight.`, href: '/transactions' }
        : budgetUsage > 90
          ? { title: 'Rem pengeluaran', description: `Rata-rata budget udah kepakai ${budgetUsage}%.`, href: '/budgets' }
          : budgetUsage === 0
            ? { title: 'Cek kategori budget', description: 'Belum ada pengeluaran yang masuk ke budget. Kategorinya udah cocok?', href: '/budgets' }
            : { title: 'Review budget', description: `Rata-rata pemakaian budget ${budgetUsage}%.`, href: '/budgets' }

  // Data quality label
  const dataQualityLabel = dataQualityScore >= 70 ? 'High' : dataQualityScore >= 40 ? 'Medium' : 'Low'
  const dataQualityReason = transactionCount < 5
    ? `Baru ${transactionCount} transaksi`
    : !filteredBudgets.length
      ? 'Belum ada budget'
      : 'Data cukup'

  // Safe-to-spend is computed server-side (see the fetchSafeToSpend effect): it
  // needs bills/recurring/credit-card data the dashboard doesn't load, and we
  // want one authoritative number shared with the chatbot.
  const activeGoals = goals.filter((g) => !g.isArchived && g.status !== 'COMPLETED')
  const safeToSpend = safeToSpendData?.safeToSpend ?? 0
  const obligationsTotal = safeToSpendData?.obligations.total ?? 0
  const goalReserve = safeToSpendData?.goalReserve ?? 0
  const safeBuffer = safeToSpendData?.buffer ?? 0
  const safeBalance = safeToSpendData?.balance ?? displayBalance
  const safeConfidence = safeToSpendData
    ? (safeToSpendData.confidence === 'high' ? 'High' : safeToSpendData.confidence === 'medium' ? 'Medium' : 'Low')
    : dataQualityLabel

  // Trend = this period vs the same elapsed span of the previous one
  // (e.g. 1–27 Okt vs 1–27 Sep), so a month in progress compares fairly.
  const noTrend: TrendResult = { pct: null, direction: 'none' }
  const incomeTrend: TrendResult = !isGroupSelected && previousFlows ? calculateTrend(flows.income, previousFlows.income) : noTrend
  const expenseTrend: TrendResult = !isGroupSelected && previousFlows ? calculateTrend(flows.expense, previousFlows.expense) : noTrend
  const trendPrevLabel = previousPeriodLabel(selectedPeriod)

  // Goal projection (nearest active goal). Pace = average monthly surplus of
  // the last 3 complete months, independent of the selected period.
  const projectionGoal = activeGoals
    .map((g) => ({ g, remaining: Math.max((g.target || 0) - (g.current || 0), 0) }))
    .filter((x) => x.remaining > 0)
    .sort((a, b) => a.remaining - b.remaining)[0]
  const monthlySurplus = isGroupSelected ? null : averageMonthlySurplus(monthlyHistory, 3)
  const goalProjection = !activeGoals.length
    ? { label: 'Belum ada goal aktif', detail: 'Bikin goal biar bisa diproyeksiin.' }
    : !projectionGoal
      ? { label: 'Semua goal tercapai 🎉', detail: 'Mantap, target kebeli.' }
      : monthlySurplus && monthlySurplus > 0
        ? { label: projectionGoal.g.name, detail: `Sisa ${formatCurrency(projectionGoal.remaining)} • ~${Math.ceil(projectionGoal.remaining / monthlySurplus)} bulan lagi (rata-rata sisa ${formatCurrency(monthlySurplus)}/bulan)` }
        : { label: projectionGoal.g.name, detail: `Sisa ${formatCurrency(projectionGoal.remaining)} • belum ada sisa bulanan buat proyeksi` }

  // Smart Insight. Savings transfers are excluded from spendingByCategory, so
  // "Savings" can no longer show up as the top spending category.
  const topSpendingCategory = spendingByCategory.length > 0 ? spendingByCategory[0] : null
  const topShare = topSpendingCategory && summary.expense > 0 ? `, ${Math.round((topSpendingCategory.amount / summary.expense) * 100)}% dari pengeluaran` : ''
  const smartInsight = transactionCount < 5
    ? `Baru ${transactionCount} transaksi (${periodLabel.toLowerCase()}). Tambah ${Math.max(5 - transactionCount, 0)} lagi biar trend & insight akurat.`
    : negativeWallets.length
      ? `${negativeWallets[0].name} saldo negatif. Beresin dulu biar cashflow sehat.`
      : budgetUsage > 90
        ? `Budget kepakai ${budgetUsage}%. Rem pengeluaran kategori utama biar gak jebol.`
        : topSpendingCategory
          ? `${savingsRate !== null ? `Saving rate ${savingsRate.toFixed(0)}%. ` : ''}Pengeluaran terbesar (${periodLabel.toLowerCase()}): ${topSpendingCategory.name} ${formatCurrency(topSpendingCategory.amount)}${topShare}.`
          : 'Cashflow stabil. Pertahankan dan mulai alokasi ke goal.'

  // Monthly close checklist with computed emphasis
  const monthlyCloseItems = [
    { label: 'Reconcile saldo wallet', hot: negativeWallets.length > 0 },
    { label: 'Review budget overspend', hot: budgetUsage > 90 },
    { label: 'Bayar/settle shared bills', hot: sharedBillsSummary.outstandingAmount > 0 },
    { label: 'Sisihkan ke goals', hot: netCashflow > 0 },
  ]

  // Upcoming obligations (merge subscriptions + shared bills + negative wallets)
  const upcomingObligations = [
    ...subscriptionAlerts.slice(0, 3).map((a) => ({ label: a.title, detail: `H-${a.daysLeft}`, amount: a.subscription.amount })),
    ...(sharedBillsSummary.outstandingAmount > 0 ? [{ label: 'Shared bills outstanding', detail: `${sharedBillsSummary.openCount} open`, amount: sharedBillsSummary.outstandingAmount }] : []),
    ...negativeWallets.slice(0, 2).map((w) => ({ label: `${w.name} negatif`, detail: 'reconcile', amount: w.balance })),
  ].slice(0, 4)

  // Recent transaction anomaly helper
  const avgExpense = (() => {
    const exp = filteredTransactions.filter((t) => t.type === 'EXPENSE')
    if (!exp.length) return 0
    return exp.reduce((s, t) => s + t.amount, 0) / exp.length
  })()
  const descCounts = filteredTransactions.reduce((acc, t) => {
    const k = (t.description || '').trim().toLowerCase()
    if (k) acc[k] = (acc[k] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const txBadges = (tx: Transaction): string[] => {
    const badges: string[] = []
    if (tx.type === 'EXPENSE' && avgExpense > 0 && tx.amount > avgExpense * 2) badges.push('Large')
    const k = (tx.description || '').trim().toLowerCase()
    if (k && descCounts[k] >= 3) badges.push('Recurring?')
    return badges
  }

  // Prepare chart data
  const barChartData = {
    labels: transactionHistory.map(m => m.month),
    datasets: [
      {
        label: 'Pemasukan',
        data: transactionHistory.map(m => m.income),
        backgroundColor: '#10b981',
        borderRadius: 6,
        maxBarThickness: 26,
      },
      {
        label: 'Pengeluaran',
        data: transactionHistory.map(m => m.expense),
        backgroundColor: '#f87171',
        borderRadius: 6,
        maxBarThickness: 26,
      },
    ],
  }


  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 1.5,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          boxWidth: 10,
          padding: 5,
          font: {
            size: 11,
          },
        },
      },
      title: {
        display: true,
        text: 'Pemasukan dan Pengeluaran 6 Bulan Terakhir',
        font: {
          size: 12,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return formatCurrency(value);
          }
        }
      }
    }
  }

  // Handle transaction save
  const handleSaveTransaction = async (transactionData: any) => {
    try {
      // Transaction data will automatically refresh via React Query
      // Just refresh wallet balances
      await refreshWallets();

      // Close modal
      setIsTransactionModalOpen(false);
    } catch (error) {
      console.error('Error saving transaction:', error);
    }
  };

  // Only block on the genuine initial load (scope not resolved yet). An empty
  // *resolved* type scope (e.g. "Investasi (0)") must still render the dashboard
  // with its tabs so the user can switch back — see the empty-state below.
  if (!isGroupSelected && !dashboardScope) {
    return <div>Loading...</div>
  }

  // Get display name for header
  const displayName = isGroupSelected && selectedGroup
    ? selectedGroup.name
    : dashboardScopeLabel || selectedWallet?.name || 'Personal'

  return (
    <div className="space-y-6">
      <SpendingAnomalyBanner />
      <div className={`bg-gradient-to-r ${isGroupSelected ? 'from-purple-700 to-purple-500' : 'from-blue-700 to-blue-500'} rounded-xl p-6 text-white shadow-lg`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Beranda
              {isGroupSelected && selectedGroup && selectedGroup.wallets && (
                <span className="text-sm font-normal bg-white/20 px-2 py-1 rounded-full">
                  {selectedGroup.wallets.length} wallets
                </span>
              )}
            </h1>
            <p className={`${isGroupSelected ? 'text-purple-100' : 'text-blue-100'} mt-1`}>
              {isGroupSelected
                ? `Melihat data gabungan dari ${displayName}`
                : 'Selamat datang kembali! Pantau keuangan Anda.'}
            </p>
          </div>

          <div className="mt-4 md:mt-0">
            {/* Only a single-wallet scope has one wallet balance to show here. */}
            <WalletSelector displayBalance={dashboardScope?.kind === 'wallet' ? displayBalance : undefined} />
          </div>
        </div>

        {/* Wallet Type Tabs - only show for individual wallets */}
        {!isGroupSelected && <WalletTypeTabs />}

        {/* Group Wallet Breakdown - show when group is selected */}
        {isGroupSelected && selectedGroup && groupDashboardData?.walletBreakdown && (
          <div className="mb-4 flex flex-wrap gap-2">
            {groupDashboardData.walletBreakdown.map((wallet: any) => (
              <div
                key={wallet.walletId}
                className="bg-white/10 px-3 py-1.5 rounded-full text-sm flex items-center gap-2"
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: wallet.walletColor || '#fff' }}
                />
                <span>{wallet.walletName}</span>
                <span className="text-white/70">({wallet.percentage?.toFixed(0) || 0}%)</span>
              </div>
            ))}
          </div>
        )}

        {/* Quick Stats */}
        <div className="mb-4">
          <select
            className="bg-white/20 text-white border border-white/40 rounded-md p-2 text-sm [&>option]:text-black"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as DashboardPeriod)}
          >
            {PERIOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 mt-4 lg:grid-cols-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 lg:col-span-3 hover:bg-white/20 transition-all duration-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-blue-100">Total Saldo</h3>
                <p className="mt-1 text-4xl font-bold tracking-tight">{formatCurrency(displayBalance)}</p>
                <p className="mt-2 text-sm text-blue-100">Saldo aktual • {displayName}</p>
                <p className={`mt-1 text-sm ${netCashflow >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                  Net cashflow {periodLabel.toLowerCase()}: {formatCurrency(netCashflow)}
                </p>
              </div>
              <div className="p-3 bg-white/20 rounded-full">
                <FiDollarSign size={26} />
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 lg:col-span-3 hover:bg-white/20 transition-all duration-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-blue-100">Safe to spend</h3>
                <p className="mt-1 text-3xl font-bold">{formatCurrency(safeToSpend)}</p>
                {safeToSpendData?.perDay !== undefined && safeToSpendData.daysLeft ? (
                  <p className="mt-1 text-sm text-blue-50">
                    ≈ {formatCurrency(safeToSpendData.perDay)}/hari · {safeToSpendData.daysLeft} hari lagi sampai akhir bulan
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-blue-100">
                  Saldo - kewajiban bulan ini - reserve - buffer
                </p>
                <div className="mt-3 grid gap-1 text-xs text-blue-50 sm:grid-cols-4">
                  <span>Saldo {formatCurrency(safeBalance)}</span>
                  <span>Kewajiban -{formatCurrency(obligationsTotal)}</span>
                  <span>Reserve -{formatCurrency(goalReserve)}</span>
                  <span>Buffer -{formatCurrency(safeBuffer)}</span>
                </div>
              </div>
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium">Confidence: {safeConfidence}</span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 lg:col-span-1">
            <h3 className="text-blue-100">Pemasukan <span className="text-[10px] opacity-80">({periodLabel})</span></h3>
            <p className="mt-1 text-2xl font-bold text-green-300">{formatCurrency(summary.income)}</p>
            <TrendBadge trend={incomeTrend} label={trendPrevLabel} />
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 lg:col-span-1">
            <h3 className="text-blue-100">Pengeluaran <span className="text-[10px] opacity-80">({periodLabel})</span></h3>
            <p className="mt-1 text-2xl font-bold text-red-300">{formatCurrency(summary.expense)}</p>
            <TrendBadge trend={expenseTrend} invert label={trendPrevLabel} />
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 lg:col-span-1">
            <h3 className="text-blue-100">Ditabung <span className="text-[10px] opacity-80">({periodLabel})</span></h3>
            <p className="mt-1 text-2xl font-bold text-sky-200">{savedThisPeriod === null ? '—' : formatCurrency(savedThisPeriod)}</p>
            <p className="mt-2 text-[11px] text-blue-100">
              Saving rate {savingsRate === null ? '—' : `${savingsRate.toFixed(1)}%`}
            </p>
          </div>

          <button type="button" onClick={() => router.push(todayAction.href)} className="rounded-xl bg-white p-4 text-left text-blue-900 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md lg:col-span-3">
            <p className="text-sm font-medium text-blue-600">Today action</p>
            <p className="mt-1 text-xl font-semibold">{todayAction.title}</p>
            <p className="mt-1 text-sm text-blue-700">{todayAction.description}</p>
          </button>
        </div>
      </div>

      {/* Decision row: Financial Health + Smart Insight */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm text-gray-500">Financial Health</p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{healthScore ?? '—'}</p>
            {healthScore !== null ? (
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${healthScore >= 70 ? 'bg-green-100 text-green-700' : healthScore >= 45 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                {health.label}
              </span>
            ) : (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">Belum cukup data</span>
            )}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {healthScore !== null
              ? health.reasons.join(' • ')
              : <>Butuh minimal 5 transaksi di periode ini (sekarang {transactionCount})</>}
          </p>
        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50 p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-2 text-blue-700">
            <FiTrendingUp />
            <p className="text-sm font-semibold">Smart Insight</p>
          </div>
          <p className="mt-2 text-sm text-blue-950">{smartInsight}</p>
        </div>
      </div>

      {/* Upcoming Obligations + Monthly Close + Goal Projection */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
              <FiAlertCircle className="text-amber-500" /> Upcoming Obligations
            </h2>
            <button onClick={() => router.push('/subscriptions')} className="text-xs font-medium text-blue-600 hover:underline">Kelola</button>
          </div>
          <div className="mt-3 space-y-2">
            {isLoadingSubscriptionAlerts ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : upcomingObligations.length === 0 ? (
              <p className="text-sm text-gray-500">No upcoming obligations dalam 14 hari. </p>
            ) : (
              upcomingObligations.map((ob, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-gray-100 dark:border-gray-700 p-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{ob.label}</p>
                    <p className="text-xs text-gray-500">{ob.detail}</p>
                  </div>
                  <span className={`text-sm font-semibold ${ob.amount < 0 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>{formatCurrency(ob.amount)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <FiCalendar className="text-blue-500" /> Monthly Close
          </h2>
          <div className="mt-3 space-y-2">
            {monthlyCloseItems.map((item, i) => (
              <div key={i} className={`flex items-center gap-2 rounded-lg p-2.5 text-sm ${item.hot ? 'bg-amber-50 text-amber-800' : 'text-gray-700 dark:text-gray-300'}`}>
                <span className={`flex h-4 w-4 items-center justify-center rounded border ${item.hot ? 'border-amber-400' : 'border-gray-300'}`}>{item.hot ? '!' : ''}</span>
                {item.label}
              </div>
            ))}
          </div>
        </div>

        <button type="button" onClick={() => router.push('/goals')} className="rounded-xl border border-gray-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <FiTrendingUp className="text-green-500" /> Goal Projection
          </h2>
          <p className="mt-3 text-base font-semibold text-gray-900 dark:text-white">{goalProjection.label}</p>
          <p className="mt-1 text-sm text-gray-500">{goalProjection.detail}</p>
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b">
        <nav className="flex space-x-4 relative">
          <div className="flex items-center">
            <button
              className={`py-2 px-1 text-base font-medium border-b-2 transition-colors duration-150 ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('overview')}
            >
              Ringkasan
            </button>

            {activeTab === 'overview' && (
              <button
                onClick={() => setIsEditModeRingkasan(!isEditModeRingkasan)}
                className="ml-2 text-indigo-600 hover:text-indigo-800 focus:outline-none"
                title={isEditModeRingkasan ? "Selesai Edit" : "Edit Ringkasan"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                </svg>
              </button>
            )}
          </div>

          <button
            className={`py-2 px-1 text-base font-medium border-b-2 transition-colors duration-150 ${
              activeTab === 'transactions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('transactions')}
          >
            Transaksi
          </button>

          <button
            className={`py-2 px-1 text-base font-medium border-b-2 transition-colors duration-150 ${
              activeTab === 'budget'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('budget')}
          >
            Budget
          </button>

          <button
            className={`py-2 px-1 text-base font-medium border-b-2 transition-colors duration-150 ${
              activeTab === 'analytics'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('analytics')}
          >
            Analisis
          </button>
        </nav>
      </div>

      {/* Tab content */}
      <div className="py-4">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div>
            {/* Customizable content for Ringkasan */}
            <CustomizableTabContent
              isEditMode={isEditModeRingkasan}
              onSaveChanges={(widgets) => {
                console.log('Debug - onSaveChanges called with widgets:', widgets);

                // Check if widgets is valid
                if (!widgets || !Array.isArray(widgets)) {
                  console.error('Invalid widgets data received:', widgets);
                  return;
                }

                // Simpan ke state lokal
                setRingkasanWidgets(widgets);

                // Simpan ke localStorage untuk persistensi
                localStorage.setItem('ringkasanWidgets', JSON.stringify(widgets));
                console.log('Debug - Saved widgets to localStorage during onSaveChanges');

                // Tutup mode edit
                setIsEditModeRingkasan(false);
              }}
              onCancelEdit={() => setIsEditModeRingkasan(false)}
              selectedWalletId={selectedWallet?.id}
              initialWidgets={ringkasanWidgets}
            />
          </div>
        )}

        {/* TRANSACTION TAB */}
        {activeTab === 'transactions' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Transaksi Terbaru</h2>
              <a href="/transactions" className="text-blue-600 text-sm hover:underline flex items-center">
                <FiEye className="mr-1" /> Lihat Semua
              </a>
            </div>

            <div className="space-y-2">
              {filteredTransactions.length > 0 ? (
                <>
                  {filteredTransactions.slice(0, showAllTransactions ? filteredTransactions.length : 5).map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center">
                        <div className={`p-2 rounded-full ${
                          tx.type === 'INCOME' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                        }`}>
                          {tx.type === 'INCOME' ?
                            <FiArrowDownLeft size={16} /> :
                            <FiArrowUpRight size={16} />
                          }
                        </div>
                        <div className="ml-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="font-medium">{tx.description || 'Unnamed Transaction'}</p>
                            {txBadges(tx).map((b) => (
                              <span key={b} className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${b === 'Large' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{b}</span>
                            ))}
                          </div>
                          <div className="flex text-sm">
                            <span className="text-gray-500">{tx.category ? tx.category.name : 'Uncategorized'}</span>
                            <span className="mx-2 text-gray-300">•</span>
                            <span className="text-gray-500">{formatDate(tx.date)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-medium ${tx.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.type === 'INCOME' ? '+' : '-'} {formatCurrency(tx.amount)}
                        </p>
                      </div>
                    </div>
                  ))}

                  {filteredTransactions.length > 5 && (
                    <button
                      className="w-full py-2 text-center text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 rounded-lg transition-colors mt-2"
                      onClick={() => setShowAllTransactions(!showAllTransactions)}
                    >
                      {showAllTransactions ? 'Tampilkan Lebih Sedikit' : 'Tampilkan Semua'}
                    </button>
                  )}
                </>
              ) : (
                <p className="text-gray-500 text-center py-8">Tidak ada transaksi untuk dompet ini</p>
              )}
            </div>
          </div>
        )}

        {/* BUDGET TAB */}
        {activeTab === 'budget' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Budget Bulanan</h2>
              <a href="/budgets" className="text-blue-600 text-sm hover:underline">Kelola Budget</a>
            </div>

            <div className="space-y-4">
              {filteredBudgets.length > 0 ? (
                filteredBudgets.map((budget) => (
                  <BudgetProgress
                    key={budget.id}
                    budget={budget as any}
                    onUpdate={handleBudgetUpdate as any}
                  />
                ))
              ) : (
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">Belum ada anggaran</p>
                  <button
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                    onClick={() => router.push('/budgets')}
                  >
                    Buat anggaran baru
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ANALYSIS TAB */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-medium text-gray-700 mb-3">Category Spending</h3>
                {spendingByCategory.length > 0 ? (
                  <div className="space-y-4">
                    {spendingByCategory.slice(0, 6).map((category, index) => {
                      const total = spendingByCategory.reduce((sum, item) => sum + item.amount, 0)
                      const pct = total > 0 ? Math.round((category.amount / total) * 100) : 0
                      return (
                        <div key={index}>
                          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                            <span className="truncate font-medium text-gray-700">{category.name}</span>
                            <span className="shrink-0 text-gray-600">{formatCurrency(category.amount)} • {pct}%</span>
                          </div>
                          <div className="h-2.5 w-full rounded-full bg-gray-100">
                            <div className="h-2.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: category.color }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-40 text-gray-400">
                    Belum ada data pengeluaran
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-700">Tren Pemasukan/Pengeluaran</h3>
                  <a href="/reports" className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline">
                    Unduh Laporan →
                  </a>
                </div>
                {transactionHistory.length > 0 ? (
                  <div className="h-80">
                    <Bar data={barChartData} options={barChartOptions} />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-80 text-gray-400">
                    Data tidak cukup untuk menampilkan tren
                  </div>
                )}
              </div>
            </div>

            {/* Wallet Group only: per-wallet contribution per category */}
            {isGroupSelected && groupDashboardData?.spendingByCategory?.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-medium text-gray-700 mb-1">Kontribusi per Dompet</h3>
                <p className="text-xs text-gray-400 mb-3">
                  Pengeluaran tiap kategori dipecah berdasarkan dompet dalam grup ini
                </p>
                <WalletContributionChart
                  spendingByCategory={groupDashboardData.spendingByCategory}
                  currencyCode={groupDashboardData.currencyCode || 'IDR'}
                />
              </div>
            )}

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-medium text-gray-700 mb-3">Kategori Pengeluaran Terbesar</h3>

              {spendingByCategory.length > 0 ? (
                <div className="space-y-3">
                  {spendingByCategory.slice(0, 5).map((category, index) => (
                    <div key={index} className="flex items-center">
                      <div
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: category.color }}
                      ></div>
                      <div className="flex-grow">
                        <div className="flex justify-between mb-1">
                          <span>{category.name}</span>
                          <span className="font-medium">{formatCurrency(category.amount)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${(category.amount / spendingByCategory[0].amount) * 100}%`,
                              backgroundColor: category.color
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">Belum ada data pengeluaran</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        onSave={handleSaveTransaction}
        initialData={{ type: transactionType }}
        isQuickAction={true}
      />
    </div>
  );
};

export default DashboardContent;