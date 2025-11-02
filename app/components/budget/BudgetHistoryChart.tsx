'use client';

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, TrendingDown, TrendingUp, DollarSign } from 'lucide-react';

interface BudgetHistory {
  id: string;
  budgetId: string;
  amount: number;
  spent: number;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
}

interface BudgetHistoryChartProps {
  budgetId: string;
}

export default function BudgetHistoryChart({ budgetId }: BudgetHistoryChartProps) {
  const [history, setHistory] = useState<BudgetHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/budgets/${budgetId}/history`);

        if (!response.ok) {
          throw new Error('Failed to fetch budget history');
        }

        const data = await response.json();
        setHistory(data.history || []);
      } catch (err) {
        console.error('Error fetching budget history:', err);
        setError(err instanceof Error ? err.message : 'Failed to load history');
      } finally {
        setIsLoading(false);
      }
    };

    if (budgetId) {
      fetchHistory();
    }
  }, [budgetId]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget History</CardTitle>
          <CardDescription>Loading historical data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget History</CardTitle>
          <CardDescription>Failed to load historical data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget History</CardTitle>
          <CardDescription>No historical data available yet</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
            <Calendar className="h-12 w-12 mb-2 opacity-50" />
            <p>Budget history will appear here after the first period ends</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format data for charts
  const chartData = history.map((h) => ({
    period: new Date(h.periodStart).toLocaleDateString('id-ID', {
      month: 'short',
      year: 'numeric',
    }),
    budget: h.amount,
    spent: h.spent,
    remaining: h.amount - h.spent,
    percentage: Math.round((h.spent / h.amount) * 100),
  })).reverse(); // Show oldest to newest

  // Calculate statistics
  const avgSpent = history.reduce((sum, h) => sum + h.spent, 0) / history.length;
  const avgPercentage = history.reduce((sum, h) => sum + (h.spent / h.amount) * 100, 0) / history.length;
  const lastPeriod = history[0];
  const previousPeriod = history[1];
  const trend = previousPeriod
    ? ((lastPeriod.spent - previousPeriod.spent) / previousPeriod.spent) * 100
    : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget History</CardTitle>
        <CardDescription>
          Performance over the last {history.length} period{history.length > 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm font-medium">Avg. Spending</span>
            </div>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {formatCurrency(avgSpent)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {avgPercentage.toFixed(1)}% of budget
            </p>
          </div>

          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
              <Calendar className="h-4 w-4" />
              <span className="text-sm font-medium">Last Period</span>
            </div>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">
              {formatCurrency(lastPeriod.spent)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {((lastPeriod.spent / lastPeriod.amount) * 100).toFixed(1)}% used
            </p>
          </div>

          <div className={`p-4 rounded-lg ${
            trend > 0
              ? 'bg-red-50 dark:bg-red-950/20'
              : 'bg-green-50 dark:bg-green-950/20'
          }`}>
            <div className={`flex items-center gap-2 mb-1 ${
              trend > 0
                ? 'text-red-600 dark:text-red-400'
                : 'text-green-600 dark:text-green-400'
            }`}>
              {trend > 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">Trend</span>
            </div>
            <p className={`text-2xl font-bold ${
              trend > 0
                ? 'text-red-700 dark:text-red-300'
                : 'text-green-700 dark:text-green-300'
            }`}>
              {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              vs. previous period
            </p>
          </div>
        </div>

        {/* Charts */}
        <Tabs defaultValue="spending" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="spending">Spending</TabsTrigger>
            <TabsTrigger value="comparison">Comparison</TabsTrigger>
            <TabsTrigger value="percentage">Percentage</TabsTrigger>
          </TabsList>

          <TabsContent value="spending" className="mt-4">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="period"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                  style={{ fontSize: '12px' }}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '8px' }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="spent"
                  stackId="1"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.6}
                  name="Spent"
                />
                <Area
                  type="monotone"
                  dataKey="remaining"
                  stackId="1"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.3}
                  name="Remaining"
                />
              </AreaChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="comparison" className="mt-4">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="period"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                  style={{ fontSize: '12px' }}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '8px' }}
                />
                <Legend />
                <Bar dataKey="budget" fill="#94a3b8" name="Budget" />
                <Bar dataKey="spent" fill="#3b82f6" name="Spent" />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="percentage" className="mt-4">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="period"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  domain={[0, 120]}
                  tickFormatter={(value) => `${value}%`}
                  style={{ fontSize: '12px' }}
                />
                <Tooltip
                  formatter={(value: number) => `${value}%`}
                  contentStyle={{ borderRadius: '8px' }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="percentage"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  name="Budget Used (%)"
                />
                <Line
                  type="monotone"
                  dataKey={() => 100}
                  stroke="#ef4444"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                  name="100% Threshold"
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
