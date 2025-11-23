'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Heart,
  TrendingUp,
  Award,
  Target,
  Info,
  ChevronDown,
  ChevronUp,
  Shield,
  PiggyBank,
  BarChart3,
  Activity,
  Lock,
} from 'lucide-react';

interface ScoreComponent {
  name: string;
  score: number;
  weight: number;
  status: 'excellent' | 'good' | 'fair' | 'poor';
  message: string;
  details: string;
  recommendation?: string;
  breakdown?: {
    currentAmount?: number;
    targetAmount?: number;
    monthsCovered?: number;
    income?: number;
    expenses?: number;
    savingsAmount?: number;
    totalBudgets?: number;
    budgetsOnTrack?: number;
    avgMonthlySpending?: number;
    variance?: number;
  };
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  isEarned: boolean;
  progress?: number;
  earnedDate?: Date;
}

interface HealthScoreData {
  overallScore: number;
  grade: string;
  status: 'excellent' | 'good' | 'fair' | 'poor';
  components: {
    emergencyFund: ScoreComponent;
    savingsRate: ScoreComponent;
    budgetAdherence: ScoreComponent;
    debtRatio: ScoreComponent;
    spendingConsistency: ScoreComponent;
  };
  achievements: Achievement[];
  strengths: string[];
  improvements: string[];
  trend?: 'improving' | 'stable' | 'declining';
}

export default function FinancialHealthScoreCard() {
  const [healthData, setHealthData] = useState<HealthScoreData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [expandedComponent, setExpandedComponent] = useState<string | null>(null);

  useEffect(() => {
    const fetchHealthScore = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch('/api/financial-health');

        if (!response.ok) {
          throw new Error('Failed to fetch financial health score');
        }

        const data = await response.json();
        setHealthData(data);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching health score:', error);
        setError('Gagal memuat financial health score');
        setIsLoading(false);
      }
    };

    fetchHealthScore();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Financial Health Score
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <p>Calculating your financial health...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Financial Health Score
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-red-500">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!healthData) {
    return null;
  }

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 55) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'bg-green-100 text-green-700';
    if (grade === 'B') return 'bg-blue-100 text-blue-700';
    if (grade === 'C') return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'border-l-green-500 bg-green-50';
      case 'good':
        return 'border-l-blue-500 bg-blue-50';
      case 'fair':
        return 'border-l-yellow-500 bg-yellow-50';
      case 'poor':
        return 'border-l-red-500 bg-red-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  const getComponentIcon = (name: string) => {
    switch (name) {
      case 'Emergency Fund Readiness':
        return <Shield className="h-5 w-5" />;
      case 'Savings Rate':
        return <PiggyBank className="h-5 w-5" />;
      case 'Budget Adherence':
        return <BarChart3 className="h-5 w-5" />;
      case 'Debt Ratio':
        return <Lock className="h-5 w-5" />;
      case 'Spending Consistency':
        return <Activity className="h-5 w-5" />;
      default:
        return <Target className="h-5 w-5" />;
    }
  };

  const componentList = Object.values(healthData.components);
  const earnedAchievements = healthData.achievements.filter((a) => a.isEarned);
  const unearnedAchievements = healthData.achievements.filter((a) => !a.isEarned);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Financial Health Score
          </span>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-blue-600 hover:underline"
          >
            {showDetails ? 'Hide' : 'Show'} Details
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Score - Large circular display */}
        <div className="flex flex-col items-center py-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg">
          <div className="relative">
            <svg className="transform -rotate-90 w-32 h-32">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                className="text-gray-200"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                strokeDasharray={`${(healthData.overallScore / 100) * 351.68} 351.68`}
                className={getScoreColor(healthData.overallScore)}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className={`text-3xl font-bold ${getScoreColor(healthData.overallScore)}`}>
                  {healthData.overallScore}
                </p>
                <p className="text-xs text-gray-500">/ 100</p>
              </div>
            </div>
          </div>
          <div className="mt-4 text-center">
            <span
              className={`px-4 py-1 rounded-full text-lg font-bold ${getGradeColor(
                healthData.grade
              )}`}
            >
              Grade {healthData.grade}
            </span>
            <p className="text-sm text-gray-600 mt-2">{healthData.status.toUpperCase()}</p>
          </div>
        </div>

        {/* Strengths & Improvements Summary */}
        {!showDetails && (
          <div className="grid grid-cols-2 gap-3">
            {healthData.strengths.length > 0 && (
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-green-700 mb-1">💪 Strengths</p>
                <p className="text-xs text-green-600">{healthData.strengths.length} categories strong</p>
              </div>
            )}
            {healthData.improvements.length > 0 && (
              <div className="bg-yellow-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-yellow-700 mb-1">🎯 Focus Areas</p>
                <p className="text-xs text-yellow-600">
                  {healthData.improvements.length} areas to improve
                </p>
              </div>
            )}
          </div>
        )}

        {/* Earned Achievements */}
        {earnedAchievements.length > 0 && (
          <div className="space-y-2">
            <p className="font-medium text-sm text-gray-700 flex items-center gap-2">
              <Award className="h-4 w-4" />
              Achievements Unlocked ({earnedAchievements.length})
            </p>
            <div className="grid grid-cols-2 gap-2">
              {earnedAchievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className="flex items-center gap-2 p-2 bg-gradient-to-r from-yellow-50 to-orange-50 rounded border border-yellow-200"
                >
                  <span className="text-2xl">{achievement.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{achievement.title}</p>
                    <p className="text-xs text-gray-500 truncate">{achievement.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detailed View */}
        {showDetails && (
          <div className="space-y-4 pt-2 border-t">
            {/* Component Scores */}
            <div>
              <h3 className="font-medium text-sm text-gray-700 mb-3">Score Breakdown</h3>
              <div className="space-y-2">
                {componentList.map((component) => (
                  <div key={component.name}>
                    <div
                      className={`p-3 border-l-4 ${getStatusColor(component.status)} rounded cursor-pointer hover:shadow-sm transition-shadow`}
                      onClick={() =>
                        setExpandedComponent(
                          expandedComponent === component.name ? null : component.name
                        )
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1">
                          {getComponentIcon(component.name)}
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-sm">{component.name}</p>
                              <p className={`font-bold text-lg ${getScoreColor(component.score)}`}>
                                {component.score}
                              </p>
                            </div>
                            <div className="mt-1">
                              <Progress value={component.score} className="h-2" />
                            </div>
                            <p className="text-xs text-gray-600 mt-1">{component.message}</p>
                          </div>
                          {expandedComponent === component.name ? (
                            <ChevronUp className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      </div>

                      {expandedComponent === component.name && (
                        <div className="mt-3 pt-3 border-t space-y-3">
                          {/* Breakdown Details */}
                          {component.breakdown && (
                            <div className="bg-white/50 p-3 rounded space-y-2">
                              {/* Emergency Fund breakdown */}
                              {component.breakdown.currentAmount !== undefined && (
                                <>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-600">Current Amount:</span>
                                    <span className="font-medium">
                                      {component.breakdown.currentAmount.toLocaleString('id-ID', {
                                        style: 'currency',
                                        currency: 'IDR',
                                      })}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-600">Target Amount:</span>
                                    <span className="font-medium">
                                      {component.breakdown.targetAmount?.toLocaleString('id-ID', {
                                        style: 'currency',
                                        currency: 'IDR',
                                      })}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-600">Months Covered:</span>
                                    <span className="font-medium">{component.breakdown.monthsCovered} months</span>
                                  </div>
                                </>
                              )}

                              {/* Savings Rate breakdown */}
                              {component.breakdown.income !== undefined && (
                                <>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-600">Income (3 months):</span>
                                    <span className="font-medium text-green-600">
                                      +{component.breakdown.income.toLocaleString('id-ID', {
                                        style: 'currency',
                                        currency: 'IDR',
                                      })}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-600">Expenses (3 months):</span>
                                    <span className="font-medium text-red-600">
                                      -{component.breakdown.expenses?.toLocaleString('id-ID', {
                                        style: 'currency',
                                        currency: 'IDR',
                                      })}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-xs pt-1 border-t">
                                    <span className="text-gray-700 font-medium">Savings:</span>
                                    <span className={`font-bold ${(component.breakdown.savingsAmount || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {component.breakdown.savingsAmount?.toLocaleString('id-ID', {
                                        style: 'currency',
                                        currency: 'IDR',
                                      })}
                                    </span>
                                  </div>
                                </>
                              )}

                              {/* Budget Adherence breakdown */}
                              {component.breakdown.totalBudgets !== undefined && (
                                <>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-600">Active Budgets:</span>
                                    <span className="font-medium">{component.breakdown.totalBudgets}</span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-600">Budgets On Track:</span>
                                    <span className="font-medium text-green-600">{component.breakdown.budgetsOnTrack}</span>
                                  </div>
                                </>
                              )}

                              {/* Spending Consistency breakdown */}
                              {component.breakdown.avgMonthlySpending !== undefined && (
                                <>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-600">Avg Monthly Spending:</span>
                                    <span className="font-medium">
                                      {component.breakdown.avgMonthlySpending.toLocaleString('id-ID', {
                                        style: 'currency',
                                        currency: 'IDR',
                                      })}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-600">Variance:</span>
                                    <span className="font-medium">{component.breakdown.variance}%</span>
                                  </div>
                                </>
                              )}
                            </div>
                          )}

                          <p className="text-xs text-gray-600">
                            <span className="font-medium">Details:</span> {component.details}
                          </p>
                          <p className="text-xs text-gray-500">
                            <span className="font-medium">Weight:</span> {component.weight}% of overall score
                          </p>
                          {component.recommendation && (
                            <div className="mt-2 p-2 bg-blue-50 rounded">
                              <p className="text-xs text-blue-700">
                                <span className="font-medium">💡 Recommendation:</span>{' '}
                                {component.recommendation}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Strengths */}
            {healthData.strengths.length > 0 && (
              <div>
                <h3 className="font-medium text-sm text-gray-700 mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  Your Strengths
                </h3>
                <div className="space-y-1">
                  {healthData.strengths.map((strength, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <span className="text-green-600">✓</span>
                      <span className="text-gray-700">{strength}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Improvements */}
            {healthData.improvements.length > 0 && (
              <div>
                <h3 className="font-medium text-sm text-gray-700 mb-2 flex items-center gap-2">
                  <Target className="h-4 w-4 text-yellow-600" />
                  Areas to Improve
                </h3>
                <div className="space-y-2">
                  {healthData.improvements.map((improvement, idx) => (
                    <div key={idx} className="p-2 bg-yellow-50 rounded text-xs text-gray-700">
                      {improvement}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Unearned Achievements */}
            {unearnedAchievements.length > 0 && (
              <div>
                <h3 className="font-medium text-sm text-gray-700 mb-2 flex items-center gap-2">
                  <Award className="h-4 w-4 text-gray-400" />
                  Achievements to Unlock ({unearnedAchievements.length})
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {unearnedAchievements.map((achievement) => (
                    <div
                      key={achievement.id}
                      className="p-2 bg-gray-50 rounded border border-gray-200 opacity-60"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl grayscale">{achievement.icon}</span>
                        <p className="text-xs font-medium">{achievement.title}</p>
                      </div>
                      <p className="text-xs text-gray-500">{achievement.description}</p>
                      {achievement.progress !== undefined && (
                        <div className="mt-2">
                          <Progress value={achievement.progress} className="h-1" />
                          <p className="text-xs text-gray-400 mt-1">
                            {achievement.progress}% complete
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
