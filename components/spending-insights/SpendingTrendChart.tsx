'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SpendingPattern, MonthlySpending } from '@/app/types/spending-insights'
import { formatCurrency } from '@/lib/utils'
import { FiTrendingUp, FiBarChart2 } from 'react-icons/fi'
import { useMemo } from 'react'

/**
 * SpendingTrendChart - Display spending trends over time
 * Requirements: 1.2
 */

interface SpendingTrendChartProps {
  patterns: SpendingPattern[]
  isLoading?: boolean
  selectedCategoryId?: string | null
}

export function SpendingTrendChart({ patterns, isLoading, selectedCategoryId }: SpendingTrendChartProps) {
  // Aggregate monthly data across all categories or filter by selected category
  const chartData = useMemo(() => {
    if (patterns.length === 0) return []

    const filteredPatterns = selectedCategoryId
      ? patterns.filter(p => p.categoryId === selectedCategoryId)
      : patterns

    // Aggregate by month
    const monthlyTotals = new Map<string, { amount: number; count: number }>()

    filteredPatterns.forEach(pattern => {
      pattern.monthlyData.forEach(month => {
        const monthKey = new Date(month.month).toISOString().slice(0, 7) // YYYY-MM
        const existing = monthlyTotals.get(monthKey) || { amount: 0, count: 0 }
        monthlyTotals.set(monthKey, {
          amount: existing.amount + month.amount,
          count: existing.count + month.transactionCount,
        })
      })
    })

    // Convert to array and sort by date
    return Array.from(monthlyTotals.entries())
      .map(([month, data]) => ({
        month,
        label: formatMonthLabel(month),
        amount: data.amount,
        count: data.count,
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
  }, [patterns, selectedCategoryId])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiBarChart2 className="h-5 w-5" />
            Spending Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-48 bg-gray-200 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiBarChart2 className="h-5 w-5" />
            Spending Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">
            No trend data available. Add more transactions to see trends.
          </p>
        </CardContent>
      </Card>
    )
  }

  const maxAmount = Math.max(...chartData.map(d => d.amount))
  const totalSpending = chartData.reduce((sum, d) => sum + d.amount, 0)
  const avgSpending = totalSpending / chartData.length

  // Calculate trend
  const firstHalf = chartData.slice(0, Math.floor(chartData.length / 2))
  const secondHalf = chartData.slice(Math.floor(chartData.length / 2))
  const firstHalfAvg = firstHalf.reduce((sum, d) => sum + d.amount, 0) / (firstHalf.length || 1)
  const secondHalfAvg = secondHalf.reduce((sum, d) => sum + d.amount, 0) / (secondHalf.length || 1)
  const trendPercentage = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FiBarChart2 className="h-5 w-5" />
            Spending Trends
          </span>
          <TrendIndicator percentage={trendPercentage} />
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 uppercase">Total</p>
            <p className="text-lg font-semibold">{formatCurrency(totalSpending)}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 uppercase">Monthly Avg</p>
            <p className="text-lg font-semibold">{formatCurrency(avgSpending)}</p>
          </div>
        </div>

        {/* Bar chart */}
        <div className="space-y-2">
          {chartData.map((data, index) => (
            <ChartBar
              key={data.month}
              label={data.label}
              amount={data.amount}
              count={data.count}
              maxAmount={maxAmount}
              isLatest={index === chartData.length - 1}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

interface ChartBarProps {
  label: string
  amount: number
  count: number
  maxAmount: number
  isLatest: boolean
}

function ChartBar({ label, amount, count, maxAmount, isLatest }: ChartBarProps) {
  const percentage = maxAmount > 0 ? (amount / maxAmount) * 100 : 0

  return (
    <div className="group">
      <div className="flex items-center justify-between text-sm mb-1">
        <span className={`${isLatest ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
          {label}
        </span>
        <span className={`${isLatest ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
          {formatCurrency(amount)}
        </span>
      </div>
      <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isLatest ? 'bg-blue-500' : 'bg-gray-300 group-hover:bg-gray-400'
          }`}
          style={{ width: `${Math.max(2, percentage)}%` }}
        />
      </div>
      <p className="text-xs text-gray-400 mt-0.5">{count} transactions</p>
    </div>
  )
}

function TrendIndicator({ percentage }: { percentage: number }) {
  const isPositive = percentage > 5
  const isNegative = percentage < -5

  if (!isPositive && !isNegative) {
    return (
      <span className="text-sm text-gray-500 flex items-center gap-1">
        Stable
      </span>
    )
  }

  return (
    <span className={`text-sm flex items-center gap-1 ${isPositive ? 'text-red-600' : 'text-green-600'}`}>
      <FiTrendingUp className={`h-4 w-4 ${isNegative ? 'rotate-180' : ''}`} />
      {isPositive ? '+' : ''}{percentage.toFixed(1)}%
    </span>
  )
}

function formatMonthLabel(monthStr: string): string {
  const [year, month] = monthStr.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1)
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

export default SpendingTrendChart
