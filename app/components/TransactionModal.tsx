'use client'

import React, { useState, useEffect } from 'react'
import { FiX, FiPlus, FiMinus, FiDollarSign, FiCalendar, FiTag, FiCreditCard } from 'react-icons/fi'
import { useWallet } from '../providers/WalletProvider'
import { formatCurrency, parseCurrency } from '../lib/utils'

type Category = {
  id: string
  name: string
  type: string
  color: string
}

type TransactionModalProps = {
  isOpen: boolean
  onClose: () => void
  onSave: (transaction: any) => void
  initialData?: any
  isQuickAction?: boolean
}

const TransactionModal = ({ isOpen, onClose, onSave, initialData, isQuickAction = false }: TransactionModalProps) => {
  const { selectedWallet, wallets } = useWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [formData, setFormData] = useState({
    type: 'EXPENSE',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    categoryId: '',
    walletId: selectedWallet?.id || '',
  })

  useEffect(() => {
    if (initialData) {
      if (initialData.id) {
        // Full transaction object for editing
        setFormData({
          type: initialData.type,
          amount: initialData.amount.toString(),
          description: initialData.description,
          date: new Date(initialData.date).toISOString().split('T')[0],
          categoryId: initialData.category?.id || '',
          walletId: initialData.wallet?.id || '',
        });
      } else if (initialData.type) {
        // Only type provided, for new transaction with predetermined type
        setFormData(prev => ({
          ...prev,
          type: initialData.type,
          walletId: selectedWallet?.id || '',
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        walletId: selectedWallet?.id || '',
      }));
    }
  }, [initialData, selectedWallet]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories')
        if (!response.ok) throw new Error('Failed to fetch categories')
        const data = await response.json()
        setCategories(data.filter((cat: Category) => cat.type === 'BOTH' || cat.type === formData.type))
      } catch (error) {
        console.error('Error fetching categories:', error)
        setCategories([])
      }
    }

    fetchCategories()
  }, [formData.type])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const amount = parseCurrency(formData.amount)
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Jumlah harus lebih besar dari 0')
      }

      const response = await fetch('/api/transactions' + (initialData?.id ? `?id=${initialData.id}` : ''), {
        method: initialData?.id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          amount,
          id: initialData?.id
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save transaction')
      }

      const savedTransaction = await response.json()
      onSave(savedTransaction)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <FiX size={24} />
        </button>

        <h2 className="text-xl font-bold mb-6">
          {initialData ? 'Edit Transaksi' : 'Tambah Transaksi'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Transaction Type */}
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              className={`flex items-center justify-center gap-2 p-3 rounded-lg border ${
                formData.type === 'INCOME'
                  ? 'bg-green-50 border-green-500 text-green-700'
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => setFormData({ ...formData, type: 'INCOME' })}
            >
              <FiPlus />
              <span>Pemasukan</span>
            </button>
            <button
              type="button"
              className={`flex items-center justify-center gap-2 p-3 rounded-lg border ${
                formData.type === 'EXPENSE'
                  ? 'bg-red-50 border-red-500 text-red-700'
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => setFormData({ ...formData, type: 'EXPENSE' })}
            >
              <FiMinus />
              <span>Pengeluaran</span>
            </button>
          </div>

          {/* Amount */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiDollarSign className="text-gray-400" />
            </div>
            <input
              type="text"
              value={formData.amount}
              onChange={(e) => {
                const value = e.target.value.replace(/[^\d,]/g, '')
                setFormData({ ...formData, amount: value })
              }}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
              required
            />
          </div>

          {/* Description */}
          <input
            type="text"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Deskripsi (opsional)"
          />

          {/* Date */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiCalendar className="text-gray-400" />
            </div>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Category Selection */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiTag className="text-gray-400" />
            </div>
            <select
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              required={!isQuickAction}
            >
              <option value="">Pilih Kategori {isQuickAction ? '(Opsional)' : ''}</option>
              {Array.isArray(categories) && categories
                .map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Wallet Selection */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiCreditCard className="text-gray-400" />
            </div>
            <select
              value={formData.walletId}
              onChange={(e) => setFormData({ ...formData, walletId: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              required
            >
              <option value="">Pilih Dompet</option>
              {wallets.map((wallet) => (
                <option key={wallet.id} value={wallet.id}>
                  {wallet.name}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              disabled={loading}
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Menyimpan...' : initialData ? 'Simpan' : 'Tambah'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TransactionModal 