'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { Clock, TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';
import BudgetHistoryChart from '@/app/components/budget/BudgetHistoryChart';

interface Transaction {
  id: string;
  amount: number;
  description: string | null;
  date: string;
  category: {
    id: string;
    name: string;
    color?: string;
  };
  wallet: {
    id: string;
    name: string;
  };
}

interface BudgetDetailClientProps {
  budgetId: string;
  budgetAmount: number;
  isRecurring: boolean;
  periodType: string;
}

export default function BudgetDetailClient({
  budgetId,
  budgetAmount,
  isRecurring,
  periodType
}: BudgetDetailClientProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState({
    count: 0,
    totalSpent: 0,
    remaining: 0,
    percentage: 0,
  });

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/budgets/${budgetId}/transactions`);

        if (!response.ok) {
          throw new Error('Failed to fetch transactions');
        }

        const data = await response.json();
        setTransactions(data.transactions || []);
        setSummary(data.summary || {
          count: 0,
          totalSpent: 0,
          remaining: budgetAmount,
          percentage: 0,
        });
      } catch (error) {
        console.error('Error fetching budget transactions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (budgetId) {
      fetchTransactions();
    }
  }, [budgetId, budgetAmount]);

  const getStatusColor = (percentage: number) => {
    if (percentage >= 100) return 'text-red-600 bg-red-50 dark:bg-red-950/20';
    if (percentage >= 80) return 'text-orange-600 bg-orange-50 dark:bg-orange-950/20';
    if (percentage >= 60) return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20';
    return 'text-green-600 bg-green-50 dark:bg-green-950/20';
  };

  const getStatusIcon = (percentage: number) => {
    if (percentage >= 100) return <AlertCircle className="h-5 w-5" />;
    if (percentage >= 80) return <TrendingUp className="h-5 w-5" />;
    return <CheckCircle className="h-5 w-5" />;
  };

  return (
    <div className="space-y-6">
      {/* Budget Status Card */}
      <Card className={getStatusColor(summary.percentage)}>
        <CardHeader>
          <div className="flex items-center gap-2">
            {getStatusIcon(summary.percentage)}
            <CardTitle>Budget Status</CardTitle>
          </div>
          <CardDescription className="text-current/80">
            {isRecurring ? `Recurring ${periodType.toLowerCase()} budget` : 'One-time budget'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm font-medium opacity-80">Spent</p>
              <p className="text-2xl font-bold">{formatCurrency(summary.totalSpent)}</p>
            </div>
            <div>
              <p className="text-sm font-medium opacity-80">Remaining</p>
              <p className="text-2xl font-bold">{formatCurrency(summary.remaining)}</p>
            </div>
            <div>
              <p className="text-sm font-medium opacity-80">Transactions</p>
              <p className="text-2xl font-bold">{summary.count}</p>
            </div>
            <div>
              <p className="text-sm font-medium opacity-80">Used</p>
              <p className="text-2xl font-bold">{summary.percentage}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for History and Transactions */}
      <Tabs defaultValue="transactions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="transactions">Transactions ({summary.count})</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Details</CardTitle>
              <CardDescription>
                All transactions contributing to this budget
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No transactions yet</p>
                  <p className="text-sm mt-1">Transactions will appear here as you add them</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: transaction.category.color || '#94a3b8',
                            }}
                          />
                          <span className="font-medium">
                            {transaction.description || 'No description'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{transaction.category.name}</span>
                          <span>•</span>
                          <span>
                            {format(new Date(transaction.date), 'MMM d, yyyy')}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-red-600">
                          -{formatCurrency(Math.abs(transaction.amount))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <BudgetHistoryChart budgetId={budgetId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
