'use client';

import React, { useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp } from 'lucide-react';
import type { NetWorthSnapshot, TimePeriod } from '@/app/types/net-worth';

/**
 * NetWorthChart Component
 * Displays line chart showing net worth history with time filter
 * 
 * Requirements: 2.1, 2.2, 2.4, 2.5
 */

interface NetWorthChartProps {
  snapshots: NetWorthSnapshot[];
  currentPeriod: TimePeriod;
  onPeriodChange: (period: TimePeriod) => void;
  isLoading?: boolean;
  className?: string;
}

// Format date for display
const formatDate = (date: Date | string) => {
  const d = new Date(date);
  return d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
};

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const netWorth = data.netWorth;
    const date = new Date(data.date);
    
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border">
        <p className="font-medium text-sm">
          {date.toLocaleDateString('id-ID', { 
            day: 'numeric',
            month: 'long', 
            year: 'numeric' 
          })}
        </p>
        <p className={`text-lg font-bold ${netWorth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {formatCurrency(netWorth)}
        </p>
        <div className="text-xs text-muted-foreground mt-1 space-y-1">
          <p>Aset: {formatCurrency(data.totalAssets)}</p>
          <p>Liabilitas: {formatCurrency(data.totalLiabilities)}</p>
        </div>
      </div>
    );
  }
  return null;
};

// Period button options
const PERIOD_OPTIONS: { value: TimePeriod; label: string }[] = [
  { value: '3M', label: '3 Bulan' },
  { value: '6M', label: '6 Bulan' },
  { value: '1Y', label: '1 Tahun' },
  { value: 'ALL', label: 'Semua' },
];

export const NetWorthChart: React.FC<NetWorthChartProps> = ({
  snapshots,
  currentPeriod,
  onPeriodChange,
  isLoading = false,
  className,
}) => {
  // Transform snapshots for chart
  const chartData = snapshots
    .map((snapshot) => ({
      date: snapshot.date,
      netWorth: snapshot.netWorth,
      totalAssets: snapshot.totalAssets,
      totalLiabilities: snapshot.totalLiabilities,
      formattedDate: formatDate(snapshot.date),
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculate trend (positive or negative overall)
  const hasTrend = chartData.length >= 2;
  const isPositiveTrend = hasTrend 
    ? chartData[chartData.length - 1].netWorth > chartData[0].netWorth
    : true;

  // Get min and max for Y axis
  const netWorthValues = chartData.map(d => d.netWorth);
  const minValue = Math.min(...netWorthValues, 0);
  const maxValue = Math.max(...netWorthValues, 0);
  const padding = (maxValue - minValue) * 0.1 || 1000000;

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Riwayat Net Worth
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="flex gap-2">
              {PERIOD_OPTIONS.map((opt) => (
                <div key={opt.value} className="h-8 w-20 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-lg flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Riwayat Net Worth
            </CardTitle>
            <CardDescription>Perkembangan kekayaan bersih Anda</CardDescription>
          </div>
          
          {/* Period Filter Buttons */}
          <div className="flex gap-2">
            {PERIOD_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={currentPeriod === option.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => onPeriodChange(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Belum ada data riwayat untuk periode ini
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
              <XAxis 
                dataKey="formattedDate" 
                tick={{ fontSize: 12 }}
                tickLine={false}
              />
              <YAxis 
                tickFormatter={(value) => {
                  if (Math.abs(value) >= 1000000000) {
                    return `${(value / 1000000000).toFixed(1)}M`;
                  }
                  if (Math.abs(value) >= 1000000) {
                    return `${(value / 1000000).toFixed(1)}Jt`;
                  }
                  if (Math.abs(value) >= 1000) {
                    return `${(value / 1000).toFixed(0)}K`;
                  }
                  return value.toString();
                }}
                tick={{ fontSize: 12 }}
                tickLine={false}
                domain={[minValue - padding, maxValue + padding]}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Zero reference line */}
              <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="3 3" />
              
              {/* Net Worth Line - color based on trend */}
              <Line
                type="monotone"
                dataKey="netWorth"
                stroke={isPositiveTrend ? '#22c55e' : '#ef4444'}
                strokeWidth={2}
                dot={{ fill: isPositiveTrend ? '#22c55e' : '#ef4444', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default NetWorthChart;
