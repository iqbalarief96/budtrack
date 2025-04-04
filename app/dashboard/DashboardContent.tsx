'use client'

import React, { useEffect, useState } from 'react'
import { FiArrowUpRight, FiArrowDownLeft, FiDollarSign, FiTrendingUp, FiAlertCircle, FiPieChart, FiBarChart2, FiCalendar, FiEye } from 'react-icons/fi'
import { useWallet } from '../providers/WalletProvider'
import WalletSelector from '../components/WalletSelector'
import type { Budget } from '@/app/types/budget'
import type { Category } from '@/app/types/category'
import type { Wallet } from '@/app/types/wallet'
import BudgetProgress from '@/components/budget/BudgetProgress'
import EmergencyFundCard from '@/components/dashboard/EmergencyFundCard'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js'
import { Pie, Bar } from 'react-chartjs-2'
import TransactionModal from '@/app/components/TransactionModal'

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
  // Get the selected wallet from context
  const { selectedWallet, refreshWallets } = useWallet()

  // State for dashboard items
  const [summary, setSummary] = useState({
    totalBalance: 0,
    income: 0,
    expense: 0,
  })
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([])
  const [allBudgets, setAllBudgets] = useState<BudgetWithRelations[]>(budgets)
  const [showTips, setShowTips] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [transactionHistory, setTransactionHistory] = useState([])
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [spendingByCategory, setSpendingByCategory] = useState<{ name: string; amount: number; color: string }[]>([])
  const [financialTips, setFinancialTips] = useState<{ id: number; title: string; description: string }[]>([
    { id: 1, title: 'Tabungan Darurat', description: 'Sisihkan 20% penghasilan setiap bulan untuk dana darurat' },
    { id: 2, title: 'Atur Budget', description: 'Tentukan batas maksimal untuk kategori pengeluaran non-esensial' },
    { id: 3, title: 'Lacak Pengeluaran', description: 'Catat semua pengeluaran untuk identifikasi area yang bisa dihemat' },
  ])
  const [showAllTransactions, setShowAllTransactions] = useState(false)
  
  // State for transaction modal
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false)
  const [transactionType, setTransactionType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE')

  // Filtered transactions and budgets
  const transactions = selectedWallet 
    ? allTransactions.filter(tx => tx.walletId === selectedWallet.id)
    : []
  const filteredBudgets = selectedWallet && allBudgets
    ? allBudgets.filter(budget => budget.walletId === selectedWallet.id)
    : allBudgets || []

  useEffect(() => {
    // Fetch transactions
    const fetchTransactions = async () => {
      try {
        const response = await fetch('/api/transactions');
        if (response.ok) {
          const data = await response.json();
          setAllTransactions(data);
        }
      } catch (error) {
        console.error('Error fetching transactions:', error);
      }
    };

    fetchTransactions();
  }, []);

  // Update summary whenever the selected wallet changes
  useEffect(() => {
    if (selectedWallet) {
      const walletTransactions = allTransactions.filter(tx => tx.walletId === selectedWallet.id)
      
      const income = walletTransactions
        .filter(tx => tx.type === 'INCOME')
        .reduce((sum, tx) => sum + tx.amount, 0)
      
      const expense = walletTransactions
        .filter(tx => tx.type === 'EXPENSE')
        .reduce((sum, tx) => sum + tx.amount, 0)
      
      setSummary({
        totalBalance: selectedWallet.balance,
        income,
        expense,
      })
    }
  }, [selectedWallet, allTransactions])

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
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          boxWidth: 12,
          padding: 15,
        },
      },
    },
  }
  
  const barChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Pemasukan dan Pengeluaran 6 Bulan Terakhir',
      },
    },
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
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-700 to-blue-500 rounded-xl p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Beranda</h1>
            <p className="text-blue-100 mt-1">Selamat datang kembali! Pantau keuangan Anda.</p>
          </div>
          
          <div className="mt-4 md:mt-0">
            <WalletSelector />
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 hover:bg-white/20 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-blue-100">Total Saldo</h3>
                <p className="text-2xl font-bold">{formatCurrency(summary.totalBalance)}</p>
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
      
      {/* Main Dashboard Tabs */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="flex border-b">
          <button 
            className={`px-4 py-3 font-medium ${activeTab === 'overview' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-blue-600'}`}
            onClick={() => setActiveTab('overview')}
          >
            Ringkasan
          </button>
          <button 
            className={`px-4 py-3 font-medium ${activeTab === 'transactions' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-blue-600'}`}
            onClick={() => setActiveTab('transactions')}
          >
            Transaksi
          </button>
          <button 
            className={`px-4 py-3 font-medium ${activeTab === 'budget' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-blue-600'}`}
            onClick={() => setActiveTab('budget')}
          >
            Budget
          </button>
          <button 
            className={`px-4 py-3 font-medium ${activeTab === 'analytics' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-blue-600'}`}
            onClick={() => setActiveTab('analytics')}
          >
            Analisis
          </button>
        </div>
        
        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Financial Health Indicators */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                  <div className="flex items-center mb-2">
                    <FiTrendingUp className="mr-2 text-blue-500" />
                    <h3 className="font-medium">Tingkat Tabungan</h3>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{stats.savingsRate.toFixed(1)}%</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {stats.savingsRate >= 20 ? 'Sangat baik!' : 'Coba tingkatkan ke 20%'}
                  </p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                  <div className="flex items-center mb-2">
                    <FiPieChart className="mr-2 text-purple-500" />
                    <h3 className="font-medium">Rasio Pengeluaran</h3>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">{stats.expenseRatio.toFixed(1)}%</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {stats.expenseRatio <= 70 ? 'Terkendali' : 'Coba kurangi pengeluaran'}
                  </p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                  <div className="flex items-center mb-2">
                    <FiBarChart2 className="mr-2 text-orange-500" />
                    <h3 className="font-medium">Kategori Terbesar</h3>
                  </div>
                  {stats.topCategory ? (
                    <>
                      <p className="text-2xl font-bold text-orange-600">{stats.topCategory.name}</p>
                      <p className="text-sm text-gray-500 mt-1">{formatCurrency(stats.topCategory.amount)}</p>
                    </>
                  ) : (
                    <p className="text-gray-500">Belum ada data</p>
                  )}
                </div>
              </div>
              
              {/* Charts & Recent Transactions */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 space-y-6">
                  {/* Bar Chart */}
                  <div className="bg-white rounded-lg border border-gray-200 p-4 h-80">
                    <h3 className="font-medium text-gray-700 mb-4">Tren Keuangan</h3>
                    {transactionHistory.length > 0 ? (
                      <Bar data={barChartData} options={barChartOptions} />
                    ) : (
                      <div className="flex items-center justify-center h-64 text-gray-400">
                        Data tidak cukup untuk menampilkan tren
                      </div>
                    )}
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="bg-gray-50 rounded-lg border border-gray-100 p-4">
                    <h3 className="font-medium text-gray-700 mb-3">Aksi Cepat</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <button 
                        onClick={() => {
                          setTransactionType('EXPENSE');
                          setIsTransactionModalOpen(true);
                        }}
                        className="bg-white p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-gray-50 text-center transition duration-200"
                      >
                        <div className="flex flex-col items-center">
                          <FiArrowUpRight className="h-6 w-6 text-red-500 mb-1" />
                          <span className="text-sm">Tambah Pengeluaran</span>
                        </div>
                      </button>
                      <button 
                        onClick={() => {
                          setTransactionType('INCOME');
                          setIsTransactionModalOpen(true);
                        }}
                        className="bg-white p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-gray-50 text-center transition duration-200"
                      >
                        <div className="flex flex-col items-center">
                          <FiArrowDownLeft className="h-6 w-6 text-green-500 mb-1" />
                          <span className="text-sm">Tambah Pemasukan</span>
                        </div>
                      </button>
                      <a href="/budgets" className="bg-white p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-gray-50 text-center transition duration-200">
                        <div className="flex flex-col items-center">
                          <FiBarChart2 className="h-6 w-6 text-blue-500 mb-1" />
                          <span className="text-sm">Atur Budget</span>
                        </div>
                      </a>
                      <a href="/goals" className="bg-white p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-gray-50 text-center transition duration-200">
                        <div className="flex flex-col items-center">
                          <FiCalendar className="h-6 w-6 text-purple-500 mb-1" />
                          <span className="text-sm">Kelola Goals</span>
                        </div>
                      </a>
                    </div>
                  </div>
                </div>
                
                {/* Right Column */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Pie Chart */}
                  <div className="bg-white rounded-lg border border-gray-200 p-4 h-80">
                    <h3 className="font-medium text-gray-700 mb-4">Distribusi Pengeluaran</h3>
                    {spendingByCategory.length > 0 ? (
                      <div className="h-64">
                        <Pie data={pieChartData} options={pieChartOptions} />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-64 text-gray-400">
                        Belum ada data pengeluaran
                      </div>
                    )}
                  </div>
                  
                  {/* Emergency Fund */}
                  <EmergencyFundCard />
                </div>
              </div>
            </div>
          )}
          
          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Transaksi Terbaru</h2>
                <a href="/transactions" className="text-blue-600 text-sm hover:underline flex items-center">
                  <FiEye className="mr-1" /> Lihat Semua
                </a>
              </div>
              
              <div className="space-y-2">
                {transactions.length > 0 ? (
                  <>
                    {transactions.slice(0, showAllTransactions ? transactions.length : 5).map((tx) => (
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
                    
                    {transactions.length > 5 && (
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
          
          {/* Budget Tab */}
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
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <p className="text-gray-500 mb-3">Belum ada budget untuk dompet ini</p>
                    <a href="/budgets" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-block">Buat Budget</a>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h3 className="font-medium text-gray-700 mb-4">Distribusi Pengeluaran</h3>
                  {spendingByCategory.length > 0 ? (
                    <div className="h-64">
                      <Pie data={pieChartData} options={pieChartOptions} />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-gray-400">
                      Belum ada data pengeluaran
                    </div>
                  )}
                </div>
                
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h3 className="font-medium text-gray-700 mb-4">Tren Pemasukan/Pengeluaran</h3>
                  {transactionHistory.length > 0 ? (
                    <div className="h-64">
                      <Bar data={barChartData} options={barChartOptions} />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-gray-400">
                      Data tidak cukup untuk menampilkan tren
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-medium text-gray-700 mb-4">Kategori Pengeluaran Terbesar</h3>
                
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