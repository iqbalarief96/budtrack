'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Calendar,
} from 'lucide-react';
import { useWallet } from '@/app/providers/WalletProvider';

interface MonthlyForecast {
  month: string;
  monthName: string;
  startingBalance: number;
  projectedIncome: number;
  projectedExpense: number;
  endingBalance: number;
  netChange: number;
  status: 'healthy' | 'warning' | 'critical';
  incomeBreakdown: Array<{
    source: string;
    amount: number;
    type: 'recurring' | 'average';
  }>;
  expenseBreakdown: Array<{
    name: string;
    amount: number;
    type: 'recurring' | 'average';
  }>;
}

interface Insight {
  type: 'warning' | 'info' | 'success';
  message: string;
  month?: string;
  amount?: number;
}

interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  estimatedImpact?: number;
}

interface ForecastData {
  walletId: string;
  walletName: string;
  currentBalance: number;
  forecastMonths: MonthlyForecast[];
  insights: Insight[];
  recommendations: Recommendation[];
  currencyCode: string;
}

export default function CashFlowForecastCard() {
  const { selectedWallet } = useWallet();
  const [forecastData, setForecastData] = useState<ForecastData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [monthsToShow, setMonthsToShow] = useState(6);

  useEffect(() => {
    const fetchForecast = async () => {
      try {
        setIsLoading(true);
        setError(null);

        let response;
        if (selectedWallet) {
          response = await fetch(
            `/api/wallets/${selectedWallet.id}/forecast?months=${monthsToShow}`
          );
        } else {
          response = await fetch(`/api/forecast/cashflow?months=${monthsToShow}`);
        }

        if (!response.ok) {
          throw new Error('Failed to fetch cash flow forecast');
        }

        const data = await response.json();
        setForecastData(data);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching forecast:', error);
        setError('Gagal memuat forecast cash flow');
        setIsLoading(false);
      }
    };

    fetchForecast();
  }, [selectedWallet, monthsToShow]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Cash Flow Forecast
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <p>Loading forecast...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Cash Flow Forecast
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-red-500">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!forecastData) {
    return null;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'border-l-green-500 bg-green-50';
      case 'warning':
        return 'border-l-yellow-500 bg-yellow-50';
      case 'critical':
        return 'border-l-red-500 bg-red-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-600" />;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Cash Flow Forecast
          </span>
          <select
            value={monthsToShow}
            onChange={(e) => setMonthsToShow(Number(e.target.value))}
            className="text-sm border rounded px-2 py-1"
          >
            <option value={3}>3 Months</option>
            <option value={6}>6 Months</option>
            <option value={12}>12 Months</option>
          </select>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Balance */}
        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
          <div>
            <p className="text-sm text-gray-600">Current Balance</p>
            <p className="text-xl font-bold text-blue-600">
              {formatCurrency(forecastData.currentBalance, forecastData.currencyCode)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Projected ({monthsToShow}mo)</p>
            <p className="text-xl font-bold">
              {formatCurrency(
                forecastData.forecastMonths?.length > 0
                  ? forecastData.forecastMonths[forecastData.forecastMonths.length - 1]?.endingBalance || 0
                  : 0,
                forecastData.currencyCode
              )}
            </p>
          </div>
        </div>

        {/* Insights */}
        {forecastData.insights.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-medium text-sm text-gray-700">Key Insights</h3>
            {forecastData.insights.slice(0, 3).map((insight, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 p-2 rounded bg-gray-50 text-sm"
              >
                {getInsightIcon(insight.type)}
                <p className="flex-1">{insight.message}</p>
              </div>
            ))}
          </div>
        )}

        {/* Monthly Forecast Timeline */}
        <div className="space-y-2">
          <h3 className="font-medium text-sm text-gray-700">Monthly Projection</h3>
          <div className="space-y-2">
            {(forecastData.forecastMonths || []).map((month) => (
              <div key={month.month}>
                <div
                  className={`border-l-4 ${getStatusColor(month.status)} p-3 rounded cursor-pointer hover:shadow-sm transition-shadow`}
                  onClick={() =>
                    setExpandedMonth(expandedMonth === month.month ? null : month.month)
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      {getStatusIcon(month.status)}
                      <div>
                        <p className="font-medium text-sm">{month.monthName}</p>
                        <p className="text-xs text-gray-600">
                          {month.netChange >= 0 ? (
                            <span className="text-green-600 flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              +{formatCurrency(month.netChange, forecastData.currencyCode)}
                            </span>
                          ) : (
                            <span className="text-red-600 flex items-center gap-1">
                              <TrendingDown className="h-3 w-3" />
                              {formatCurrency(month.netChange, forecastData.currencyCode)}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">
                        {formatCurrency(month.endingBalance, forecastData.currencyCode)}
                      </p>
                      <p className="text-xs text-gray-500">ending balance</p>
                    </div>
                    {expandedMonth === month.month ? (
                      <ChevronUp className="h-4 w-4 ml-2 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 ml-2 text-gray-400" />
                    )}
                  </div>

                  {/* Expanded Details */}
                  {expandedMonth === month.month && (
                    <div className="mt-3 pt-3 border-t space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="text-gray-500 mb-1">Income</p>
                          <p className="font-medium text-green-600">
                            {formatCurrency(month.projectedIncome, forecastData.currencyCode)}
                          </p>
                          <div className="mt-1 space-y-0.5">
                            {month.incomeBreakdown
                              .filter((i) => i.amount > 0)
                              .map((income, idx) => (
                                <p key={idx} className="text-gray-600">
                                  • {income.source}: {formatCurrency(income.amount, forecastData.currencyCode)}
                                </p>
                              ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-gray-500 mb-1">Expenses</p>
                          <p className="font-medium text-red-600">
                            {formatCurrency(month.projectedExpense, forecastData.currencyCode)}
                          </p>
                          <div className="mt-1 space-y-0.5">
                            {month.expenseBreakdown
                              .filter((e) => e.amount > 0)
                              .map((expense, idx) => (
                                <p key={idx} className="text-gray-600">
                                  • {expense.name}: {formatCurrency(expense.amount, forecastData.currencyCode)}
                                </p>
                              ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        {forecastData.recommendations.length > 0 && (
          <div className="space-y-2">
            <button
              onClick={() => setShowRecommendations(!showRecommendations)}
              className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              {showRecommendations ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              Recommendations ({forecastData.recommendations.length})
            </button>

            {showRecommendations && (
              <div className="space-y-2">
                {forecastData.recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded border-l-4 ${
                      rec.priority === 'high'
                        ? 'border-l-red-500 bg-red-50'
                        : rec.priority === 'medium'
                        ? 'border-l-yellow-500 bg-yellow-50'
                        : 'border-l-blue-500 bg-blue-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{rec.title}</p>
                        <p className="text-xs text-gray-600 mt-1">{rec.description}</p>
                      </div>
                      {rec.estimatedImpact && (
                        <div className="text-right ml-2">
                          <p className="text-xs text-gray-500">Impact</p>
                          <p className="text-sm font-medium">
                            {formatCurrency(rec.estimatedImpact, forecastData.currencyCode)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
