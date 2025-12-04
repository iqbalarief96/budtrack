'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Recommendation, RecommendationType } from '@/app/types/goals-timeline'
import { formatCurrency } from '@/lib/utils'
import {
  FiZap,
  FiTrendingUp,
  FiList,
  FiTarget,
  FiDollarSign,
  FiChevronRight,
  FiClock,
} from 'react-icons/fi'

/**
 * RecommendationList - Display recommendations with impact
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

interface RecommendationListProps {
  recommendations: Recommendation[]
  isLoading?: boolean
  onApplyRecommendation?: (recommendation: Recommendation) => void
}

export function RecommendationList({
  recommendations,
  isLoading,
  onApplyRecommendation,
}: RecommendationListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiZap className="h-5 w-5" />
            Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiZap className="h-5 w-5" />
            Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FiZap className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">No recommendations available.</p>
            <p className="text-sm text-gray-400">
              Add more goals or transactions to get personalized recommendations.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }


  // Group recommendations by type
  const groupedRecommendations = recommendations.reduce((acc, rec) => {
    if (!acc[rec.type]) {
      acc[rec.type] = []
    }
    acc[rec.type].push(rec)
    return acc
  }, {} as Record<RecommendationType, Recommendation[]>)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FiZap className="h-5 w-5 text-yellow-500" />
          Recommendations
        </CardTitle>
        <p className="text-sm text-gray-500 mt-1">
          Personalized suggestions to optimize your goal timeline
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendations.map((recommendation, index) => (
          <RecommendationCard
            key={`${recommendation.type}-${index}`}
            recommendation={recommendation}
            onApply={() => onApplyRecommendation?.(recommendation)}
          />
        ))}

        {/* Summary */}
        <div className="p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Summary</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-blue-700">Total Recommendations</p>
              <p className="text-2xl font-bold text-blue-900">{recommendations.length}</p>
            </div>
            <div>
              <p className="text-blue-700">Potential Time Saved</p>
              <p className="text-2xl font-bold text-blue-900">
                {calculateTotalTimeSaved(recommendations)} months
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface RecommendationCardProps {
  recommendation: Recommendation
  onApply?: () => void
}

function RecommendationCard({ recommendation, onApply }: RecommendationCardProps) {
  const { type, title, description, impact, category } = recommendation

  const getTypeConfig = () => {
    switch (type) {
      case 'increase_savings':
        return {
          icon: <FiTrendingUp className="h-5 w-5" />,
          color: 'bg-green-100 text-green-700 border-green-200',
          iconBg: 'bg-green-100',
          iconColor: 'text-green-600',
        }
      case 'reorder_goals':
        return {
          icon: <FiList className="h-5 w-5" />,
          color: 'bg-blue-100 text-blue-700 border-blue-200',
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
        }
      case 'adjust_target':
        return {
          icon: <FiTarget className="h-5 w-5" />,
          color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
          iconBg: 'bg-yellow-100',
          iconColor: 'text-yellow-600',
        }
      case 'reduce_spending':
        return {
          icon: <FiDollarSign className="h-5 w-5" />,
          color: 'bg-purple-100 text-purple-700 border-purple-200',
          iconBg: 'bg-purple-100',
          iconColor: 'text-purple-600',
        }
      default:
        return {
          icon: <FiZap className="h-5 w-5" />,
          color: 'bg-gray-100 text-gray-700 border-gray-200',
          iconBg: 'bg-gray-100',
          iconColor: 'text-gray-600',
        }
    }
  }

  const config = getTypeConfig()

  return (
    <div className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`p-2 rounded-full ${config.iconBg}`}>
          <span className={config.iconColor}>{config.icon}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-gray-900">{title}</h4>
            <Badge className={config.color}>{getTypeLabel(type)}</Badge>
          </div>
          <p className="text-sm text-gray-600 mb-3">{description}</p>

          {/* Impact */}
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {impact.timelineSavings > 0 && (
              <div className="flex items-center gap-1 text-green-600">
                <FiClock className="h-4 w-4" />
                <span>Save {impact.timelineSavings} months</span>
              </div>
            )}
            {impact.additionalSavingsNeeded && impact.additionalSavingsNeeded > 0 && (
              <div className="flex items-center gap-1 text-blue-600">
                <FiDollarSign className="h-4 w-4" />
                <span>{formatCurrency(impact.additionalSavingsNeeded)}/month needed</span>
              </div>
            )}
            {impact.affectedGoals.length > 0 && (
              <div className="flex items-center gap-1 text-gray-500">
                <FiTarget className="h-4 w-4" />
                <span>{impact.affectedGoals.length} goal(s) affected</span>
              </div>
            )}
          </div>

          {/* Category tag for spending recommendations */}
          {category && (
            <div className="mt-2">
              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                Category: {category}
              </span>
            </div>
          )}
        </div>

        {/* Action Button */}
        {onApply && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onApply}
            className="flex-shrink-0"
          >
            <FiChevronRight className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  )
}

function getTypeLabel(type: RecommendationType): string {
  switch (type) {
    case 'increase_savings':
      return 'Savings'
    case 'reorder_goals':
      return 'Priority'
    case 'adjust_target':
      return 'Target'
    case 'reduce_spending':
      return 'Spending'
    default:
      return 'Tip'
  }
}

function calculateTotalTimeSaved(recommendations: Recommendation[]): number {
  return recommendations.reduce((total, rec) => {
    return total + (rec.impact.timelineSavings || 0)
  }, 0)
}

export default RecommendationList
