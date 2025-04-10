'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { 
  FiPlus, FiClock, FiBell, FiRepeat, FiPieChart, 
  FiAlertCircle, FiCheckCircle, FiEdit, FiTrash2,
  FiX, FiCalendar, FiDollarSign, FiTag, FiRefreshCw
} from 'react-icons/fi'
import { useWallet } from '@/app/providers/WalletProvider'

// Tipe data untuk transaksi berulang
interface RecurringTransaction {
  id: string;
  name: string;
  amount: number;
  category: string | null;
  frequency: string;
  nextPaymentDate: string;
  isActive: boolean;
  type: string;
}

// Interface untuk wallet
interface Wallet {
  id: string;
  name: string;
  balance: number;
  currencyCode?: string;
}

// Tambahkan interface untuk kategori
interface Category {
  id: string;
  name: string;
  type: string;
  icon?: string;
  color?: string;
}

export default function RecurringPage() {
  const { data: session, status } = useSession()
  const { selectedWallet, refreshWallets } = useWallet()
  const [activeTab, setActiveTab] = useState('overview')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    category: 'Entertainment',
    frequency: 'Monthly',
    startDate: '',
    description: '',
    type: 'expense',
    walletId: ''
  })
  const [isLoading, setIsLoading] = useState(true)
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isSynchronizing, setIsSynchronizing] = useState(false)
  const [syncResult, setSyncResult] = useState<{success: number; skipped: number} | null>(null)
  const [categories, setCategories] = useState<Category[]>([])

  // Fetch wallets when component mounts
  useEffect(() => {
    if (session) {
      fetchWallets()
    }
  }, [session])

  // Fetch recurring transactions when wallet changes
  useEffect(() => {
    if (selectedWallet && session) {
      fetchRecurringTransactions()
      
      // Atur default walletId ke selectedWallet saat buka form
      setFormData(prev => ({
        ...prev,
        walletId: selectedWallet.id
      }))
    }
  }, [selectedWallet, session])

  // Fetch kategori saat komponen dimount
  useEffect(() => {
    if (session) {
      fetchCategories()
    }
  }, [session])

  // Fetch wallets from API
  const fetchWallets = async () => {
    try {
      const response = await fetch('/api/wallets')
      
      if (!response.ok) {
        throw new Error('Failed to fetch wallets')
      }
      
      const data = await response.json()
      setWallets(data)
    } catch (err) {
      console.error('Error fetching wallets:', err)
      setError('Failed to load wallets')
    }
  }

  // Fetch recurring transactions from API
  const fetchRecurringTransactions = async () => {
    if (!selectedWallet) return
    
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch(`/api/recurring?walletId=${selectedWallet.id}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch recurring transactions')
      }
      
      const data = await response.json()
      setRecurringTransactions(data)
    } catch (err) {
      console.error('Error fetching recurring transactions:', err)
      setError('Failed to load recurring transactions')
    } finally {
      setIsLoading(false)
    }
  }

  // Fungsi untuk sinkronisasi transaksi berulang
  const synchronizeTransactions = async () => {
    if (!selectedWallet) {
      setError('No wallet selected')
      return
    }
    
    try {
      setIsSynchronizing(true)
      setSyncResult(null)
      
      // Call API to synchronize recurring transactions
      const response = await fetch('/api/transactions/sync-recurring', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          walletId: selectedWallet.id
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to synchronize transactions')
      }
      
      const result = await response.json()
      setSyncResult(result)
      
      // Refresh recurring transactions after sync
      await fetchRecurringTransactions()

      // Refresh wallet balances after sync
      await refreshWallets()
      
      // Force a hard refresh to update everything
      window.location.reload()
    } catch (err) {
      console.error('Error synchronizing transactions:', err)
      setError('Failed to synchronize transactions')
    } finally {
      setIsSynchronizing(false)
    }
  }

  // Fungsi untuk mengambil kategori dari API
  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      
      if (!response.ok) {
        throw new Error('Failed to fetch categories')
      }
      
      const data = await response.json()
      setCategories(data)
    } catch (err) {
      console.error('Error fetching categories:', err)
      setError('Failed to load categories')
    }
  }

  if (status === 'loading' || isLoading) {
    return <div className="p-8 flex justify-center">Loading...</div>
  }

  if (status === 'unauthenticated') {
    return <div className="p-8 flex justify-center">Please login to access this page.</div>
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      </div>
    )
  }

  // Helper function to determine tab button class
  const getTabClass = (tabName: string) => {
    const baseClass = "flex items-center gap-2 px-4 py-2 rounded-md transition-colors"
    return activeTab === tabName 
      ? `${baseClass} bg-white text-blue-600 shadow-sm`
      : `${baseClass} text-gray-500 hover:bg-gray-200`
  }

  // Format date string for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  // Calculate days until next payment
  const getDaysUntil = (dateString: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const targetDate = new Date(dateString)
    targetDate.setHours(0, 0, 0, 0)
    
    const diffTime = targetDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    return diffDays
  }

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    
    // Jika type berubah, update category sesuai dengan type
    if (name === 'type') {
      setFormData({
        ...formData,
        [name]: value,
        category: value === 'income' ? 'Salary' : 'Entertainment'
      })
    } else {
      setFormData({
        ...formData,
        [name]: value
      })
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.walletId) {
      setError('No wallet selected')
      return
    }
    
    try {
      // Parse amount from formatted string menggunakan fungsi parseCurrencyToNumber
      const amountValue = parseCurrencyToNumber(formData.amount)
      
      if (isNaN(amountValue) || amountValue <= 0) {
        setError('Invalid amount value')
        return
      }
      
      console.log('Submitting amount:', amountValue) // Log untuk debugging
      console.log('Submitting form data:', formData) // Log untuk debugging seluruh form data
      
      const response = await fetch('/api/recurring', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          amount: amountValue,
          category: formData.category,
          frequency: formData.frequency,
          startDate: formData.startDate,
          description: formData.description,
          type: formData.type,
          walletId: formData.walletId
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to create recurring transaction')
      }
      
      // Refresh the transaction list
      await fetchRecurringTransactions()
      
      // Reset form and close modal with correct default category based on type
      setFormData({
        name: '',
        amount: '',
        category: 'expense',
        frequency: 'Monthly',
        startDate: '',
        description: '',
        type: 'expense',
        walletId: selectedWallet ? selectedWallet.id : ''
      })
      setIsModalOpen(false)
    } catch (err) {
      console.error('Error creating recurring transaction:', err)
      setError('Failed to create recurring transaction')
    }
  }

  // Display format for amount in recurring transactions
  const displayAmount = (amount: number, type: string = 'expense') => {
    if (!amount || isNaN(amount)) {
      return type === 'income' ? '+Rp0' : 'Rp0';
    }
    
    try {
      // Gunakan format yang lebih sederhana dan handal
      const formatter = new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });
      
      const formatted = `Rp${formatter.format(amount)}`;
      return type === 'income' ? `+${formatted}` : formatted;
    } catch (err) {
      console.error('Error formatting amount:', err, amount);
      // Fallback formatting
      return type === 'income' ? `+Rp${amount}` : `Rp${amount}`;
    }
  }

  // Format currency input
  const formatCurrency = (value: string) => {
    // Remove all non-numeric characters
    const numericValue = value.replace(/[^0-9]/g, '')
    
    // Format as currency
    if (numericValue === '') {
      return ''
    }
    
    try {
      // Parse as number
      const amount = Number(numericValue);
      
      // Format using Intl.NumberFormat
      const formatter = new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });
      
      return `Rp${formatter.format(amount)}`;
    } catch (err) {
      console.error('Error formatting currency input:', err, numericValue);
      // Fallback formatting
      return `Rp${numericValue}`;
    }
  }

  // Parse formatted currency string to number
  const parseCurrencyToNumber = (formattedValue: string): number => {
    if (!formattedValue) return 0;
    
    try {
      // Hapus simbol mata uang (Rp) dan spasi
      let cleaned = formattedValue.replace(/[Rp\s]/g, '');
      
      // Untuk format Indonesia, ganti titik (pemisah ribuan) dengan string kosong
      cleaned = cleaned.replace(/\./g, '');
      
      // Ganti koma dengan titik jika ada desimal
      cleaned = cleaned.replace(/,/g, '.');
      
      // Konversi ke number
      const result = Number(cleaned);
      
      // Debug untuk melihat nilai yang diproses
      console.log('Parsing currency:', { 
        original: formattedValue, 
        cleaned, 
        result 
      });
      
      return result;
    } catch (err) {
      console.error('Error parsing currency:', err, formattedValue);
      return 0;
    }
  }

  // Handle amount input with formatting
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const rawValue = value.replace(/[^0-9]/g, '')
    
    setFormData({
      ...formData,
      amount: formatCurrency(rawValue)
    })
  }

  // Handle transaction deletion
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recurring transaction?')) {
      return
    }
    
    try {
      const response = await fetch(`/api/recurring?id=${id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete recurring transaction')
      }
      
      // Refresh the transaction list
      await fetchRecurringTransactions()
    } catch (err) {
      console.error('Error deleting recurring transaction:', err)
      setError('Failed to delete recurring transaction')
    }
  }

  // Get upcoming transactions (within 7 days)
  const upcomingTransactions = recurringTransactions
    .filter(transaction => {
      const daysUntil = getDaysUntil(transaction.nextPaymentDate)
      return daysUntil >= 0 && daysUntil <= 7
    })
    .sort((a, b) => getDaysUntil(a.nextPaymentDate) - getDaysUntil(b.nextPaymentDate))

  // Mendapatkan kategori sesuai tipe transaksi
  const getFilteredCategories = () => {
    if (formData.type === 'income') {
      return categories.filter(cat => cat.type === 'INCOME' || cat.type === 'BOTH')
    } else {
      return categories.filter(cat => cat.type === 'EXPENSE' || cat.type === 'BOTH')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Recurring Transaction</h1>
        <div className="flex gap-2">
          <button
            onClick={synchronizeTransactions}
            disabled={isSynchronizing}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            <FiRefreshCw className={isSynchronizing ? "animate-spin" : ""} /> 
            {isSynchronizing ? "Synchronizing..." : "Sync Transactions"}
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <FiPlus /> Add New Recurring
          </button>
        </div>
      </div>

      {/* Display synchronization result if available */}
      {syncResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FiCheckCircle className="text-green-500" size={20} />
            <span>
              Sinkronisasi transaksi berulang selesai. 
              <strong className="ml-1">{syncResult.success}</strong> transaksi dibuat, 
              <strong className="ml-1">{syncResult.skipped}</strong> transaksi dilewati (sudah ada).
            </span>
          </div>
          <button 
            onClick={() => setSyncResult(null)} 
            className="text-gray-400 hover:text-gray-600"
          >
            <FiX />
          </button>
        </div>
      )}

      {/* Modal for adding new recurring transaction */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-xl overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Add New Recurring Transaction</h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FiX size={24} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transaction Type
                  </label>
                  <div className="flex space-x-4">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="type"
                        value="expense"
                        checked={formData.type === 'expense'}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-blue-600"
                      />
                      <span className="ml-2 text-gray-700">Expense</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="type"
                        value="income"
                        checked={formData.type === 'income'}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-green-600"
                      />
                      <span className="ml-2 text-gray-700">Income</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transaction Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md py-2 px-4"
                      placeholder={formData.type === 'income' ? "e.g., Monthly Salary" : "e.g., Netflix Subscription"}
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="amount"
                      value={formData.amount}
                      onChange={handleAmountChange}
                      className="w-full border border-gray-300 rounded-md py-2 px-4"
                      placeholder="Rp 100,000"
                      required
                    />
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <FiDollarSign className="text-gray-400" />
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Wallet
                  </label>
                  <div className="relative">
                    <select
                      name="walletId"
                      value={formData.walletId}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md py-2 px-4 appearance-none"
                      required
                    >
                      <option value="" disabled>Select a wallet</option>
                      {wallets.map(wallet => (
                        <option key={wallet.id} value={wallet.id}>
                          {wallet.name} ({displayAmount(wallet.balance, 'expense')})
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <FiDollarSign className="text-gray-400" />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <div className="relative">
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-md py-2 px-4 appearance-none"
                        required
                      >
                        <option value="" disabled>Select a category</option>
                        {getFilteredCategories().map(category => (
                          <option key={category.id} value={category.name}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <FiTag className="text-gray-400" />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Frequency
                    </label>
                    <div className="relative">
                      <select
                        name="frequency"
                        value={formData.frequency}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-md py-2 px-4 appearance-none"
                        required
                      >
                        <option value="Daily">Daily</option>
                        <option value="Weekly">Weekly</option>
                        <option value="Monthly">Monthly</option>
                        <option value="Yearly">Yearly</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <FiRepeat className="text-gray-400" />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md py-2 px-4"
                      required
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <FiCalendar className="text-gray-400" />
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md py-2 px-4"
                    rows={3}
                    placeholder="Additional details about this recurring transaction"
                  />
                </div>
                
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Save Transaction
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow">
        {/* Simplified Tabs Navigation */}
        <div className="grid grid-cols-4 gap-2 bg-gray-100 p-1 rounded-md mb-8">
          <button
            className={getTabClass('overview')}
            onClick={() => setActiveTab('overview')}
          >
            <FiPieChart /> Overview
          </button>
          <button
            className={getTabClass('upcoming')}
            onClick={() => setActiveTab('upcoming')}
          >
            <FiClock /> Upcoming
          </button>
          <button
            className={getTabClass('active')}
            onClick={() => setActiveTab('active')}
          >
            <FiCheckCircle /> Active
          </button>
          <button
            className={getTabClass('history')}
            onClick={() => setActiveTab('history')}
          >
            <FiRepeat /> History
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-4">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-blue-800 mb-1">Total Recurring</h3>
                  <p className="text-2xl font-bold">{recurringTransactions.length} items</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-red-800 mb-1">Monthly Cost</h3>
                  <p className="text-2xl font-bold">
                    {displayAmount(
                      recurringTransactions
                        .filter(t => t.frequency === 'Monthly' && t.type === 'expense')
                        .reduce((sum, t) => sum + t.amount, 0),
                      'expense'
                    )}
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-green-800 mb-1">Monthly Income</h3>
                  <p className="text-2xl font-bold">
                    {displayAmount(
                      recurringTransactions
                        .filter(t => t.frequency === 'Monthly' && t.type === 'income')
                        .reduce((sum, t) => sum + t.amount, 0),
                      'income'
                    )}
                  </p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-orange-800 mb-1">Upcoming (7 Days)</h3>
                  <p className="text-2xl font-bold">{upcomingTransactions.length} payments</p>
                </div>
              </div>

              <div className="bg-white rounded-lg border p-6 space-y-4">
                <h2 className="text-xl font-bold">Recurring Features</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-4 border rounded-lg">
                    <div className="mt-1 text-blue-600"><FiRepeat size={20} /></div>
                    <div>
                      <h3 className="font-semibold">Set transaksi rutin</h3>
                      <p className="text-sm text-gray-600">Atur tagihan berulang untuk subscription, tagihan, dan pembayaran rutin lainnya</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 border rounded-lg">
                    <div className="mt-1 text-blue-600"><FiBell size={20} /></div>
                    <div>
                      <h3 className="font-semibold">Reminder untuk upcoming payment</h3>
                      <p className="text-sm text-gray-600">Dapatkan notifikasi sebelum tanggal pembayaran jatuh tempo</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 border rounded-lg">
                    <div className="mt-1 text-blue-600"><FiCheckCircle size={20} /></div>
                    <div>
                      <h3 className="font-semibold">Auto-record recurring transaction</h3>
                      <p className="text-sm text-gray-600">Rekam transaksi berulang secara otomatis pada tanggal yang ditentukan</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 border rounded-lg">
                    <div className="mt-1 text-blue-600"><FiPieChart size={20} /></div>
                    <div>
                      <h3 className="font-semibold">Analisis total pengeluaran recurring</h3>
                      <p className="text-sm text-gray-600">Lihat berapa banyak yang Anda habiskan untuk biaya berulang</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Upcoming Tab */}
          {activeTab === 'upcoming' && (
            <div className="space-y-4">
              {upcomingTransactions.length > 0 ? (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
                    <FiAlertCircle className="text-amber-500" size={20} />
                    <span>Kamu memiliki {upcomingTransactions.length} pembayaran yang harus dilakukan dalam 7 hari ke depan.</span>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white rounded-lg border">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="py-3 px-4 text-left">Nama</th>
                          <th className="py-3 px-4 text-left">Jatuh Tempo</th>
                          <th className="py-3 px-4 text-left">Jumlah</th>
                          <th className="py-3 px-4 text-left">Status</th>
                          <th className="py-3 px-4 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {upcomingTransactions.map(transaction => {
                          const daysUntil = getDaysUntil(transaction.nextPaymentDate)
                          
                          return (
                            <tr key={transaction.id}>
                              <td className="py-3 px-4">{transaction.name}</td>
                              <td className="py-3 px-4">
                                <span className={`${
                                  daysUntil === 0 ? 'bg-red-100 text-red-800' : 
                                  daysUntil <= 2 ? 'bg-red-100 text-red-800' : 
                                  daysUntil <= 5 ? 'bg-amber-100 text-amber-800' : 
                                  'bg-blue-100 text-blue-800'
                                } px-2 py-1 rounded text-xs`}>
                                  {daysUntil === 0 ? 'Today' :
                                   daysUntil === 1 ? 'Tomorrow' : 
                                   `${daysUntil} days left`}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                {displayAmount(transaction.amount, transaction.type)}
                              </td>
                              <td className="py-3 px-4">
                                <span className="inline-flex items-center gap-1 text-amber-600">
                                  <FiClock size={14} /> Upcoming
                                </span>
                              </td>
                              <td className="py-3 px-4 flex justify-center gap-2">
                                <button className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                                  <FiEdit size={18} />
                                </button>
                                <button 
                                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                                  onClick={() => handleDelete(transaction.id)}
                                >
                                  <FiTrash2 size={18} />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="bg-gray-50 border rounded-lg p-8 text-center text-gray-500">
                  <FiClock className="mx-auto mb-4" size={40} />
                  <p className="text-lg font-medium mb-2">No upcoming payments</p>
                  <p>You don't have any payments due in the next 7 days.</p>
                </div>
              )}
            </div>
          )}

          {/* Active Tab */}
          {activeTab === 'active' && (
            <div className="space-y-4">
              {recurringTransactions.length > 0 ? (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
                    <FiCheckCircle className="text-blue-500" size={20} />
                    <span>Kamu memiliki {recurringTransactions.length} subscription dan tagihan berulang aktif.</span>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white rounded-lg border">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="py-3 px-4 text-left">Nama</th>
                          <th className="py-3 px-4 text-left">Kategori</th>
                          <th className="py-3 px-4 text-left">Frekuensi</th>
                          <th className="py-3 px-4 text-left">Jumlah</th>
                          <th className="py-3 px-4 text-left">Next Payment</th>
                          <th className="py-3 px-4 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {recurringTransactions.map((transaction) => (
                          <tr key={transaction.id}>
                            <td className="py-3 px-4">{transaction.name}</td>
                            <td className="py-3 px-4">{transaction.category || '-'}</td>
                            <td className="py-3 px-4">{transaction.frequency}</td>
                            <td className="py-3 px-4">
                              {displayAmount(transaction.amount, transaction.type)}
                            </td>
                            <td className="py-3 px-4">{formatDate(transaction.nextPaymentDate)}</td>
                            <td className="py-3 px-4 flex justify-center gap-2">
                              <button className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                                <FiEdit size={18} />
                              </button>
                              <button 
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                onClick={() => handleDelete(transaction.id)}
                              >
                                <FiTrash2 size={18} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="bg-gray-50 border rounded-lg p-8 text-center text-gray-500">
                  <FiRepeat className="mx-auto mb-4" size={40} />
                  <p className="text-lg font-medium mb-2">No recurring transactions</p>
                  <p>Click the "Add New Recurring" button to create your first recurring transaction.</p>
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
                <FiRepeat className="text-blue-500" size={20} />
                <span>Histori transaksi berulang yang telah dibayar.</span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white rounded-lg border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-3 px-4 text-left">Nama</th>
                      <th className="py-3 px-4 text-left">Kategori</th>
                      <th className="py-3 px-4 text-left">Tanggal Bayar</th>
                      <th className="py-3 px-4 text-left">Jumlah</th>
                      <th className="py-3 px-4 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {/* This would be filled from transaction history, not the recurring transaction list */}
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500">
                        No payment history available. History will be shown after recurring transactions are processed.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 