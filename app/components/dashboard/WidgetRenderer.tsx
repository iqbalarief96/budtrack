'use client';

import React, { useState, useEffect } from 'react';
import { DashboardWidget } from './WidgetTypes';
import { useWallet } from '@/app/providers/WalletProvider';
import { FiDollarSign, FiArrowDownLeft, FiArrowUpRight, FiAlertCircle, FiZap } from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import { useTransactionModal } from '@/app/providers/TransactionModalProvider';

// Import widget components
import { EmergencyFundCard } from '@/components/dashboard/EmergencyFundCard';
import BudgetOverview from '@/components/budget/BudgetOverview';
import ExpenseChart from '@/components/charts/ExpenseChart';
import IncomeExpenseChart from '@/components/charts/IncomeExpenseChart';
import TransactionList from '@/app/components/dashboard/TransactionList';
import { formatCurrency } from '@/lib/utils';
import SavingsGoalCard from '@/components/dashboard/SavingsGoalCard';
import InvestmentPerformance from '@/components/dashboard/InvestmentPerformance';
import TopSpendingWidget from '@/app/components/dashboard/TopSpendingWidget';
import SummaryWidget from '@/app/components/dashboard/SummaryWidget';
import SafeToSpendCard from '@/app/components/dashboard/SafeToSpendCard';
import CashFlowForecastCard from '@/app/components/dashboard/CashFlowForecastCard';
import SubscriptionIntelligenceCard from '@/app/components/dashboard/SubscriptionIntelligenceCard';
import FinancialHealthScoreCard from '@/app/components/dashboard/FinancialHealthScoreCard';
import DebtPayoffPlannerCard from '@/app/components/dashboard/DebtPayoffPlannerCard';

// New SummaryStatsWidget component
function SummaryStatsWidget({ walletId }: { walletId?: string }) {
  const { selectedWallet, selectedGroup, isGroupSelected } = useWallet();
  const [summary, setSummary] = useState({
    savingsRate: 0,
    expenseRatio: 0,
    topCategory: null as { name: string; amount: number } | null
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAndCalculate = async () => {
      try {
        setIsLoading(true);
        
        // For group selection, fetch from group dashboard API
        if (isGroupSelected && selectedGroup) {
          const response = await fetch(`/api/wallet-groups/${selectedGroup.id}/dashboard`);
          if (response.ok) {
            const responseData = await response.json();
            console.log('[SummaryStatsWidget] Raw API response:', responseData);
            // API returns { success: true, data: {...} } format
            const groupData = responseData.data || responseData;
            console.log('[SummaryStatsWidget] Group data:', groupData);
            
            const income = groupData.totalIncome || 0;
            const expense = groupData.totalExpense || 0;
            console.log('[SummaryStatsWidget] income:', income, 'expense:', expense);
            
            // Calculate ratios
            const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;
            const expenseRatio = income > 0 ? (expense / income) * 100 : 0;
            
            // Get top spending category from group data
            const topCategory = groupData.spendingByCategory && groupData.spendingByCategory.length > 0
              ? { name: groupData.spendingByCategory[0].categoryName, amount: groupData.spendingByCategory[0].amount }
              : null;
            
            setSummary({
              savingsRate,
              expenseRatio,
              topCategory
            });
          }
          setIsLoading(false);
          return;
        }
        
        // For individual wallet selection
        const response = await fetch('/api/transactions?limit=-1', { cache: 'no-store' });
        if (response.ok) {
          const json = await response.json();
          // Handle both array and paginated response formats
          const data = Array.isArray(json) ? json : json.data || [];
          const currentWalletId = walletId || (selectedWallet?.id || '');
          const filteredTx = data.filter((tx: any) => tx.walletId === currentWalletId);

          // Calculate income and expenses
          let income = 0;
          let expense = 0;

          filteredTx.forEach((tx: any) => {
            if (tx.type === 'INCOME') {
              income += tx.amount;
            } else if (tx.type === 'EXPENSE') {
              expense += tx.amount;
            }
          });

          // Calculate ratios
          const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;
          const expenseRatio = income > 0 ? (expense / income) * 100 : 0;

          // Get top spending category
          const walletTxs = filteredTx.filter((tx: any) =>
            tx.type === 'EXPENSE' && tx.category !== null
          );

          const categorySpending: Record<string, {
            name: string;
            amount: number;
          }> = {};

          walletTxs.forEach((tx: any) => {
            const categoryName = tx.category.name;
            if (!categorySpending[categoryName]) {
              categorySpending[categoryName] = {
                name: categoryName,
                amount: 0
              };
            }
            categorySpending[categoryName].amount += tx.amount;
          });

          const categories = Object.values(categorySpending)
            .sort((a, b) => b.amount - a.amount);

          const topCategory = categories.length > 0 ? categories[0] : null;

          setSummary({
            savingsRate,
            expenseRatio,
            topCategory
          });
        }
      } catch (error) {
        console.error('Error fetching transaction data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAndCalculate();
  }, [walletId, selectedWallet, selectedGroup, isGroupSelected]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full h-32">
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 animate-pulse"></div>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 animate-pulse"></div>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 animate-pulse"></div>
      </div>
    );
  }

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
        <p className="text-2xl font-bold text-blue-600">{summary.savingsRate.toFixed(1)}%</p>
        <p className="text-sm text-gray-500 mt-1">
          {summary.savingsRate >= 20 ? 'Sangat baik!' : 'Coba tingkatkan ke 20%'}
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
        <p className="text-2xl font-bold text-purple-600">{summary.expenseRatio.toFixed(1)}%</p>
        <p className="text-sm text-gray-500 mt-1">
          {summary.expenseRatio <= 70 ? 'Terkendali' : 'Coba kurangi pengeluaran'}
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
        {summary.topCategory ? (
          <>
            <p className="text-2xl font-bold text-orange-600">{summary.topCategory.name}</p>
            <p className="text-sm text-gray-500 mt-1">{formatCurrency(summary.topCategory.amount)}</p>
          </>
        ) : (
          <p className="text-gray-500">Belum ada data</p>
        )}
      </div>
    </div>
  );
}

interface WidgetRendererProps {
  widget: DashboardWidget;
  selectedWalletId?: string;
}

// Dynamic widget renderer based on type
export default function WidgetRenderer({ widget, selectedWalletId }: WidgetRendererProps) {
  const { selectedWallet, setSelectedWalletAndPersist, wallets } = useWallet();
  const walletId = selectedWalletId || (selectedWallet?.id || '');
  console.log('[DEBUG] WidgetRenderer walletId:', walletId, 'selectedWallet:', selectedWallet);
  const router = useRouter();

  // Data state for widgets
  const [isLoading, setIsLoading] = React.useState(true);
  const [data, setData] = React.useState({
    balance: 0,
    income: 0,
    expense: 0,
  });

  // Use the transaction modal provider
  const { openTransactionModal } = useTransactionModal();

  // Fetch data for widgets
  React.useEffect(() => {
    if (!walletId) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Update balance data from selectedWallet
        if (selectedWallet) {
          // Get transactions for the selected wallet
          const response = await fetch(`/api/transactions?walletId=${walletId}&limit=-1`, { cache: 'no-store' });
          if (response.ok) {
            const json = await response.json();
            // Handle both array and paginated response formats
            const transactions = Array.isArray(json) ? json : json.data || [];

            // Calculate total income and expense
            let totalIncome = 0;
            let totalExpense = 0;

            transactions.forEach((tx: any) => {
              if (tx.type === 'INCOME') {
                totalIncome += tx.amount;
              } else if (tx.type === 'EXPENSE') {
                totalExpense += tx.amount;
              }
            });

            // Update data state
            setData({
              balance: selectedWallet.balance || 0,
              income: totalIncome,
              expense: totalExpense
            });
          }
        }
      } catch (error) {
        console.error('Error fetching widget data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [walletId, selectedWallet]);

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

  // Render widget based on type
  switch (widget.type) {
    case 'summary':
      return <SummaryWidget walletId={walletId} />;

    case 'balance':
      return (
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Total Saldo</h3>
              <p className="mt-1 text-xl font-semibold">{formatCurrency(data.balance)}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full text-blue-600">
              <FiDollarSign size={24} />
            </div>
          </div>
        </div>
      );

    case 'income':
      return (
        <div className="flex items-center justify-between">
          {isLoading ? (
            <div className="animate-pulse flex w-full justify-between">
              <div className="h-8 w-32 bg-gray-200 rounded"></div>
              <div className="h-10 w-10 rounded-full bg-gray-200"></div>
            </div>
          ) : (
            <>
              <div>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(data.income)}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <FiArrowDownLeft size={24} className="text-green-600" />
              </div>
            </>
          )}
        </div>
      );

    case 'expense':
      return (
        <div className="flex items-center justify-between">
          {isLoading ? (
            <div className="animate-pulse flex w-full justify-between">
              <div className="h-8 w-32 bg-gray-200 rounded"></div>
              <div className="h-10 w-10 rounded-full bg-gray-200"></div>
            </div>
          ) : (
            <>
              <div>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(data.expense)}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <FiArrowUpRight size={24} className="text-red-600" />
              </div>
            </>
          )}
        </div>
      );

    case 'emergency-fund':
      console.log('[DEBUG] WidgetRenderer passing walletId to EmergencyFundCard:', walletId, 'selectedWallet:', selectedWallet);
      return <EmergencyFundCard walletId={walletId} />;

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
      // @ts-ignore - walletId prop is valid but TypeScript doesn't recognize it
      return <SavingsGoalCard walletId={walletId} />;

    case 'investment-performance':
      return <InvestmentPerformance />;

    case 'summary-stats':
      return <SummaryStatsWidget walletId={selectedWalletId} />;

    case 'quick-actions':
      return (
        <div className="bg-gray-50 rounded-lg border border-gray-100 p-3">
          <h3 className="font-medium text-gray-700 mb-2 text-sm">Aksi Cepat</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => openTransactionModal({ quick: true })}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm hover:border-blue-400 hover:bg-blue-50 transition"
            >
              <FiZap className="h-4 w-4 text-blue-500" /> Tambah Transaksi
            </button>
            <button
              onClick={() => router.push('/transactions')}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm hover:border-green-400 hover:bg-green-50 transition"
            >
              <FiArrowDownLeft className="h-4 w-4 text-green-500" /> Import
            </button>
            <button
              onClick={() => router.push('/chatbot')}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm hover:border-purple-400 hover:bg-purple-50 transition"
            >
              <FiZap className="h-4 w-4 text-purple-500" /> Chatbot
            </button>
          </div>
        </div>
      );

    case 'top-spending':
      // @ts-ignore - walletId prop is valid but TypeScript doesn't recognize it
      return <TopSpendingWidget walletId={walletId} />;

    case 'safe-to-spend':
      return <SafeToSpendCard />;

    case 'cashflow-forecast':
      return <CashFlowForecastCard />;

    case 'subscription-intelligence':
      return <SubscriptionIntelligenceCard />;

    case 'financial-health':
      return <FinancialHealthScoreCard />;

    case 'debt-payoff-planner':
      return <DebtPayoffPlannerCard />;

    case 'budget-forecast':
      const BudgetForecastWidget = React.lazy(() => import('@/components/dashboard/BudgetForecastWidget'));
      return (
        <React.Suspense fallback={<div className="animate-pulse h-32 bg-gray-200 rounded"></div>}>
          <BudgetForecastWidget />
        </React.Suspense>
      );

    case 'upcoming-recurring':
      const UpcomingRecurringWidget = React.lazy(() => import('@/components/dashboard/UpcomingRecurringWidget'));
      return (
        <React.Suspense fallback={<div className="animate-pulse h-32 bg-gray-200 rounded"></div>}>
          <UpcomingRecurringWidget />
        </React.Suspense>
      );

    case 'upcoming-bills':
      const UpcomingBillsWidget = React.lazy(() => import('@/components/dashboard/UpcomingBillsWidget'));
      return (
        <React.Suspense fallback={<div className="animate-pulse h-32 bg-gray-200 rounded"></div>}>
          <UpcomingBillsWidget />
        </React.Suspense>
      );

    default:
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">Widget type '{widget.type}' not implemented yet</p>
        </div>
      );
  }
} 
