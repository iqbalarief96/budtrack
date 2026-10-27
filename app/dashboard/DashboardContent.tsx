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
import { useBudgets, type Budget as BudgetType } from '@/lib/hooks/useBudgets'
import { useGoals } from '@/lib/hooks/useGoals'
import { useEmergencyFund } from '@/lib/hooks/useEmergencyFund'

import SpendingAnomalyBanner from '@/app/components/dashboard/SpendingAnomalyBanner'

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
  const { wallets, selectedWallet, refreshWallets, selectedGroup, isGroupSelected } = useWallet()

  // React Query hooks for data fetching
  const [selectedPeriod, setSelectedPeriod] = useState('all')
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
        const params = new URLSearchParams()
        if (isGroupSelected && selectedGroup?.id) params.set('walletGroupId', selectedGroup.id)
        if (!isGroupSelected && selectedWallet?.id) params.set('walletId', selectedWallet.id)

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
  }, [isGroupSelected, selectedGroup?.id, selectedWallet?.id])

  // Safe to spend is computed server-side (it needs bills/recurring/credit-card
  // data the dashboard doesn't load) so the number stays consistent everywhere.
  useEffect(() => {
    const fetchSafeToSpend = async () => {
      try {
        const params = new URLSearchParams()
        if (isGroupSelected && selectedGroup?.id) params.set('walletGroupId', selectedGroup.id)
        if (!isGroupSelected && selectedWallet?.id) params.set('walletId', selectedWallet.id)

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
  }, [isGroupSelected, selectedGroup?.id, selectedWallet?.id])

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
    if (selectedWallet && allBudgets) {
      return allBudgets.filter(budget => budget.walletId === selectedWallet.id)
    }
    return allBudgets || []
  }, [isGroupSelected, selectedGroup, selectedWallet, allBudgets])

  // Calculate totals and filter transactions when wallet or transaction data changes
  useEffect(() => {
    // Skip if group is selected - we use group dashboard data instead
    if (isGroupSelected) return

    if (selectedWallet && allTransactions.length > 0) {
      // Filter transaksi untuk wallet yang dipilih
      let filteredTx = allTransactions.filter(
        (tx) => tx.walletId === selectedWallet.id
      );

      // Filter transaksi berdasarkan periode waktu
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      if (selectedPeriod !== 'all') {
        filteredTx = filteredTx.filter((tx) => {
          const txDate = new Date(tx.date);

          switch (selectedPeriod) {
            case 'daily':
              // Hanya transaksi hari ini
              return txDate.setHours(0, 0, 0, 0) === today.setHours(0, 0, 0, 0);

            case 'weekly':
              // Transaksi 7 hari terakhir
              const weekAgo = new Date(today);
              weekAgo.setDate(today.getDate() - 7);
              return txDate >= weekAgo;

            case 'monthly':
              // Transaksi bulan ini
              const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
              return txDate >= startOfMonth;

            case 'quarterly':
              // Transaksi 3 bulan terakhir
              const threeMonthsAgo = new Date(today);
              threeMonthsAgo.setMonth(today.getMonth() - 3);
              return txDate >= threeMonthsAgo;

            case 'yearly':
              // Transaksi tahun ini
              const startOfYear = new Date(today.getFullYear(), 0, 1);
              return txDate >= startOfYear;

            default:
              return true;
          }
        });
      }

      setFilteredTransactions(filteredTx);

      // Calculate income and expenses for the selected wallet
      let income = 0;
      let expense = 0;

      filteredTx.forEach((tx) => {
        if (tx.type === 'INCOME') {
          income += tx.amount;
        } else if (tx.type === 'EXPENSE') {
          // Count ALL expense transactions including savings
          expense += tx.amount;
        }
      });

      // Calculate total balance as income - expense
      const total = income - expense;

      // Set summary values
      setSummary({
        total,
        income,
        expense,
      });

      console.log('Summary updated:', { total, income, expense });

      // Set chart data
      setChartData({
        income,
        expense,
      });
    }
  }, [selectedWallet, allTransactions, selectedPeriod, isGroupSelected]);

  // Savings data is now fetched via React Query hook (useEmergencyFund)

  // Get transactions grouped by category for pie chart
  useEffect(() => {
    // Skip if group is selected - we use group dashboard data instead
    if (isGroupSelected) {
      console.log('[DashboardContent] Skipping individual wallet spendingByCategory - group is selected')
      return
    }

    if (selectedWallet && allTransactions.length > 0) {
      console.log('[DashboardContent] Calculating spendingByCategory for individual wallet:', selectedWallet.id)
      const walletTxs = allTransactions.filter(tx =>
        tx.walletId === selectedWallet.id &&
        tx.type === 'EXPENSE' &&
        tx.category !== null && tx.category !== undefined  // Filter out transactions without category
      )

      const categorySpending = walletTxs.reduce((acc, tx) => {
        const categoryName = tx.category?.name
        if (!categoryName) return acc
        if (!acc[categoryName]) {
          acc[categoryName] = 0
        }
        acc[categoryName] += tx.amount
        return acc
      }, {} as Record<string, number>)

      // Generate colors
      const colors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
        '#FF9F40', '#8AC926', '#1982C4', '#6A4C93', '#FF595E'
      ]

      const result = Object.entries(categorySpending).map(([name, amount], index) => ({
        name,
        amount,
        color: colors[index % colors.length]
      }))

      setSpendingByCategory(result.sort((a, b) => b.amount - a.amount))
    }
  }, [selectedWallet, allTransactions, isGroupSelected])

  // Get monthly transaction history data for the bar chart
  useEffect(() => {
    // Skip if group is selected - we use group dashboard data instead
    if (isGroupSelected) return

    if (selectedWallet && allTransactions.length > 0) {
      const now = new Date()
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(now.getMonth() - 5)

      // Create an array of last 6 months
      const months = Array.from({ length: 6 }, (_, i) => {
        const date = new Date()
        date.setMonth(now.getMonth() - 5 + i)
        return {
          month: date.toLocaleString('id-ID', { month: 'short' }),
          year: date.getFullYear(),
          income: 0,
          expense: 0
        }
      })

      // Fill in transaction data
      allTransactions.forEach(tx => {
        if (tx.walletId !== selectedWallet.id) return

        const txDate = new Date(tx.date)
        if (txDate < sixMonthsAgo) return

        const monthName = txDate.toLocaleString('id-ID', { month: 'short' })
        const monthIndex = months.findIndex(m =>
          m.month === monthName && m.year === txDate.getFullYear()
        )

        if (monthIndex !== -1) {
          if (tx.type === 'INCOME') {
            months[monthIndex].income += tx.amount
          } else {
            months[monthIndex].expense += tx.amount
          }
        }
      })

      setTransactionHistory(months)
    }
  }, [selectedWallet, allTransactions, isGroupSelected])

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

  // Calculate financial stats
  const calculateFinancialStats = () => {
    if (!selectedWallet && !isGroupSelected) return { savingsRate: 0, expenseRatio: 0, topCategory: null }

    // Calculate savings rate (income - expense) / income
    const savingsRate = summary.income > 0
      ? ((summary.income - summary.expense) / summary.income) * 100
      : 0

    // Calculate expense to income ratio
    const expenseRatio = summary.income > 0
      ? (summary.expense / summary.income) * 100
      : 0

    // Get top spending category
    const topCategory = spendingByCategory.length > 0 ? spendingByCategory[0] : null

    return { savingsRate, expenseRatio, topCategory }
  }

  const stats = calculateFinancialStats()

  // Source-of-truth balance: actual wallet/group balance, not period cashflow
  const displayBalance = isGroupSelected
    ? (groupDashboardData?.totalBalance ?? summary.total)
    : (selectedWallet?.balance ?? 0)
  const netCashflow = summary.income - summary.expense
  const periodLabelMap: Record<string, string> = {
    all: 'Semua waktu', daily: 'Hari ini', weekly: '7 hari', monthly: 'Bulan ini', quarterly: '3 bulan', yearly: 'Tahun ini',
  }
  const periodLabel = periodLabelMap[selectedPeriod] || 'Semua waktu'
  const negativeWallets = wallets.filter((wallet) => wallet.balance < 0)
  const transactionCount = filteredTransactions.length
  const budgetUsage = filteredBudgets.length
    ? Math.round(filteredBudgets.reduce((sum, budget) => sum + ((budget.spent || 0) / Math.max(budget.amount || 1, 1)), 0) / filteredBudgets.length * 100)
    : 0
  const dataQualityScore = Math.min(100, Math.round((Math.min(transactionCount, 20) / 20) * 70 + (filteredBudgets.length ? 15 : 0) + (selectedWallet ? 15 : 0)))
  // Don't score with too little data: a constant baseline (it used to show 75 "Good"
  // for a brand-new empty account) is misleading in a finance app.
  const MIN_TX_FOR_HEALTH_SCORE = 5
  const hasEnoughDataForHealth = transactionCount >= MIN_TX_FOR_HEALTH_SCORE
  const healthScore: number | null = hasEnoughDataForHealth
    ? Math.max(0, Math.min(100, 70 + (netCashflow > 0 ? 10 : netCashflow < 0 ? -15 : 0) - (negativeWallets.length ? 20 : 0) - (budgetUsage > 90 ? 15 : 0) + (dataQualityScore >= 60 ? 5 : -5)))
    : null
  const todayAction = negativeWallets.length
    ? { title: 'Beresin saldo negatif', description: `${negativeWallets[0].name} perlu dicek/reconcile.`, href: '/wallets' }
    : !filteredBudgets.length
      ? { title: 'Buat budget pertama', description: 'Budget bikin dashboard lebih akurat.', href: '/budgets' }
      : transactionCount < 5
        ? { title: 'Tambah data transaksi', description: `Baru ${transactionCount} transaksi. Butuh 5+ buat insight.`, href: '/transactions' }
        : { title: 'Review budget bulan ini', description: `Rata-rata pemakaian budget ${budgetUsage}%.`, href: '/budgets' }

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

  // Month-over-month trend (last COMPLETE month vs previous month from transaction history)
  // Skip the current in-progress month so a 2-day-old month doesn't show -100% as "trend"
  const nowForTrend = new Date()
  const currentMonthLabel = nowForTrend.toLocaleString('id-ID', { month: 'short' })
  const fullMonths = transactionHistory.filter((m) => m.month !== currentMonthLabel)
  const trendCurrentMonth = fullMonths.length >= 1 ? fullMonths[fullMonths.length - 1] : null
  const trendPrevMonth = fullMonths.length >= 2 ? fullMonths[fullMonths.length - 2] : null
  const incomeTrend: TrendResult = trendCurrentMonth && trendPrevMonth
    ? calculateTrend(trendCurrentMonth.income, trendPrevMonth.income)
    : { pct: null, direction: 'none' }
  const expenseTrend: TrendResult = trendCurrentMonth && trendPrevMonth
    ? calculateTrend(trendCurrentMonth.expense, trendPrevMonth.expense)
    : { pct: null, direction: 'none' }
  const trendPrevLabel = trendPrevMonth?.month ?? ''

  // Goal projection (nearest active goal)
  const projectionGoal = activeGoals
    .map((g) => ({ g, remaining: Math.max((g.target || 0) - (g.current || 0), 0) }))
    .filter((x) => x.remaining > 0)
    .sort((a, b) => a.remaining - b.remaining)[0]
  const monthlyNet = netCashflow
  const goalProjection = !activeGoals.length
    ? { label: 'Belum ada goal aktif', detail: 'Bikin goal biar bisa diproyeksiin.' }
    : !projectionGoal
      ? { label: 'Semua goal tercapai 🎉', detail: 'Mantap, target kebeli.' }
      : monthlyNet > 0
        ? { label: projectionGoal.g.name, detail: `Sisa ${formatCurrency(projectionGoal.remaining)} • ~${Math.ceil(projectionGoal.remaining / monthlyNet)} bulan lagi (pace sekarang)` }
        : { label: projectionGoal.g.name, detail: `Sisa ${formatCurrency(projectionGoal.remaining)} • butuh cashflow positif buat proyeksi` }

  // Smart Insight (data-driven, replaces generic tip)
  const topSpendingCategory = spendingByCategory.length > 0 ? spendingByCategory[0] : null
  const smartInsight = transactionCount < 5
    ? `Baru ${transactionCount} transaksi ${periodLabel.toLowerCase()}. Tambah ${Math.max(5 - transactionCount, 0)} lagi biar trend, anomaly & forecast akurat.`
    : negativeWallets.length
      ? `${negativeWallets[0].name} saldo negatif. Beresin dulu biar cashflow sehat.`
      : budgetUsage > 90
        ? `Budget kepakai ${budgetUsage}%. Rem pengeluaran kategori utama biar gak jebol.`
        : topSpendingCategory
          ? `Pengeluaran terbesar: ${topSpendingCategory.name} (${formatCurrency(topSpendingCategory.amount)}). Cek apakah masih wajar.`
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

  if (!selectedWallet && !isGroupSelected) {
    return <div>Loading...</div>
  }

  // Get display name for header
  const displayName = isGroupSelected && selectedGroup
    ? selectedGroup.name
    : selectedWallet?.name || 'Personal'

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
            <WalletSelector displayBalance={summary.total} />
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
            onChange={(e) => setSelectedPeriod(e.target.value)}
          >
            <option value="all">Semua Waktu</option>
            <option value="daily">Hari Ini</option>
            <option value="weekly">7 Hari Terakhir</option>
            <option value="monthly">Bulan Ini</option>
            <option value="quarterly">3 Bulan Terakhir</option>
            <option value="yearly">Tahun Ini</option>
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
            <h3 className="text-blue-100">Data Quality</h3>
            <p className="mt-1 text-2xl font-bold">{dataQualityLabel}</p>
            <p className="text-xs text-blue-100">{dataQualityReason}</p>
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
                {healthScore >= 70 ? 'Good' : healthScore >= 45 ? 'Watch' : 'Risk'}
              </span>
            ) : (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">Belum cukup data</span>
            )}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {healthScore !== null
              ? <>Budget {budgetUsage}% • data quality {dataQualityLabel}</>
              : <>Butuh minimal {MIN_TX_FOR_HEALTH_SCORE} transaksi (sekarang {transactionCount})</>}
          </p>
          {negativeWallets.length > 0 && <p className="mt-1 text-xs text-red-600">• {negativeWallets.length} wallet negatif</p>}
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