'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  SpendingInsight, 
  InsightType,
  SEVERITY_CONFIG,
} from '@/app/types/spending-insights'
import { 
  FiSun, 
  FiTrendingUp, 
  FiTrendingDown,
  FiAlertCircle,
  FiDollarSign,
  FiCalendar,
  FiX,
  FiChevronRight,
  FiBell
} from 'react-icons/fi'
import { Badge } from '@/components/ui/badge'

/**
 * SpendingInsightsWidget - Dashboard widget displaying top 3 insights with badge
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

export default function SpendingInsightsWidget() {
  const [insights, setInsights] = useState<SpendingInsight[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [anomalyCount, setAnomalyCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchInsights()
  }, [])

  const fetchInsights = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch insights and anomalies in parallel
      // Requirements: 5.1, 5.2, 5.5
      const [insightsRes, anomaliesRes] = await Promise.all([
        fetch('/api/insights/spending?includeRead=true&limit=10'),
        fetch('/api/insights/anomalies'),
      ])

      if (insightsRes.ok) {
        const data = await insightsRes.json()
        // Filter to show only non-dismissed, sorted by severity (Requirement: 5.2)
        const activeInsights = (data.insights || [])
          .filter((i: SpendingInsight) => !i.isDismissed)
          .slice(0, 3) // Max 3 insights (Requirement: 5.2)
        setInsights(activeInsights)
        setUnreadCount(data.unreadCount || 0)
      }

      // Get anomaly count for badge (Requirement: 5.5)
      if (anomaliesRes.ok) {
        const anomalyData = await anomaliesRes.json()
        setAnomalyCount(anomalyData.total || 0)
      }
    } catch (err) {
      console.error('Error fetching spending insights:', err)
      setError('Failed to load insights')
    } finally {
      setLoading(false)
    }
  }


  /**
   * Mark insight as read when clicked
   * Requirement: 5.3
   */
  const handleMarkAsRead = async (insightId: string) => {
    try {
      const response = await fetch('/api/insights/spending/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ insightId }),
      })

      if (response.ok) {
        setInsights(prev => 
          prev.map(i => i.id === insightId ? { ...i, isRead: true } : i)
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (err) {
      console.error('Error marking insight as read:', err)
    }
  }

  /**
   * Dismiss insight from widget
   * Requirement: 5.4
   */
  const handleDismiss = async (insightId: string) => {
    try {
      const response = await fetch('/api/insights/spending/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ insightId }),
      })

      if (response.ok) {
        setInsights(prev => prev.filter(i => i.id !== insightId))
      }
    } catch (err) {
      console.error('Error dismissing insight:', err)
    }
  }

  const getTypeIcon = (type: InsightType) => {
    switch (type) {
      case 'spending_increase':
        return <FiTrendingUp className="h-4 w-4" />
      case 'spending_decrease':
        return <FiTrendingDown className="h-4 w-4" />
      case 'absence':
        return <FiAlertCircle className="h-4 w-4" />
      case 'transaction_size':
        return <FiDollarSign className="h-4 w-4" />
      case 'weekend_pattern':
        return <FiCalendar className="h-4 w-4" />
      default:
        return <FiSun className="h-4 w-4" />
    }
  }

  const getTypeColor = (type: InsightType) => {
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

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-5 w-5 bg-gray-200 rounded"></div>
          <div className="h-5 bg-gray-200 rounded w-32"></div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <FiSun className="h-5 w-5 text-yellow-500" />
          <h3 className="font-semibold text-gray-900">Spending Insights</h3>
        </div>
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    )
  }

  const hasNotifications = unreadCount > 0 || anomalyCount > 0

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header with badge (Requirement: 5.5) */}
      <div className="flex justify-between items-center p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="relative">
            <FiSun className="text-yellow-500" size={20} />
            {hasNotifications && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </div>
          <h3 className="font-semibold text-gray-900">Spending Insights</h3>
          {unreadCount > 0 && (
            <Badge variant="default" className="ml-1">
              {unreadCount} new
            </Badge>
          )}
        </div>
        <Link
          href="/spending-insights"
          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
        >
          View All <FiChevronRight size={14} />
        </Link>
      </div>


      {/* Anomaly Alert Banner (Requirement: 5.5) */}
      {anomalyCount > 0 && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-100 flex items-center gap-2">
          <FiBell className="text-red-500" size={16} />
          <span className="text-sm text-red-700">
            {anomalyCount} anomal{anomalyCount > 1 ? 'ies' : 'y'} detected
          </span>
          <Link
            href="/spending-insights"
            className="text-sm text-red-600 hover:underline ml-auto"
          >
            Review
          </Link>
        </div>
      )}

      {/* Insights List (Requirements: 5.1, 5.2) */}
      <div className="p-4">
        {insights.length === 0 ? (
          <div className="text-center py-6">
            <FiSun className="mx-auto text-yellow-300 mb-2" size={32} />
            <p className="text-gray-600">No insights available</p>
            <p className="text-gray-400 text-sm">Check back later for spending analysis</p>
          </div>
        ) : (
          <div className="space-y-3">
            {insights.map((insight) => (
              <div
                key={insight.id}
                className={`p-3 rounded-lg border transition-all cursor-pointer ${
                  !insight.isRead
                    ? 'border-blue-200 bg-blue-50/50 hover:bg-blue-50'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
                onClick={() => !insight.isRead && handleMarkAsRead(insight.id)}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-1.5 rounded-full ${getTypeColor(insight.type)}`}>
                    {getTypeIcon(insight.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className={`text-sm font-medium truncate ${
                        !insight.isRead ? 'text-gray-900' : 'text-gray-700'
                      }`}>
                        {insight.title}
                      </h4>
                      {!insight.isRead && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                      {insight.description}
                    </p>
                    
                    {/* Severity indicator */}
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        SEVERITY_CONFIG[insight.severity].bgColor
                      } ${SEVERITY_CONFIG[insight.severity].color}`}>
                        {SEVERITY_CONFIG[insight.severity].label}
                      </span>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDismiss(insight.id)
                        }}
                        className="text-gray-400 hover:text-gray-600 p-1"
                        title="Dismiss"
                      >
                        <FiX size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Show more link if there are more insights */}
            {unreadCount > 3 && (
              <Link
                href="/spending-insights"
                className="block text-center text-sm text-blue-600 hover:underline py-2"
              >
                +{unreadCount - 3} more insights
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
