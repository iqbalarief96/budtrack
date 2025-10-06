'use client';

import { useState, useEffect } from 'react';
import type { Budget } from '@/app/types/budget';
import type { Category } from '@/app/types/category';
import type { Wallet } from '@/app/types/wallet';
import BudgetList from './BudgetList';
import BudgetForm from './BudgetForm';
import BudgetProgress from './BudgetProgress';

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

export default function BudgetDashboard({ initialBudgets, categories, wallets }: Props) {
  const [budgets, setBudgets] = useState<BudgetWithRelations[]>(initialBudgets);
  const [showForm, setShowForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetWithRelations | null>(null);
  
  // Function to refresh budget data from server
  const refreshBudgets = async () => {
    try {
      const response = await fetch('/api/budgets/with-spending');
      if (response.ok) {
        const updatedBudgets = await response.json();
        setBudgets(updatedBudgets);
      }
    } catch (error) {
      console.error('Failed to refresh budgets:', error);
    }
  };
  
  // Set up event listener for transaction changes
  useEffect(() => {
    // Create event listener for transaction changes
    const handleTransactionChange = () => {
      refreshBudgets();
    };
    
    // Listen for custom event
    window.addEventListener('transaction:change', handleTransactionChange);
    
    // Clean up
    return () => {
      window.removeEventListener('transaction:change', handleTransactionChange);
    };
  }, []);

  const handleAddBudget = async (newBudget: BudgetWithRelations) => {
    setBudgets([newBudget, ...budgets]);
    setShowForm(false);
    
    // Refresh budgets to ensure data is up-to-date
    refreshBudgets();
  };

  const handleUpdateBudget = async (updatedBudget: BudgetWithRelations) => {
    setBudgets(budgets.map(budget => 
      budget.id === updatedBudget.id ? updatedBudget : budget
    ));
  };

  const handleDeleteBudget = async (budgetId: string) => {
    setBudgets(budgets.filter(budget => budget.id !== budgetId));
  };
  
  const handleFormSuccess = () => {
    setShowForm(false); // Tutup form setelah berhasil submit
    setEditingBudget(null); // Reset budget yang sedang diedit
    refreshBudgets(); // Refresh data budget dari server
  };
  
  const handleOpenEditForm = (budget: BudgetWithRelations) => {
    setEditingBudget(budget);
    setShowForm(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Active Budgets</h2>
        <button
          onClick={() => {
            setEditingBudget(null); // Reset editing state
            setShowForm(true);
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Add New Budget
        </button>
      </div>

      {/* Budget Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {budgets.map(budget => (
          <BudgetProgress 
            key={budget.id}
            budget={budget}
            onUpdate={handleUpdateBudget}
          />
        ))}
      </div>

      {/* Budget List */}
      <BudgetList 
        budgets={budgets}
        onUpdate={handleUpdateBudget}
        onDelete={handleDeleteBudget}
        onEdit={handleOpenEditForm}
      />

      {/* Budget Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">
                {editingBudget ? 'Edit Budget' : 'Add New Budget'}
              </h3>
              <button 
                onClick={() => {
                  setShowForm(false);
                  setEditingBudget(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <BudgetForm
              userId={budgets[0]?.userId || ''}
              categories={categories}
              wallets={wallets}
              initialData={editingBudget ? {
                id: editingBudget.id,
                amount: editingBudget.amount,
                categoryId: editingBudget.category.id,
                walletId: editingBudget.wallet.id,
                startDate: new Date(editingBudget.startDate),
                endDate: new Date(editingBudget.endDate)
              } : undefined}
              isEditing={!!editingBudget}
              onSuccess={handleFormSuccess}
            />
          </div>
        </div>
      )}
    </div>
  );
} 