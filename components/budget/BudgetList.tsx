'use client';

import type { Budget } from '@/app/types/budget';
import type { Category } from '@/app/types/category';
import type { Wallet } from '@/app/types/wallet';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

type BudgetWithRelations = Budget & {
  category: Category;
  wallet: Wallet;
  spent: number;
  percentage: number;
}

interface Props {
  budgets: BudgetWithRelations[];
  onUpdate: (budget: BudgetWithRelations) => void;
  onDelete: (budgetId: string) => void;
  onEdit?: (budget: BudgetWithRelations) => void;
}

export default function BudgetList({ budgets, onUpdate, onDelete, onEdit }: Props) {
  const handleDelete = async (budgetId: string) => {
    if (!confirm('Are you sure you want to delete this budget?')) {
      return;
    }

    try {
      const response = await fetch(`/api/budgets/${budgetId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete budget');
      }

      onDelete(budgetId);
    } catch (error) {
      console.error('Error deleting budget:', error);
      alert('Failed to delete budget');
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white">
        <thead>
          <tr className="bg-gray-100">
            <th className="py-2 px-4 text-left">Category</th>
            <th className="py-2 px-4 text-left">Wallet</th>
            <th className="py-2 px-4 text-right">Budget</th>
            <th className="py-2 px-4 text-right">Spent</th>
            <th className="py-2 px-4 text-right">Remaining</th>
            <th className="py-2 px-4 text-center">Progress</th>
            <th className="py-2 px-4 text-left">Period</th>
            <th className="py-2 px-4 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {budgets.map((budget) => (
            <tr key={budget.id} className="border-t">
              <td className="py-2 px-4">
                <Link 
                  href={`/budgets/${budget.id}`}
                  className="text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {budget.category.name}
                </Link>
              </td>
              <td className="py-2 px-4">{budget.wallet.name}</td>
              <td className="py-2 px-4 text-right">
                Rp {budget.amount.toLocaleString()}
              </td>
              <td className="py-2 px-4 text-right">
                Rp {budget.spent.toLocaleString()}
              </td>
              <td className="py-2 px-4 text-right">
                Rp {(budget.amount - budget.spent).toLocaleString()}
              </td>
              <td className="py-2 px-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      budget.percentage >= 100
                        ? 'bg-red-500'
                        : budget.percentage >= 75
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                  />
                </div>
                <div className="text-center text-sm text-gray-500 mt-1">
                  {budget.percentage.toFixed(1)}%
                </div>
              </td>
              <td className="py-2 px-4">
                {formatDate(budget.startDate)} - {formatDate(budget.endDate)}
              </td>
              <td className="py-2 px-4 text-center">
                <div className="flex items-center justify-center space-x-2">
                  {onEdit ? (
                    <button
                      onClick={() => onEdit(budget)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      Edit
                    </button>
                  ) : (
                    <Link
                      href={`/budgets/${budget.id}/edit`}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      Edit
                    </Link>
                  )}
                  <button
                    onClick={() => handleDelete(budget.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 