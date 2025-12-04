'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TimelineGoal } from '@/app/types/goals-timeline'
import { formatCurrency } from '@/lib/utils'
import { FiList, FiArrowUp, FiArrowDown, FiMenu, FiSave, FiTarget } from 'react-icons/fi'

/**
 * GoalPriorityList - Drag-and-drop priority ordering
 * Requirements: 3.1, 3.2, 3.4
 */

interface GoalPriorityListProps {
  goals: TimelineGoal[]
  onPriorityChange?: (goalId: string, newPriority: number) => Promise<void>
  isLoading?: boolean
}

export function GoalPriorityList({ goals, onPriorityChange, isLoading }: GoalPriorityListProps) {
  const [orderedGoals, setOrderedGoals] = useState<TimelineGoal[]>(goals)
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  // Update local state when props change
  useState(() => {
    setOrderedGoals([...goals].sort((a, b) => a.priority - b.priority))
  })

  const moveGoal = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return

    setOrderedGoals((prev) => {
      const newGoals = [...prev]
      const [movedGoal] = newGoals.splice(fromIndex, 1)
      newGoals.splice(toIndex, 0, movedGoal)
      return newGoals
    })
    setHasChanges(true)
  }, [])

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      moveGoal(index, index - 1)
    }
  }

  const handleMoveDown = (index: number) => {
    if (index < orderedGoals.length - 1) {
      moveGoal(index, index + 1)
    }
  }


  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    moveGoal(draggedIndex, index)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const handleSave = async () => {
    if (!onPriorityChange || !hasChanges) return

    setIsSaving(true)
    try {
      // Update priorities based on new order
      for (let i = 0; i < orderedGoals.length; i++) {
        const goal = orderedGoals[i]
        const newPriority = i + 1
        if (goal.priority !== newPriority) {
          await onPriorityChange(goal.goal.id, newPriority)
        }
      }
      setHasChanges(false)
    } catch (error) {
      console.error('Failed to save priorities:', error)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiList className="h-5 w-5" />
            Goal Priorities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse h-16 bg-gray-200 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (orderedGoals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiList className="h-5 w-5" />
            Goal Priorities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">
            No goals to prioritize. Create goals to set their priorities.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FiList className="h-5 w-5" />
            Goal Priorities
          </CardTitle>
          {hasChanges && (
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2"
            >
              <FiSave className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Drag and drop to reorder your goals by priority
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {orderedGoals.map((goal, index) => (
            <PriorityItem
              key={goal.goal.id}
              goal={goal}
              index={index}
              isFirst={index === 0}
              isLast={index === orderedGoals.length - 1}
              isDragging={draggedIndex === index}
              onMoveUp={() => handleMoveUp(index)}
              onMoveDown={() => handleMoveDown(index)}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
            />
          ))}
        </div>

        {/* Priority Impact Info */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>Tip:</strong> Higher priority goals (top of list) will be focused on first
            when allocating your savings.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

interface PriorityItemProps {
  goal: TimelineGoal
  index: number
  isFirst: boolean
  isLast: boolean
  isDragging: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onDragStart: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDragEnd: () => void
}

function PriorityItem({
  goal,
  index,
  isFirst,
  isLast,
  isDragging,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragOver,
  onDragEnd,
}: PriorityItemProps) {
  const progress = goal.projection.currentProgress

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
        isDragging
          ? 'border-blue-400 bg-blue-50 shadow-lg'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      {/* Drag Handle */}
      <div className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600">
        <FiMenu className="h-5 w-5" />
      </div>

      {/* Priority Number */}
      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
        <span className="text-sm font-bold text-blue-600">{index + 1}</span>
      </div>

      {/* Goal Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <FiTarget className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <h4 className="font-medium text-gray-900 truncate">{goal.goal.name}</h4>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
          <span>{Math.round(progress)}% complete</span>
          <span className="text-gray-300">•</span>
          <span>{formatCurrency(goal.goal.target - goal.goal.current)} remaining</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-24 hidden sm:block">
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      </div>

      {/* Move Buttons */}
      <div className="flex flex-col gap-1">
        <button
          onClick={onMoveUp}
          disabled={isFirst}
          className={`p-1 rounded ${
            isFirst
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
          }`}
          title="Move up"
        >
          <FiArrowUp className="h-4 w-4" />
        </button>
        <button
          onClick={onMoveDown}
          disabled={isLast}
          className={`p-1 rounded ${
            isLast
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
          }`}
          title="Move down"
        >
          <FiArrowDown className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export default GoalPriorityList
