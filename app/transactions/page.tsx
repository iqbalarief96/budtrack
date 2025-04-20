'use client'

import React, { useState, useEffect } from 'react'
import { FiPlus, FiFilter, FiEdit2, FiTrash2, FiChevronUp, FiChevronDown } from 'react-icons/fi'
import { useWallet } from '../providers/WalletProvider'
import TransactionModal from '../components/TransactionModal'
import FilterModal from '../components/FilterModal'
import { formatCurrency } from '../lib/utils'
import { useRouter, useSearchParams } from 'next/navigation'

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
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [activeFilters, setActiveFilters] = useState<FilterValues>({})
  const [initialType, setInitialType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE')
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'date', direction: 'desc' })

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions')
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch transactions when wallet changes
  useEffect(() => {
    fetchTransactions(activeFilters)
  }, [selectedWallet, activeFilters])
  
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

  // Sort indicator component
  const SortIndicator = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig.key !== columnKey) return null;
    return sortConfig.direction === 'asc' ? <FiChevronUp className="inline ml-1" /> : <FiChevronDown className="inline ml-1" />;
  }

  if (!selectedWallet) {
    return (
      <div className="text-center py-8 text-gray-500">
        Pilih dompet terlebih dahulu
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Transaksi</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setIsFilterModalOpen(true)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
          >
            <FiFilter />
            Filter
          </button>
          <button
            onClick={() => {
              setEditingTransaction(null)
              setIsModalOpen(true)
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <FiPlus />
            Tambah
          </button>
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
    </div>
  )
}

export default TransactionsPage 