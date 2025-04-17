'use client';

import React, { useEffect, useState } from 'react';
import { useWallet } from '@/app/providers/WalletProvider';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';

// Define budget type
type Budget = {
  id: string;
  category: string;
  amount: number;
  spent: number;
  startDate: string;
  endDate: string;
  color: string;
};

export default function BudgetOverview() {
  const { selectedWallet } = useWallet();
  const [isLoading, setIsLoading] = useState(true);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [totalBudget, setTotalBudget] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);

  // Fetch budgets
  useEffect(() => {
    const fetchBudgets = async () => {
      setIsLoading(true);
      try {
        // Placeholder data - in real app, fetch from API
        const dummyData: Budget[] = [
          {
            id: 'b1',
            category: 'Makanan',
            amount: 1500000,
            spent: 950000,
            startDate: '2024-07-01',
            endDate: '2024-07-31',
            color: '#4ade80' // green
          },
          {
            id: 'b2',
            category: 'Transportasi',
            amount: 800000,
            spent: 650000,
            startDate: '2024-07-01',
            endDate: '2024-07-31',
            color: '#60a5fa' // blue
          },
          {
            id: 'b3',
            category: 'Hiburan',
            amount: 500000,
            spent: 475000,
            startDate: '2024-07-01',
            endDate: '2024-07-31',
            color: '#f97316' // orange
          },
          {
            id: 'b4',
            category: 'Tagihan',
            amount: 1200000,
            spent: 1200000,
            startDate: '2024-07-01',
            endDate: '2024-07-31',
            color: '#8b5cf6' // purple
          },
          {
            id: 'b5',
            category: 'Belanja',
            amount: 1000000,
            spent: 850000,
            startDate: '2024-07-01',
            endDate: '2024-07-31',
            color: '#ec4899' // pink
          }
        ];

        // Calculate totals
        const total = dummyData.reduce((sum, budget) => sum + budget.amount, 0);
        const spent = dummyData.reduce((sum, budget) => sum + budget.spent, 0);

        // Simulate API delay
        setTimeout(() => {
          setBudgets(dummyData);
          setTotalBudget(total);
          setTotalSpent(spent);
          setIsLoading(false);
        }, 500);
        
      } catch (error) {
        console.error('Error fetching budgets:', error);
        setIsLoading(false);
      }
    };

    fetchBudgets();
  }, [selectedWallet]);

  const getPercentage = (spent: number, total: number) => {
    return Math.min(Math.round((spent / total) * 100), 100);
  };

  const getStatusColor = (spent: number, total: number) => {
    const percentage = getPercentage(spent, total);
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getTotalStatusColor = () => {
    const percentage = getPercentage(totalSpent, totalBudget);
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[300px]">
        <div className="animate-pulse text-gray-400">Loading budgets...</div>
      </div>
    );
  }

  if (budgets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-gray-500">
        <p className="mb-2">Belum ada budget</p>
        <Link href="/budgets/new" className="text-blue-600 hover:underline">
          Buat Budget Baru
        </Link>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Summary header */}
      <div className="mb-5 pb-3 border-b">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-medium">Periode Juli 2024</h3>
          <span className={`font-medium ${getTotalStatusColor()}`}>
            {formatCurrency(totalSpent)} / {formatCurrency(totalBudget)}
            <span className="text-gray-500 text-sm ml-1">
              ({getPercentage(totalSpent, totalBudget)}%)
            </span>
          </span>
        </div>
      </div>
      
      {/* Budget list */}
      <div className="space-y-4 overflow-y-auto flex-1">
        {budgets.map((budget) => {
          const percentage = getPercentage(budget.spent, budget.amount);
          return (
            <div key={budget.id} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{budget.category}</span>
                <span>
                  {formatCurrency(budget.spent)} / {formatCurrency(budget.amount)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="h-2.5 rounded-full"
                  style={{ 
                    width: `${percentage}%`, 
                    backgroundColor: budget.color 
                  }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>
                  {percentage >= 100 ? 'Melebihi budget!' : `${percentage}% terpakai`}
                </span>
                <span>
                  Sisa: {formatCurrency(Math.max(budget.amount - budget.spent, 0))}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Footer */}
      <div className="mt-4 pt-3 border-t text-center">
        <Link href="/budgets" className="text-blue-600 text-sm hover:underline">
          Kelola Semua Budget
        </Link>
      </div>
    </div>
  );
} 