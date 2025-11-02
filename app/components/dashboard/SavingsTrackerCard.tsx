'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { PiggyBank, TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface SavingsCategory {
  type: string;
  label: string;
  icon: string;
  total: number;
  percentage: number;
}

interface SavingsSummary {
  totalSavings: number;
  transactionCount: number;
  breakdown: SavingsCategory[];
}

export default function SavingsTrackerCard() {
  const [savings, setSavings] = useState<SavingsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSavings = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/savings');

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

    fetchSavings();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PiggyBank className="h-5 w-5" />
            Tabungan
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <p>Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (!savings || savings.totalSavings === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PiggyBank className="h-5 w-5" />
            Tabungan
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-gray-500">Belum ada transaksi tabungan</p>
        </CardContent>
      </Card>
    );
  }

  const topCategories = savings.breakdown.slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PiggyBank className="h-5 w-5" />
          Tabungan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-gray-500">Total Tabungan</p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(savings.totalSavings)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {savings.transactionCount} transaksi
          </p>
        </div>

        {topCategories.length > 0 && (
          <div className="pt-2 border-t space-y-3">
            <p className="text-xs text-gray-500 font-medium flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Top Kategori:
            </p>
            {topCategories.map((category) => (
              <div key={category.type} className="space-y-1">
                <div className="flex justify-between items-center text-sm">
                  <span className="flex items-center gap-1">
                    <span>{category.icon}</span>
                    <span className="text-gray-700">{category.label}</span>
                  </span>
                  <span className="font-medium">{category.percentage}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${category.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <Link
          href="/savings"
          className="block w-full text-center py-2 text-sm text-primary hover:underline"
        >
          Lihat Detail →
        </Link>
      </CardContent>
    </Card>
  );
}
