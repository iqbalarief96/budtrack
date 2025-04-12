'use client';

import { useState } from 'react';
import type { Budget } from '@/app/types/budget';
import type { Category } from '@/app/types/category';
import type { Wallet } from '@/app/types/wallet';
import BudgetList from './BudgetList';
import BudgetForm from './BudgetForm';
import BudgetProgress from './BudgetProgress';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Target } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState('budgets');

  const handleAddBudget = async (newBudget: BudgetWithRelations) => {
    setBudgets([newBudget, ...budgets]);
    setShowForm(false);
  };

  const handleUpdateBudget = async (updatedBudget: BudgetWithRelations) => {
    setBudgets(budgets.map(budget => 
      budget.id === updatedBudget.id ? updatedBudget : budget
    ));
  };

  const handleDeleteBudget = async (budgetId: string) => {
    setBudgets(budgets.filter(budget => budget.id !== budgetId));
  };

  return (
    <div className="space-y-8">
      <Tabs defaultValue="budgets" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="budgets">Anggaran</TabsTrigger>
          <TabsTrigger value="goals">Tujuan Keuangan</TabsTrigger>
        </TabsList>
        
        <TabsContent value="budgets" className="mt-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Active Budgets</h2>
            <button
              onClick={() => setShowForm(true)}
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
          />
        </TabsContent>

        <TabsContent value="goals" className="mt-6">
          <div className="text-center py-16 border rounded-lg bg-white">
            <div className="mx-auto w-16 h-16 flex items-center justify-center bg-blue-100 rounded-full mb-4">
              <Target className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Kelola Tujuan Keuanganmu</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-6">
              Tetapkan target finansial jangka pendek dan jangka panjang, lacak progresmu, dan raih impianmu.
            </p>
            <Link href="/goals" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Lihat Semua Tujuan Keuangan
            </Link>
          </div>
        </TabsContent>
      </Tabs>

      {/* Budget Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <BudgetForm
              categories={categories}
              wallets={wallets}
              onSubmit={handleAddBudget}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
} 