'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SpendingPattern, TrendDirection, SEVERITY_CONFIG } from '@/app/types/spending-insights'
import { formatCurrency } from '@/lib/utils'
import { FiTrendingUp, FiTrendingDown, FiMinus, FiPieChart } from 'react-icons/fi'

/**
 * SpendingPatternCard - Display category patterns with trends
 * Requirements: 1.1, 1.2, 1.3
 */

interface SpendingPatternCardProps {
  patterns: SpendingPattern[]
  isLoading?: boolean
}

export function SpendingPatternCard({ patterns, isLoading }: SpendingPatternCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiPieChart className="h-5 w-5" />
            Spending Patterns
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-200 rounded-lg" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (patterns.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiPieChart className="h-5 w-5" />
            Spending Patterns
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">
            No spending patterns available. Add more transactions to see patterns.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FiPieChart className="h-5 w-5" />
          Spending Patterns
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {patterns.map((pattern) => (
            <PatternItem key={pattern.categoryId} pattern={pattern} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

interface PatternItemProps {
  pattern: SpendingPattern
}

function PatternItem({ pattern }: PatternItemProps) {
  const { categoryName, averageAmount, trend, trendPercentage, monthlyData } = pattern

  // Get current and previous month data for comparison
  const currentMonth = monthlyData.length > 0 ? monthlyData[monthlyData.length - 1] : null
  const previousMonth = monthlyData.length > 1 ? monthlyData[monthlyData.length - 2] : null

  const monthComparison = currentMonth && previousMonth
    ? ((currentMonth.amount - previousMonth.amount) / Math.abs(previousMonth.amount || 1)) * 100
    : 0

  return (
    <div className="p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-gray-900">{categoryName}</h4>
            <TrendBadge trend={trend} percentage={trendPercentage} />
          </div>
          <p className="text-sm text-gray-600">
            Average: {formatCurrency(averageAmount)}/month
          </p>
        </div>

        <div className="text-right">
          {currentMonth && (
            <>
              <p className="font-medium text-gray-900">
                {formatCurrency(currentMonth.amount)}
              </p>
              <p className="text-xs text-gray-500">
                {currentMonth.transactionCount} transactions
              </p>
            </>
          )}
        </div>
      </div>

      {/* Month-over-month comparison */}
      {previousMonth && currentMonth && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">vs last month</span>
            <MonthComparisonBadge percentage={monthComparison} />
          </div>
        </div>
      )}

      {/* Mini sparkline visualization */}
      {monthlyData.length > 1 && (
        <div className="mt-3">
          <MiniSparkline data={monthlyData} />
        </div>
      )}
    </div>
  )
}

function TrendBadge({ trend, percentage }: { trend: TrendDirection; percentage: number }) {
  const config = {
    increasing: {
      icon: FiTrendingUp,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      label: 'Increasing',
    },
    decreasing: {
      icon: FiTrendingDown,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      label: 'Decreasing',
    },
    stable: {
      icon: FiMinus,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      label: 'Stable',
    },
  }

  const { icon: Icon, color, bgColor, label } = config[trend]

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${bgColor} ${color}`}>
      <Icon className="h-3 w-3" />
      {label} {Math.abs(percentage).toFixed(0)}%
    </span>
  )
}

function MonthComparisonBadge({ percentage }: { percentage: number }) {
  const isPositive = percentage > 0
  const isNeutral = Math.abs(percentage) < 5

  if (isNeutral) {
    return (
      <span className="text-gray-600 flex items-center gap-1">
        <FiMinus className="h-3 w-3" />
        No change
      </span>
    )
  }

  return (
    <span className={`flex items-center gap-1 ${isPositive ? 'text-red-600' : 'text-green-600'}`}>
      {isPositive ? (
        <FiTrendingUp className="h-3 w-3" />
      ) : (
        <FiTrendingDown className="h-3 w-3" />
      )}
      {isPositive ? '+' : ''}{percentage.toFixed(1)}%
    </span>
  )
}

function MiniSparkline({ data }: { data: SpendingPattern['monthlyData'] }) {
  const amounts = data.map(d => d.amount)
  const max = Math.max(...amounts)
  const min = Math.min(...amounts)
  const range = max - min || 1

  return (
    <div className="flex items-end gap-1 h-8">
      {amounts.map((amount, index) => {
        const height = ((amount - min) / range) * 100
        const isLast = index === amounts.length - 1
        return (
          <div
            key={index}
            className={`flex-1 rounded-t ${isLast ? 'bg-blue-500' : 'bg-gray-200'}`}
            style={{ height: `${Math.max(10, height)}%` }}
            title={formatCurrency(amount)}
          />
        )
      })}
    </div>
  )
}

export default SpendingPatternCard
