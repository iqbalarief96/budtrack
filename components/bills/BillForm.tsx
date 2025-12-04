'use client'

import { useState, useEffect } from 'react'
import { FiX } from 'react-icons/fi'
import { Bill, BillFrequency, FREQUENCY_OPTIONS, REMINDER_DAY_OPTIONS, DEFAULT_REMINDER_DAYS } from '@/app/types/bill'

interface BillFormProps {
  bill?: Bill
  categories: { id: string; name: string }[]
  onSubmit: (data: any) => void
  onClose: () => void
}

export default function BillForm({ bill, categories: propCategories, onSubmit, onClose }: BillFormProps) {
  const [wallets, setWallets] = useState<{ id: string; name: string }[]>([])
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(propCategories || [])
  const [recurringTransactions, setRecurringTransactions] = useState<any[]>([])
  const [formData, setFormData] = useState({
    name: bill?.name || '',
    amount: bill?.amount || '',
    dueDate: bill?.dueDate ? new Date(bill.dueDate).toISOString().split('T')[0] : '',
    categoryId: bill?.categoryId || '',
    walletId: bill?.walletId || '',
    recurringTransactionId: bill?.recurringTransactionId || '',
    reminderDays: bill?.reminderDays || DEFAULT_REMINDER_DAYS,
    notes: bill?.notes || '',
    isRecurring: bill?.isRecurring || false,
    frequency: bill?.frequency || 'MONTHLY',
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchWallets()
    fetchCategories()
    fetchRecurringTransactions()
  }, [])

  // Update categories if prop changes
  useEffect(() => {
    if (propCategories && propCategories.length > 0) {
      setCategories(propCategories)
    }
  }, [propCategories])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      const result = await response.json()
      if (response.ok) {
        // Handle both wrapped response { data: [...] } and direct array response
        const categoriesData = Array.isArray(result) ? result : (result.data || [])
        if (categoriesData.length > 0) {
          setCategories(categoriesData)
        }
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchWallets = async () => {
    try {
      const response = await fetch('/api/wallets')
      const result = await response.json()
      if (response.ok) {
        // Handle both wrapped response { data: [...] } and direct array response
        const walletsData = Array.isArray(result) ? result : (result.data || [])
        setWallets(walletsData)
        if (!formData.walletId && walletsData.length > 0) {
          const defaultWallet = walletsData.find((w: any) => w.isDefault) || walletsData[0]
          setFormData(prev => ({ ...prev, walletId: defaultWallet.id }))
        }
      }
    } catch (error) {
      console.error('Error fetching wallets:', error)
    }
  }

  const fetchRecurringTransactions = async () => {
    try {
      const response = await fetch('/api/bills/import')
      const data = await response.json()
      if (response.ok) {
        setRecurringTransactions(data.candidates || [])
      }
    } catch (error) {
      console.error('Error fetching recurring transactions:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await onSubmit({
        ...formData,
        amount: parseFloat(formData.amount as string),
        categoryId: formData.categoryId || null,
        recurringTransactionId: formData.recurringTransactionId || null,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleReminderDayToggle = (day: number) => {
    setFormData(prev => ({
      ...prev,
      reminderDays: prev.reminderDays.includes(day)
        ? prev.reminderDays.filter(d => d !== day)
        : [...prev.reminderDays, day].sort((a, b) => a - b),
    }))
  }

  const handleRecurringSelect = (recurringId: string) => {
    if (!recurringId) {
      setFormData(prev => ({ ...prev, recurringTransactionId: '' }))
      return
    }

    const recurring = recurringTransactions.find(r => r.id === recurringId)
    if (recurring) {
      setFormData(prev => ({
        ...prev,
        recurringTransactionId: recurringId,
        name: recurring.name,
        amount: recurring.amount,
        dueDate: new Date(recurring.nextPaymentDate).toISOString().split('T')[0],
        walletId: recurring.walletId,
        isRecurring: true,
        frequency: recurring.frequency.toUpperCase(),
      }))
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">
            {bill ? 'Edit Bill' : 'Add New Bill'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <FiX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Link to Recurring Transaction */}
          {!bill && recurringTransactions.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Link to Recurring Transaction (Optional)
              </label>
              <select
                value={formData.recurringTransactionId}
                onChange={(e) => handleRecurringSelect(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="">-- Create standalone bill --</option>
                {recurringTransactions.map((rt) => (
                  <option key={rt.id} value={rt.id}>
                    {rt.name} - Rp {rt.amount.toLocaleString('id-ID')}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bill Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="e.g., Internet, Electricity"
              required
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount *
            </label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="0"
              min="0"
              step="1000"
              required
            />
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Due Date *
            </label>
            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              required
            />
          </div>

          {/* Wallet */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Wallet *
            </label>
            <select
              value={formData.walletId}
              onChange={(e) => setFormData(prev => ({ ...prev, walletId: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              required
            >
              <option value="">Select wallet</option>
              {wallets.map((wallet) => (
                <option key={wallet.id} value={wallet.id}>
                  {wallet.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={formData.categoryId}
              onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">No category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Recurring */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isRecurring"
              checked={formData.isRecurring}
              onChange={(e) => setFormData(prev => ({ ...prev, isRecurring: e.target.checked }))}
              className="rounded border-gray-300"
            />
            <label htmlFor="isRecurring" className="text-sm text-gray-700">
              This is a recurring bill
            </label>
          </div>

          {/* Frequency */}
          {formData.isRecurring && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Frequency
              </label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value as BillFrequency }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                {FREQUENCY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Reminder Days */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Remind me before
            </label>
            <div className="flex flex-wrap gap-2">
              {REMINDER_DAY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleReminderDayToggle(opt.value)}
                  className={`px-3 py-1 rounded-full text-sm border ${
                    formData.reminderDays.includes(opt.value)
                      ? 'bg-blue-100 border-blue-500 text-blue-700'
                      : 'border-gray-300 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              rows={2}
              placeholder="Optional notes..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : bill ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
