'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TimelineGoal } from '@/app/types/goals-timeline'
import { formatCurrency, formatDate } from '@/lib/utils'
import { FiAlertTriangle, FiCheckCircle, FiTarget, FiCalendar } from 'react-icons/fi'

/**
 * GoalsTimelineChart - Displays timeline with projected dates
 * Requirements: 1.1, 1.4
 */

interface GoalsTimelineChartProps {
  goals: TimelineGoal[]
  isLoading?: boolean
}

export function GoalsTimelineChart({ goals, isLoading }: GoalsTimelineChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiCalendar className="h-5 w-5" />
            Goals Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-gray-200 rounded-lg" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (goals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiCalendar className="h-5 w-5" />
            Goals Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">
            No active goals. Create a goal to see your timeline.
          </p>
        </CardContent>
      </Card>
    )
  }


  // Sort goals by projected date
  const sortedGoals = [...goals].sort((a, b) => {
    const dateA = new Date(a.projection.projectedDate).getTime()
    const dateB = new Date(b.projection.projectedDate).getTime()
    return dateA - dateB
  })

  // Calculate timeline range
  const now = new Date()
  const maxDate = sortedGoals.reduce((max, goal) => {
    const projDate = new Date(goal.projection.projectedDate)
    return projDate > max ? projDate : max
  }, now)

  const totalMonths = Math.max(
    1,
    (maxDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FiCalendar className="h-5 w-5" />
          Goals Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline axis */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

          {/* Goals on timeline */}
          <div className="space-y-6 pl-10">
            {sortedGoals.map((goal, index) => {
              const projectedDate = new Date(goal.projection.projectedDate)
              const monthsFromNow = Math.max(
                0,
                (projectedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)
              )
              const position = (monthsFromNow / totalMonths) * 100

              return (
                <TimelineItem
                  key={goal.goal.id}
                  goal={goal}
                  position={position}
                  isFirst={index === 0}
                  isLast={index === sortedGoals.length - 1}
                />
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface TimelineItemProps {
  goal: TimelineGoal
  position: number
  isFirst: boolean
  isLast: boolean
}

function TimelineItem({ goal, position, isFirst, isLast }: TimelineItemProps) {
  const { projection } = goal
  const projectedDate = new Date(projection.projectedDate)
  const isOnTrack = projection.isOnTrack
  const progress = projection.currentProgress
  
  // Check if projection is valid (not year 9999)
  const isProjectionValid = projectedDate.getFullYear() < 9000
  const deadline = goal.goal.deadline ? new Date(goal.goal.deadline) : null

  const getStatusColor = () => {
    if (progress >= 100) return 'bg-green-500'
    if (!isProjectionValid) return 'bg-gray-400'
    if (!isOnTrack) return 'bg-yellow-500'
    return 'bg-blue-500'
  }

  const getStatusIcon = () => {
    if (progress >= 100) return <FiCheckCircle className="h-4 w-4 text-green-600" />
    if (!isOnTrack) return <FiAlertTriangle className="h-4 w-4 text-yellow-600" />
    return <FiTarget className="h-4 w-4 text-blue-600" />
  }

  return (
    <div className="relative">
      {/* Timeline dot */}
      <div
        className={`absolute -left-10 w-4 h-4 rounded-full ${getStatusColor()} border-2 border-white shadow`}
        style={{ top: '50%', transform: 'translateY(-50%)' }}
      />

      {/* Goal card */}
      <div
        className={`p-4 rounded-lg border ${
          !isOnTrack ? 'border-yellow-200 bg-yellow-50' : 'border-gray-200 bg-white'
        } hover:shadow-md transition-shadow`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {getStatusIcon()}
              <h4 className="font-semibold text-gray-900">{goal.goal.name}</h4>
              {!isOnTrack && isProjectionValid && (
                <Badge variant="destructive" className="text-xs">
                  Behind Schedule
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>
                {formatCurrency(goal.goal.current)} / {formatCurrency(goal.goal.target)}
              </span>
              <span className="text-gray-400">•</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
          </div>

          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">
              {isProjectionValid ? formatDate(projectedDate) : (deadline ? formatDate(deadline) : 'Butuh data')}
            </p>
            <p className="text-xs text-gray-500">
              {isProjectionValid && projection.monthsRemaining < 10000
                ? `${Math.round(projection.monthsRemaining)} months remaining`
                : 'Tambahkan income'}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                progress >= 100
                  ? 'bg-green-500'
                  : !isOnTrack
                  ? 'bg-yellow-500'
                  : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
        </div>

        {/* Confidence indicator */}
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-gray-500">Confidence:</span>
          <ConfidenceBadge level={projection.confidenceLevel} />
        </div>
      </div>
    </div>
  )
}

function ConfidenceBadge({ level }: { level: 'low' | 'medium' | 'high' }) {
  const config = {
    low: { color: 'bg-red-100 text-red-700', label: 'Low' },
    medium: { color: 'bg-yellow-100 text-yellow-700', label: 'Medium' },
    high: { color: 'bg-green-100 text-green-700', label: 'High' },
  }

  const { color, label } = config[level]

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${color}`}>{label}</span>
  )
}

export default GoalsTimelineChart
