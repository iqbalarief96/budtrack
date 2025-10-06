'use client';

import type { Budget } from '@/app/types/budget';
import type { Category } from '@/app/types/category';
import type { Wallet } from '@/app/types/wallet';
import { formatCurrency } from '@/lib/utils';

type BudgetWithRelations = Budget & {
  category: Category;
  wallet: Wallet;
  spent: number;
  percentage: number;
}

interface Props {
  budget: BudgetWithRelations;
  onUpdate?: (budget: BudgetWithRelations) => void;
}

export default function BudgetProgress({ budget, onUpdate }: Props) {
  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getProgressTextColor = (percentage: number) => {
    if (percentage >= 100) return 'text-red-500';
    if (percentage >= 80) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getGradientColor = (percentage: number) => {
    if (percentage >= 100) return 'from-red-50 to-white';
    if (percentage >= 80) return 'from-yellow-50 to-white';
    return 'from-green-50 to-white';
  };

  return (
    <div className={`rounded-xl shadow-md overflow-hidden bg-gradient-to-br ${getGradientColor(budget.percentage)} p-4 border border-gray-100 hover:shadow-lg transition-shadow`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-lg">{budget.category.name}</h3>
          <p className="text-sm text-gray-500 flex items-center mt-1">{budget.wallet.name}</p>
        </div>
        <div className="text-right">
          <p className={`font-bold text-lg ${getProgressTextColor(budget.percentage)}`}>
            {formatCurrency(budget.spent)}
          </p>
          <p className="text-sm text-gray-500">/ {formatCurrency(budget.amount)}</p>
        </div>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-3 mt-4">
        <div
          className={`h-3 rounded-full ${getProgressColor(budget.percentage)}`}
          style={{ width: `${Math.min(budget.percentage, 100)}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between items-center">
        <p className="text-xs font-medium text-gray-500">Progress</p>
        <p className={`text-sm font-bold ${getProgressTextColor(budget.percentage)}`}>{budget.percentage.toFixed(1)}%</p>
      </div>
    </div>
  );
} 