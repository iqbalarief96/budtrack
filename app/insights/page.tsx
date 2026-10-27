'use client'

import React, { useState, useEffect, useRef } from 'react'
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend, 
  ArcElement, 
  PointElement, 
  LineElement,
  Filler 
} from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import { FiTrendingUp, FiTrendingDown, FiAlertCircle, FiCheckCircle, FiRefreshCw, FiTrash2 } from 'react-icons/fi'
import { useWallet } from '../providers/WalletProvider'
import WalletSelector from '../components/WalletSelector'
import { FaChartLine, FaChartPie, FaChartBar } from 'react-icons/fa'
import { Pie } from 'react-chartjs-2'
import ReactMarkdown from 'react-markdown'
import ComparativeSummaryCard from '../components/ComparativeSummaryCard'
import { SmartAnalysisCards, DeepAnalysis } from './components/SmartAnalysisCards'
import type { SmartAnalysis, SmartAnalysisFacts } from '@/lib/smart-analysis'

// Saved Smart Analysis. v2 = structured cards + long markdown; legacy saved
// entries only have `summary` (+ `analysis`) markdown.
type AnalysisResult = {
  version?: 2
  structured?: SmartAnalysis | null
  facts?: SmartAnalysisFacts | null
  summary: string | null
  analysis: string | null
}

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
)

// Wallet comparison interface for group insights
interface WalletComparison {
  walletId: string
  walletName: string
  totalSpending: number
  percentageOfGroup: number
  topCategories: CategoryBreakdown[]
}

type TrendGrouping = 'month' | 'quarter' | 'year'

interface TrendData {
  labels: string[]
  income: number[]
  expense: number[]
  net: number[]
  grouping: TrendGrouping
}

interface CategoryBreakdown {
  name: string
  amount: number
  percentage: number
}

interface ChartData {
  totalIncome: number
  totalExpense: number
  netSavings: number
  period: TrendGrouping
  summaryRange: {
    start: string
    end: string
  }
  trend: TrendData
  categoryBreakdown: CategoryBreakdown[]
  expensesByCategory: Record<string, number>
  incomeByCategory: Record<string, number>
  monthlyData: Record<string, { income: number; expense: number }>
}

const formatDateInput = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const startOfMonthLocal = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)
const endOfMonthLocal = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0)
const startOfQuarterLocal = (date: Date) => {
  const q = Math.floor(date.getMonth() / 3) * 3
  return new Date(date.getFullYear(), q, 1)
}
const endOfQuarterLocal = (date: Date) => {
  const start = startOfQuarterLocal(date)
  return new Date(start.getFullYear(), start.getMonth() + 3, 0)
}
const startOfYearLocal = (date: Date) => new Date(date.getFullYear(), 0, 1)
const endOfYearLocal = (date: Date) => new Date(date.getFullYear(), 11, 31)

const getDefaultRangeForPeriod = (period: TrendGrouping) => {
  const now = new Date()
  let start: Date
  let end: Date
  if (period === 'quarter') {
    start = startOfQuarterLocal(now)
    end = endOfQuarterLocal(now)
  } else if (period === 'year') {
    start = startOfYearLocal(now)
    end = endOfYearLocal(now)
  } else {
    start = startOfMonthLocal(now)
    end = endOfMonthLocal(now)
  }
  const today = new Date()
  if (end > today) {
    end = today
  }
  return {
    startDate: formatDateInput(start),
    endDate: formatDateInput(end)
  }
}

const CATEGORY_COLORS = [
  'rgba(59, 130, 246, 0.85)',
  'rgba(16, 185, 129, 0.85)',
  'rgba(249, 115, 22, 0.85)',
  'rgba(217, 70, 239, 0.85)',
  'rgba(239, 68, 68, 0.85)',
  'rgba(245, 158, 11, 0.85)',
  'rgba(99, 102, 241, 0.85)',
  'rgba(20, 184, 166, 0.85)'
]

const InsightsPage = () => {
  const { selectedWallet, selectedGroup, isGroupSelected } = useWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chartData, setChartData] = useState<ChartData | null>(null)
  // Prompts + facts for Smart Analysis, built server-side by /api/insights/analyze.
  const [structuredPrompt, setStructuredPrompt] = useState<string | null>(null)
  const [deepAnalysisPrompt, setDeepAnalysisPrompt] = useState<string | null>(null)
  const [analysisFacts, setAnalysisFacts] = useState<SmartAnalysisFacts | null>(null)
  const [analysisWarning, setAnalysisWarning] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<TrendGrouping>('month')
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult>({ summary: null, analysis: null })
  const [dateRange, setDateRange] = useState(() => getDefaultRangeForPeriod('month'))
  
  // Group-specific insights data
  const [groupInsightsData, setGroupInsightsData] = useState<any>(null)
  const [walletComparison, setWalletComparison] = useState<WalletComparison[]>([])

  useEffect(() => {
    if (selectedWallet || isGroupSelected) {
      loadSavedAnalysis()
    }
  }, [selectedWallet, isGroupSelected])

  useEffect(() => {
    // Handle group insights
    if (isGroupSelected && selectedGroup) {
      const fetchKey = `group-${selectedGroup.id}|${dateRange.startDate}|${dateRange.endDate}|${selectedPeriod}`
      if (lastFetchKeyRef.current === fetchKey) return
      lastFetchKeyRef.current = fetchKey
      fetchGroupInsights()
      return
    }

    if (!selectedWallet) return

    const fetchKey = `${selectedWallet.id}|${dateRange.startDate}|${dateRange.endDate}|${selectedPeriod}`
    if (lastFetchKeyRef.current === fetchKey) {
      return
    }
    lastFetchKeyRef.current = fetchKey
    fetchInsights(fetchKey)
  }, [selectedWallet, selectedGroup, isGroupSelected, dateRange.startDate, dateRange.endDate, selectedPeriod])

  // Fetch group insights
  const fetchGroupInsights = async () => {
    if (!selectedGroup) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/wallet-groups/${selectedGroup.id}/insights?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch group insights')
      }

      const responseData = await response.json()
      // API returns { success: true, data: {...} } format
      const data = responseData.data || responseData
      setGroupInsightsData(data)
      
      // Set wallet comparison data
      if (data.walletComparison) {
        setWalletComparison(data.walletComparison)
      }

      // Convert group data to chart data format
      if (data.spendingPatterns || data.trends || data.walletComparison) {
        // Convert SpendingTrend[] to TrendData format
        const trendsArray = data.trends || []
        const trendData: TrendData = {
          labels: trendsArray.map((t: any) => t.period || ''),
          income: trendsArray.map(() => 0), // Group insights don't have income breakdown by period
          expense: trendsArray.map((t: any) => t.totalSpending || 0),
          net: trendsArray.map((t: any) => -(t.totalSpending || 0)), // Negative since it's expense
          grouping: selectedPeriod
        }

        // Calculate total expense from wallet comparison
        const totalExpense = (data.walletComparison || []).reduce(
          (sum: number, w: any) => sum + (w.totalSpending || 0), 
          0
        )

        // Convert spending patterns to category breakdown
        const categoryBreakdown: CategoryBreakdown[] = (data.spendingPatterns || []).map((pattern: any) => ({
          name: pattern.categoryName || 'Unknown',
          amount: pattern.averageAmount || 0,
          percentage: totalExpense > 0 ? ((pattern.averageAmount || 0) / totalExpense) * 100 : 0
        }))

        const convertedChartData: ChartData = {
          totalIncome: 0, // Group insights focus on expenses
          totalExpense,
          netSavings: -totalExpense,
          period: selectedPeriod,
          summaryRange: { start: dateRange.startDate, end: dateRange.endDate },
          trend: trendData,
          categoryBreakdown,
          expensesByCategory: {},
          incomeByCategory: {},
          monthlyData: {}
        }
        setChartData(convertedChartData)
      } else {
        // Set empty chart data to prevent errors
        setChartData({
          totalIncome: 0,
          totalExpense: 0,
          netSavings: 0,
          period: selectedPeriod,
          summaryRange: { start: dateRange.startDate, end: dateRange.endDate },
          trend: { labels: [], income: [], expense: [], net: [], grouping: selectedPeriod },
          categoryBreakdown: [],
          expensesByCategory: {},
          incomeByCategory: {},
          monthlyData: {}
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Load saved analysis from localStorage
  const loadSavedAnalysis = () => {
    const storageKey = isGroupSelected && selectedGroup 
      ? `financial-analysis-group-${selectedGroup.id}`
      : selectedWallet 
        ? `financial-analysis-${selectedWallet.id}`
        : null
    
    if (!storageKey) return
    
    try {
      const savedAnalysis = localStorage.getItem(storageKey)
      if (savedAnalysis) {
        const parsedAnalysis = JSON.parse(savedAnalysis)
        setAnalysisResult(parsedAnalysis)
      }
    } catch (err) {
      console.error('Failed to load saved analysis:', err)
    }
  }

  // Save analysis to localStorage
  const saveAnalysisToStorage = (analysis: AnalysisResult) => {
    const storageKey = isGroupSelected && selectedGroup 
      ? `financial-analysis-group-${selectedGroup.id}`
      : selectedWallet 
        ? `financial-analysis-${selectedWallet.id}`
        : null
    
    if (!storageKey) return
    
    try {
      localStorage.setItem(storageKey, JSON.stringify(analysis))
    } catch (err) {
      console.error('Failed to save analysis to storage:', err)
    }
  }

  // Clear saved analysis
  const clearSavedAnalysis = () => {
    const storageKey = isGroupSelected && selectedGroup 
      ? `financial-analysis-group-${selectedGroup.id}`
      : selectedWallet 
        ? `financial-analysis-${selectedWallet.id}`
        : null
    
    if (!storageKey) return
    
    try {
      localStorage.removeItem(storageKey)
      setAnalysisResult({ summary: null, analysis: null })
    } catch (err) {
      console.error('Failed to clear saved analysis:', err)
    }
  }

  const lastFetchKeyRef = useRef<string | null>(null)

  const fetchInsights = async (fetchKey: string) => {
    if (!selectedWallet) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/insights/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletId: selectedWallet.id,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          period: selectedPeriod,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch insights')
      }

      const data = await response.json()
      if (lastFetchKeyRef.current !== fetchKey) {
        return
      }

      setChartData(data.data)
      
      setStructuredPrompt(data.structuredPrompt ?? null)
      setDeepAnalysisPrompt(data.deepAnalysisPrompt ?? null)
      setAnalysisFacts(data.facts ?? null)
    } catch (err) {
      if (lastFetchKeyRef.current === fetchKey) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      }
    } finally {
      if (lastFetchKeyRef.current === fetchKey) {
        setLoading(false)
      }
    }
  }

  const generateAnalysis = async () => {
    if (!chartData) return

    setIsGenerating(true)
    setGenerationError(null)
    setAnalysisWarning(null)
    try {
      const response = await fetch('/api/insights/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          structuredPrompt,
          deepAnalysisPrompt,
          categoryNames: (analysisFacts?.categories ?? []).map((c) => c.name),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate analysis')
      }

      // Cards failed but the long analysis worked: say so instead of silently
      // showing only the markdown.
      if (!data.structured && data.warnings?.structured) {
        setAnalysisWarning(`Ringkasan kartu gagal dibuat (${data.warnings.structured}). Yang tampil analisis lengkap.`)
      } else if (data.structured && !data.analysis && data.warnings?.analysis) {
        setAnalysisWarning(`Analisis lengkap gagal dibuat (${data.warnings.analysis}). Coba Refresh Analysis lagi.`)
      }

      const newAnalysis: AnalysisResult = {
        version: 2,
        structured: data.structured ?? null,
        facts: analysisFacts,
        summary: null,
        analysis: data.analysis ?? null,
      }
      
      setAnalysisResult(newAnalysis)
      
      // Save to localStorage
      saveAnalysisToStorage(newAnalysis)
      
    } catch (err) {
      console.error('Failed to generate analysis:', err)
      setGenerationError(err instanceof Error ? err.message : 'Failed to generate analysis')
    } finally {
      setIsGenerating(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const handleSummaryPeriodChange = (period: string) => {
    const normalized: TrendGrouping = period === 'quarter' || period === 'year' ? period : 'month'
    setSelectedPeriod(normalized)
    setDateRange(getDefaultRangeForPeriod(normalized))
  }

  if (!selectedWallet && !isGroupSelected) {
    return (
      <div className="p-6">
        <WalletSelector />
        <div className="mt-4 text-center text-gray-500">
          Please select a wallet or wallet group to view insights
        </div>
      </div>
    )
  }

  // Get display name
  const displayName = isGroupSelected && selectedGroup 
    ? selectedGroup.name 
    : selectedWallet?.name || 'Wallet'

  return (
    <div className="p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col sm:flex-row gap-4">
          <WalletSelector />
          {isGroupSelected && selectedGroup && (
            <div className="flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
              <span>Group: {selectedGroup.name}</span>
              <span className="bg-purple-200 px-2 py-0.5 rounded-full text-xs">
                {selectedGroup.wallets?.length || 0} wallets
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-4">
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
            className="rounded-lg border border-gray-300 px-3 py-2"
          />
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
            className="rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>
      </div>

      {loading && (
        <div className="mt-8 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em]"></div>
          <div className="mt-2">Analyzing your financial data...</div>
        </div>
      )}

      {error && (
        <div className="mt-8 rounded-lg bg-red-100 p-4 text-red-700">
          {error}
        </div>
      )}

      {chartData && !loading && !error && (
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Summary Card - Replace with ComparativeSummaryCard */}
          <div className="rounded-lg">
            <ComparativeSummaryCard 
              period={selectedPeriod} 
              onPeriodChange={handleSummaryPeriodChange} 
            />
          </div>

          {/* Monthly Trend Card */}
          <div className="rounded-lg bg-white p-6 shadow-md col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Monthly Trend</h3>
              <span className="text-xs uppercase tracking-wide text-gray-400">
                {chartData.trend?.grouping === 'month'
                  ? 'Bulanan'
                  : chartData.trend?.grouping === 'quarter'
                  ? 'Kuartalan'
                  : 'Tahunan'}
              </span>
            </div>
            <div className="h-64">
              {chartData.trend && chartData.trend.labels && chartData.trend.labels.length > 0 ? (() => {
                const labels = chartData.trend.labels
                const shouldUseBarFallback = labels.length <= 1
                const lineData = {
                  labels,
                  datasets: [
                    {
                      label: 'Income',
                      data: chartData.trend.income,
                      borderColor: 'rgba(16, 185, 129, 1)',
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      tension: 0.3,
                      fill: 'origin',
                      pointRadius: 3,
                      pointHoverRadius: 5,
                      spanGaps: false,
                    },
                    {
                      label: 'Expense',
                      data: chartData.trend.expense,
                      borderColor: 'rgba(239, 68, 68, 1)',
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      tension: 0.3,
                      fill: 'origin',
                      pointRadius: 3,
                      pointHoverRadius: 5,
                      spanGaps: false,
                    },
                    {
                      label: 'Net Savings',
                      data: chartData.trend.net,
                      borderColor: 'rgba(59, 130, 246, 1)',
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      borderDash: [6, 6],
                      pointRadius: 2,
                      pointHoverRadius: 5,
                      fill: false,
                      spanGaps: false,
                    },
                  ],
                }

                const barData = {
                  labels,
                  datasets: [
                    {
                      label: 'Income',
                      data: chartData.trend.income,
                      backgroundColor: 'rgba(16, 185, 129, 0.85)',
                      borderRadius: 6,
                    },
                    {
                      label: 'Expense',
                      data: chartData.trend.expense,
                      backgroundColor: 'rgba(239, 68, 68, 0.85)',
                      borderRadius: 6,
                    },
                    {
                      label: 'Net Savings',
                      data: chartData.trend.net,
                      backgroundColor: 'rgba(59, 130, 246, 0.7)',
                      borderRadius: 6,
                    },
                  ],
                }

                const commonOptions = {
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      ticks: {
                        callback: function (value: unknown) {
                          return typeof value === 'number' ? formatCurrency(value) : value
                        },
                      },
                      grid: {
                        color: 'rgba(148, 163, 184, 0.2)',
                      },
                    },
                    x: {
                      grid: {
                        display: false,
                      },
                    },
                  },
                  plugins: {
                    legend: {
                      position: 'top' as const,
                    },
                    tooltip: {
                      callbacks: {
                        label: function (context: any) {
                          let label = context.dataset.label || ''
                          if (label) {
                            label += ': '
                          }
                          if (context.parsed.y !== null) {
                            label += formatCurrency(context.parsed.y)
                          }
                          return label
                        },
                      },
                    },
                  },
                }

                if (shouldUseBarFallback) {
                  return (
                    <Bar
                      data={barData}
                      options={{
                        ...commonOptions,
                        barPercentage: 0.5,
                        categoryPercentage: 0.5,
                      }}
                    />
                  )
                }

                return (
                  <Line
                    data={lineData}
                    options={{
                      ...commonOptions,
                      interaction: {
                        intersect: false,
                        mode: 'index' as const,
                      },
                    }}
                  />
                )
              })() : (
                <div className="flex h-full items-center justify-center text-sm text-gray-400">
                  Belum ada data untuk periode ini
                </div>
              )}
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h3 className="mb-4 text-lg font-semibold">Expense by Category</h3>
            <div className="h-64">
              {chartData.categoryBreakdown && chartData.categoryBreakdown.length > 0 && chartData.categoryBreakdown.some(cat => cat.amount > 0) ? (
                <Doughnut
                  data={{
                    labels: chartData.categoryBreakdown.map(cat => `${cat.name} (${cat.percentage.toFixed(1)}%)`),
                    datasets: [
                      {
                        data: chartData.categoryBreakdown.map(cat => Number(cat.amount.toFixed(2))),
                        backgroundColor: chartData.categoryBreakdown.map((_, idx) => CATEGORY_COLORS[idx % CATEGORY_COLORS.length]),
                        borderWidth: 1,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'right' as const,
                        labels: {
                          usePointStyle: true,
                        },
                      },
                      tooltip: {
                        callbacks: {
                          label: function (context) {
                            const label = context.label || ''
                            const value = context.parsed
                            return `${label}: ${formatCurrency(value)}`.trim()
                          },
                        },
                      },
                    },
                    cutout: '65%',
                  }}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-gray-400">
                  Belum ada data pengeluaran untuk periode ini
                </div>
              )}
            </div>
            {chartData.categoryBreakdown && chartData.categoryBreakdown.length > 0 && (
              <div className="mt-6 space-y-4">
                <div className="space-y-3">
                  {chartData.categoryBreakdown.slice(0, 6).map((cat, idx) => (
                    <div key={cat.name} className="flex items-center gap-3">
                      <div className="flex flex-col md:flex-row md:items-center md:gap-3 w-full">
                        <div className="flex items-center min-w-[120px]">
                          <span
                            className="mr-2 inline-block h-2 w-2 rounded-full"
                            style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                          />
                          <span className="text-sm font-medium text-gray-700">{cat.name}</span>
                        </div>
                        <div className="flex-1 h-2 rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.max(cat.percentage, 2)}%`,
                              backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
                              opacity: 0.85,
                            }}
                          />
                        </div>
                        <div className="min-w-[140px] text-right text-sm text-gray-700">
                          {formatCurrency(cat.amount)}{' '}
                          <span className="ml-1 text-xs text-gray-400">
                            ({cat.percentage.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {chartData.categoryBreakdown.length === 1 && (
                  <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700">
                    Semua pengeluaran kamu masuk kategori <strong>{chartData.categoryBreakdown[0].name}</strong>.
                    Kalau ini direncanakan (misal transfer ke tabungan), aman. Tapi kalau harusnya tersebar ke kebutuhan lain,
                    coba cek ulang kategorisasi biar insight-nya lebih akurat.
                  </div>
                )}
                {chartData.categoryBreakdown.length > 6 && (
                  <div className="text-xs text-gray-400">
                    Menampilkan 6 kategori teratas. Periksa tab Transaksi untuk detail lengkapnya.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Wallet Comparison - Only show for groups */}
          {isGroupSelected && walletComparison.length > 0 && (
            <div className="rounded-lg bg-white p-6 shadow-md">
              <h3 className="mb-4 text-lg font-semibold">Wallet Comparison</h3>
              <div className="space-y-4">
                {walletComparison.map((wallet, idx) => (
                  <div key={wallet.walletId} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-800">{wallet.walletName}</span>
                      <span className="text-sm text-gray-600">
                        {formatCurrency(wallet.totalSpending)} ({wallet.percentageOfGroup.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(wallet.percentageOfGroup, 2)}%`,
                          backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
                        }}
                      />
                    </div>
                    {wallet.topCategories && wallet.topCategories.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {wallet.topCategories.slice(0, 3).map((cat) => (
                          <span 
                            key={cat.name} 
                            className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full"
                          >
                            {cat.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Advanced Analytics Card */}
          <div className="rounded-lg bg-white p-6 shadow-md lg:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Smart Financial Analysis</h3>
              <div className="flex gap-2">
                <button
                  onClick={generateAnalysis}
                  disabled={isGenerating || (!structuredPrompt && !deepAnalysisPrompt)}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm flex items-center gap-1 hover:bg-blue-700 disabled:bg-blue-300"
                >
                  {isGenerating ? (
                    <>
                      <FiRefreshCw className="animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FiRefreshCw className="w-4 h-4" />
                      {(analysisResult.structured || analysisResult.summary || analysisResult.analysis) ? 'Refresh Analysis' : 'Generate Analysis'}
                    </>
                  )}
                </button>
                {(analysisResult.structured || analysisResult.summary || analysisResult.analysis) && (
                  <button
                    onClick={clearSavedAnalysis}
                    className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-md text-sm flex items-center gap-1 hover:bg-gray-300"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {generationError && (
              <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">
                <div className="flex items-center gap-2">
                  <FiAlertCircle className="w-5 h-5" />
                  <p>{generationError}</p>
                </div>
                {generationError.includes('AI settings not configured') && (
                  <a 
                    href="/settings"
                    className="mt-2 inline-flex items-center text-sm text-red-700 hover:text-red-800"
                  >
                    Configure AI Settings →
                  </a>
                )}
              </div>
            )}

            {analysisWarning && (
              <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{analysisWarning}</div>
            )}

            {(analysisResult.structured || analysisResult.summary || analysisResult.analysis) ? (
              <div className="space-y-4">
                {analysisResult.structured ? (
                  <SmartAnalysisCards analysis={analysisResult.structured} facts={analysisResult.facts ?? analysisFacts} />
                ) : analysisResult.summary ? (
                  <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
                    <p className="mb-2 text-xs text-gray-500">Format lama. Klik Refresh Analysis buat versi baru.</p>
                    <ReactMarkdown>{analysisResult.summary}</ReactMarkdown>
                  </div>
                ) : null}
                {analysisResult.analysis && (
                  <DeepAnalysis
                    markdown={analysisResult.analysis}
                    defaultOpen={!analysisResult.structured && !analysisResult.summary}
                  />
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <FiAlertCircle className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-gray-500">No analysis available</p>
                <p className="text-sm text-gray-400">Click generate to analyze your financial data</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default InsightsPage 
