'use client'

import React, { useState, useEffect } from 'react'
import { FiPlus, FiFilter, FiEdit2, FiTrash2, FiChevronUp, FiChevronDown, FiUpload, FiRefreshCw } from 'react-icons/fi'
import { useWallet } from '../providers/WalletProvider'
import TransactionModal from '../components/TransactionModal'
import FilterModal from '../components/FilterModal'
import ImportModal from '../components/ImportModal'
import { formatCurrency } from '../lib/utils'
import { useRouter, useSearchParams } from 'next/navigation'
import { Insight } from '../lib/insights'
import { FiArrowUp, FiArrowDown } from 'react-icons/fi'
import { MicrophoneIcon } from '@heroicons/react/24/solid';
import { VoiceTransactionModal } from '../components/VoiceTransactionModal';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// Define Transaction type
type Transaction = {
  id: string
  type: 'INCOME' | 'EXPENSE'
  amount: number
  description: string
  date: string
  category: {
    id: string
    name: string
    type: string
  }
  wallet: {
    id: string
    name: string
    currencyCode: string
  }
  [key: string]: any // Allow indexing with string
}

type FilterValues = {
  type?: 'INCOME' | 'EXPENSE'
  categoryId?: string
  dateRange?: { start?: string; end?: string }
  amountRange?: { min?: number; max?: number }
}

type SortConfig = {
  key: string
  direction: 'asc' | 'desc'
}

// Constants for localStorage keys
const AI_MODE_KEY = 'budtrack_insights_ai_mode';
const PERIOD_KEY = 'budtrack_insights_period';
const INSIGHTS_CACHE_KEY = 'budtrack_insights_cache';
const WALLET_INSIGHTS_TIMESTAMP_KEY = 'budtrack_insights_timestamp';

const TransactionsPage = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const typeParam = searchParams.get('type')
  
  const { selectedWallet, refreshWallets } = useWallet()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [activeFilters, setActiveFilters] = useState<FilterValues>({})
  const [initialType, setInitialType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE')
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'date', direction: 'desc' })
  const [insights, setInsights] = useState<Insight[]>([])
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [totalIncome, setTotalIncome] = useState(0)
  const [totalExpense, setTotalExpense] = useState(0)
  const [useAI, setUseAI] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState('monthly')
  
  // Hydration-safe localStorage init
  const [isClientSide, setIsClientSide] = useState(false)
  
  // Check if we're on client-side
  useEffect(() => {
    setIsClientSide(true)
    
    // Get saved AI mode state
    try {
      const savedAIMode = localStorage.getItem(AI_MODE_KEY);
      if (savedAIMode) {
        setUseAI(savedAIMode === 'true');
      }
      
      // Get saved period preference
      const savedPeriod = localStorage.getItem(PERIOD_KEY);
      if (savedPeriod) {
        setSelectedPeriod(savedPeriod);
      }
    } catch (error) {
      console.error('Error reading from localStorage:', error);
    }
  }, []);

  // Handle AI mode toggle with localStorage persistence
  const handleAIModeToggle = (checked: boolean) => {
    setUseAI(checked);
    
    // Save to localStorage
    if (isClientSide) {
      try {
        localStorage.setItem(AI_MODE_KEY, checked.toString());
        
        // Clear cached insights to force a refresh
        if (selectedWallet) {
          localStorage.removeItem(`${INSIGHTS_CACHE_KEY}_${selectedWallet.id}`);
          localStorage.removeItem(`${WALLET_INSIGHTS_TIMESTAMP_KEY}_${selectedWallet.id}`);
        }
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }
    }
    
    // Always fetch new insights when toggling AI mode
    setInsightsLoading(true);
    fetchInsights();
  };
  
  // Handle period change with localStorage persistence
  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    
    // Save to localStorage
    if (isClientSide) {
      try {
        localStorage.setItem(PERIOD_KEY, period);
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }
    }
  };

  // Check for type parameter in URL and open transaction modal automatically
  useEffect(() => {
    if (typeParam) {
      const transactionType = typeParam.toUpperCase() === 'INCOME' ? 'INCOME' : 'EXPENSE'
      setInitialType(transactionType)
      setEditingTransaction(null)
      setIsModalOpen(true)
      
      // Clear the URL parameter after processing
      router.replace('/transactions', { scroll: false })
    }
  }, [typeParam, router])

  // Fetch transactions
  const fetchTransactions = async (filters = {}) => {
    setIsLoading(true)
    setError('')
    try {
      const queryParams = new URLSearchParams()
      if (selectedWallet) {
        queryParams.append('walletId', selectedWallet.id)
      }
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value.toString())
      })

      const response = await fetch(`/api/transactions?${queryParams.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch transactions')
      const data = await response.json()
      setTransactions(data)

      // Totals will be calculated in the useEffect that depends on transactions and selectedPeriod
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions')
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch insights
  const fetchInsights = async () => {
    if (!selectedWallet) return;
    
    // Check if we have cached insights for this wallet
    let shouldFetchFromAPI = true;
    
    if (isClientSide) {
      try {
        // Get the cached insights and timestamp
        const cachedInsightsData = localStorage.getItem(`${INSIGHTS_CACHE_KEY}_${selectedWallet.id}`);
        const cachedTimestamp = localStorage.getItem(`${WALLET_INSIGHTS_TIMESTAMP_KEY}_${selectedWallet.id}`);
        
        if (cachedInsightsData && cachedTimestamp) {
          // Check if cache is less than 1 hour old
          const timestamp = parseInt(cachedTimestamp, 10);
          const now = Date.now();
          const cacheAge = now - timestamp;
          const ONE_HOUR = 60 * 60 * 1000;
          
          if (cacheAge < ONE_HOUR) {
            // Use the cached insights
            const parsedInsights = JSON.parse(cachedInsightsData);
            setInsights(parsedInsights);
            setInsightsLoading(false);
            console.log('Using cached insights');
            shouldFetchFromAPI = false;
          }
        }
      } catch (error) {
        console.error('Error reading cached insights:', error);
      }
    }
    
    // Only fetch from API if needed
    if (shouldFetchFromAPI) {
      setInsightsLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (selectedWallet) {
          queryParams.append('walletId', selectedWallet.id);
        }
        
        // Add AI parameter
        if (useAI) {
          queryParams.append('useAI', 'true');
        }
        
        const response = await fetch(`/api/insights?${queryParams.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch insights');
        
        const data = await response.json();
        const newInsights = data.insights || [];
        setInsights(newInsights);
        
        // Cache the insights and timestamp
        if (isClientSide && selectedWallet) {
          try {
            localStorage.setItem(`${INSIGHTS_CACHE_KEY}_${selectedWallet.id}`, JSON.stringify(newInsights));
            localStorage.setItem(`${WALLET_INSIGHTS_TIMESTAMP_KEY}_${selectedWallet.id}`, Date.now().toString());
          } catch (error) {
            console.error('Error caching insights:', error);
          }
        }
      } catch (error) {
        console.error('Error fetching insights:', error);
      } finally {
        setInsightsLoading(false);
      }
    }
  };

  // Fetch transactions when wallet changes
  useEffect(() => {
    fetchTransactions(activeFilters)
  }, [selectedWallet, activeFilters])
  
  // Recalculate totals when transactions or period changes
  useEffect(() => {
    const { income, expense } = calculateTotals(transactions);
    setTotalIncome(income);
    setTotalExpense(expense);
  }, [transactions, selectedPeriod]);
  
  // Fetch insights when wallet changes
  useEffect(() => {
    fetchInsights()
  }, [selectedWallet, useAI])
  
  // Sort handler
  const handleSort = (key: string) => {
    setSortConfig((prevConfig) => {
      if (prevConfig.key === key) {
        return {
          key,
          direction: prevConfig.direction === 'asc' ? 'desc' : 'asc'
        }
      }
      return { key, direction: 'asc' }
    })
  }

  // Get sorted transactions
  const getSortedTransactions = (transactions: Transaction[], sortConfig: SortConfig) => {
    const sortableItems = [...transactions]
    
    sortableItems.sort((a, b) => {
      let aValue, bValue;
      
      // Extract the correct values based on the sort key
      switch (sortConfig.key) {
        case 'date':
          aValue = new Date(a.date).getTime()
          bValue = new Date(b.date).getTime()
          break
        case 'description':
          aValue = a.description?.toLowerCase() || ''
          bValue = b.description?.toLowerCase() || ''
          break
        case 'category':
          aValue = a.category?.name?.toLowerCase() || ''
          bValue = b.category?.name?.toLowerCase() || ''
          break
        case 'wallet':
          aValue = a.wallet?.name?.toLowerCase() || ''
          bValue = b.wallet?.name?.toLowerCase() || ''
          break
        case 'amount':
          aValue = a.amount
          bValue = b.amount
          break
        default:
          aValue = a[sortConfig.key] || ''
          bValue = b[sortConfig.key] || ''
      }
      
      // Perform the actual comparison
      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1
      }
      return 0
    })
    
    return sortableItems
  }
  
  // Filter transactions based on selected wallet and filters
  const filteredTransactions = getSortedTransactions(
    transactions.filter(tx => {
      if (!activeFilters) return true
      
      // Filter by type
      if (activeFilters.type && tx.type !== activeFilters.type) return false
      
      // Filter by category
      if (activeFilters.categoryId && tx.category.id !== activeFilters.categoryId) return false
      
      // Filter by date range
      if (activeFilters.dateRange) {
        const txDate = new Date(tx.date)
        if (activeFilters.dateRange.start && txDate < new Date(activeFilters.dateRange.start)) return false
        if (activeFilters.dateRange.end && txDate > new Date(activeFilters.dateRange.end)) return false
      }
      
      // Filter by amount range
      if (activeFilters.amountRange) {
        if (activeFilters.amountRange.min && tx.amount < activeFilters.amountRange.min) return false
        if (activeFilters.amountRange.max && tx.amount > activeFilters.amountRange.max) return false
      }
      
      return true
    }),
    sortConfig
  )

  // Handle transaction save
  const handleSaveTransaction = async (transactionData: any) => {
    try {
      // Wait for the transaction to be saved (handled by TransactionModal)
      console.log('Transaction saved:', transactionData);
      
      // Refresh transaction list
      await fetchTransactions(activeFilters);
      
      // Refresh wallet balances
      await refreshWallets();
      
      // Close modal and reset editing state
      setIsModalOpen(false);
      setEditingTransaction(null);
      
      // Force refresh page to ensure all data is updated correctly
      window.location.reload();
    } catch (error) {
      console.error('Error handling transaction save:', error);
    }
  }

  // Handle transaction delete
  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) return
    
    try {
      const response = await fetch(`/api/transactions?id=${id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete transaction')
      }

      await fetchTransactions()
      await refreshWallets()
      
      // Force refresh halaman untuk memastikan saldo diperbarui
      window.location.reload()
    } catch (error) {
      console.error('Error deleting transaction:', error)
    }
  }

  const handleFilter = (filters: FilterValues) => {
    setActiveFilters(filters)
    setIsFilterModalOpen(false)
  }
  
  // Handle import complete
  const handleImportComplete = async () => {
    // Refresh transactions after import
    await fetchTransactions(activeFilters)
    await refreshWallets()
    
    // Force refresh page to ensure all data is updated correctly
    window.location.reload()
  }

  // Sort indicator component
  const SortIndicator = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig.key !== columnKey) return null;
    return sortConfig.direction === 'asc' ? <FiChevronUp className="inline ml-1" /> : <FiChevronDown className="inline ml-1" />;
  }

  // Update the calculation logic for totals based on period selection
  const calculateTotals = (transactions: Transaction[]) => {
    const now = new Date();
    let periodStart = new Date();
    
    // Set period start date based on selection
    switch (selectedPeriod) {
      case 'weekly':
        // Get start of current week (Sunday)
        const dayOfWeek = now.getDay();
        periodStart.setDate(now.getDate() - dayOfWeek);
        periodStart.setHours(0, 0, 0, 0);
        break;
      case 'monthly':
        // Get start of current month
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarterly':
        // Get start of current quarter
        const quarter = Math.floor(now.getMonth() / 3);
        periodStart = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case 'yearly':
        // Get start of current year
        periodStart = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1); // Default to monthly
    }
    
    const filteredTransactions = transactions.filter((tx: Transaction) => 
      new Date(tx.date) >= periodStart
    );
    
    const income = filteredTransactions
      .filter((tx: Transaction) => tx.type === 'INCOME')
      .reduce((sum: number, tx: Transaction) => sum + tx.amount, 0);
      
    const expense = filteredTransactions
      .filter((tx: Transaction) => tx.type === 'EXPENSE')
      .reduce((sum: number, tx: Transaction) => sum + tx.amount, 0);
      
    return { income, expense };
  };

  // Add a refresh button for insights
  const handleRefreshInsights = () => {
    // Clear the cache for this wallet
    if (isClientSide && selectedWallet) {
      try {
        localStorage.removeItem(`${INSIGHTS_CACHE_KEY}_${selectedWallet.id}`);
        localStorage.removeItem(`${WALLET_INSIGHTS_TIMESTAMP_KEY}_${selectedWallet.id}`);
      } catch (error) {
        console.error('Error clearing cached insights:', error);
      }
    }
    
    setInsightsLoading(true);
    fetchInsights();
  };

  if (!selectedWallet) {
    return (
      <div className="text-center py-8 text-gray-500">
        Pilih dompet terlebih dahulu
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Transactions - {selectedWallet?.name || 'Personal'}</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setIsFilterModalOpen(true)}
            className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            <FiFilter className="mr-2" />
            Filter
          </button>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <FiUpload className="mr-2" />
            Import
          </button>
          <VoiceTransactionModal 
            buttonVariant="outline"
            buttonText="Voice"
            onSuccess={handleImportComplete}
            className="bg-purple-600 text-white hover:bg-purple-700 border-0"
          />
          <button
            onClick={() => {
              setEditingTransaction(null);
              setIsModalOpen(true);
            }}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <FiPlus className="mr-2" />
            Add Transaction
          </button>
        </div>
      </div>

      {/* Transaction Summary Section */}
      <div className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly Summary Card */}
        <div className="bg-white rounded-lg p-5 shadow">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-medium">
              {selectedPeriod === 'weekly' && 'Ringkasan Minggu Ini'}
              {selectedPeriod === 'monthly' && 'Ringkasan Bulan Ini'}
              {selectedPeriod === 'quarterly' && 'Ringkasan Kuartal Ini'}
              {selectedPeriod === 'yearly' && 'Ringkasan Tahun Ini'}
            </h3>
            <select 
              className="text-sm border border-gray-200 rounded-md p-1"
              value={selectedPeriod}
              onChange={(e) => handlePeriodChange(e.target.value)}
            >
              <option value="weekly">Mingguan</option>
              <option value="monthly">Bulanan</option>
              <option value="quarterly">Kuartalan</option>
              <option value="yearly">Tahunan</option>
            </select>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Income</span>
            <span className="font-medium text-green-600">{formatCurrency(totalIncome)}</span>
          </div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-600">Expense</span>
            <span className="font-medium text-red-600">{formatCurrency(totalExpense)}</span>
          </div>
          
          {/* Income vs Expense Bar */}
          <div className="mb-2">
            <div className="text-xs text-gray-500 mb-1">Income vs Expense</div>
            <div className="h-4 bg-gray-100 rounded-full overflow-hidden flex">
              <div 
                className="h-full bg-green-500 transition-all duration-500"
                style={{
                  width: `${totalIncome && totalExpense ? (totalIncome / (totalIncome + totalExpense)) * 100 : 50}%`
                }}
              ></div>
              <div 
                className="h-full bg-red-500 transition-all duration-500"
                style={{
                  width: `${totalIncome && totalExpense ? (totalExpense / (totalIncome + totalExpense)) * 100 : 50}%`
                }}
              ></div>
            </div>
          </div>
          
          {/* Balance Info */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Balance</span>
              <span className={`font-medium ${totalIncome - totalExpense >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(totalIncome - totalExpense)}
              </span>
            </div>
          </div>
        </div>
        
        {/* Smart Insights */}
        <div className="bg-white rounded-lg p-5 shadow col-span-1 lg:col-span-2">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-medium">Smart Insights {useAI ? '🧠✨' : '🧠'}</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleRefreshInsights}
                className="text-xs text-gray-500 hover:text-blue-500 mr-2"
                title="Refresh insights"
              >
                <FiRefreshCw className="h-4 w-4" />
              </button>
              <Switch 
                id="ai-mode" 
                checked={useAI}
                onCheckedChange={handleAIModeToggle}
              />
              <Label htmlFor="ai-mode" className="text-xs text-gray-500">AI Mode</Label>
            </div>
          </div>
          
          {insightsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-pulse">Loading insights...</div>
            </div>
          ) : insights.length > 0 ? (
            <div className="space-y-2">
              {insights.map((insight, idx) => (
                <div 
                  key={idx} 
                  className={`p-3 rounded-lg ${
                    insight.type === 'warning' ? 'bg-amber-50 border-l-4 border-amber-500' : 
                    insight.type === 'success' ? 'bg-green-50 border-l-4 border-green-500' : 
                    'bg-blue-50 border-l-4 border-blue-500'
                  }`}
                >
                  <p className={`text-sm ${
                    insight.type === 'warning' ? 'text-amber-800' : 
                    insight.type === 'success' ? 'text-green-800' : 
                    'text-blue-800'
                  }`}>{insight.message}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-500">
              <p>Not enough transaction data for insights yet.</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Active Filters */}
      {Object.keys(activeFilters).length > 0 && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-600">Filter aktif:</span>
            {(Object.entries(activeFilters) as [string, FilterValues][]).map(([key, value]) => (
              value && typeof value !== 'object' && (
                <span key={key} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                  {key}: {String(value)}
                </span>
              )
            ))}
            <button
              onClick={() => setActiveFilters({})}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('date')}
              >
                Tanggal <SortIndicator columnKey="date" />
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('description')}
              >
                Deskripsi <SortIndicator columnKey="description" />
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('category')}
              >
                Kategori <SortIndicator columnKey="category" />
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('wallet')}
              >
                Dompet <SortIndicator columnKey="wallet" />
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('amount')}
              >
                Jumlah <SortIndicator columnKey="amount" />
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 whitespace-nowrap text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 whitespace-nowrap text-center text-gray-500">
                  Tidak ada transaksi
                </td>
              </tr>
            ) : (
              filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(transaction.date).toLocaleDateString('id-ID')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transaction.description || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transaction.category?.name || 'Tanpa Kategori'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transaction.wallet?.name || '-'}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${
                    transaction.type === 'EXPENSE' ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {transaction.type === 'EXPENSE' ? '-' : '+'}{formatCurrency(transaction.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => {
                        console.log('Edit button clicked for transaction:', transaction);
                        setEditingTransaction(transaction);
                        setIsModalOpen(true);
                      }}
                      className="text-blue-600 hover:text-blue-900 mx-1"
                    >
                      <FiEdit2 className="inline" />
                    </button>
                    <button
                      onClick={() => handleDeleteTransaction(transaction.id)}
                      className="text-red-600 hover:text-red-900 mx-1"
                    >
                      <FiTrash2 className="inline" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Transaction Modal */}
      {isModalOpen && (
        <TransactionModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingTransaction(null);
          }}
          onSave={handleSaveTransaction}
          initialData={editingTransaction || { type: initialType }}
        />
      )}

      {/* Filter Modal */}
      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApply={handleFilter}
        initialFilters={activeFilters}
      />
      
      {/* Import Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        wallets={selectedWallet ? [selectedWallet] : []}
        onImportComplete={handleImportComplete}
      />
    </div>
  )
}

export default TransactionsPage 