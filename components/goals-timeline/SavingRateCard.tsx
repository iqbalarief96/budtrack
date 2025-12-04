'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SavingRateAnalysis, SavingRateData } from '@/app/types/goals-timeline'
import { formatCurrency } from '@/lib/utils'
import { FiTrendingUp, FiTrendingDown, FiMinus, FiPieChart } from 'react-icons/fi'

/**
 * SavingRateCard - Displays saving rate with trend
 * Requirements: 2.1, 2.2, 2.3
 */

interface SavingRateCardProps {
  analysis: SavingRateAnalysis | null
  history?: SavingRateData[]
  isLoading?: boolean
}

export function SavingRateCard({ analysis, history, isLoading }: SavingRateCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiPieChart className="h-5 w-5" />
            Saving Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-16 bg-gray-200 rounded-lg" />
            <div className="h-24 bg-gray-200 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!analysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiPieChart className="h-5 w-5" />
            Saving Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">
            No saving rate data available. Add income and expense transactions to see your saving rate.
          </p>
        </CardContent>
      </Card>
    )
  }


  const getTrendIcon = () => {
    switch (analysis.trend) {
      case 'improving':
        return <FiTrendingUp className="h-5 w-5 text-green-500" />
      case 'declining':
        return <FiTrendingDown className="h-5 w-5 text-red-500" />
      default:
        return <FiMinus className="h-5 w-5 text-gray-500" />
    }
  }

  const getTrendColor = () => {
    switch (analysis.trend) {
      case 'improving':
        return 'text-green-600 bg-green-50'
      case 'declining':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getTrendLabel = () => {
    switch (analysis.trend) {
      case 'improving':
        return 'Improving'
      case 'declining':
        return 'Declining'
      default:
        return 'Stable'
    }
  }

  const getConsistencyLabel = () => {
    if (analysis.consistency > 0.8) return { label: 'High', color: 'text-green-600' }
    if (analysis.consistency > 0.5) return { label: 'Medium', color: 'text-yellow-600' }
    return { label: 'Low', color: 'text-red-600' }
  }

  const consistencyInfo = getConsistencyLabel()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FiPieChart className="h-5 w-5" />
          Saving Rate
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Rate */}
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Current Saving Rate</p>
          <p className="text-4xl font-bold text-blue-600">
            {analysis.current.toFixed(1)}%
          </p>
          <div className={`inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-full ${getTrendColor()}`}>
            {getTrendIcon()}
            <span className="text-sm font-medium">{getTrendLabel()}</span>
            {analysis.trendPercentage !== 0 && (
              <span className="text-xs">
                ({analysis.trendPercentage > 0 ? '+' : ''}{analysis.trendPercentage.toFixed(1)}%)
              </span>
            )}
          </div>
        </div>

        {/* Period Averages */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Period Averages</h4>
          <div className="grid grid-cols-3 gap-3">
            <PeriodAverage label="3 Month" value={analysis.average3Month} />
            <PeriodAverage label="6 Month" value={analysis.average6Month} />
            <PeriodAverage label="12 Month" value={analysis.average12Month} />
          </div>
        </div>

        {/* Consistency Score */}
        <div className="p-3 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Consistency Score</span>
            <span className={`font-medium ${consistencyInfo.color}`}>
              {consistencyInfo.label} ({(analysis.consistency * 100).toFixed(0)}%)
            </span>
          </div>
          <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                analysis.consistency > 0.8
                  ? 'bg-green-500'
                  : analysis.consistency > 0.5
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${analysis.consistency * 100}%` }}
            />
          </div>
        </div>

        {/* History Chart (simplified bar chart) */}
        {history && history.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Monthly History</h4>
            <div className="flex items-end gap-1 h-24">
              {history.slice(-12).map((data, index) => {
                const maxRate = Math.max(...history.map(h => Math.abs(h.savingRate)), 1)
                const height = Math.abs(data.savingRate) / maxRate * 100
                const isPositive = data.savingRate >= 0

                return (
                  <div
                    key={index}
                    className="flex-1 flex flex-col items-center justify-end"
                    title={`${new Date(data.month).toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })}: ${data.savingRate.toFixed(1)}%`}
                  >
                    <div
                      className={`w-full rounded-t ${
                        isPositive ? 'bg-blue-400' : 'bg-red-400'
                      }`}
                      style={{ height: `${Math.max(4, height)}%` }}
                    />
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between mt-1 text-xs text-gray-400">
              <span>
                {history.length > 0 &&
                  new Date(history[Math.max(0, history.length - 12)].month).toLocaleDateString('id-ID', {
                    month: 'short',
                  })}
              </span>
              <span>
                {history.length > 0 &&
                  new Date(history[history.length - 1].month).toLocaleDateString('id-ID', {
                    month: 'short',
                  })}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function PeriodAverage({ label, value }: { label: string; value: number }) {
  const isPositive = value >= 0

  return (
    <div className="text-center p-2 bg-gray-50 rounded-lg">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-lg font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {value.toFixed(1)}%
      </p>
    </div>
  )
}

export default SavingRateCard
