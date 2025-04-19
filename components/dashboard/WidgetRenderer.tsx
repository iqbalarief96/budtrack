'use client';

import React from 'react';
import { DashboardWidget } from '@/app/components/dashboard/WidgetTypes';
import { useWallet } from '@/app/providers/WalletProvider';
import { FiDollarSign, FiArrowDownLeft, FiArrowUpRight, FiAlertCircle } from 'react-icons/fi';
import { useRouter } from 'next/navigation';

// Import widget components
import EmergencyFundCard from '@/components/dashboard/EmergencyFundCard';
import BudgetOverview from '@/components/budget/BudgetOverview';
import ExpenseChart from '@/components/charts/ExpenseChart';
import IncomeExpenseChart from '@/components/charts/IncomeExpenseChart';
import TransactionList from '@/app/components/dashboard/TransactionList';
import { formatCurrency } from '@/lib/utils';
import SavingsGoalCard from '@/components/dashboard/SavingsGoalCard';
import InvestmentPerformance from '@/components/dashboard/InvestmentPerformance';
import TopSpendingWidget from '@/app/components/dashboard/TopSpendingWidget';

interface WidgetRendererProps {
  widget: DashboardWidget;
  selectedWalletId?: string;
}

// Dynamic widget renderer based on type
export default function WidgetRenderer({ widget, selectedWalletId }: WidgetRendererProps) {
  const { selectedWallet, setSelectedWalletAndPersist, wallets } = useWallet();
  const walletId = selectedWalletId || (selectedWallet?.id || '');
  const router = useRouter();
  
  // For demo purposes, placeholder data
  const [isLoading, setIsLoading] = React.useState(false);
  const [data, setData] = React.useState({
    balance: 5000000,
    income: 7500000,
    expense: 2500000,
  });
  
  // Fetch data for widget if needed
  React.useEffect(() => {
    if (!walletId) return;
    
    // Here you would fetch data specific to this widget type
    // For now using placeholder data
  }, [walletId, widget.type]);
  
  // If selectedWalletId is provided and different from current selectedWallet,
  // we update the context (this will cascade to child components)
  React.useEffect(() => {
    if (selectedWalletId && selectedWallet?.id !== selectedWalletId && wallets.length > 0) {
      // Find wallet by ID and set it
      const wallet = wallets.find(w => w.id === selectedWalletId);
      if (wallet) {
        setSelectedWalletAndPersist(wallet);
      }
    }
  }, [selectedWalletId, selectedWallet?.id, wallets, setSelectedWalletAndPersist]);
  
  // Function to open transaction modal - in production this would be handled by a global state manager
  const openTransactionModal = (type: 'INCOME' | 'EXPENSE') => {
    console.log(`Opening transaction modal for ${type}`);
    // In real implementation, this would trigger a modal via a state manager
    // For demo, we'll just redirect to the transactions page
    router.push('/transactions/new?type=' + type);
  };

  // Render widget based on type
  switch (widget.type) {
    case 'balance':
      return (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold">{formatCurrency(data.balance)}</p>
          </div>
          <div className="p-3 bg-blue-100 rounded-full">
            <FiDollarSign size={24} className="text-blue-600" />
          </div>
        </div>
      );
      
    case 'income':
      return (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(data.income)}</p>
          </div>
          <div className="p-3 bg-green-100 rounded-full">
            <FiArrowDownLeft size={24} className="text-green-600" />
          </div>
        </div>
      );
      
    case 'expense':
      return (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(data.expense)}</p>
          </div>
          <div className="p-3 bg-red-100 rounded-full">
            <FiArrowUpRight size={24} className="text-red-600" />
          </div>
        </div>
      );
      
    case 'emergency-fund':
      return <EmergencyFundCard />;
      
    case 'expense-chart':
      return <ExpenseChart />;
      
    case 'income-expense-chart':
      return <IncomeExpenseChart />;
      
    case 'transaction-list':
      // Extract limit from widget config if available
      const limit = widget.config?.limit || 5;
      return <TransactionList limit={limit} />;
      
    case 'budget-overview':
      return <BudgetOverview />;
      
    case 'top-spending':
      return <TopSpendingWidget />;
      
    case 'financial-tips':
      const tips = [
        'Sisihkan 20% penghasilan setiap bulan untuk dana darurat',
        'Tentukan batas maksimal untuk kategori pengeluaran non-esensial',
        'Catat semua pengeluaran untuk identifikasi area yang bisa dihemat',
      ];
      const randomTip = tips[Math.floor(Math.random() * tips.length)];
      
      return (
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-yellow-100 rounded-full flex-shrink-0">
            <FiAlertCircle className="h-6 w-6 text-yellow-600" />
          </div>
          <div>
            <p className="text-yellow-700">{randomTip}</p>
          </div>
        </div>
      );
            
    case 'savings-goals':
      return <SavingsGoalCard />;
      
    case 'investment-performance':
      return <InvestmentPerformance />;
    
    case 'summary-stats':
      // Generate stats similar to the original dashboard
      const savingsRate = 29.6; // Example data
      const expenseRatio = 70.4; // Example data
      const topCategory = {
        name: 'Savings',
        amount: 16827165
      };
      
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <div className="flex items-center mb-2">
              <div className="mr-2 text-blue-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" 
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                  <polyline points="17 6 23 6 23 12"></polyline>
                </svg>
              </div>
              <h3 className="font-medium">Tingkat Tabungan</h3>
            </div>
            <p className="text-2xl font-bold text-blue-600">{savingsRate.toFixed(1)}%</p>
            <p className="text-sm text-gray-500 mt-1">
              {savingsRate >= 20 ? 'Sangat baik!' : 'Coba tingkatkan ke 20%'}
            </p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <div className="flex items-center mb-2">
              <div className="mr-2 text-purple-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" 
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path>
                  <path d="M22 12A10 10 0 0 0 12 2v10z"></path>
                </svg>
              </div>
              <h3 className="font-medium">Rasio Pengeluaran</h3>
            </div>
            <p className="text-2xl font-bold text-purple-600">{expenseRatio.toFixed(1)}%</p>
            <p className="text-sm text-gray-500 mt-1">
              {expenseRatio <= 70 ? 'Terkendali' : 'Coba kurangi pengeluaran'}
            </p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <div className="flex items-center mb-2">
              <div className="mr-2 text-orange-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" 
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="20" x2="12" y2="10"></line>
                  <line x1="18" y1="20" x2="18" y2="4"></line>
                  <line x1="6" y1="20" x2="6" y2="16"></line>
                </svg>
              </div>
              <h3 className="font-medium">Kategori Terbesar</h3>
            </div>
            {topCategory ? (
              <>
                <p className="text-2xl font-bold text-orange-600">{topCategory.name}</p>
                <p className="text-sm text-gray-500 mt-1">{formatCurrency(topCategory.amount)}</p>
              </>
            ) : (
              <p className="text-gray-500">Belum ada data</p>
            )}
          </div>
        </div>
      );
      
    case 'quick-actions':
      return (
        <div className="bg-gray-50 rounded-lg border border-gray-100 p-4">
          <h3 className="font-medium text-gray-700 mb-3">Aksi Cepat</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <button
              onClick={() => openTransactionModal('EXPENSE')}
              className="bg-white p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-gray-50 text-center transition duration-200"
            >
              <div className="flex flex-col items-center">
                <FiArrowUpRight className="h-6 w-6 text-red-500 mb-1" />
                <span className="text-sm">Tambah Pengeluaran</span>
              </div>
            </button>
            <button 
              onClick={() => openTransactionModal('INCOME')}
              className="bg-white p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-gray-50 text-center transition duration-200"
            >
              <div className="flex flex-col items-center">
                <FiArrowDownLeft className="h-6 w-6 text-green-500 mb-1" />
                <span className="text-sm">Tambah Pemasukan</span>
              </div>
            </button>
            <button
              onClick={() => router.push('/budgets/new')}
              className="bg-white p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-gray-50 text-center transition duration-200"
            >
              <div className="flex flex-col items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" 
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className="h-6 w-6 text-blue-500 mb-1">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                </svg>
                <span className="text-sm">Buat Budget</span>
              </div>
            </button>
            <button
              onClick={() => router.push('/analytics')}
              className="bg-white p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-gray-50 text-center transition duration-200"
            >
              <div className="flex flex-col items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" 
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className="h-6 w-6 text-purple-500 mb-1">
                  <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z"></path>
                  <line x1="8" y1="21" x2="8" y2="9"></line>
                  <line x1="16" y1="21" x2="16" y2="13"></line>
                  <line x1="12" y1="21" x2="12" y2="15"></line>
                </svg>
                <span className="text-sm">Analisis</span>
              </div>
            </button>
            <button
              onClick={() => router.push('/wedding-planner')}
              className="bg-white p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-gray-50 text-center transition duration-200"
            >
              <div className="flex flex-col items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" 
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className="h-6 w-6 text-pink-500 mb-1">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
                <span className="text-sm">Wedding Planner</span>
              </div>
            </button>
          </div>
        </div>
      );
      
    default:
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">Widget type '{widget.type}' not implemented yet</p>
        </div>
      );
  }
} 