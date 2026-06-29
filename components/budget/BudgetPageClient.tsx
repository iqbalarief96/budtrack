'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/app/providers/WalletProvider';
import WalletSelector from '@/app/components/WalletSelector';
import BudgetDashboard from './BudgetDashboard';
import type { Category } from '@/app/types/category';
import type { Wallet } from '@/app/types/wallet';
import type { Budget } from '@/app/types/budget';

type BudgetWithRelations = Budget & {
  category: Category;
  wallet: Wallet;
  spent: number;
  percentage: number;
}

interface Props {
  initialBudgets: BudgetWithRelations[];
  categories: Category[];
  wallets: Wallet[];
}

// Aggregated budget type for group view
interface AggregatedBudget {
  budgetId: string;
  categoryId: string;
  categoryName: string;
  budgetAmount: number;
  spentAmount: number;
  remainingAmount: number;
  percentage: number;
  walletContributions: { walletId: string; walletName: string; spent: number }[];
}

export default function BudgetPageClient({ initialBudgets, categories, wallets }: Props) {
  const { selectedWallet, selectedGroup, isGroupSelected } = useWallet();
  const [groupBudgets, setGroupBudgets] = useState<AggregatedBudget[]>([]);
  const [groupBudgetSummary, setGroupBudgetSummary] = useState({
    totalBudgeted: 0,
    totalSpent: 0,
    totalRemaining: 0,
    overallUtilization: 0,
  });
  const [isLoadingGroupBudgets, setIsLoadingGroupBudgets] = useState(false);

  // Filter budgets for selected wallet
  const filteredBudgets = selectedWallet 
    ? initialBudgets.filter(b => b.walletId === selectedWallet.id)
    : initialBudgets;

  // Fetch group budgets when a group is selected
  useEffect(() => {
    const fetchGroupBudgets = async () => {
      if (!isGroupSelected || !selectedGroup) {
        setGroupBudgets([]);
        setGroupBudgetSummary({ totalBudgeted: 0, totalSpent: 0, totalRemaining: 0, overallUtilization: 0 });
        return;
      }

      try {
        setIsLoadingGroupBudgets(true);
        const response = await fetch(`/api/wallet-groups/${selectedGroup.id}/budgets`);
        if (response.ok) {
          const responseData = await response.json();
          // API returns { success: true, data: {...} } format
          const data = responseData.data || responseData;
          const budgets = data.budgets || data || [];
          setGroupBudgets(budgets);
          setGroupBudgetSummary({
            totalBudgeted: data.totalBudgeted || budgets.reduce((sum: number, budget: AggregatedBudget) => sum + budget.budgetAmount, 0),
            totalSpent: data.totalSpent || budgets.reduce((sum: number, budget: AggregatedBudget) => sum + budget.spentAmount, 0),
            totalRemaining: data.totalRemaining ?? budgets.reduce((sum: number, budget: AggregatedBudget) => sum + budget.remainingAmount, 0),
            overallUtilization: data.overallUtilization || 0,
          });
        }
      } catch (error) {
        console.error('Error fetching group budgets:', error);
      } finally {
        setIsLoadingGroupBudgets(false);
      }
    };

    fetchGroupBudgets();
  }, [isGroupSelected, selectedGroup]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Get progress color based on percentage
  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-6">
      {/* Wallet/Group Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <WalletSelector />
        {isGroupSelected && selectedGroup && (
          <div className="flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
            <span>Group: {selectedGroup.name}</span>
            <span className="bg-purple-200 px-2 py-0.5 rounded-full text-xs">
              {selectedGroup.wallets?.length || 0} wallets
            </span>
          </div>
        )}
      </div>

      {/* Group Budget View */}
      {isGroupSelected && selectedGroup ? (
        <div className="space-y-6">
          <div className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold">
              Aggregated Budgets - {selectedGroup.name}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="bg-white rounded-lg border p-4">
                <p className="text-xs text-gray-500">Group Budgeted</p>
                <p className="text-lg font-semibold text-gray-900">{formatCurrency(groupBudgetSummary.totalBudgeted)}</p>
              </div>
              <div className="bg-white rounded-lg border p-4">
                <p className="text-xs text-gray-500">Group Spent</p>
                <p className="text-lg font-semibold text-red-600">{formatCurrency(groupBudgetSummary.totalSpent)}</p>
              </div>
              <div className="bg-white rounded-lg border p-4">
                <p className="text-xs text-gray-500">Remaining</p>
                <p className={groupBudgetSummary.totalRemaining >= 0 ? 'text-lg font-semibold text-green-600' : 'text-lg font-semibold text-red-600'}>{formatCurrency(groupBudgetSummary.totalRemaining)}</p>
              </div>
              <div className="bg-white rounded-lg border p-4">
                <p className="text-xs text-gray-500">Utilization</p>
                <p className="text-lg font-semibold text-gray-900">{groupBudgetSummary.overallUtilization.toFixed(0)}%</p>
              </div>
            </div>
          </div>
          
          {isLoadingGroupBudgets ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading budgets...</p>
            </div>
          ) : groupBudgets.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-500">No budgets found for this group</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupBudgets.map((budget) => (
                <div key={budget.budgetId || budget.categoryId} className="bg-white rounded-lg shadow p-4">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-medium text-gray-900">{budget.categoryName}</h3>
                    <span className={`text-sm px-2 py-0.5 rounded-full ${
                      budget.percentage >= 100 ? 'bg-red-100 text-red-700' :
                      budget.percentage >= 80 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {budget.percentage.toFixed(0)}%
                    </span>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
                    <div 
                      className={`h-full ${getProgressColor(budget.percentage)} transition-all`}
                      style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                    />
                  </div>
                  
                  {/* Amount info */}
                  <div className="flex justify-between text-sm mb-3">
                    <span className="text-gray-600">
                      {formatCurrency(budget.spentAmount)} / {formatCurrency(budget.budgetAmount)}
                    </span>
                    <span className={budget.remainingAmount >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {budget.remainingAmount >= 0 ? 'Remaining: ' : 'Over: '}
                      {formatCurrency(Math.abs(budget.remainingAmount))}
                    </span>
                  </div>
                  
                  {/* Wallet contributions */}
                  {budget.walletContributions && budget.walletContributions.length > 0 && (
                    <div className="border-t pt-3 mt-3">
                      <p className="text-xs text-gray-500 mb-2">Per-wallet breakdown:</p>
                      <div className="space-y-1">
                        {budget.walletContributions.map((contrib) => (
                          <div key={contrib.walletId} className="flex justify-between text-xs">
                            <span className="text-gray-600">{contrib.walletName}</span>
                            <span className="text-gray-900">{formatCurrency(contrib.spent)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Individual Wallet Budget View */
        <BudgetDashboard 
          initialBudgets={filteredBudgets}
          categories={categories}
          wallets={wallets}
        />
      )}
    </div>
  );
}
