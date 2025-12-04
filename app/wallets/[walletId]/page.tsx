'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, CreditCard, MoreHorizontal, Edit, Trash2 } from 'lucide-react'
import WalletSavingsDetail from '@/app/components/wallet/WalletSavingsDetail'

// Function untuk format currency
const formatCurrency = (amount: number, currencyCode = 'IDR') => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
  }).format(amount);
};

interface Transaction {
  id: string
  amount: number
  type: string
  date: string
  description: string
  category?: {
    id: string
    name: string
    color?: string
    icon?: string
  }
  goal?: {
    id: string
    name: string
  }
}

interface Category {
  id: string
  name: string
  type: string
  icon?: string
  color?: string
}

interface Wallet {
  id: string
  name: string
  balance: number
  currencyCode: string
  icon?: string
  color?: string
  isDefault: boolean
}

export default function WalletDetailPage({ params }: { params: { walletId: string } }) {
  const { data: session } = useSession()
  const router = useRouter()

  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('transactions')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [showAddTransactionDialog, setShowAddTransactionDialog] = useState(false)
  const [showEditTransactionDialog, setShowEditTransactionDialog] = useState(false)
  const [currentTransaction, setCurrentTransaction] = useState<Transaction | null>(null)
  const [transactionFormData, setTransactionFormData] = useState({
    amount: '',
    type: 'EXPENSE' as 'EXPENSE' | 'INCOME',
    description: '',
    date: new Date().toISOString().split('T')[0],
    categoryId: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const tabParam = searchParams.get('tab');
      if (tabParam && ['transactions', 'savings', 'settings'].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }
  }, []);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', value);
      window.history.pushState({}, '', url);
    }
  };

  useEffect(() => {
    if (session) {
      fetchWalletData()
      fetchTransactions()
      fetchCategories()
    }
  }, [session, params.walletId])

  const fetchWalletData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/wallets?id=${params.walletId}`)

      if (response.ok) {
        const data = await response.json()
        // API returns array, find the wallet by ID
        const foundWallet = Array.isArray(data)
          ? data.find((w: Wallet) => w.id === params.walletId)
          : data

        if (foundWallet) {
          setWallet(foundWallet)
        } else {
          alert('Wallet not found')
          router.push('/wallets')
        }
      } else {
        alert('Failed to load wallet data')
        router.push('/wallets')
      }
    } catch (error) {
      console.error('Error fetching wallet data:', error)
      alert('An error occurred while loading wallet data')
    } finally {
      setLoading(false)
    }
  }

  const fetchTransactions = async () => {
    try {
      // Fetch all transactions for this wallet (limit=-1)
      const response = await fetch(`/api/transactions?walletId=${params.walletId}&limit=-1`)

      if (response.ok) {
        const json = await response.json()
        // Handle both array and paginated response formats
        const data = Array.isArray(json) ? json : json.data || []
        setTransactions(data)
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')

      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...transactionFormData,
          walletId: params.walletId,
          amount: parseFloat(transactionFormData.amount)
        }),
      })

      if (response.ok) {
        const newTransaction = await response.json()
        setTransactions(prev => [newTransaction, ...prev])

        if (wallet) {
          const amount = parseFloat(transactionFormData.amount)
          const newBalance = transactionFormData.type === 'INCOME'
            ? wallet.balance + amount
            : wallet.balance - amount

          setWallet({
            ...wallet,
            balance: newBalance
          })
        }

        setTransactionFormData({
          amount: '',
          type: 'EXPENSE',
          description: '',
          date: new Date().toISOString().split('T')[0],
          categoryId: ''
        })

        setShowAddTransactionDialog(false)
        alert('Transaction added successfully')
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to add transaction')
      }
    } catch (error) {
      console.error('Error adding transaction:', error)
      alert('An error occurred while adding the transaction')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditTransaction = (transaction: Transaction) => {
    setCurrentTransaction(transaction)
    setTransactionFormData({
      amount: transaction.amount.toString(),
      type: transaction.type as 'EXPENSE' | 'INCOME',
      description: transaction.description,
      date: new Date(transaction.date).toISOString().split('T')[0],
      categoryId: transaction.category?.id || ''
    })
    setShowEditTransactionDialog(true)
  }

  const handleUpdateTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentTransaction) return

    try {
      setIsSubmitting(true)

      const response = await fetch(`/api/transactions?id=${currentTransaction.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...transactionFormData,
          amount: parseFloat(transactionFormData.amount)
        }),
      })

      if (response.ok) {
        const updatedTransaction = await response.json()

        setTransactions(prevTransactions => {
          return prevTransactions.map(tx =>
            tx.id === currentTransaction.id ? updatedTransaction : tx
          )
        })

        alert('Transaction updated successfully')
        setShowEditTransactionDialog(false)
        fetchWalletData()
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to update transaction')
      }
    } catch (error) {
      console.error('Error updating transaction:', error)
      alert('An error occurred while updating the transaction')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteTransaction = async (transactionId: string) => {
    if (confirm('Are you sure you want to delete this transaction?')) {
      try {
        const response = await fetch(`/api/transactions?id=${transactionId}`, {
          method: 'DELETE',
        })

        if (response.ok) {
          setTransactions(prevTransactions =>
            prevTransactions.filter(tx => tx.id !== transactionId)
          )

          alert('Transaction deleted successfully')
          fetchWalletData()
        } else {
          const error = await response.json()
          alert(error.error || 'Failed to delete transaction')
        }
      } catch (error) {
        console.error('Error deleting transaction:', error)
        alert('An error occurred while deleting the transaction')
      }
    }
  }

  if (!session) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">
          Please sign in to access this page
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">
          Loading wallet data...
        </div>
      </div>
    )
  }

  if (!wallet) {
    return (
      <div className="p-6">
        <div className="text-center text-red-500">
          Wallet not found
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex items-center mb-6 space-x-2">
        <Link
          href="/wallets"
          className="inline-flex items-center px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Wallets
        </Link>
        <h1 className="text-2xl font-bold">{wallet.name}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm text-gray-500 mb-1">Balance</h3>
          <div className="text-3xl font-bold">{formatCurrency(wallet.balance, wallet.currencyCode)}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => handleTabChange('transactions')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'transactions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Transactions
            </button>
            <button
              onClick={() => handleTabChange('savings')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'savings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Savings
            </button>
            <button
              onClick={() => handleTabChange('settings')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'settings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Settings
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Recent Transactions</h2>
                <button
                  onClick={() => setShowAddTransactionDialog(true)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Transaction
                </button>
              </div>

              {transactions.length > 0 ? (
                <div className="space-y-3">
                  {transactions.map(transaction => (
                    <div key={transaction.id} className="border rounded-lg p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <p className="font-medium text-sm sm:text-base line-clamp-2">{transaction.description}</p>
                            <div className="relative group flex-shrink-0">
                              <button className="p-1 sm:p-2 hover:bg-gray-100 rounded">
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 hidden group-hover:block z-10">
                                <button
                                  onClick={() => handleEditTransaction(transaction)}
                                  className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center text-sm"
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteTransaction(transaction.id)}
                                  className="w-full text-left px-4 py-2 hover:bg-gray-50 text-red-600 flex items-center text-sm"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs sm:text-sm text-gray-500">
                              {new Date(transaction.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                            {transaction.category && (
                              <span
                                className="inline-block px-2 py-0.5 text-xs rounded-full"
                                style={{
                                  backgroundColor: transaction.category.color || '#e2e8f0',
                                  color: '#000'
                                }}
                              >
                                {transaction.category.name}
                              </span>
                            )}
                            {transaction.goal && (
                              <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-800">
                                {transaction.goal.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={`font-semibold text-base sm:text-lg flex-shrink-0 ${transaction.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                          {transaction.type === 'INCOME' ? '+' : '-'}
                          {formatCurrency(transaction.amount, wallet.currencyCode)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <CreditCard className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <h3 className="text-lg font-medium mb-2">No Transactions Yet</h3>
                  <p className="text-gray-500 mb-4">Start adding transactions to this wallet</p>
                  <button
                    onClick={() => setShowAddTransactionDialog(true)}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add Your First Transaction
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Savings Tab */}
          {activeTab === 'savings' && (
            <div>
              <div className="mb-4">
                <h2 className="text-xl font-semibold mb-2">Savings Breakdown</h2>
                <p className="text-sm text-gray-600">
                  View detailed breakdown of your savings transactions in this wallet
                </p>
              </div>

              <WalletSavingsDetail
                walletId={params.walletId}
                timeRange="all_time"
              />
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div>
              <div className="bg-white rounded-lg border p-6">
                <h2 className="text-lg font-semibold mb-4">Wallet Settings</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Wallet Info</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="font-medium">Name:</div>
                      <div>{wallet.name}</div>

                      <div className="font-medium">Currency:</div>
                      <div>{wallet.currencyCode}</div>

                      <div className="font-medium">Current Balance:</div>
                      <div className="font-semibold">{formatCurrency(wallet.balance, wallet.currencyCode)}</div>

                      <div className="font-medium">Default Wallet:</div>
                      <div>{wallet.isDefault ? 'Yes' : 'No'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Transaction Dialog */}
      {showAddTransactionDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Transaction</h2>
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Transaction Type</label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="EXPENSE"
                      checked={transactionFormData.type === 'EXPENSE'}
                      onChange={(e) => setTransactionFormData({...transactionFormData, type: 'EXPENSE'})}
                      className="mr-2"
                    />
                    Expense
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="INCOME"
                      checked={transactionFormData.type === 'INCOME'}
                      onChange={(e) => setTransactionFormData({...transactionFormData, type: 'INCOME'})}
                      className="mr-2"
                    />
                    Income
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Amount</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="0"
                  value={transactionFormData.amount}
                  onChange={e => setTransactionFormData({...transactionFormData, amount: e.target.value})}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="What is this transaction for?"
                  value={transactionFormData.description}
                  onChange={e => setTransactionFormData({...transactionFormData, description: e.target.value})}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  className="w-full px-4 py-2 border rounded-lg"
                  value={transactionFormData.categoryId}
                  onChange={e => setTransactionFormData({...transactionFormData, categoryId: e.target.value})}
                >
                  <option value="">Select a category</option>
                  {categories
                    .filter(category => category.type === transactionFormData.type)
                    .map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))
                  }
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input
                  type="date"
                  className="w-full px-4 py-2 border rounded-lg"
                  value={transactionFormData.date}
                  onChange={e => setTransactionFormData({...transactionFormData, date: e.target.value})}
                  required
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddTransactionDialog(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Adding...' : 'Add Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Transaction Dialog */}
      {showEditTransactionDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Edit Transaction</h2>
            <form onSubmit={handleUpdateTransaction} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Transaction Type</label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="EXPENSE"
                      checked={transactionFormData.type === 'EXPENSE'}
                      onChange={(e) => setTransactionFormData({...transactionFormData, type: 'EXPENSE'})}
                      className="mr-2"
                    />
                    Expense
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="INCOME"
                      checked={transactionFormData.type === 'INCOME'}
                      onChange={(e) => setTransactionFormData({...transactionFormData, type: 'INCOME'})}
                      className="mr-2"
                    />
                    Income
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Amount</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="0"
                  value={transactionFormData.amount}
                  onChange={e => setTransactionFormData({...transactionFormData, amount: e.target.value})}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="What is this transaction for?"
                  value={transactionFormData.description}
                  onChange={e => setTransactionFormData({...transactionFormData, description: e.target.value})}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  className="w-full px-4 py-2 border rounded-lg"
                  value={transactionFormData.categoryId}
                  onChange={e => setTransactionFormData({...transactionFormData, categoryId: e.target.value})}
                >
                  <option value="">Select a category</option>
                  {categories
                    .filter(category => category.type === transactionFormData.type)
                    .map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))
                  }
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input
                  type="date"
                  className="w-full px-4 py-2 border rounded-lg"
                  value={transactionFormData.date}
                  onChange={e => setTransactionFormData({...transactionFormData, date: e.target.value})}
                  required
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditTransactionDialog(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Updating...' : 'Update Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
