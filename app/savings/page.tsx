'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { PiggyBank, ChevronDown, ChevronRight, TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface Transaction {
  id: string;
  amount: number;
  description: string | null;
  date: string;
  categoryName: string;
  categoryColor?: string;
  walletName: string;
}

interface SavingsCategory {
  type: string;
  label: string;
  icon: string;
  total: number;
  transactions: Transaction[];
  percentage: number;
}

interface SavingsSummary {
  totalSavings: number;
  transactionCount: number;
  breakdown: SavingsCategory[];
}

export default function SavingsPage() {
  const [savings, setSavings] = useState<SavingsSummary | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'this_month' | 'last_3_months' | 'all_time'>('all_time');

  useEffect(() => {
    fetchSavings();
  }, [timeRange]);

  const fetchSavings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/savings?timeRange=${timeRange}`);

      if (!response.ok) {
        throw new Error('Failed to fetch savings');
      }

      const data = await response.json();
      setSavings(data);
    } catch (error) {
      console.error('Error fetching savings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCategory = (type: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(type)) {
      newExpanded.delete(type);
    } else {
      newExpanded.add(type);
    }
    setExpandedCategories(newExpanded);
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-8">
        <div className="flex items-center justify-center py-12">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <PiggyBank className="h-8 w-8" />
          Savings Tracker
        </h1>
      </div>

      {/* Time Range Filter */}
      <div className="flex gap-2">
        <Button
          variant={timeRange === 'this_month' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTimeRange('this_month')}
        >
          Bulan Ini
        </Button>
        <Button
          variant={timeRange === 'last_3_months' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTimeRange('last_3_months')}
        >
          3 Bulan Terakhir
        </Button>
        <Button
          variant={timeRange === 'all_time' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTimeRange('all_time')}
        >
          Semua Waktu
        </Button>
      </div>

      {/* Total Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Total Tabungan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-4xl font-bold text-green-600">
              {formatCurrency(savings?.totalSavings || 0)}
            </p>
            <p className="text-sm text-gray-500">
              {savings?.transactionCount || 0} transaksi tabungan
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Categories Breakdown */}
      {savings && savings.breakdown.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Breakdown per Kategori
          </h2>

          {savings.breakdown.map((category) => {
            const isExpanded = expandedCategories.has(category.type);

            return (
              <Card key={category.type}>
                <CardHeader
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleCategory(category.type)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                      <span className="text-2xl">{category.icon}</span>
                      <div>
                        <h3 className="font-semibold">{category.label}</h3>
                        <p className="text-sm text-gray-500">
                          {category.transactions.length} transaksi
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(category.total)}
                      </p>
                      <p className="text-sm text-gray-500">{category.percentage}%</p>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0">
                    <div className="border-t pt-4 space-y-2">
                      {category.transactions.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-4">
                          Tidak ada transaksi
                        </p>
                      ) : (
                        category.transactions.map((transaction) => (
                          <div
                            key={transaction.id}
                            className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50"
                          >
                            <div className="flex-1">
                              <p className="font-medium">
                                {transaction.description || 'Tabungan'}
                              </p>
                              <p className="text-sm text-gray-500">
                                {new Date(transaction.date).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                                {' • '}
                                {transaction.walletName}
                              </p>
                            </div>
                            <p className="font-semibold text-green-600">
                              {formatCurrency(transaction.amount)}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <PiggyBank className="h-16 w-16 text-gray-300 mb-4" />
            <p className="text-gray-500 text-center mb-4">
              Belum ada transaksi tabungan
            </p>
            <Link href="/transactions">
              <Button>Buat Transaksi Tabungan</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
