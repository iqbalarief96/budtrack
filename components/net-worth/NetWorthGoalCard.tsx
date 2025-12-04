'use client';

import React from 'react';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, Calendar, Award } from 'lucide-react';
import type { NetWorthGoal, GoalProgress, Milestone } from '@/app/types/net-worth';

/**
 * NetWorthGoalCard Component
 * Displays goal progress and required growth rate
 * 
 * Requirements: 4.2, 4.3
 */

interface NetWorthGoalCardProps {
  goal: NetWorthGoal;
  progress: GoalProgress;
  milestone: Milestone | null;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

// Get milestone badge color
const getMilestoneColor = (milestone: Milestone): string => {
  switch (milestone) {
    case 25:
      return 'bg-blue-100 text-blue-800';
    case 50:
      return 'bg-yellow-100 text-yellow-800';
    case 75:
      return 'bg-orange-100 text-orange-800';
    case 100:
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// Format date for display
const formatTargetDate = (date: Date | string) => {
  const d = new Date(date);
  return d.toLocaleDateString('id-ID', { 
    day: 'numeric',
    month: 'long', 
    year: 'numeric' 
  });
};

export const NetWorthGoalCard: React.FC<NetWorthGoalCardProps> = ({
  goal,
  progress,
  milestone,
  onEdit,
  onDelete,
  className,
}) => {
  const {
    currentNetWorth,
    targetAmount,
    progressPercentage,
    remainingAmount,
    requiredMonthlyGrowth,
    monthsRemaining,
    isOnTrack,
  } = progress;

  // Determine progress bar color
  const getProgressColor = () => {
    if (progressPercentage >= 100) return 'bg-green-500';
    if (progressPercentage >= 75) return 'bg-green-400';
    if (progressPercentage >= 50) return 'bg-yellow-400';
    if (progressPercentage >= 25) return 'bg-orange-400';
    return 'bg-blue-400';
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center">
              <Target className="h-5 w-5 mr-2" />
              Target Net Worth
            </CardTitle>
            <CardDescription>
              Target: {formatTargetDate(goal.targetDate)}
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            {milestone && (
              <Badge className={getMilestoneColor(milestone)}>
                <Award className="h-3 w-3 mr-1" />
                {milestone}% Tercapai!
              </Badge>
            )}
            {!goal.isActive && (
              <Badge variant="secondary">Tidak Aktif</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Progress Section */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{progressPercentage.toFixed(1)}%</span>
            </div>
            <Progress 
              value={Math.min(progressPercentage, 100)} 
              className={`h-3 ${getProgressColor()}`}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatCurrency(currentNetWorth)}</span>
              <span>{formatCurrency(targetAmount)}</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Remaining Amount */}
            <div className="space-y-1 p-3 bg-gray-50 rounded-lg">
              <div className="text-xs text-muted-foreground">Sisa Target</div>
              <div className="text-lg font-semibold">
                {remainingAmount > 0 
                  ? formatCurrency(remainingAmount)
                  : <span className="text-green-600">Tercapai!</span>
                }
              </div>
            </div>

            {/* Months Remaining */}
            <div className="space-y-1 p-3 bg-gray-50 rounded-lg">
              <div className="text-xs text-muted-foreground flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                Waktu Tersisa
              </div>
              <div className="text-lg font-semibold">
                {monthsRemaining > 0 
                  ? `${monthsRemaining} bulan`
                  : <span className="text-orange-600">Lewat</span>
                }
              </div>
            </div>

            {/* Required Monthly Growth */}
            <div className="space-y-1 p-3 bg-gray-50 rounded-lg col-span-2">
              <div className="text-xs text-muted-foreground flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                Pertumbuhan Bulanan yang Dibutuhkan
              </div>
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold">
                  {monthsRemaining > 0 && remainingAmount > 0
                    ? formatCurrency(requiredMonthlyGrowth)
                    : '-'
                  }
                </div>
                {monthsRemaining > 0 && remainingAmount > 0 && (
                  <Badge variant={isOnTrack ? 'default' : 'destructive'}>
                    {isOnTrack ? 'On Track' : 'Perlu Usaha Lebih'}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {(onEdit || onDelete) && (
            <div className="flex gap-2 pt-2 border-t">
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Edit Target
                </button>
              )}
              {onDelete && (
                <button
                  onClick={onDelete}
                  className="text-sm text-red-600 hover:text-red-800 hover:underline"
                >
                  Hapus
                </button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default NetWorthGoalCard;
