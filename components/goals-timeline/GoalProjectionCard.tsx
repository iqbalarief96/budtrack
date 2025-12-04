'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TimelineGoal, ConfidenceLevel } from '@/app/types/goals-timeline'
import { formatCurrency, formatDate } from '@/lib/utils'
import { FiTarget, FiCalendar, FiTrendingUp, FiAlertCircle, FiCheckCircle } from 'react-icons/fi'

/**
 * GoalProjectionCard - Displays goal with projection and confidence
 * Requirements: 1.2, 1.3, 1.5
 */

interface GoalProjectionCardProps {
  goal: TimelineGoal
  onViewDetails?: (goalId: string) => void
}

export function GoalProjectionCard({ goal, onViewDetails }: GoalProjectionCardProps) {
  const { projection } = goal
  const progress = projection.currentProgress
  const projectedDate = new Date(projection.projectedDate)
  const deadline = goal.goal.deadline ? new Date(goal.goal.deadline) : null
  
  // Check if projection is valid (not year 9999)
  const isProjectionValid = projectedDate.getFullYear() < 9000

  const getProgressColor = () => {
    if (progress >= 100) return 'bg-green-500'
    if (progress >= 75) return 'bg-blue-500'
    if (progress >= 50) return 'bg-blue-400'
    if (progress >= 25) return 'bg-yellow-500'
    return 'bg-gray-400'
  }

  const getStatusBadge = () => {
    if (progress >= 100) {
      return (
        <Badge variant="success" className="flex items-center gap-1">
          <FiCheckCircle className="h-3 w-3" />
          Completed
        </Badge>
      )
    }
    if (!projection.isOnTrack) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <FiAlertCircle className="h-3 w-3" />
          Behind Schedule
        </Badge>
      )
    }
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <FiTrendingUp className="h-3 w-3" />
        On Track
      </Badge>
    )
  }


  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onViewDetails?.(goal.goal.id)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-blue-50">
              <FiTarget className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg">{goal.goal.name}</CardTitle>
              <p className="text-sm text-gray-500">Priority #{goal.priority}</p>
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Section */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">Progress</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${getProgressColor()}`}
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{formatCurrency(goal.goal.current)}</span>
            <span>{formatCurrency(goal.goal.target)}</span>
          </div>
        </div>

        {/* Projection Details */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
              <FiCalendar className="h-3 w-3" />
              Projected Date
            </div>
            <p className="font-medium text-gray-900">
              {isProjectionValid ? formatDate(projectedDate) : 'Butuh data savings'}
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500 mb-1">Time Remaining</div>
            <p className="font-medium text-gray-900">
              {isProjectionValid && projection.monthsRemaining < 10000 
                ? `${Math.round(projection.monthsRemaining)} months` 
                : 'N/A'}
            </p>
          </div>
        </div>
        
        {/* Warning if no savings data */}
        {!isProjectionValid && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-700">
              ⚠️ Tidak bisa memproyeksikan tanggal karena belum ada data income/savings. 
              Tambahkan transaksi income untuk melihat proyeksi.
            </p>
          </div>
        )}

        {/* Deadline Comparison */}
        {deadline && isProjectionValid && (
          <div className={`p-3 rounded-lg ${projection.isOnTrack ? 'bg-green-50' : 'bg-yellow-50'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Target Deadline</p>
                <p className="font-medium">{formatDate(deadline)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Difference</p>
                <p className={`font-medium ${projection.isOnTrack ? 'text-green-600' : 'text-yellow-600'}`}>
                  {calculateDateDifference(projectedDate, deadline)}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Show deadline only when no projection */}
        {deadline && !isProjectionValid && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">Target Deadline</p>
            <p className="font-medium">{formatDate(deadline)}</p>
          </div>
        )}

        {/* Confidence Level */}
        <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
          <span className="text-sm text-gray-600">Projection Confidence</span>
          <ConfidenceBadge level={projection.confidenceLevel} />
        </div>

        {/* Required Saving Rate */}
        {projection.requiredSavingRate > 0 && (
          <div className="text-sm text-gray-600">
            <span>Required saving rate: </span>
            <span className="font-medium text-gray-900">
              {formatCurrency(projection.requiredSavingRate)}/month
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  const config = {
    low: { color: 'bg-red-100 text-red-700 border-red-200', label: 'Low', icon: '⚠️' },
    medium: { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'Medium', icon: '📊' },
    high: { color: 'bg-green-100 text-green-700 border-green-200', label: 'High', icon: '✓' },
  }

  const { color, label, icon } = config[level]

  return (
    <span className={`text-sm px-3 py-1 rounded-full border ${color}`}>
      {icon} {label}
    </span>
  )
}

function calculateDateDifference(projected: Date, deadline: Date): string {
  const diffMs = deadline.getTime() - projected.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
  const diffMonths = Math.round(diffDays / 30)

  if (diffDays === 0) return 'On target'
  if (diffDays > 0) {
    return diffMonths > 0 ? `${diffMonths} months early` : `${diffDays} days early`
  }
  return diffMonths < 0 ? `${Math.abs(diffMonths)} months late` : `${Math.abs(diffDays)} days late`
}

export default GoalProjectionCard
