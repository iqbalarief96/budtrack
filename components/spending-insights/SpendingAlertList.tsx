'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  SpendingAlert, 
  AlertNotification,
  AlertType,
  ALERT_TYPE_OPTIONS 
} from '@/app/types/spending-insights'
import { formatCurrency } from '@/lib/utils'
import { 
  FiBell, 
  FiBellOff,
  FiEdit2, 
  FiTrash2, 
  FiPlus,
  FiAlertTriangle,
  FiCheckCircle
} from 'react-icons/fi'

/**
 * SpendingAlertList - List all alerts with toggle
 * Requirements: 4.1, 4.5
 */

interface SpendingAlertListProps {
  alerts: SpendingAlert[]
  notifications?: AlertNotification[]
  isLoading?: boolean
  onToggle?: (alertId: string, isActive: boolean) => Promise<void>
  onEdit?: (alert: SpendingAlert) => void
  onDelete?: (alertId: string) => Promise<void>
  onAdd?: () => void
}

export function SpendingAlertList({ 
  alerts, 
  notifications = [],
  isLoading, 
  onToggle, 
  onEdit, 
  onDelete,
  onAdd 
}: SpendingAlertListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiBell className="h-5 w-5" />
            Spending Alerts
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

  // Create a map of notifications by alertId
  const notificationMap = new Map<string, AlertNotification>()
  notifications.forEach(n => notificationMap.set(n.alertId, n))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FiBell className="h-5 w-5" />
            Spending Alerts
          </span>
          {onAdd && (
            <Button size="sm" onClick={onAdd}>
              <FiPlus className="h-4 w-4 mr-1" />
              Add Alert
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <FiBellOff className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No alerts configured</p>
            <p className="text-gray-500 text-sm mb-4">
              Set up alerts to monitor your spending
            </p>
            {onAdd && (
              <Button onClick={onAdd}>
                <FiPlus className="h-4 w-4 mr-1" />
                Create Your First Alert
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <AlertItem 
                key={alert.id} 
                alert={alert}
                notification={notificationMap.get(alert.id)}
                onToggle={onToggle}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface AlertItemProps {
  alert: SpendingAlert
  notification?: AlertNotification
  onToggle?: (alertId: string, isActive: boolean) => Promise<void>
  onEdit?: (alert: SpendingAlert) => void
  onDelete?: (alertId: string) => Promise<void>
}

function AlertItem({ alert, notification, onToggle, onEdit, onDelete }: AlertItemProps) {
  const [isToggling, setIsToggling] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const { id, type, category, threshold, isActive } = alert
  const typeLabel = ALERT_TYPE_OPTIONS.find(o => o.value === type)?.label || type

  const handleToggle = async () => {
    if (!onToggle) return
    setIsToggling(true)
    try {
      await onToggle(id, !isActive)
    } finally {
      setIsToggling(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    if (!confirm('Are you sure you want to delete this alert?')) return
    setIsDeleting(true)
    try {
      await onDelete(id)
    } finally {
      setIsDeleting(false)
    }
  }

  const getStatusBadge = () => {
    if (!notification) {
      return (
        <Badge variant="success" className="text-xs">
          <FiCheckCircle className="h-3 w-3 mr-1" />
          OK
        </Badge>
      )
    }

    if (notification.type === 'exceeded') {
      return (
        <Badge variant="destructive" className="text-xs">
          <FiAlertTriangle className="h-3 w-3 mr-1" />
          Exceeded
        </Badge>
      )
    }

    return (
      <Badge className="text-xs bg-yellow-100 text-yellow-800">
        <FiAlertTriangle className="h-3 w-3 mr-1" />
        Warning
      </Badge>
    )
  }

  return (
    <div 
      className={`p-4 rounded-lg border transition-colors ${
        !isActive 
          ? 'border-gray-200 bg-gray-50 opacity-60' 
          : notification 
            ? notification.type === 'exceeded'
              ? 'border-red-200 bg-red-50'
              : 'border-yellow-200 bg-yellow-50'
            : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-gray-900">{typeLabel}</h4>
            {isActive && getStatusBadge()}
            {!isActive && (
              <Badge variant="outline" className="text-xs">
                Disabled
              </Badge>
            )}
          </div>

          {category && (
            <p className="text-sm text-gray-600 mb-1">
              Category: <span className="font-medium">{category.name}</span>
            </p>
          )}

          <p className="text-sm text-gray-600">
            Threshold: <span className="font-medium">{formatCurrency(threshold)}</span>
          </p>

          {/* Show progress if there's a notification */}
          {notification && isActive && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-500">
                  {formatCurrency(notification.currentAmount)} / {formatCurrency(notification.threshold)}
                </span>
                <span className={notification.type === 'exceeded' ? 'text-red-600' : 'text-yellow-600'}>
                  {notification.percentage.toFixed(0)}%
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    notification.type === 'exceeded' ? 'bg-red-500' : 'bg-yellow-500'
                  }`}
                  style={{ width: `${Math.min(100, notification.percentage)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle Switch */}
          {onToggle && (
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={handleToggle}
                disabled={isToggling}
                className="sr-only peer"
              />
              <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 ${isToggling ? 'opacity-50' : ''}`}></div>
            </label>
          )}

          {/* Edit Button */}
          {onEdit && (
            <button
              onClick={() => onEdit(alert)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              title="Edit alert"
            >
              <FiEdit2 className="h-4 w-4" />
            </button>
          )}

          {/* Delete Button */}
          {onDelete && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
              title="Delete alert"
            >
              <FiTrash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default SpendingAlertList
