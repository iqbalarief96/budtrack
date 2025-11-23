'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import {
  Calendar,
  AlertTriangle,
  TrendingUp,
  Copy,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Info,
  X,
  CheckCircle,
} from 'lucide-react';

interface DetectedSubscription {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  nextPaymentDate: Date;
  category: string;
  confidence: number;
  walletName: string;
  isActive: boolean;
  totalPaidLastYear: number;
  averageMonthlyAmount: number;
}

interface DuplicateSubscription {
  category: string;
  subscriptions: DetectedSubscription[];
  potentialSavings: number;
  recommendation: string;
}

interface PriceChange {
  subscriptionName: string;
  oldAmount: number;
  newAmount: number;
  changePercentage: number;
}

interface SubscriptionInsight {
  type: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  potentialSavings?: number;
}

interface SubscriptionAnalysis {
  totalSubscriptions: number;
  totalMonthlySpend: number;
  totalYearlySpend: number;
  subscriptions: DetectedSubscription[];
  byCategory: Record<string, {
    count: number;
    totalMonthly: number;
    subscriptions: DetectedSubscription[];
  }>;
  duplicates: DuplicateSubscription[];
  priceChanges: PriceChange[];
  insights: SubscriptionInsight[];
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    potentialSavings: number;
  }>;
}

export default function SubscriptionIntelligenceCard() {
  const [analysis, setAnalysis] = useState<SubscriptionAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'calendar' | 'insights'>('overview');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch('/api/subscriptions/analyze');

        if (!response.ok) {
          throw new Error('Failed to fetch subscription analysis');
        }

        const data = await response.json();
        setAnalysis(data);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching subscription analysis:', error);
        setError('Gagal memuat analisis subscription');
        setIsLoading(false);
      }
    };

    fetchAnalysis();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Subscription Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <p>Analyzing subscriptions...</p>
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
            Subscription Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-red-500">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!analysis || analysis.totalSubscriptions === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Subscription Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Calendar className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-gray-500">No subscriptions detected</p>
          <p className="text-sm text-gray-400 mt-1">Add recurring transactions to see insights</p>
        </CardContent>
      </Card>
    );
  }

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      streaming: '🎬',
      software: '💻',
      utilities: '⚡',
      fitness: '💪',
      'cloud-storage': '☁️',
      'news-media': '📰',
      gaming: '🎮',
      music: '🎵',
      education: '📚',
      other: '📦',
    };
    return icons[category] || '📦';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'border-l-red-500 bg-red-50';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50';
      case 'low':
        return 'border-l-blue-500 bg-blue-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  // Prepare calendar data (next 3 months)
  const getCalendarData = () => {
    const months: Record<string, DetectedSubscription[]> = {};
    const now = new Date();

    for (let i = 0; i < 3; i++) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthKey = monthDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      months[monthKey] = [];
    }

    analysis.subscriptions.forEach((sub) => {
      const nextDate = new Date(sub.nextPaymentDate);
      const monthKey = nextDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      if (months[monthKey]) {
        months[monthKey].push(sub);
      }
    });

    return months;
  };

  const calendarData = getCalendarData();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Subscription Intelligence
          </span>
          <div className="flex gap-1 text-xs">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1 rounded ${
                activeTab === 'overview' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`px-3 py-1 rounded ${
                activeTab === 'calendar' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'
              }`}
            >
              Calendar
            </button>
            <button
              onClick={() => setActiveTab('insights')}
              className={`px-3 py-1 rounded ${
                activeTab === 'insights' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'
              }`}
            >
              Insights
            </button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">Total Subscriptions</p>
            <p className="text-2xl font-bold text-blue-600">{analysis.totalSubscriptions}</p>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-red-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">Monthly Spend</p>
            <p className="text-2xl font-bold text-orange-600">
              {formatCurrency(analysis.totalMonthlySpend, 'IDR')}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {formatCurrency(analysis.totalYearlySpend, 'IDR')}/year
            </p>
          </div>
        </div>

        {/* Alerts */}
        {(analysis.duplicates.length > 0 || analysis.insights.filter(i => i.severity === 'high').length > 0) && (
          <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-sm text-yellow-800">
                {analysis.duplicates.length} duplicate{analysis.duplicates.length > 1 ? 's' : ''} detected!
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                Potential savings: {formatCurrency(
                  analysis.duplicates.reduce((sum, d) => sum + d.potentialSavings * 12, 0),
                  'IDR'
                )}/year
              </p>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-3">
            <h3 className="font-medium text-sm text-gray-700">By Category</h3>
            {Object.entries(analysis.byCategory)
              .sort(([, a], [, b]) => b.totalMonthly - a.totalMonthly)
              .map(([category, data]) => (
                <div key={category}>
                  <div
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                    onClick={() =>
                      setExpandedCategory(expandedCategory === category ? null : category)
                    }
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-2xl">{getCategoryIcon(category)}</span>
                      <div>
                        <p className="font-medium text-sm capitalize">{category.replace('-', ' ')}</p>
                        <p className="text-xs text-gray-500">{data.count} subscription{data.count > 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">
                        {formatCurrency(data.totalMonthly, 'IDR')}
                      </p>
                      <p className="text-xs text-gray-500">/month</p>
                    </div>
                    {expandedCategory === category ? (
                      <ChevronUp className="h-4 w-4 ml-2 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 ml-2 text-gray-400" />
                    )}
                  </div>

                  {expandedCategory === category && (
                    <div className="mt-2 ml-4 space-y-2">
                      {data.subscriptions.map((sub) => (
                        <div key={sub.id} className="flex items-center justify-between p-2 bg-white rounded border border-gray-200 text-sm">
                          <div>
                            <p className="font-medium">{sub.name}</p>
                            <p className="text-xs text-gray-500">
                              {sub.frequency} • {sub.walletName}
                            </p>
                          </div>
                          <p className="font-medium">
                            {formatCurrency(sub.averageMonthlyAmount, 'IDR')}/mo
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="space-y-3">
            <h3 className="font-medium text-sm text-gray-700">Upcoming Payments</h3>
            {Object.entries(calendarData).map(([month, subs]) => (
              <div key={month}>
                <p className="font-medium text-sm text-gray-600 mb-2">{month}</p>
                {subs.length === 0 ? (
                  <p className="text-sm text-gray-400 ml-4">No payments this month</p>
                ) : (
                  <div className="space-y-2">
                    {subs.map((sub) => {
                      const date = new Date(sub.nextPaymentDate);
                      return (
                        <div key={sub.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                          <div className="text-center bg-white rounded px-2 py-1 border border-gray-200">
                            <p className="text-xs text-gray-500">{date.toLocaleString('en-US', { month: 'short' })}</p>
                            <p className="text-lg font-bold">{date.getDate()}</p>
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{sub.name}</p>
                            <p className="text-xs text-gray-500">{getCategoryIcon(sub.category)} {sub.category}</p>
                          </div>
                          <p className="font-medium text-sm">
                            {formatCurrency(sub.amount, 'IDR')}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="space-y-3">
            {/* Duplicates */}
            {analysis.duplicates.length > 0 && (
              <div>
                <h3 className="font-medium text-sm text-gray-700 mb-2 flex items-center gap-2">
                  <Copy className="h-4 w-4" />
                  Duplicate Subscriptions
                </h3>
                {analysis.duplicates.map((dup, idx) => (
                  <div key={idx} className="p-3 border-l-4 border-l-yellow-500 bg-yellow-50 rounded mb-2">
                    <p className="font-medium text-sm">{dup.category.replace('-', ' ').toUpperCase()}</p>
                    <p className="text-xs text-gray-600 mt-1">{dup.recommendation}</p>
                    <p className="text-xs text-yellow-700 mt-2 font-medium">
                      Save {formatCurrency(dup.potentialSavings * 12, 'IDR')}/year
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Price Changes */}
            {analysis.priceChanges.length > 0 && (
              <div>
                <h3 className="font-medium text-sm text-gray-700 mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Recent Price Changes
                </h3>
                {analysis.priceChanges.map((change, idx) => (
                  <div key={idx} className="p-2 bg-orange-50 rounded text-sm">
                    <p className="font-medium">{change.subscriptionName}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {formatCurrency(change.oldAmount, 'IDR')} → {formatCurrency(change.newAmount, 'IDR')}
                      <span className="text-orange-600 font-medium ml-1">
                        (+{change.changePercentage.toFixed(0)}%)
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* All Insights */}
            {analysis.insights.length > 0 && (
              <div>
                <h3 className="font-medium text-sm text-gray-700 mb-2 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Smart Insights
                </h3>
                {analysis.insights.slice(0, 5).map((insight, idx) => (
                  <div key={idx} className={`p-3 border-l-4 ${getSeverityColor(insight.severity)} rounded mb-2`}>
                    <p className="font-medium text-sm">{insight.title}</p>
                    <p className="text-xs text-gray-600 mt-1">{insight.description}</p>
                    {insight.potentialSavings && (
                      <p className="text-xs font-medium mt-2 text-green-600">
                        Potential savings: {formatCurrency(insight.potentialSavings, 'IDR')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {analysis.recommendations.length > 0 && (
              <div>
                <h3 className="font-medium text-sm text-gray-700 mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Recommendations
                </h3>
                {analysis.recommendations.slice(0, 3).map((rec, idx) => (
                  <div key={idx} className={`p-3 border-l-4 ${
                    rec.priority === 'high' ? 'border-l-red-500 bg-red-50' :
                    rec.priority === 'medium' ? 'border-l-yellow-500 bg-yellow-50' :
                    'border-l-blue-500 bg-blue-50'
                  } rounded mb-2`}>
                    <p className="font-medium text-sm">{rec.title}</p>
                    <p className="text-xs text-gray-600 mt-1">{rec.description}</p>
                    <p className="text-xs font-medium mt-2 text-green-600">
                      Save up to {formatCurrency(rec.potentialSavings, 'IDR')}/year
                    </p>
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
