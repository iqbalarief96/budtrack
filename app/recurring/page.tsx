'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { 
  FiPlus, FiClock, FiBell, FiRepeat, FiPieChart, 
  FiAlertCircle, FiCheckCircle, FiEdit, FiTrash2,
  FiX, FiCalendar, FiDollarSign, FiTag
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
}

export default function RecurringPage() {
  const { data: session, status } = useSession()
  const { selectedWallet } = useWallet()
  const [activeTab, setActiveTab] = useState('overview')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    category: 'Entertainment',
    frequency: 'Monthly',
    startDate: '',
    description: ''
  })
  const [isLoading, setIsLoading] = useState(true)
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([])
  const [error, setError] = useState<string | null>(null)

  // Fetch recurring transactions when wallet changes
  useEffect(() => {
    if (selectedWallet && session) {
      fetchRecurringTransactions()
    }
  }, [selectedWallet, session])

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
    setFormData({
      ...formData,
      [name]: value
    })
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedWallet) {
      setError('No wallet selected')
      return
    }
    
    try {
      // Parse amount from formatted string
      const amountValue = parseFloat(formData.amount.replace(/[^0-9.-]+/g, ''))
      
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
          walletId: selectedWallet.id
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to create recurring transaction')
      }
      
      // Refresh the transaction list
      await fetchRecurringTransactions()
      
      // Reset form and close modal
      setFormData({
        name: '',
        amount: '',
        category: 'Entertainment',
        frequency: 'Monthly',
        startDate: '',
        description: ''
      })
      setIsModalOpen(false)
    } catch (err) {
      console.error('Error creating recurring transaction:', err)
      setError('Failed to create recurring transaction')
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
    
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(parseInt(numericValue))
    .replace('IDR', 'Rp')
    .replace(/\s/g, '')
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Recurring Transaction</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <FiPlus /> Add New Recurring
        </button>
      </div>

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
                    Transaction Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md py-2 px-4"
                      placeholder="e.g., Netflix Subscription"
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
                        <option value="Entertainment">Entertainment</option>
                        <option value="Utilities">Utilities</option>
                        <option value="Subscription">Subscription</option>
                        <option value="Insurance">Insurance</option>
                        <option value="Rent">Rent</option>
                        <option value="Transportation">Transportation</option>
                        <option value="Other">Other</option>
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
                    {new Intl.NumberFormat('id-ID', {
                      style: 'currency',
                      currency: 'IDR',
                      minimumFractionDigits: 0,
                    }).format(
                      recurringTransactions
                        .filter(t => t.frequency === 'Monthly')
                        .reduce((sum, t) => sum + t.amount, 0)
                    )
                    .replace('IDR', 'Rp')
                    .replace(/\s/g, '')}
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-green-800 mb-1">Yearly Cost</h3>
                  <p className="text-2xl font-bold">
                    {new Intl.NumberFormat('id-ID', {
                      style: 'currency',
                      currency: 'IDR',
                      minimumFractionDigits: 0,
                    }).format(
                      recurringTransactions
                        .filter(t => t.frequency === 'Monthly')
                        .reduce((sum, t) => sum + t.amount * 12, 0) +
                      recurringTransactions
                        .filter(t => t.frequency === 'Yearly')
                        .reduce((sum, t) => sum + t.amount, 0)
                    )
                    .replace('IDR', 'Rp')
                    .replace(/\s/g, '')}
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
                                {new Intl.NumberFormat('id-ID', {
                                  style: 'currency',
                                  currency: 'IDR',
                                  minimumFractionDigits: 0,
                                }).format(transaction.amount)
                                .replace('IDR', 'Rp')
                                .replace(/\s/g, '')}
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
                              {new Intl.NumberFormat('id-ID', {
                                style: 'currency',
                                currency: 'IDR',
                                minimumFractionDigits: 0,
                              }).format(transaction.amount)
                              .replace('IDR', 'Rp')
                              .replace(/\s/g, '')}
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