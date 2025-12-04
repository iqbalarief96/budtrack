'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TimelineGoal, Milestone } from '@/app/types/goals-timeline'
import { formatDate } from '@/lib/utils'
import { FiFlag, FiCheckCircle, FiCircle, FiAward, FiClock } from 'react-icons/fi'

/**
 * MilestoneTracker - Display milestones with achievements
 * Requirements: 5.1, 5.2, 5.4
 */

interface MilestoneTrackerProps {
  goals: TimelineGoal[]
  isLoading?: boolean
  onCelebrate?: (goalId: string, milestone: number) => void
}

export function MilestoneTracker({ goals, isLoading, onCelebrate }: MilestoneTrackerProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiFlag className="h-5 w-5" />
            Milestone Tracker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg" />
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
            <FiFlag className="h-5 w-5" />
            Milestone Tracker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">
            No goals to track. Create goals to see your milestones.
          </p>
        </CardContent>
      </Card>
    )
  }


  // Find recently achieved milestones and upcoming milestones
  const recentAchievements: { goal: TimelineGoal; milestone: Milestone }[] = []
  const upcomingMilestones: { goal: TimelineGoal; milestone: Milestone }[] = []

  goals.forEach((goal) => {
    goal.milestones.forEach((milestone) => {
      if (milestone.isAchieved) {
        recentAchievements.push({ goal, milestone })
      } else {
        upcomingMilestones.push({ goal, milestone })
      }
    })
  })

  // Sort achievements by date (most recent first)
  recentAchievements.sort((a, b) => {
    const dateA = a.milestone.achievedDate ? new Date(a.milestone.achievedDate).getTime() : 0
    const dateB = b.milestone.achievedDate ? new Date(b.milestone.achievedDate).getTime() : 0
    return dateB - dateA
  })

  // Sort upcoming by target date (soonest first)
  upcomingMilestones.sort((a, b) => {
    const dateA = new Date(a.milestone.targetDate).getTime()
    const dateB = new Date(b.milestone.targetDate).getTime()
    return dateA - dateB
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FiFlag className="h-5 w-5" />
          Milestone Tracker
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Recent Achievements */}
        {recentAchievements.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <FiAward className="h-4 w-4 text-yellow-500" />
              Recent Achievements
            </h4>
            <div className="space-y-2">
              {recentAchievements.slice(0, 5).map(({ goal, milestone }, index) => (
                <AchievementItem
                  key={`${goal.goal.id}-${milestone.percentage}-${index}`}
                  goalName={goal.goal.name}
                  milestone={milestone}
                  onCelebrate={() => onCelebrate?.(goal.goal.id, milestone.percentage)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Milestones */}
        {upcomingMilestones.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <FiClock className="h-4 w-4 text-blue-500" />
              Upcoming Milestones
            </h4>
            <div className="space-y-2">
              {upcomingMilestones.slice(0, 5).map(({ goal, milestone }, index) => (
                <UpcomingItem
                  key={`${goal.goal.id}-${milestone.percentage}-${index}`}
                  goalName={goal.goal.name}
                  milestone={milestone}
                  currentProgress={goal.projection.currentProgress}
                />
              ))}
            </div>
          </div>
        )}

        {/* Goal Progress Overview */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Goal Progress Overview</h4>
          <div className="space-y-4">
            {goals.map((goal) => (
              <GoalMilestoneProgress key={goal.goal.id} goal={goal} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface AchievementItemProps {
  goalName: string
  milestone: Milestone
  onCelebrate?: () => void
}

function AchievementItem({ goalName, milestone, onCelebrate }: AchievementItemProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
      <div className="p-2 bg-green-100 rounded-full">
        <FiCheckCircle className="h-4 w-4 text-green-600" />
      </div>
      <div className="flex-1">
        <p className="font-medium text-green-900">
          {goalName} - {milestone.percentage}% Complete! 🎉
        </p>
        {milestone.achievedDate && (
          <p className="text-xs text-green-700">
            Achieved on {formatDate(new Date(milestone.achievedDate))}
          </p>
        )}
      </div>
      <Badge variant="success">{milestone.percentage}%</Badge>
    </div>
  )
}

interface UpcomingItemProps {
  goalName: string
  milestone: Milestone
  currentProgress: number
}

function UpcomingItem({ goalName, milestone, currentProgress }: UpcomingItemProps) {
  const progressToMilestone = (currentProgress / milestone.percentage) * 100
  const daysUntil = Math.max(
    0,
    Math.round((new Date(milestone.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  )

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
      <div className="p-2 bg-blue-100 rounded-full">
        <FiCircle className="h-4 w-4 text-blue-600" />
      </div>
      <div className="flex-1">
        <p className="font-medium text-gray-900">
          {goalName} - {milestone.percentage}% Milestone
        </p>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${Math.min(100, progressToMilestone)}%` }}
            />
          </div>
          <span className="text-xs text-gray-500">
            {Math.round(progressToMilestone)}%
          </span>
        </div>
      </div>
      <div className="text-right">
        <p className="text-xs text-gray-500">Target</p>
        <p className="text-sm font-medium text-gray-700">
          {daysUntil === 0 ? 'Today' : `${daysUntil} days`}
        </p>
      </div>
    </div>
  )
}

interface GoalMilestoneProgressProps {
  goal: TimelineGoal
}

function GoalMilestoneProgress({ goal }: GoalMilestoneProgressProps) {
  const progress = goal.projection.currentProgress

  return (
    <div className="p-3 border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <h5 className="font-medium text-gray-900">{goal.goal.name}</h5>
        <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
      </div>

      {/* Milestone Progress Bar */}
      <div className="relative h-6 bg-gray-100 rounded-full overflow-hidden">
        {/* Progress fill */}
        <div
          className="absolute inset-y-0 left-0 bg-blue-500 transition-all"
          style={{ width: `${Math.min(100, progress)}%` }}
        />

        {/* Milestone markers */}
        {goal.milestones.map((milestone) => (
          <div
            key={milestone.percentage}
            className="absolute top-0 bottom-0 flex items-center"
            style={{ left: `${milestone.percentage}%`, transform: 'translateX(-50%)' }}
          >
            <div
              className={`w-4 h-4 rounded-full border-2 ${
                milestone.isAchieved
                  ? 'bg-green-500 border-green-600'
                  : progress >= milestone.percentage
                  ? 'bg-blue-500 border-blue-600'
                  : 'bg-white border-gray-300'
              }`}
            />
          </div>
        ))}
      </div>

      {/* Milestone labels */}
      <div className="relative h-4 mt-1">
        {goal.milestones.map((milestone) => (
          <div
            key={milestone.percentage}
            className="absolute text-xs text-gray-500"
            style={{ left: `${milestone.percentage}%`, transform: 'translateX(-50%)' }}
          >
            {milestone.percentage}%
          </div>
        ))}
      </div>
    </div>
  )
}

export default MilestoneTracker
