'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { GoalCard } from '@/components/dashboard/GoalCard';
import { GoalForm } from '@/components/dashboard/GoalForm';
import { FiPlus, FiTarget } from 'react-icons/fi';
import WalletSelector from '@/app/components/WalletSelector';
import { useWallet } from '@/app/providers/WalletProvider';

// Aggregated goal type for group view
interface AggregatedGoal {
  id: string;
  name: string;
  target: number;
  current: number;
  type: string;
  description?: string | null;
  status: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  targetDate?: string;
  progress: number;
  walletContributions: Array<{
    walletId: string;
    walletName: string;
    walletColor?: string | null;
    contributionAmount: number;
    transactionCount: number;
  }>;
  walletId?: string;
  walletName?: string;
  walletColor?: string | null;
  category?: string | null;
}

// Transform API response to match expected format
function transformGoalApiResponse(goal: any): AggregatedGoal {
  // Get wallet info from contributions if available
  const firstContribution = goal.walletContributions?.[0];
  
  return {
    id: goal.id,
    name: goal.name,
    target: goal.targetAmount,
    current: goal.currentAmount,
    type: goal.category || 'OTHER',
    description: goal.description,
    status: goal.status || 'ONGOING',
    targetAmount: goal.targetAmount,
    currentAmount: goal.currentAmount,
    deadline: goal.targetDate || goal.deadline,
    targetDate: goal.targetDate || goal.deadline,
    progress: goal.progress,
    walletContributions: goal.walletContributions || [],
    walletId: firstContribution?.walletId,
    walletName: firstContribution?.walletName,
    walletColor: firstContribution?.walletColor,
    category: goal.category,
  };
}

export function GoalsContent() {
  const { selectedWallet, selectedGroup, isGroupSelected } = useWallet();
  const [goals, setGoals] = useState<any[]>([]);
  const [groupGoals, setGroupGoals] = useState<AggregatedGoal[]>([]);
  const [combinedSavingsRate, setCombinedSavingsRate] = useState<number>(0);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isLoadingGroupGoals, setIsLoadingGroupGoals] = useState(false);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalToEdit, setGoalToEdit] = useState<any>(null);
  const [starterPrefill, setStarterPrefill] = useState<any>(null);

  const goalStarters = [
    { name: 'Dana Darurat 3 Bulan', category: 'EMERGENCY_FUND', icon: '🛡️', hint: 'Bantalan 3x pengeluaran bulanan' },
    { name: 'Lunasi Utang', category: 'DEBT', icon: '💸', hint: 'Beresin saldo negatif / cicilan' },
    { name: 'Target Nabung Bulanan', category: 'SAVINGS', icon: '📈', hint: 'Konsisten tiap bulan' },
    { name: 'Liburan / Beli Besar', category: 'OTHER', icon: '✈️', hint: 'Rencana pengeluaran besar' },
  ];

  const openStarter = (starter: typeof goalStarters[number]) => {
    setStarterPrefill({ name: starter.name, category: starter.category });
    setIsAddingGoal(true);
  };

  useEffect(() => {
    if (!isGroupSelected) {
      fetchGoals();
    } else {
      // When group is selected, set loading to false since we use isLoadingGroupGoals instead
      setLoading(false);
    }
  }, [selectedWallet, isGroupSelected]);

  // Fetch group goals when a group is selected
  useEffect(() => {
    const fetchGroupGoals = async () => {
      if (!isGroupSelected || !selectedGroup) {
        setGroupGoals([]);
        setCombinedSavingsRate(0);
        return;
      }

      try {
        setIsLoadingGroupGoals(true);
        const response = await fetch(`/api/wallet-groups/${selectedGroup.id}/goals`);
        if (response.ok) {
          const responseData = await response.json();
          // API returns { success: true, data: {...} } format
          const data = responseData.data || responseData;
          // Transform goals to match expected format
          const goalsArray = data.goals || data || [];
          const transformedGoals = goalsArray.map(transformGoalApiResponse);
          setGroupGoals(transformedGoals);
          setCombinedSavingsRate(data.combinedSavingsRate || 0);
        }
      } catch (error) {
        console.error('Error fetching group goals:', error);
      } finally {
        setIsLoadingGroupGoals(false);
      }
    };

    fetchGroupGoals();
  }, [isGroupSelected, selectedGroup]);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedWallet) {
        params.append('walletId', selectedWallet.id);
      }
      const response = await fetch(`/api/goals?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch goals');
      const data = await response.json();
      setGoals(data);
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async (data: any) => {
    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to create goal');

      const newGoal = await response.json();
      console.log('[Create Goal] Created:', newGoal);

      // Auto-sync existing transactions if goal has a category
      if (newGoal.category) {
        try {
          console.log(`[Auto-Sync] Syncing for goal ${newGoal.id}...`);
          const syncResponse = await fetch(`/api/goals/${newGoal.id}/sync`, {
            method: 'POST',
          });

          if (syncResponse.ok) {
            const syncData = await syncResponse.json();
            console.log('[Auto-Sync] Result:', syncData);
            if (syncData.syncedCount > 0) {
              alert(`Goal created! ✅ Auto-synced ${syncData.syncedCount} transaction(s) worth Rp ${syncData.totalAmount.toLocaleString()}`);
            }
          }
        } catch (syncError) {
          console.error('[Auto-Sync] Error:', syncError);
        }
      }

      setIsAddingGoal(false);
      fetchGoals();
    } catch (error) {
      console.error('Error creating goal:', error);
    }
  };

  const handleUpdateGoal = async (id: string, data: any) => {
    try {
      const response = await fetch('/api/goals', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, ...data }),
      });

      if (!response.ok) throw new Error('Failed to update goal');

      setIsEditingGoal(false);
      setGoalToEdit(null);
      fetchGoals();
    } catch (error) {
      console.error('Error updating goal:', error);
    }
  };

  const handleEditGoal = (id: string) => {
    const goal = goals.find(g => g.id === id);
    if (goal) {
      setGoalToEdit(goal);
      setIsEditingGoal(true);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    try {
      const response = await fetch(`/api/goals?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete goal');

      // Refresh goals list
      fetchGoals();
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
  };

  if (loading || isLoadingGroupGoals) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="relative w-12 h-12">
          <div className="absolute top-0 w-full h-full rounded-full border-4 border-gray-200"></div>
          <div className="absolute top-0 w-full h-full rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
        </div>
      </div>
    );
  }

  // Use group goals when group is selected
  const displayGoals = isGroupSelected ? groupGoals : goals;

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-8">
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

      {/* Combined Savings Rate for Group View */}
      {isGroupSelected && combinedSavingsRate > 0 && (
        <div className="bg-gradient-to-r from-green-500 to-emerald-400 rounded-xl p-6 text-white shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium text-green-100">Combined Savings Rate</h3>
              <p className="text-3xl font-bold mt-1">{combinedSavingsRate.toFixed(1)}%</p>
            </div>
            <div className="p-3 bg-white/20 rounded-full">
              <FiTarget className="h-8 w-8" />
            </div>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-blue-600 to-blue-400 rounded-xl p-6 text-white shadow-lg">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-full">
              <FiTarget className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Financial Goals</h3>
              <p className="text-sm text-blue-100">
                {isGroupSelected 
                  ? `Aggregated goals from ${selectedGroup?.wallets?.length || 0} wallets`
                  : 'Track your progress toward financial freedom'}
              </p>
            </div>
          </div>
          {!isGroupSelected && (
            <Dialog open={isAddingGoal} onOpenChange={(open) => {
              setIsAddingGoal(open);
              if (!open) setStarterPrefill(null);
            }}>
              <DialogTrigger asChild>
                <Button className="bg-white text-blue-600 hover:bg-blue-50 flex items-center gap-1">
                  <FiPlus className="h-4 w-4" />
                  Add Goal
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Goal</DialogTitle>
                </DialogHeader>
                <GoalForm onSubmit={handleCreateGoal} initialData={starterPrefill || undefined} />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Dialog open={isEditingGoal} onOpenChange={setIsEditingGoal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Goal</DialogTitle>
          </DialogHeader>
          {goalToEdit && (
            <GoalForm
              onSubmit={(data) => handleUpdateGoal(goalToEdit.id, data)}
              initialData={goalToEdit}
              isEditing={true}
            />
          )}
        </DialogContent>
      </Dialog>

      {displayGoals.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="bg-blue-50 rounded-full p-4 w-16 h-16 flex items-center justify-center mx-auto">
            <FiTarget className="h-8 w-8 text-blue-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mt-4">No goals yet</h3>
          <p className="text-gray-500 mt-2 max-w-md mx-auto">
            {isGroupSelected 
              ? 'No goals found for this wallet group.'
              : 'Set financial goals to track your progress and stay motivated on your financial journey.'}
          </p>
          {!isGroupSelected && (
            <>
              <Button
                className="mt-6 bg-blue-600 hover:bg-blue-700"
                onClick={() => { setStarterPrefill(null); setIsAddingGoal(true); }}
              >
                <FiPlus className="mr-2 h-4 w-4" />
                Create Your First Goal
              </Button>
              <div className="mt-8 grid gap-3 sm:grid-cols-2 max-w-xl mx-auto text-left">
                {goalStarters.map((starter) => (
                  <button
                    key={starter.name}
                    type="button"
                    onClick={() => openStarter(starter)}
                    className="rounded-2xl border border-gray-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/50 hover:shadow-sm"
                  >
                    <span className="text-2xl">{starter.icon}</span>
                    <p className="mt-2 font-medium text-gray-900">{starter.name}</p>
                    <p className="text-xs text-gray-500">{starter.hint}</p>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {displayGoals.map((goal) => (
            <div key={goal.id} className="relative">
              {/* Wallet indicator for group view */}
              {isGroupSelected && (goal as AggregatedGoal).walletName && (
                <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-0.5 bg-white/90 rounded-full text-xs shadow-sm">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: (goal as AggregatedGoal).walletColor || '#6366f1' }}
                  />
                  <span className="text-gray-600">{(goal as AggregatedGoal).walletName}</span>
                </div>
              )}
              <GoalCard
                goal={goal}
                onUpdate={isGroupSelected ? undefined : handleUpdateGoal}
                onDelete={isGroupSelected ? undefined : handleDeleteGoal}
                onEdit={isGroupSelected ? undefined : handleEditGoal}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}