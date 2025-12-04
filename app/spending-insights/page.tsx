'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  SpendingPatternCard,
  SpendingTrendChart,
  AnomalyAlert,
  InsightCard,
  SpendingAlertForm,
  SpendingAlertList,
} from '@/components/spending-insights'
import {
  SpendingPattern,
  DayOfWeekPattern,
  Anomaly,
  SpendingInsight,
  SpendingAlert,
  AlertNotification,
  CreateAlertInput,
  UpdateAlertInput,
} from '@/app/types/spending-insights'
import { 
  FiRefreshCw, 
  FiTrendingUp, 
  FiAlertTriangle, 
  FiSun, 
  FiBell,
  FiCalendar,
  FiPieChart
} from 'react-icons/fi'

/**
 * Spending Insights Page
 * Main page integrating patterns, anomalies, insights, and alerts
 * Requirements: 1.1, 2.1, 3.1, 4.1
 */

interface PatternsData {
  patterns: SpendingPattern[]
  topCategories: SpendingPattern[]
  dayOfWeekPatterns: DayOfWeekPattern[]
  monthComparison: {
    difference: number
    percentageChange: number
  }
}

interface AnomaliesData {
  anomalies: Anomaly[]
  total: number
}

interface InsightsData {
  insights: SpendingInsight[]
  unreadCount: number
}

interface AlertsData {
  alerts: SpendingAlert[]
  notifications: AlertNotification[]
}

export default function SpendingInsightsPage() {
  const { status } = useSession()
  
  // Data states
  const [patterns, setPatterns] = useState<PatternsData | null>(null)
  const [anomalies, setAnomalies] = useState<AnomaliesData | null>(null)
  const [insights, setInsights] = useState<InsightsData | null>(null)
  const [alerts, setAlerts] = useState<AlertsData | null>(null)
  
  // Loading states
  const [loadingPatterns, setLoadingPatterns] = useState(true)
  const [loadingAnomalies, setLoadingAnomalies] = useState(true)
  const [loadingInsights, setLoadingInsights] = useState(true)
  const [loadingAlerts, setLoadingAlerts] = useState(true)
  
  // UI states
  const [showAlertForm, setShowAlertForm] = useState(false)
  const [editingAlert, setEditingAlert] = useState<SpendingAlert | null>(null)
  const [selectedCategory] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch patterns data
  const fetchPatterns = useCallback(async () => {
    try {
      setLoadingPatterns(true)
      const response = await fetch('/api/insights/patterns?months=3&topCategories=5')
      if (!response.ok) throw new Error('Failed to fetch patterns')
      const data = await response.json()
      setPatterns(data)
    } catch (err) {
      console.error('Error fetching patterns:', err)
      setError('Failed to load spending patterns')
    } finally {
      setLoadingPatterns(false)
    }
  }, [])

  // Fetch anomalies data
  const fetchAnomalies = useCallback(async () => {
    try {
      setLoadingAnomalies(true)
      const response = await fetch('/api/insights/anomalies')
      if (!response.ok) throw new Error('Failed to fetch anomalies')
      const data = await response.json()
      setAnomalies(data)
    } catch (err) {
      console.error('Error fetching anomalies:', err)
    } finally {
      setLoadingAnomalies(false)
    }
  }, [])

  // Fetch insights data
  const fetchInsights = useCallback(async () => {
    try {
      setLoadingInsights(true)
      const response = await fetch('/api/insights/spending?includeRead=true&limit=10')
      if (!response.ok) throw new Error('Failed to fetch insights')
      const data = await response.json()
      setInsights(data)
    } catch (err) {
      console.error('Error fetching insights:', err)
    } finally {
      setLoadingInsights(false)
    }
  }, [])

  // Fetch alerts data
  const fetchAlerts = useCallback(async () => {
    try {
      setLoadingAlerts(true)
      const response = await fetch('/api/alerts/spending?activeOnly=false&checkNotifications=true')
      if (!response.ok) throw new Error('Failed to fetch alerts')
      const data = await response.json()
      setAlerts(data)
    } catch (err) {
      console.error('Error fetching alerts:', err)
    } finally {
      setLoadingAlerts(false)
    }
  }, [])

  // Initial data fetch
  useEffect(() => {
    if (status === 'authenticated') {
      fetchPatterns()
      fetchAnomalies()
      fetchInsights()
      fetchAlerts()
    }
  }, [status, fetchPatterns, fetchAnomalies, fetchInsights, fetchAlerts])

  // Refresh all data
  const handleRefresh = async () => {
    setRefreshing(true)
    setError(null)
    await Promise.all([
      fetchPatterns(),
      fetchAnomalies(),
      fetchInsights(),
      fetchAlerts(),
    ])
    setRefreshing(false)
  }

  // Mark insight as read
  const handleMarkInsightAsRead = async (insightId: string) => {
    try {
      const response = await fetch('/api/insights/spending/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ insightId }),
      })
      if (response.ok) {
        setInsights(prev => prev ? {
          ...prev,
          insights: prev.insights.map(i => 
            i.id === insightId ? { ...i, isRead: true } : i
          ),
          unreadCount: Math.max(0, prev.unreadCount - 1),
        } : null)
      }
    } catch (err) {
      console.error('Error marking insight as read:', err)
    }
  }

  // Dismiss insight
  const handleDismissInsight = async (insightId: string) => {
    try {
      const response = await fetch('/api/insights/spending/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ insightId }),
      })
      if (response.ok) {
        setInsights(prev => prev ? {
          ...prev,
          insights: prev.insights.map(i => 
            i.id === insightId ? { ...i, isDismissed: true } : i
          ),
        } : null)
      }
    } catch (err) {
      console.error('Error dismissing insight:', err)
    }
  }

  // Create alert
  const handleCreateAlert = async (data: CreateAlertInput | UpdateAlertInput) => {
    const response = await fetch('/api/alerts/spending', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create alert')
    }
    await fetchAlerts()
  }

  // Update alert
  const handleUpdateAlert = async (data: CreateAlertInput | UpdateAlertInput) => {
    if (!editingAlert) return
    const response = await fetch(`/api/alerts/spending/${editingAlert.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update alert')
    }
    await fetchAlerts()
    setEditingAlert(null)
  }

  // Toggle alert active status
  const handleToggleAlert = async (alertId: string, isActive: boolean) => {
    const response = await fetch(`/api/alerts/spending/${alertId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive }),
    })
    if (response.ok) {
      setAlerts(prev => prev ? {
        ...prev,
        alerts: prev.alerts.map(a => 
          a.id === alertId ? { ...a, isActive } : a
        ),
      } : null)
    }
  }

  // Delete alert
  const handleDeleteAlert = async (alertId: string) => {
    const response = await fetch(`/api/alerts/spending/${alertId}`, {
      method: 'DELETE',
    })
    if (response.ok) {
      setAlerts(prev => prev ? {
        ...prev,
        alerts: prev.alerts.filter(a => a.id !== alertId),
        notifications: prev.notifications.filter(n => n.alertId !== alertId),
      } : null)
    }
  }

  // Loading state
  if (status === 'loading') {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  // Unauthenticated state
  if (status === 'unauthenticated') {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Please sign in to view spending insights</p>
        </div>
      </div>
    )
  }

  // Calculate summary stats
  const totalAnomalies = anomalies?.total || 0
  const unreadInsights = insights?.unreadCount || 0
  const activeAlerts = alerts?.alerts.filter(a => a.isActive).length || 0
  const triggeredAlerts = alerts?.notifications.length || 0

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Spending Insights</h1>
          <p className="text-gray-500 mt-1">
            Analyze your spending patterns and get personalized insights
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outline"
          className="flex items-center gap-2"
        >
          <FiRefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          icon={<FiPieChart className="h-5 w-5" />}
          label="Categories"
          value={patterns?.topCategories.length || 0}
          color="blue"
        />
        <SummaryCard
          icon={<FiAlertTriangle className="h-5 w-5" />}
          label="Anomalies"
          value={totalAnomalies}
          color={totalAnomalies > 0 ? 'red' : 'green'}
        />
        <SummaryCard
          icon={<FiSun className="h-5 w-5" />}
          label="New Insights"
          value={unreadInsights}
          color={unreadInsights > 0 ? 'yellow' : 'gray'}
        />
        <SummaryCard
          icon={<FiBell className="h-5 w-5" />}
          label="Alerts"
          value={`${triggeredAlerts}/${activeAlerts}`}
          color={triggeredAlerts > 0 ? 'orange' : 'gray'}
          subtitle="triggered"
        />
      </div>

      {/* Month Comparison */}
      {patterns?.monthComparison && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${
                  patterns.monthComparison.percentageChange > 0 
                    ? 'bg-red-100 text-red-600' 
                    : 'bg-green-100 text-green-600'
                }`}>
                  <FiTrendingUp className={`h-5 w-5 ${
                    patterns.monthComparison.percentageChange < 0 ? 'rotate-180' : ''
                  }`} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Month-over-Month</p>
                  <p className="font-semibold">
                    {patterns.monthComparison.percentageChange > 0 ? '+' : ''}
                    {patterns.monthComparison.percentageChange.toFixed(1)}% vs last month
                  </p>
                </div>
              </div>
              <Badge variant={patterns.monthComparison.percentageChange > 10 ? 'destructive' : 'default'}>
                {patterns.monthComparison.percentageChange > 10 
                  ? 'Spending Up' 
                  : patterns.monthComparison.percentageChange < -10 
                    ? 'Spending Down' 
                    : 'Stable'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Spending Patterns */}
          <SpendingPatternCard
            patterns={patterns?.topCategories || []}
            isLoading={loadingPatterns}
          />

          {/* Anomaly Alerts */}
          <AnomalyAlert
            anomalies={anomalies?.anomalies || []}
            isLoading={loadingAnomalies}
          />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Spending Trend Chart */}
          <SpendingTrendChart
            patterns={patterns?.patterns || []}
            isLoading={loadingPatterns}
            selectedCategoryId={selectedCategory}
          />

          {/* Insights */}
          <InsightCard
            insights={insights?.insights || []}
            isLoading={loadingInsights}
            onMarkAsRead={handleMarkInsightAsRead}
            onDismiss={handleDismissInsight}
          />
        </div>
      </div>

      {/* Day of Week Patterns */}
      {patterns?.dayOfWeekPatterns && patterns.dayOfWeekPatterns.length > 0 && (
        <DayOfWeekCard patterns={patterns.dayOfWeekPatterns} />
      )}

      {/* Spending Alerts */}
      <SpendingAlertList
        alerts={alerts?.alerts || []}
        notifications={alerts?.notifications || []}
        isLoading={loadingAlerts}
        onToggle={handleToggleAlert}
        onEdit={(alert) => {
          setEditingAlert(alert)
          setShowAlertForm(true)
        }}
        onDelete={handleDeleteAlert}
        onAdd={() => {
          setEditingAlert(null)
          setShowAlertForm(true)
        }}
      />

      {/* Alert Form Modal */}
      {showAlertForm && (
        <SpendingAlertForm
          alert={editingAlert || undefined}
          onSubmit={editingAlert ? handleUpdateAlert : handleCreateAlert}
          onClose={() => {
            setShowAlertForm(false)
            setEditingAlert(null)
          }}
        />
      )}
    </div>
  )
}


// Summary Card Component
interface SummaryCardProps {
  icon: React.ReactNode
  label: string
  value: number | string
  color: 'blue' | 'red' | 'green' | 'yellow' | 'orange' | 'gray'
  subtitle?: string
}

function SummaryCard({ icon, label, value, color, subtitle }: SummaryCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    red: 'bg-red-100 text-red-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    orange: 'bg-orange-100 text-orange-600',
    gray: 'bg-gray-100 text-gray-600',
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${colorClasses[color]}`}>
            {icon}
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
            <p className="text-xl font-bold text-gray-900">{value}</p>
            {subtitle && (
              <p className="text-xs text-gray-400">{subtitle}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Day of Week Patterns Card
interface DayOfWeekCardProps {
  patterns: DayOfWeekPattern[]
}

function DayOfWeekCard({ patterns }: DayOfWeekCardProps) {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const maxAmount = Math.max(...patterns.map(p => p.averageAmount))

  // Sort by day of week
  const sortedPatterns = [...patterns].sort((a, b) => a.dayOfWeek - b.dayOfWeek)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FiCalendar className="h-5 w-5" />
          Day of Week Spending
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {sortedPatterns.map((pattern) => {
            const percentage = maxAmount > 0 ? (pattern.averageAmount / maxAmount) * 100 : 0
            const isWeekend = pattern.dayOfWeek === 0 || pattern.dayOfWeek === 6
            
            return (
              <div key={pattern.dayOfWeek} className="text-center">
                <p className={`text-xs font-medium mb-2 ${isWeekend ? 'text-blue-600' : 'text-gray-600'}`}>
                  {dayNames[pattern.dayOfWeek]}
                </p>
                <div className="h-24 flex items-end justify-center">
                  <div
                    className={`w-8 rounded-t transition-all ${
                      isWeekend ? 'bg-blue-500' : 'bg-gray-300'
                    }`}
                    style={{ height: `${Math.max(10, percentage)}%` }}
                    title={`Avg: Rp ${pattern.averageAmount.toLocaleString()}`}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {pattern.transactionCount}
                </p>
              </div>
            )
          })}
        </div>
        <p className="text-xs text-gray-400 text-center mt-4">
          Average spending by day of week (transaction count shown below)
        </p>
      </CardContent>
    </Card>
  )
}
