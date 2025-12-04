'use client';

import React from 'react';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, DollarSign } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { NetWorthCalculation, PercentageChange } from '@/app/types/net-worth';

/**
 * NetWorthCard Component
 * Displays current net worth with change indicator
 * 
 * Requirements: 1.1, 1.5
 */

interface NetWorthCardProps {
  calculation: NetWorthCalculation | null;
  change: PercentageChange | null;
  previousNetWorth: number | null;
  isLoading?: boolean;
  className?: string;
}

export const NetWorthCard: React.FC<NetWorthCardProps> = ({
  calculation,
  change,
  previousNetWorth,
  isLoading = false,
  className,
}) => {
  // Get trend icon and color based on change direction
  const getTrendIndicator = () => {
    if (!change) return null;

    const { direction, value } = change;

    if (direction === 'up') {
      return (
        <div className="flex items-center text-green-600">
          <TrendingUp className="h-4 w-4 mr-1" />
          <span className="text-sm font-medium">+{value.toFixed(1)}%</span>
        </div>
      );
    }

    if (direction === 'down') {
      return (
        <div className="flex items-center text-red-600">
          <TrendingDown className="h-4 w-4 mr-1" />
          <span className="text-sm font-medium">-{value.toFixed(1)}%</span>
        </div>
      );
    }

    return (
      <div className="flex items-center text-gray-500">
        <Minus className="h-4 w-4 mr-1" />
        <span className="text-sm font-medium">0%</span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            Net Worth
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="h-16 bg-gray-200 rounded"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!calculation) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            Net Worth
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">Data tidak tersedia</div>
        </CardContent>
      </Card>
    );
  }

  const { netWorth, totalAssets, totalLiabilities } = calculation;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              Net Worth
            </CardTitle>
            <CardDescription>Kekayaan bersih Anda saat ini</CardDescription>
          </div>
          {getTrendIndicator()}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Main Net Worth Value */}
          <div>
            <div className={`text-3xl font-bold ${netWorth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(netWorth)}
            </div>
            {previousNetWorth !== null && (
              <div className="text-sm text-muted-foreground mt-1">
                Sebelumnya: {formatCurrency(previousNetWorth)}
              </div>
            )}
          </div>

          {/* Assets and Liabilities Summary */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Total Aset</div>
              <div className="text-lg font-semibold text-green-600">
                {formatCurrency(totalAssets)}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Total Liabilitas</div>
              <div className="text-lg font-semibold text-red-600">
                {formatCurrency(totalLiabilities)}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NetWorthCard;
