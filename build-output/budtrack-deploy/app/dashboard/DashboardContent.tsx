'use client'

import React, { useEffect, useState } from 'react'
import { FiArrowUpRight, FiArrowDownLeft, FiDollarSign, FiTrendingUp, FiAlertCircle, FiPieChart, FiBarChart2, FiCalendar, FiEye } from 'react-icons/fi'
import { useWallet } from '../providers/WalletProvider'
import WalletSelector from '../components/WalletSelector'
import type { Budget } from '@/app/types/budget'
import type { Category } from '@/app/types/category'
import type { Wallet } from '@/app/types/wallet'
import BudgetProgress from '@/components/budget/BudgetProgress'
import EmergencyFundCard from '@/app/components/dashboard/EmergencyFundCard'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js'
import { Pie, Bar } from 'react-chartjs-2'
import TransactionModal from '@/app/components/TransactionModal'
import { useRouter } from 'next/navigation'
import CustomizableTabContent from '../components/dashboard/CustomizableTabContent'

// Register ChartJS components
ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

// Define types for our data
type Transaction = {
  id: string
  date: string
  description: string
  amount: number
  type: 'INCOME' | 'EXPENSE'
  category: {
    id: string
    name: string
    type: string
  }
  wallet: {
    id: string
    name: string
  }
  categoryId: string
  walletId: string
}

type BudgetWithRelations = Budget & {
  category: Category
  wallet: Wallet
  spent: number
  percentage: number
}

interface Props {
  budgets: BudgetWithRelations[];
}

const DashboardContent = ({ budgets = [] }: Props) => {
  const { wallets, selectedWallet, refreshWallets } = useWallet()
  const [summary, setSummary] = useState({ total: 0, income: 0, expense: 0 })
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([])
  const [savingsData, setSavingsData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingSavings, setIsLoadingSavings] = useState(true)
  const [chartData, setChartData] = useState({ income: 0, expense: 0 })
  const [recentBudgets, setRecentBudgets] = useState<BudgetWithRelations[]>([])
  const [showAllTransactions, setShowAllTransactions] = useState(false)
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false)
  const [transactionType, setTransactionType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE')

  // State for dashboard items
  const [allBudgets, setAllBudgets] = useState<BudgetWithRelations[]>(budgets)
  const [showTips, setShowTips] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [transactionHistory, setTransactionHistory] = useState<Array<{
    month: string;
    year: number;
    income: number;
    expense: number;
  }>>([])
  const [selectedPeriod, setSelectedPeriod] = useState('all')
  const [spendingByCategory, setSpendingByCategory] = useState<{ name: string; amount: number; color: string }[]>([])
  const [financialTips, setFinancialTips] = useState<{ id: number; title: string; description: string }[]>([
    { id: 1, title: 'Tabungan Darurat', description: 'Sisihkan 20% penghasilan setiap bulan untuk dana darurat' },
    { id: 2, title: 'Atur Budget', description: 'Tentukan batas maksimal untuk kategori pengeluaran non-esensial' },
    { id: 3, title: 'Lacak Pengeluaran', description: 'Catat semua pengeluaran untuk identifikasi area yang bisa dihemat' },
  ])

  const router = useRouter()

  // Load saved widget state from localStorage on component initialization
  const getSavedWidgets = () => {
    if (typeof window !== 'undefined') {
      try {
        const savedWidgetsStr = localStorage.getItem('ringkasanWidgets');
        console.log('Debug - Loading from localStorage:', savedWidgetsStr);
        
        if (savedWidgetsStr) {
          const parsedWidgets = JSON.parse(savedWidgetsStr);
          console.log('Debug - Parsed widgets:', parsedWidgets);
          return parsedWidgets;
        }
      } catch (error) {
        console.error('Error loading saved widgets from localStorage:', error);
      }
    }
    console.log('Debug - No widgets found in localStorage, returning empty array');
    return [];
  };
  
  const [isEditModeRingkasan, setIsEditModeRingkasan] = useState(false);
  const [ringkasanWidgets, setRingkasanWidgets] = useState<any[]>(getSavedWidgets());
  const [widgetsInitialized, setWidgetsInitialized] = useState(false);

  // Update localStorage whenever widgets change
  useEffect(() => {
    if (ringkasanWidgets.length > 0) {
      console.log('Debug - Saving to localStorage:', ringkasanWidgets);
      localStorage.setItem('ringkasanWidgets', JSON.stringify(ringkasanWidgets));
    }
  }, [ringkasanWidgets]);

  // Filtered transactions and budgets
  const filteredBudgets = selectedWallet && allBudgets
    ? allBudgets.filter(budget => budget.walletId === selectedWallet.id)
    : allBudgets || []

  // Fetch transactions
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        // Use period parameter for server-side filtering
        const url = selectedPeriod === 'all' 
          ? '/api/transactions' 
          : `/api/transactions?period=${selectedPeriod}`;
        
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setAllTransactions(data);
        }
      } catch (error) {
        console.error('Error fetching transactions:', error);
      }
    };

    fetchTransactions();
  }, [selectedPeriod]); // Add selectedPeriod as a dependency

  // Calculate totals and filter transactions when wallet or transaction data changes
  useEffect(() => {
    if (selectedWallet && allTransactions.length > 0) {
      // Filter transaksi untuk wallet yang dipilih
      let filteredTx = allTransactions.filter(
        (tx) => tx.walletId === selectedWallet.id
      );

      // Filter transaksi berdasarkan periode waktu
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      if (selectedPeriod !== 'all') {
        filteredTx = filteredTx.filter((tx) => {
          const txDate = new Date(tx.date);
          
          switch (selectedPeriod) {
            case 'daily':
              // Hanya transaksi hari ini
              return txDate.setHours(0, 0, 0, 0) === today.setHours(0, 0, 0, 0);
            
            case 'weekly':
              // Transaksi 7 hari terakhir
              const weekAgo = new Date(today);
              weekAgo.setDate(today.getDate() - 7);
              return txDate >= weekAgo;
            
            case 'monthly':
              // Transaksi bulan ini
              const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
              return txDate >= startOfMonth;
            
            case 'quarterly':
              // Transaksi 3 bulan terakhir
              const threeMonthsAgo = new Date(today);
              threeMonthsAgo.setMonth(today.getMonth() - 3);
              return txDate >= threeMonthsAgo;
            
            case 'yearly':
              // Transaksi tahun ini
              const startOfYear = new Date(today.getFullYear(), 0, 1);
              return txDate >= startOfYear;
            
            default:
              return true;
          }
        });
      }

      setFilteredTransactions(filteredTx);

      // Calculate income and expenses for the selected wallet
      let income = 0;
      let expense = 0;

      filteredTx.forEach((tx) => {
        if (tx.type === 'INCOME') {
          income += tx.amount;
        } else if (tx.type === 'EXPENSE') {
          // Count ALL expense transactions including savings
          expense += tx.amount;
        }
      });

      // Calculate total balance as income - expense
      const total = income - expense;
      
      // Set summary values
      setSummary({
        total,
        income,
        expense,
      });

      console.log('Summary updated:', { total, income, expense });

      // Set chart data
      setChartData({
        income,
        expense,
      });
    }
  }, [selectedWallet, allTransactions, selectedPeriod]);

  // Fetch savings data
  useEffect(() => {
    const fetchSavingsData = async () => {
      try {
        setIsLoadingSavings(true);
        
        // Construct URL with walletId if a wallet is selected
        const url = selectedWallet 
          ? `/api/emergency-fund?walletId=${selectedWallet.id}` 
          : '/api/emergency-fund';
        
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          setSavingsData(data);
        } else {
          console.error('Error fetching emergency fund data:', response.statusText);
        }
      } catch (error) {
        console.error('Error fetching savings data:', error);
      } finally {
        setIsLoadingSavings(false);
      }
    };

    fetchSavingsData();
  }, [selectedWallet]); // Re-fetch when selectedWallet changes

  // Get transactions grouped by category for pie chart
  useEffect(() => {
    if (selectedWallet && allTransactions.length > 0) {
      const walletTxs = allTransactions.filter(tx => 
        tx.walletId === selectedWallet.id && 
        tx.type === 'EXPENSE' &&
        tx.category !== null  // Filter out transactions without category
      )
      
      const categorySpending = walletTxs.reduce((acc, tx) => {
        const categoryName = tx.category.name
        if (!acc[categoryName]) {
          acc[categoryName] = 0
        }
        acc[categoryName] += tx.amount
        return acc
      }, {} as Record<string, number>)
      
      // Generate colors
      const colors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', 
        '#FF9F40', '#8AC926', '#1982C4', '#6A4C93', '#FF595E'
      ]
      
      const result = Object.entries(categorySpending).map(([name, amount], index) => ({
        name,
        amount,
        color: colors[index % colors.length]
      }))
      
      setSpendingByCategory(result.sort((a, b) => b.amount - a.amount))
    }
  }, [selectedWallet, allTransactions])
  
  // Get monthly transaction history data for the bar chart
  useEffect(() => {
    if (selectedWallet && allTransactions.length > 0) {
      const now = new Date()
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(now.getMonth() - 5)
      
      // Create an array of last 6 months
      const months = Array.from({ length: 6 }, (_, i) => {
        const date = new Date()
        date.setMonth(now.getMonth() - 5 + i)
        return {
          month: date.toLocaleString('id-ID', { month: 'short' }),
          year: date.getFullYear(),
          income: 0,
          expense: 0
        }
      })
      
      // Fill in transaction data
      allTransactions.forEach(tx => {
        if (tx.walletId !== selectedWallet.id) return
        
        const txDate = new Date(tx.date)
        if (txDate < sixMonthsAgo) return
        
        const monthName = txDate.toLocaleString('id-ID', { month: 'short' })
        const monthIndex = months.findIndex(m => 
          m.month === monthName && m.year === txDate.getFullYear()
        )
        
        if (monthIndex !== -1) {
          if (tx.type === 'INCOME') {
            months[monthIndex].income += tx.amount
          } else {
            months[monthIndex].expense += tx.amount
          }
        }
      })
      
      setTransactionHistory(months)
    }
  }, [selectedWallet, allTransactions])

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
    }).format(date);
  }

  const handleBudgetUpdate = async (budget: BudgetWithRelations) => {
    // Refresh data after budget update
    const response = await fetch('/api/budgets');
    if (response.ok) {
      const data = await response.json();
      setAllBudgets(data);
    }
  };

  // Calculate financial stats
  const calculateFinancialStats = () => {
    if (!selectedWallet) return { savingsRate: 0, expenseRatio: 0, topCategory: null }
    
    // Calculate savings rate (income - expense) / income
    const savingsRate = summary.income > 0 
      ? ((summary.income - summary.expense) / summary.income) * 100
      : 0
      
    // Calculate expense to income ratio
    const expenseRatio = summary.income > 0
      ? (summary.expense / summary.income) * 100
      : 0
      
    // Get top spending category
    const topCategory = spendingByCategory.length > 0 ? spendingByCategory[0] : null
    
    return { savingsRate, expenseRatio, topCategory }
  }
  
  const stats = calculateFinancialStats()
  
  // Prepare chart data
  const pieChartData = {
    labels: spendingByCategory.map(cat => cat.name),
    datasets: [
      {
        data: spendingByCategory.map(cat => cat.amount),
        backgroundColor: spendingByCategory.map(cat => cat.color),
        borderColor: spendingByCategory.map(cat => cat.color),
        borderWidth: 1,
      },
    ],
  }
  
  const barChartData = {
    labels: transactionHistory.map(m => m.month),
    datasets: [
      {
        label: 'Pemasukan',
        data: transactionHistory.map(m => m.income),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
      },
      {
        label: 'Pengeluaran',
        data: transactionHistory.map(m => m.expense),
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
      },
    ],
  }
  
  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 1.2,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          boxWidth: 10,
          padding: 10,
          font: {
            size: 11,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const value = context.raw;
            const dataset = context.dataset;
            const total = dataset.data.reduce((sum: number, val: number) => sum + val, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
          }
        }
      }
    },
  }
  
  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 1.5,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          boxWidth: 10,
          padding: 5,
          font: {
            size: 11,
          },
        },
      },
      title: {
        display: true,
        text: 'Pemasukan dan Pengeluaran 6 Bulan Terakhir',
        font: {
          size: 12,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return formatCurrency(value);
          }
        }
      }
    }
  }
  
  // Handle transaction save
  const handleSaveTransaction = async (transactionData: any) => {
    try {
      // Fetch updated transactions
      const response = await fetch('/api/transactions');
      if (response.ok) {
        const data = await response.json();
        setAllTransactions(data);
      }
      
      // Refresh wallet balances
      await refreshWallets();
      
      // Close modal
      setIsTransactionModalOpen(false);
    } catch (error) {
      console.error('Error saving transaction:', error);
    }
  };

  if (!selectedWallet) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-blue-700 to-blue-500 rounded-xl p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Beranda</h1>
            <p className="text-blue-100 mt-1">Selamat datang kembali! Pantau keuangan Anda.</p>
          </div>
          
          <div className="mt-4 md:mt-0">
            <WalletSelector displayBalance={summary.total} />
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="mb-4">
          <select 
            className="bg-white/20 text-white border border-white/40 rounded-md p-2 text-sm [&>option]:text-black"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
          >
            <option value="all">Semua Waktu</option>
            <option value="daily">Hari Ini</option>
            <option value="weekly">7 Hari Terakhir</option>
            <option value="monthly">Bulan Ini</option>
            <option value="quarterly">3 Bulan Terakhir</option>
            <option value="yearly">Tahun Ini</option>
          </select>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 hover:bg-white/20 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-blue-100">Total Saldo</h3>
                <p className="text-2xl font-bold">{formatCurrency(summary.total)}</p>
              </div>
              <div className="p-3 bg-white/20 rounded-full">
                <FiDollarSign size={24} />
              </div>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 hover:bg-white/20 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-blue-100">Pemasukan</h3>
                <p className="text-2xl font-bold text-green-300">{formatCurrency(summary.income)}</p>
              </div>
              <div className="p-3 bg-green-400/20 rounded-full">
                <FiArrowDownLeft size={24} />
              </div>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 hover:bg-white/20 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-blue-100">Pengeluaran</h3>
                <p className="text-2xl font-bold text-red-300">{formatCurrency(summary.expense)}</p>
              </div>
              <div className="p-3 bg-red-400/20 rounded-full">
                <FiArrowUpRight size={24} />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Financial Advice Banner (Conditional) */}
      {showTips && (
        <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4 relative">
          <button 
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
            onClick={() => setShowTips(false)}
          >
            ×
          </button>
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-yellow-100 rounded-full flex-shrink-0">
              <FiAlertCircle className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <h3 className="font-semibold text-yellow-800">Tip Keuangan</h3>
              <p className="text-yellow-700 mt-1">
                {financialTips[Math.floor(Math.random() * financialTips.length)].description}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Tab Navigation */}
      <div className="border-b">
        <nav className="flex space-x-4 relative">
          <div className="flex items-center">
            <button
              className={`py-2 px-1 text-base font-medium border-b-2 transition-colors duration-150 ${
                activeTab === 'overview' 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('overview')}
            >
              Ringkasan
            </button>
            
            {activeTab === 'overview' && (
              <button
                onClick={() => setIsEditModeRingkasan(!isEditModeRingkasan)}
                className="ml-2 text-indigo-600 hover:text-indigo-800 focus:outline-none"
                title={isEditModeRingkasan ? "Selesai Edit" : "Edit Ringkasan"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                </svg>
              </button>
            )}
          </div>
          
          <button
            className={`py-2 px-1 text-base font-medium border-b-2 transition-colors duration-150 ${
              activeTab === 'transactions' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('transactions')}
          >
            Transaksi
          </button>
          
          <button
            className={`py-2 px-1 text-base font-medium border-b-2 transition-colors duration-150 ${
              activeTab === 'budget' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('budget')}
          >
            Budget
          </button>
          
          <button
            className={`py-2 px-1 text-base font-medium border-b-2 transition-colors duration-150 ${
              activeTab === 'analytics' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('analytics')}
          >
            Analisis
          </button>
        </nav>
      </div>
      
      {/* Tab content */}
      <div className="py-4">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div>
            {/* Customizable content for Ringkasan */}
            <CustomizableTabContent
              isEditMode={isEditModeRingkasan}
              onSaveChanges={(widgets) => {
                console.log('Debug - onSaveChanges called with widgets:', widgets);
                
                // Check if widgets is valid
                if (!widgets || !Array.isArray(widgets)) {
                  console.error('Invalid widgets data received:', widgets);
                  return;
                }
                
                // Simpan ke state lokal
                setRingkasanWidgets(widgets);
                
                // Simpan ke localStorage untuk persistensi
                localStorage.setItem('ringkasanWidgets', JSON.stringify(widgets));
                console.log('Debug - Saved widgets to localStorage during onSaveChanges');
                
                // Tutup mode edit
                setIsEditModeRingkasan(false);
              }}
              onCancelEdit={() => setIsEditModeRingkasan(false)}
              selectedWalletId={selectedWallet?.id}
              initialWidgets={ringkasanWidgets}
            />
          </div>
        )}
        
        {/* TRANSACTION TAB */}
        {activeTab === 'transactions' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Transaksi Terbaru</h2>
              <a href="/transactions" className="text-blue-600 text-sm hover:underline flex items-center">
                <FiEye className="mr-1" /> Lihat Semua
              </a>
            </div>
            
            <div className="space-y-2">
              {filteredTransactions.length > 0 ? (
                <>
                  {filteredTransactions.slice(0, showAllTransactions ? filteredTransactions.length : 5).map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center">
                        <div className={`p-2 rounded-full ${
                          tx.type === 'INCOME' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                        }`}>
                          {tx.type === 'INCOME' ? 
                            <FiArrowDownLeft size={16} /> : 
                            <FiArrowUpRight size={16} />
                          }
                        </div>
                        <div className="ml-3">
                          <p className="font-medium">{tx.description || 'Unnamed Transaction'}</p>
                          <div className="flex text-sm">
                            <span className="text-gray-500">{tx.category ? tx.category.name : 'Uncategorized'}</span>
                            <span className="mx-2 text-gray-300">•</span>
                            <span className="text-gray-500">{formatDate(tx.date)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-medium ${tx.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.type === 'INCOME' ? '+' : '-'} {formatCurrency(tx.amount)}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {filteredTransactions.length > 5 && (
                    <button 
                      className="w-full py-2 text-center text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 rounded-lg transition-colors mt-2"
                      onClick={() => setShowAllTransactions(!showAllTransactions)}
                    >
                      {showAllTransactions ? 'Tampilkan Lebih Sedikit' : 'Tampilkan Semua'}
                    </button>
                  )}
                </>
              ) : (
                <p className="text-gray-500 text-center py-8">Tidak ada transaksi untuk dompet ini</p>
              )}
            </div>
          </div>
        )}
        
        {/* BUDGET TAB */}
        {activeTab === 'budget' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Budget Bulanan</h2>
              <a href="/budgets" className="text-blue-600 text-sm hover:underline">Kelola Budget</a>
            </div>
            
            <div className="space-y-4">
              {filteredBudgets.length > 0 ? (
                filteredBudgets.map((budget) => (
                  <BudgetProgress 
                    key={budget.id} 
                    budget={budget} 
                    onUpdate={handleBudgetUpdate} 
                  />
                ))
              ) : (
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">Belum ada anggaran</p>
                  <button 
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                    onClick={() => router.push('/budgets')}
                  >
                    Buat anggaran baru
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* ANALYSIS TAB */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-medium text-gray-700 mb-3">Distribusi Pengeluaran</h3>
                {spendingByCategory.length > 0 ? (
                  <div className="h-80">
                    <Pie data={pieChartData} options={pieChartOptions} />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-80 text-gray-400">
                    Belum ada data pengeluaran
                  </div>
                )}
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-medium text-gray-700 mb-3">Tren Pemasukan/Pengeluaran</h3>
                {transactionHistory.length > 0 ? (
                  <div className="h-80">
                    <Bar data={barChartData} options={barChartOptions} />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-80 text-gray-400">
                    Data tidak cukup untuk menampilkan tren
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-medium text-gray-700 mb-3">Kategori Pengeluaran Terbesar</h3>
              
              {spendingByCategory.length > 0 ? (
                <div className="space-y-3">
                  {spendingByCategory.slice(0, 5).map((category, index) => (
                    <div key={index} className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: category.color }}
                      ></div>
                      <div className="flex-grow">
                        <div className="flex justify-between mb-1">
                          <span>{category.name}</span>
                          <span className="font-medium">{formatCurrency(category.amount)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full" 
                            style={{ 
                              width: `${(category.amount / spendingByCategory[0].amount) * 100}%`,
                              backgroundColor: category.color 
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">Belum ada data pengeluaran</p>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        onSave={handleSaveTransaction}
        initialData={{ type: transactionType }}
        isQuickAction={true}
      />
    </div>
  );
};

export default DashboardContent; 