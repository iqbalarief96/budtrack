'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Anomaly, 
  Severity, 
  AnomalyType,
  SEVERITY_CONFIG, 
  ANOMALY_TYPE_CONFIG 
} from '@/app/types/spending-insights'
import { formatCurrency } from '@/lib/utils'
import { 
  FiAlertTriangle, 
  FiAlertCircle, 
  FiTrendingUp, 
  FiDollarSign,
  FiActivity,
  FiClock
} from 'react-icons/fi'

/**
 * AnomalyAlert - Display anomaly with severity indicator
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */

interface AnomalyAlertProps {
  anomalies: Anomaly[]
  isLoading?: boolean
  onDismiss?: (anomalyId: string) => void
}

export function AnomalyAlert({ anomalies, isLoading, onDismiss }: AnomalyAlertProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiAlertTriangle className="h-5 w-5" />
            Anomaly Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-gray-200 rounded-lg" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (anomalies.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiAlertTriangle className="h-5 w-5" />
            Anomaly Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FiAlertCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No anomalies detected</p>
            <p className="text-gray-500 text-sm">Your spending patterns look normal</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Sort by severity (high first) then by date
  const sortedAnomalies = [...anomalies].sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 }
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity]
    if (severityDiff !== 0) return severityDiff
    return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FiAlertTriangle className="h-5 w-5" />
            Anomaly Alerts
          </span>
          <Badge variant="destructive">{anomalies.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedAnomalies.map((anomaly) => (
            <AnomalyItem 
              key={anomaly.id} 
              anomaly={anomaly} 
              onDismiss={onDismiss}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

interface AnomalyItemProps {
  anomaly: Anomaly
  onDismiss?: (anomalyId: string) => void
}

function AnomalyItem({ anomaly, onDismiss }: AnomalyItemProps) {
  const { type, severity, deviation, currentValue, baselineValue, category, detectedAt } = anomaly
  const typeConfig = ANOMALY_TYPE_CONFIG[type]
  const severityConfig = SEVERITY_CONFIG[severity]

  const getTypeIcon = () => {
    switch (type) {
      case 'spike':
        return <FiTrendingUp className="h-5 w-5" />
      case 'large_transaction':
        return <FiDollarSign className="h-5 w-5" />
      case 'frequency_change':
        return <FiActivity className="h-5 w-5" />
      default:
        return <FiAlertTriangle className="h-5 w-5" />
    }
  }

  const getSeverityBorderColor = () => {
    switch (severity) {
      case 'high':
        return 'border-l-red-500'
      case 'medium':
        return 'border-l-yellow-500'
      case 'low':
        return 'border-l-blue-500'
      default:
        return 'border-l-gray-500'
    }
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div 
      className={`p-4 rounded-lg border border-l-4 ${getSeverityBorderColor()} bg-white hover:shadow-md transition-shadow`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-full ${severityConfig.bgColor}`}>
          <span className={severityConfig.color}>{getTypeIcon()}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-gray-900">{typeConfig.label}</h4>
            <SeverityBadge severity={severity} />
          </div>

          <p className="text-sm text-gray-600 mb-2">
            {typeConfig.description}
          </p>

          {category && (
            <p className="text-sm text-gray-500 mb-2">
              Category: <span className="font-medium">{category.name}</span>
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div>
              <span className="text-gray-500">Current: </span>
              <span className="font-medium text-gray-900">
                {type === 'frequency_change' 
                  ? `${currentValue} transactions`
                  : formatCurrency(currentValue)
                }
              </span>
            </div>
            <div>
              <span className="text-gray-500">Baseline: </span>
              <span className="font-medium text-gray-900">
                {type === 'frequency_change'
                  ? `${baselineValue} transactions`
                  : formatCurrency(baselineValue)
                }
              </span>
            </div>
            <div>
              <span className="text-gray-500">Deviation: </span>
              <span className={`font-medium ${deviation > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {deviation > 0 ? '+' : ''}{deviation.toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <FiClock className="h-3 w-3" />
              {formatDate(detectedAt)}
            </span>
            {onDismiss && (
              <button
                onClick={() => onDismiss(anomaly.id)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function SeverityBadge({ severity }: { severity: Severity }) {
  const config = SEVERITY_CONFIG[severity]
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
      {config.label}
    </span>
  )
}

export default AnomalyAlert
