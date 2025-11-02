'use client'

import React, { useState, useEffect, useRef } from 'react'
import { FiPlus, FiFilter, FiEdit2, FiTrash2, FiChevronUp, FiChevronDown, FiUpload, FiRefreshCw, FiDownload } from 'react-icons/fi'
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
import { toast } from 'sonner';

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
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(() => new Set())
  const [isExporting, setIsExporting] = useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
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
  const selectAllRef = useRef<HTMLInputElement>(null)
  
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

  useEffect(() => {
    setSelectedTransactions(prev => {
      if (prev.size === 0) {
        return prev
      }
      const next = new Set<string>()
      transactions.forEach(tx => {
        if (prev.has(tx.id)) {
          next.add(tx.id)
        }
      })
      return next
    })
  }, [transactions])

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

  const selectedCount = selectedTransactions.size
  const isAllSelected = filteredTransactions.length > 0 && filteredTransactions.every(tx => selectedTransactions.has(tx.id))

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        selectedTransactions.size > 0 && selectedTransactions.size < filteredTransactions.length
    }
  }, [selectedTransactions, filteredTransactions.length])

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

      toast.success('Transaksi berhasil disimpan');
    } catch (error) {
      console.error('Error handling transaction save:', error);
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan transaksi');
    }
  }

  // Handle transaction delete
  const deleteTransactionsBatch = async (ids: string[], confirmMessage: string) => {
    if (ids.length === 0) return
    if (!confirm(confirmMessage)) return

    setIsBulkDeleting(true)

    try {
      const params = new URLSearchParams()
      if (ids.length === 1) {
        params.append('id', ids[0])
      } else {
        params.append('ids', ids.join(','))
      }

      const response = await fetch(`/api/transactions?${params.toString()}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to delete transaction')
      }

      const result = await response.json().catch(() => null)

      await fetchTransactions(activeFilters)
      await refreshWallets()
      setSelectedTransactions(new Set())

      const successMessage =
        (result && typeof result === 'object' && 'message' in result && typeof result.message === 'string')
          ? result.message
          : ids.length > 1
            ? `${ids.length} transaksi berhasil dihapus`
            : 'Transaksi berhasil dihapus'

      toast.success(successMessage)
    } catch (error) {
      console.error('Error deleting transactions:', error)
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan saat menghapus transaksi')
    } finally {
      setIsBulkDeleting(false)
    }
  }

  const handleDeleteTransaction = async (id: string) => {
    await deleteTransactionsBatch([id], 'Apakah Anda yakin ingin menghapus transaksi ini?')
  }

  const handleDeleteSelected = async () => {
    const ids = Array.from(selectedTransactions)
    if (ids.length === 0) return
    await deleteTransactionsBatch(ids, `Apakah Anda yakin ingin menghapus ${ids.length} transaksi terpilih?`)
  }

  const handleDeleteAll = async () => {
    const ids = filteredTransactions.map(tx => tx.id)
    if (ids.length === 0) return
    await deleteTransactionsBatch(ids, `Apakah Anda yakin ingin menghapus semua ${ids.length} transaksi yang sedang ditampilkan?`)
  }

  const toggleTransactionSelection = (transactionId: string) => {
    setSelectedTransactions(prev => {
      const next = new Set(prev)
      if (next.has(transactionId)) {
        next.delete(transactionId)
      } else {
        next.add(transactionId)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelectedTransactions(prev => {
      const next = new Set(prev)
      const allSelected = filteredTransactions.every(tx => next.has(tx.id))

      if (allSelected) {
        filteredTransactions.forEach(tx => next.delete(tx.id))
      } else {
        filteredTransactions.forEach(tx => next.add(tx.id))
      }

      return next
    })
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

    toast.success('Import transaksi selesai')
  }

  const handleExport = async () => {
    if (!selectedWallet) {
      toast.error('Pilih dompet terlebih dahulu sebelum mengekspor')
      return
    }

    setIsExporting(true)

    try {
      const params = new URLSearchParams()
      params.append('walletId', selectedWallet.id)

      if (activeFilters.type) {
        params.append('type', activeFilters.type)
      }

      if (activeFilters.categoryId) {
        params.append('categoryId', activeFilters.categoryId)
      }

      if (activeFilters.dateRange?.start) {
        params.append('startDate', activeFilters.dateRange.start)
      }

      if (activeFilters.dateRange?.end) {
        params.append('endDate', activeFilters.dateRange.end)
      }

      if (activeFilters.amountRange?.min !== undefined) {
        params.append('minAmount', String(activeFilters.amountRange.min))
      }

      if (activeFilters.amountRange?.max !== undefined) {
        params.append('maxAmount', String(activeFilters.amountRange.max))
      }

      const response = await fetch(`/api/transactions/export?${params.toString()}`)

      if (response.status === 204) {
        toast.info('Tidak ada transaksi yang cocok dengan filter untuk diekspor')
        return
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Gagal mengekspor transaksi')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const slug =
        selectedWallet.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'wallet'
      const fileName = `transactions-${slug}-${new Date().toISOString().split('T')[0]}.csv`

      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success('Export transaksi berhasil')
    } catch (error) {
      console.error('Error exporting transactions:', error)
      toast.error(error instanceof Error ? error.message : 'Gagal mengekspor transaksi')
    } finally {
      setIsExporting(false)
    }
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
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
      {/* Header - Desktop */}
      <div className="hidden md:flex justify-between items-center mb-8">
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
          <button
            onClick={handleDeleteSelected}
            disabled={selectedCount === 0 || isBulkDeleting}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <FiTrash2 className="mr-2" />
            Delete Selected
          </button>
          <button
            onClick={handleDeleteAll}
            disabled={filteredTransactions.length === 0 || isBulkDeleting}
            className="flex items-center px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <FiTrash2 className="mr-2" />
            Delete All
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isExporting ? <FiRefreshCw className="mr-2 animate-spin" /> : <FiDownload className="mr-2" />}
            Export
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

      {/* Header - Mobile */}
      <div className="md:hidden mb-4">
        <h1 className="text-lg font-bold mb-3">Transactions - {selectedWallet?.name || 'Personal'}</h1>

        {/* Action Buttons Row 1 */}
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => {
              setEditingTransaction(null);
              setIsModalOpen(true);
            }}
            className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <FiPlus className="mr-1 h-4 w-4" />
            Add
          </button>
          <button
            onClick={() => setIsFilterModalOpen(true)}
            className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
          >
            <FiFilter className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
          >
            <FiUpload className="h-4 w-4" />
          </button>
          <VoiceTransactionModal
            buttonVariant="outline"
            buttonText=""
            onSuccess={handleImportComplete}
            className="bg-purple-600 text-white hover:bg-purple-700 border-0 px-3 py-2 rounded-lg"
          />
        </div>

        {/* Action Buttons Row 2 - Bulk Actions */}
        {selectedCount > 0 && (
          <div className="flex gap-2">
            <button
              onClick={handleDeleteSelected}
              disabled={isBulkDeleting}
              className="flex-1 flex items-center justify-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60 text-sm"
            >
              <FiTrash2 className="mr-1 h-4 w-4" />
              Delete {selectedCount}
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60 text-sm"
            >
              {isExporting ? <FiRefreshCw className="animate-spin h-4 w-4" /> : <FiDownload className="h-4 w-4" />}
            </button>
          </div>
        )}
      </div>

      {/* Transaction Summary Section */}
      <div className="mb-4 sm:mb-8 grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Monthly Summary Card */}
        <div className="bg-white rounded-lg p-4 sm:p-5 shadow">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm sm:text-lg font-medium">
              {selectedPeriod === 'weekly' && 'Minggu Ini'}
              {selectedPeriod === 'monthly' && 'Bulan Ini'}
              {selectedPeriod === 'quarterly' && 'Kuartal Ini'}
              {selectedPeriod === 'yearly' && 'Tahun Ini'}
            </h3>
            <select
              className="text-xs sm:text-sm border border-gray-200 rounded-md p-1"
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
            <span className="text-xs sm:text-sm text-gray-600">Income</span>
            <span className="text-sm sm:text-base font-semibold text-green-600">{formatCurrency(totalIncome)}</span>
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs sm:text-sm text-gray-600">Expense</span>
            <span className="text-sm sm:text-base font-semibold text-red-600">{formatCurrency(totalExpense)}</span>
          </div>

          {/* Income vs Expense Bar */}
          <div className="mb-2">
            <div className="text-xs text-gray-500 mb-1">Income vs Expense</div>
            <div className="h-3 sm:h-4 bg-gray-100 rounded-full overflow-hidden flex">
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
          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm text-gray-600">Balance</span>
              <span className={`text-sm sm:text-base font-semibold ${totalIncome - totalExpense >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(totalIncome - totalExpense)}
              </span>
            </div>
          </div>
        </div>
        
        {/* Smart Insights */}
        <div className="bg-white rounded-lg p-4 sm:p-5 shadow col-span-1 lg:col-span-2">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm sm:text-lg font-medium">Smart Insights {useAI ? '🧠✨' : '🧠'}</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefreshInsights}
                className="text-xs text-gray-500 hover:text-blue-500 p-1"
                title="Refresh insights"
              >
                <FiRefreshCw className="h-4 w-4" />
              </button>
              <Switch
                id="ai-mode"
                checked={useAI}
                onCheckedChange={handleAIModeToggle}
              />
              <Label htmlFor="ai-mode" className="text-xs text-gray-500 hidden sm:inline">AI Mode</Label>
            </div>
          </div>

          {insightsLoading ? (
            <div className="flex items-center justify-center h-24 sm:h-32">
              <div className="animate-pulse text-sm text-gray-500">Loading insights...</div>
            </div>
          ) : insights.length > 0 ? (
            <div className="space-y-2 max-h-64 sm:max-h-none overflow-y-auto">
              {insights.map((insight, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 sm:p-3 rounded-lg ${
                    insight.type === 'warning' ? 'bg-amber-50 border-l-4 border-amber-500' :
                    insight.type === 'success' ? 'bg-green-50 border-l-4 border-green-500' :
                    'bg-blue-50 border-l-4 border-blue-500'
                  }`}
                >
                  <p className={`text-xs sm:text-sm leading-relaxed ${
                    insight.type === 'warning' ? 'text-amber-800' :
                    insight.type === 'success' ? 'text-green-800' :
                    'text-blue-800'
                  }`}>{insight.message}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-24 sm:h-32 text-gray-500">
              <p className="text-xs sm:text-sm text-center px-4">Not enough transaction data for insights yet.</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Active Filters */}
      {Object.keys(activeFilters).length > 0 && (
        <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs sm:text-sm font-medium text-gray-600">Filter aktif:</span>
            {(Object.entries(activeFilters) as [string, FilterValues][]).map(([key, value]) => (
              value && typeof value !== 'object' && (
                <span key={key} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs sm:text-sm">
                  {key}: {String(value)}
                </span>
              )
            ))}
            <button
              onClick={() => setActiveFilters({})}
              className="text-xs sm:text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-red-100 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Transactions Table - Desktop */}
      <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  aria-label="Pilih semua transaksi"
                />
              </th>
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
                <td colSpan={7} className="px-6 py-4 whitespace-nowrap text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 whitespace-nowrap text-center text-gray-500">
                  Tidak ada transaksi
                </td>
              </tr>
            ) : (
              filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedTransactions.has(transaction.id)}
                      onChange={() => toggleTransactionSelection(transaction.id)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      aria-label={`Pilih transaksi ${transaction.description || transaction.id}`}
                    />
                  </td>
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
                      className="text-red-600 hover:text-red-900 mx-1 disabled:opacity-60 disabled:cursor-not-allowed"
                      disabled={isBulkDeleting}
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

      {/* Transactions List - Mobile */}
      <div className="md:hidden bg-white rounded-lg shadow">
        {/* Select All Header */}
        <div className="px-3 py-2.5 bg-gray-50 border-b flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
            <input
              ref={selectAllRef}
              type="checkbox"
              checked={isAllSelected}
              onChange={toggleSelectAll}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Pilih Semua</span>
          </label>
          {selectedCount > 0 && (
            <span className="text-xs font-medium text-blue-600">{selectedCount} dipilih</span>
          )}
        </div>

        {/* Transaction Cards */}
        <div className="divide-y divide-gray-100">
          {isLoading ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">Loading...</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">Tidak ada transaksi</div>
          ) : (
            filteredTransactions.map((transaction) => (
              <div key={transaction.id} className="p-3 hover:bg-gray-50 active:bg-gray-100">
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={selectedTransactions.has(transaction.id)}
                    onChange={() => toggleTransactionSelection(transaction.id)}
                    className="h-4 w-4 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 line-clamp-1">
                          {transaction.description || '-'}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(transaction.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <div className={`text-sm font-bold flex-shrink-0 ${
                        transaction.type === 'EXPENSE' ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {transaction.type === 'EXPENSE' ? '-' : '+'}{formatCurrency(transaction.amount)}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        {transaction.category?.name || 'Tanpa Kategori'}
                      </span>
                      <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-gray-50 text-gray-600 border border-gray-200">
                        {transaction.wallet?.name || '-'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setEditingTransaction(transaction);
                          setIsModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded border border-blue-200"
                      >
                        <FiEdit2 className="h-3 w-3" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteTransaction(transaction.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded disabled:opacity-60 border border-red-200"
                        disabled={isBulkDeleting}
                      >
                        <FiTrash2 className="h-3 w-3" />
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
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
