'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  SpendingInsight, 
  InsightType,
  Severity,
  SEVERITY_CONFIG, 
  INSIGHT_TYPE_CONFIG 
} from '@/app/types/spending-insights'
import { formatCurrency } from '@/lib/utils'
import { 
  FiSun, 
  FiTrendingUp, 
  FiTrendingDown,
  FiAlertCircle,
  FiDollarSign,
  FiCalendar,
  FiX,
  FiCheck,
  FiClock
} from 'react-icons/fi'

/**
 * InsightCard - Display insight with dismiss action
 * Requirements: 3.1, 3.2, 3.3, 3.4, 5.3, 5.4
 */

interface InsightCardProps {
  insights: SpendingInsight[]
  isLoading?: boolean
  onMarkAsRead?: (insightId: string) => void
  onDismiss?: (insightId: string) => void
}

export function InsightCard({ insights, isLoading, onMarkAsRead, onDismiss }: InsightCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiSun className="h-5 w-5" />
            Spending Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-24 bg-gray-200 rounded-lg" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Filter out dismissed insights
  const visibleInsights = insights.filter(i => !i.isDismissed)
  const unreadCount = visibleInsights.filter(i => !i.isRead).length

  if (visibleInsights.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiSun className="h-5 w-5" />
            Spending Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FiSun className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No insights available</p>
            <p className="text-gray-500 text-sm">Check back later for personalized insights</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Sort by unread first, then by severity, then by date
  const sortedInsights = [...visibleInsights].sort((a, b) => {
    // Unread first
    if (!a.isRead && b.isRead) return -1
    if (a.isRead && !b.isRead) return 1
    
    // Then by severity
    const severityOrder = { high: 0, medium: 1, low: 2 }
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity]
    if (severityDiff !== 0) return severityDiff
    
    // Then by date
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FiSun className="h-5 w-5" />
            Spending Insights
          </span>
          {unreadCount > 0 && (
            <Badge variant="default">{unreadCount} new</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedInsights.map((insight) => (
            <InsightItem 
              key={insight.id} 
              insight={insight}
              onMarkAsRead={onMarkAsRead}
              onDismiss={onDismiss}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

interface InsightItemProps {
  insight: SpendingInsight
  onMarkAsRead?: (insightId: string) => void
  onDismiss?: (insightId: string) => void
}

function InsightItem({ insight, onMarkAsRead, onDismiss }: InsightItemProps) {
  const [isHovered, setIsHovered] = useState(false)
  const { type, title, description, severity, category, isRead, createdAt, data } = insight
  const severityConfig = SEVERITY_CONFIG[severity]

  const getTypeIcon = () => {
    switch (type) {
      case 'spending_increase':
        return <FiTrendingUp className="h-5 w-5" />
      case 'spending_decrease':
        return <FiTrendingDown className="h-5 w-5" />
      case 'absence':
        return <FiAlertCircle className="h-5 w-5" />
      case 'transaction_size':
        return <FiDollarSign className="h-5 w-5" />
      case 'weekend_pattern':
        return <FiCalendar className="h-5 w-5" />
      default:
        return <FiSun className="h-5 w-5" />
    }
  }

  const getTypeColor = () => {
    switch (type) {
      case 'spending_increase':
        return 'bg-red-100 text-red-600'
      case 'spending_decrease':
        return 'bg-green-100 text-green-600'
      case 'absence':
        return 'bg-yellow-100 text-yellow-600'
      case 'transaction_size':
        return 'bg-purple-100 text-purple-600'
      case 'weekend_pattern':
        return 'bg-blue-100 text-blue-600'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  const handleClick = () => {
    if (!isRead && onMarkAsRead) {
      onMarkAsRead(insight.id)
    }
  }

  return (
    <div 
      className={`p-4 rounded-lg border transition-all cursor-pointer ${
        !isRead 
          ? 'border-blue-200 bg-blue-50/50 hover:bg-blue-50' 
          : 'border-gray-200 bg-white hover:bg-gray-50'
      }`}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-full ${getTypeColor()}`}>
          {getTypeIcon()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className={`font-semibold ${!isRead ? 'text-gray-900' : 'text-gray-700'}`}>
              {title}
            </h4>
            {!isRead && (
              <span className="w-2 h-2 rounded-full bg-blue-500" />
            )}
          </div>

          <p className="text-sm text-gray-600 mb-2">
            {description}
          </p>

          {category && (
            <Badge variant="outline" className="text-xs mb-2">
              {category.name}
            </Badge>
          )}

          {/* Show additional data if available */}
          {data && Object.keys(data).length > 0 && (
            <InsightDataDisplay data={data} type={type} />
          )}

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <FiClock className="h-3 w-3" />
              {formatDate(createdAt)}
            </span>

            <div className="flex items-center gap-2">
              {!isRead && onMarkAsRead && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onMarkAsRead(insight.id)
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <FiCheck className="h-3 w-3" />
                  Mark read
                </button>
              )}
              {onDismiss && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDismiss(insight.id)
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  <FiX className="h-3 w-3" />
                  Dismiss
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface InsightDataDisplayProps {
  data: Record<string, unknown>
  type: InsightType
}

function InsightDataDisplay({ data, type }: InsightDataDisplayProps) {
  // Display relevant data based on insight type
  const renderData = (): React.ReactNode => {
    switch (type) {
      case 'spending_increase':
      case 'spending_decrease':
        if (data.previousAmount !== undefined && data.currentAmount !== undefined) {
          return (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-500">
                Previous: {formatCurrency(data.previousAmount as number)}
              </span>
              <span className="text-gray-500">→</span>
              <span className={type === 'spending_increase' ? 'text-red-600' : 'text-green-600'}>
                Current: {formatCurrency(data.currentAmount as number)}
              </span>
            </div>
          )
        }
        return null
      case 'absence':
        if (data.daysSinceLastSpend !== undefined) {
          return (
            <p className="text-sm text-gray-500">
              No spending for {String(data.daysSinceLastSpend)} days
            </p>
          )
        }
        return null
      case 'weekend_pattern':
        if (data.weekendAvg !== undefined && data.weekdayAvg !== undefined) {
          return (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-500">
                Weekday avg: {formatCurrency(data.weekdayAvg as number)}
              </span>
              <span className="text-gray-500">
                Weekend avg: {formatCurrency(data.weekendAvg as number)}
              </span>
            </div>
          )
        }
        return null
      default:
        return null
    }
  }

  const content = renderData()
  if (!content) return null

  return (
    <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
      {content}
    </div>
  )
}

export default InsightCard
