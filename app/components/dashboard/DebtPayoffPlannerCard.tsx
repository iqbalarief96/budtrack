'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  CreditCard,
  TrendingDown,
  Calendar,
  DollarSign,
  PiggyBank,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Check,
  Target,
  Zap,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Debt {
  id: string;
  name: string;
  type: string;
  currentBalance: number;
  interestRate: number;
  minimumPayment: number;
}

interface PayoffPlan {
  strategy: string;
  totalMonthlyPayment: number;
  totalInterestPaid: number;
  totalPrincipal: number;
  monthsToPayoff: number;
  debtFreeDate: Date;
  summary: {
    firstDebtPayoff: { name: string; month: number };
    lastDebtPayoff: { name: string; month: number };
    averageMonthlyPayment: number;
  };
}

interface Comparison {
  snowball: PayoffPlan;
  avalanche: PayoffPlan;
  recommended: 'SNOWBALL' | 'AVALANCHE';
  savings: {
    interestSaved: number;
    monthsSaved: number;
  };
  insights: string[];
}

interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  estimatedSavings?: number;
}

interface PayoffData {
  hasDebts: boolean;
  debtsCount?: number;
  totalDebt?: number;
  totalMinimumPayment?: number;
  comparison?: Comparison;
  recommendations?: Recommendation[];
  message?: string;
}

export default function DebtPayoffPlannerCard() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [payoffData, setPayoffData] = useState<PayoffData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [extraPayment, setExtraPayment] = useState(0);
  const [showAddDebt, setShowAddDebt] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [expandedDebt, setExpandedDebt] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [debtsRes, payoffRes] = await Promise.all([
        fetch('/api/debts'),
        fetch(`/api/debts/payoff-plan?extraPayment=${extraPayment}`),
      ]);

      if (!debtsRes.ok || !payoffRes.ok) {
        throw new Error('Failed to fetch debt data');
      }

      const debtsData = await debtsRes.json();
      const payoffDataRes = await payoffRes.json();

      setDebts(debtsData);
      setPayoffData(payoffDataRes);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching debt data:', error);
      setError('Gagal memuat data debt');
      setIsLoading(false);
    }
  };

  const recalculatePayoff = async (newExtraPayment: number) => {
    try {
      const response = await fetch(`/api/debts/payoff-plan?extraPayment=${newExtraPayment}`);
      if (!response.ok) throw new Error('Failed to recalculate');

      const data = await response.json();
      setPayoffData(data);
    } catch (error) {
      console.error('Error recalculating payoff:', error);
    }
  };

  const handleExtraPaymentChange = (value: number) => {
    setExtraPayment(value);
    recalculatePayoff(value);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Debt Payoff Planner
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <p>Loading debt analysis...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Debt Payoff Planner
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-red-500">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!payoffData?.hasDebts) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Debt Payoff Planner
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-8">
            <Shield className="h-16 w-16 mx-auto text-green-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Debt Free! 🎉</h3>
            <p className="text-sm text-gray-600 mb-4">
              You have no active debts. Great financial health!
            </p>
            <Button onClick={() => setShowAddDebt(true)} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Track a Debt
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { comparison, recommendations } = payoffData;
  const recommendedPlan = comparison?.recommended === 'SNOWBALL' ? comparison.snowball : comparison?.avalanche;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Debt Payoff Planner
          </span>
          <Button onClick={() => setShowAddDebt(true)} size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-1" />
            Add Debt
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Debt Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-red-50 p-3 rounded-lg">
            <p className="text-xs text-red-600 font-medium mb-1">Total Debt</p>
            <p className="text-xl font-bold text-red-700">
              {(payoffData.totalDebt || 0).toLocaleString('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
              })}
            </p>
            <p className="text-xs text-red-500 mt-1">{payoffData.debtsCount} debts</p>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-xs text-blue-600 font-medium mb-1">Min. Payment</p>
            <p className="text-xl font-bold text-blue-700">
              {(payoffData.totalMinimumPayment || 0).toLocaleString('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
              })}
            </p>
            <p className="text-xs text-blue-500 mt-1">per month</p>
          </div>
        </div>

        {/* Active Debts List */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700">Your Debts</h3>
          {debts.slice(0, 3).map((debt) => (
            <div
              key={debt.id}
              className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-sm">{debt.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-600">
                      {debt.currentBalance.toLocaleString('id-ID', {
                        style: 'currency',
                        currency: 'IDR',
                        minimumFractionDigits: 0,
                      })}
                    </span>
                    <span className="text-xs text-red-600 font-medium">
                      {debt.interestRate}% APR
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {debts.length > 3 && (
            <p className="text-xs text-gray-500 text-center">
              +{debts.length - 3} more debts
            </p>
          )}
        </div>

        {/* Recommended Strategy */}
        {recommendedPlan && comparison && (
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-lg border-2 border-purple-200">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-5 w-5 text-purple-600" />
              <h3 className="font-semibold text-purple-900">
                Recommended: {comparison.recommended} Method
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <p className="text-xs text-purple-600 mb-1">Debt Free In</p>
                <p className="text-2xl font-bold text-purple-900">
                  {recommendedPlan.monthsToPayoff}
                </p>
                <p className="text-xs text-purple-600">months</p>
              </div>
              <div>
                <p className="text-xs text-purple-600 mb-1">Total Interest</p>
                <p className="text-lg font-bold text-purple-900">
                  {recommendedPlan.totalInterestPaid.toLocaleString('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    minimumFractionDigits: 0,
                  })}
                </p>
              </div>
            </div>

            <div className="bg-white/50 p-2 rounded">
              <p className="text-xs text-gray-700">
                <span className="font-medium">Debt Free Date:</span>{' '}
                {new Date(recommendedPlan.debtFreeDate).toLocaleDateString('id-ID', {
                  year: 'numeric',
                  month: 'long',
                })}
              </p>
              <p className="text-xs text-gray-700 mt-1">
                <span className="font-medium">First Payoff:</span>{' '}
                {recommendedPlan.summary.firstDebtPayoff.name} in{' '}
                {recommendedPlan.summary.firstDebtPayoff.month} months
              </p>
            </div>

            <Button
              onClick={() => setShowComparison(!showComparison)}
              variant="outline"
              size="sm"
              className="w-full mt-3"
            >
              {showComparison ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-2" />
                  Hide Comparison
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Compare Strategies
                </>
              )}
            </Button>
          </div>
        )}

        {/* Strategy Comparison */}
        {showComparison && comparison && (
          <div className="space-y-3 pt-2 border-t">
            <div className="grid grid-cols-2 gap-3">
              {/* Snowball */}
              <div
                className={`p-3 rounded-lg border-2 ${
                  comparison.recommended === 'SNOWBALL'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-sm">Snowball</p>
                  {comparison.recommended === 'SNOWBALL' && (
                    <Check className="h-4 w-4 text-green-600" />
                  )}
                </div>
                <p className="text-xs text-gray-600 mb-2">Smallest balance first</p>
                <p className="text-sm font-bold">{comparison.snowball.monthsToPayoff} months</p>
                <p className="text-xs text-gray-500">
                  {comparison.snowball.totalInterestPaid.toLocaleString('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    minimumFractionDigits: 0,
                  })}{' '}
                  interest
                </p>
              </div>

              {/* Avalanche */}
              <div
                className={`p-3 rounded-lg border-2 ${
                  comparison.recommended === 'AVALANCHE'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-sm">Avalanche</p>
                  {comparison.recommended === 'AVALANCHE' && (
                    <Check className="h-4 w-4 text-green-600" />
                  )}
                </div>
                <p className="text-xs text-gray-600 mb-2">Highest interest first</p>
                <p className="text-sm font-bold">{comparison.avalanche.monthsToPayoff} months</p>
                <p className="text-xs text-gray-500">
                  {comparison.avalanche.totalInterestPaid.toLocaleString('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    minimumFractionDigits: 0,
                  })}{' '}
                  interest
                </p>
              </div>
            </div>

            {/* Savings Info */}
            {comparison.savings.interestSaved > 0 && (
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-green-700">
                  💰 Save{' '}
                  {comparison.savings.interestSaved.toLocaleString('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    minimumFractionDigits: 0,
                  })}{' '}
                  with {comparison.recommended}!
                </p>
              </div>
            )}

            {/* Insights */}
            {comparison.insights.length > 0 && (
              <div className="space-y-1">
                {comparison.insights.slice(0, 3).map((insight, idx) => (
                  <p key={idx} className="text-xs text-gray-600">
                    • {insight}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Extra Payment Impact */}
        <div className="space-y-3 pt-2 border-t">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Extra Monthly Payment</Label>
            <span className="text-sm font-bold text-blue-600">
              {extraPayment.toLocaleString('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
              })}
            </span>
          </div>
          <Input
            type="range"
            min="0"
            max={(payoffData.totalMinimumPayment || 0) * 2}
            step="100000"
            value={extraPayment}
            onChange={(e) => handleExtraPaymentChange(Number(e.target.value))}
            className="w-full"
          />
          <p className="text-xs text-gray-500">
            Slide to see how extra payments accelerate your debt payoff
          </p>
        </div>

        {/* Recommendations */}
        {recommendations && recommendations.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Recommendations
            </h3>
            {recommendations.slice(0, 3).map((rec, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border-l-4 ${
                  rec.priority === 'high'
                    ? 'border-l-red-500 bg-red-50'
                    : rec.priority === 'medium'
                      ? 'border-l-yellow-500 bg-yellow-50'
                      : 'border-l-blue-500 bg-blue-50'
                }`}
              >
                <p className="font-medium text-sm">{rec.title}</p>
                <p className="text-xs text-gray-600 mt-1">{rec.description}</p>
                {rec.estimatedSavings && (
                  <p className="text-xs text-green-600 font-medium mt-1">
                    Save{' '}
                    {rec.estimatedSavings.toLocaleString('id-ID', {
                      style: 'currency',
                      currency: 'IDR',
                      minimumFractionDigits: 0,
                    })}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
