'use client';

import React, { useEffect, useState } from 'react';
import { useWallet } from '@/app/providers/WalletProvider';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

// Define budget type
type Budget = {
  id: string;
  category: {
    id: string;
    name: string;
    color?: string;
  };
  amount: number;
  spent: number;
  startDate: Date;
  endDate: Date;
  percentage: number;
};

export default function BudgetOverview() {
  const { selectedWallet } = useWallet();
  const [isLoading, setIsLoading] = useState(true);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [totalBudget, setTotalBudget] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [period, setPeriod] = useState('');

  // Fetch budgets
  useEffect(() => {
    const fetchBudgets = async () => {
      setIsLoading(true);
      try {
        // Fetch real data from API
        const response = await fetch('/api/budgets/with-spending');
        
        if (!response.ok) {
          throw new Error('Failed to fetch budgets');
        }
        
        const data = await response.json();
        
        // Filter budgets for selected wallet if needed
        const filteredBudgets = selectedWallet 
          ? data.filter((budget: any) => budget.walletId === selectedWallet.id)
          : data;
        
        // Calculate totals
        const total = filteredBudgets.reduce((sum: number, budget: any) => sum + budget.amount, 0);
        const spent = filteredBudgets.reduce((sum: number, budget: any) => sum + budget.spent, 0);
        
        // Get period from first budget if available
        let periodText = '';
        if (filteredBudgets.length > 0) {
          const firstBudget = filteredBudgets[0];
          const startDate = new Date(firstBudget.startDate);
          const endDate = new Date(firstBudget.endDate);
          periodText = `${startDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`;
        }
        
        setBudgets(filteredBudgets);
        setTotalBudget(total);
        setTotalSpent(spent);
        setPeriod(periodText);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching budgets:', error);
        toast.error('Gagal memuat data budget');
        setIsLoading(false);
      }
    };

    fetchBudgets();
  }, [selectedWallet]);

  const getPercentage = (spent: number, total: number) => {
    if (total <= 0) return 0;
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
          <h3 className="text-base font-medium">{period || "Periode Aktif"}</h3>
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
          const percentage = budget.percentage || getPercentage(budget.spent, budget.amount);
          const color = budget.category?.color || '#4ade80';
          return (
            <div key={budget.id} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{budget.category?.name}</span>
                <span>
                  {formatCurrency(budget.spent)} / {formatCurrency(budget.amount)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="h-2.5 rounded-full"
                  style={{ 
                    width: `${percentage}%`, 
                    backgroundColor: color
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