'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, TrendingUp, CheckCircle, Calendar } from 'lucide-react';

interface BudgetForecast {
  budgetId: string;
  budgetName: string;
  currentSpent: number;
  budgetAmount: number;
  daysRemaining: number;
  projectedSpending: number;
  projectedOverage: number;
  recommendedDailySpending: number;
  willExceed: boolean;
  exceedDate?: string;
  status: 'on_track' | 'warning' | 'danger';
}

export default function BudgetForecastWidget() {
  const [forecasts, setForecasts] = useState<BudgetForecast[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchForecasts();
  }, []);

  const fetchForecasts = async () => {
    try {
      const response = await fetch('/api/budgets/forecast');
      if (response.ok) {
        const data = await response.json();
        setForecasts(data);
      }
    } catch (error) {
      console.error('Error fetching budget forecasts:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'on_track':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'danger':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_track':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'danger':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (forecasts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>No active budgets to forecast</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {forecasts.map((forecast) => (
        <div
          key={forecast.budgetId}
          className={`border rounded-lg p-4 ${getStatusColor(forecast.status)}`}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {getStatusIcon(forecast.status)}
              <h3 className="font-semibold">{forecast.budgetName}</h3>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium">
                {formatCurrency(forecast.currentSpent)} / {formatCurrency(forecast.budgetAmount)}
              </div>
              <div className="text-xs opacity-75">
                {((forecast.currentSpent / forecast.budgetAmount) * 100).toFixed(0)}% used
              </div>
            </div>
          </div>

          {forecast.willExceed && (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">
                  Projected overage: {formatCurrency(forecast.projectedOverage)}
                </span>
              </div>
              
              {forecast.exceedDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>
                    Will exceed on: {new Date(forecast.exceedDate).toLocaleDateString('id-ID')}
                  </span>
                </div>
              )}

              <div className="mt-3 p-2 bg-white/50 rounded">
                <p className="text-xs font-medium mb-1">💡 Recommendation:</p>
                <p className="text-xs">
                  Limit spending to {formatCurrency(forecast.recommendedDailySpending)}/day 
                  for the next {forecast.daysRemaining} days
                </p>
              </div>
            </div>
          )}

          {!forecast.willExceed && forecast.status === 'on_track' && (
            <div className="text-sm">
              <p className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>On track! {forecast.daysRemaining} days remaining</span>
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
