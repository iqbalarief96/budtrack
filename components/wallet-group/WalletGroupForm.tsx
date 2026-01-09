'use client'

import { useState, useEffect } from 'react'
import { FiX, FiCreditCard } from 'react-icons/fi'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

// Color options for wallet groups
const COLOR_OPTIONS = [
  '#1976D2', // Blue
  '#388E3C', // Green
  '#D32F2F', // Red
  '#7B1FA2', // Purple
  '#F57C00', // Orange
  '#00796B', // Teal
  '#5D4037', // Brown
  '#455A64', // Blue Grey
]

// Icon options for wallet groups
const ICON_OPTIONS = [
  { value: 'users', label: '👥 Family' },
  { value: 'heart', label: '💑 Couple' },
  { value: 'home', label: '🏠 Home' },
  { value: 'briefcase', label: '💼 Business' },
  { value: 'piggy', label: '🐷 Savings' },
  { value: 'star', label: '⭐ Priority' },
]

interface Wallet {
  id: string
  name: string
  balance: number
  color?: string
  type?: string
}

interface WalletGroup {
  id: string
  name: string
  description?: string | null
  icon?: string | null
  color?: string | null
  wallets: { walletId: string; wallet: Wallet }[]
}

interface WalletGroupFormProps {
  group?: WalletGroup
  onSubmit: (data: {
    name: string
    description?: string
    icon?: string
    color?: string
    walletIds: string[]
  }) => Promise<void>
  onClose: () => void
}

export default function WalletGroupForm({ group, onSubmit, onClose }: WalletGroupFormProps) {
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchingWallets, setFetchingWallets] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: group?.name || '',
    description: group?.description || '',
    icon: group?.icon || '',
    color: group?.color || COLOR_OPTIONS[0],
    walletIds: group?.wallets?.map(w => w.walletId) || [] as string[],
  })

  useEffect(() => {
    fetchWallets()
  }, [])

  const fetchWallets = async () => {
    try {
      setFetchingWallets(true)
      const response = await fetch('/api/wallets')
      const result = await response.json()
      if (response.ok) {
        const walletsData = Array.isArray(result) ? result : (result.data || [])
        setWallets(walletsData)
      }
    } catch (error) {
      console.error('Error fetching wallets:', error)
    } finally {
      setFetchingWallets(false)
    }
  }

  const handleWalletToggle = (walletId: string) => {
    setFormData(prev => ({
      ...prev,
      walletIds: prev.walletIds.includes(walletId)
        ? prev.walletIds.filter(id => id !== walletId)
        : [...prev.walletIds, walletId],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    // Validate name
    if (!formData.name.trim()) {
      setError('Group name cannot be empty')
      return
    }

    if (formData.name.trim().length > 50) {
      setError('Group name must be 50 characters or less')
      return
    }

    // Validate wallet count
    if (formData.walletIds.length > 10) {
      setError('Maximum of 10 wallets per group allowed')
      return
    }

    setLoading(true)

    try {
      await onSubmit({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        icon: formData.icon || undefined,
        color: formData.color || undefined,
        walletIds: formData.walletIds,
      })
    } catch (err: any) {
      setError(err.message || 'Failed to save wallet group')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {group ? 'Edit Wallet Group' : 'Create Wallet Group'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <FiX size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Group Name */}
          <div>
            <Label htmlFor="name" className="block mb-1">
              Group Name *
            </Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Family Budget, Couple Expenses"
              maxLength={50}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.name.length}/50 characters
            </p>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="block mb-1">
              Description
            </Label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
              placeholder="Optional description..."
            />
          </div>

          {/* Icon Selection */}
          <div>
            <Label className="block mb-2">Icon</Label>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map((icon) => (
                <button
                  key={icon.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, icon: icon.value }))}
                  className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                    formData.icon === icon.value
                      ? 'bg-blue-100 border-blue-500 text-blue-700'
                      : 'border-gray-300 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  {icon.label}
                </button>
              ))}
            </div>
          </div>

          {/* Color Selection */}
          <div>
            <Label className="block mb-2">Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, color }))}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    formData.color === color
                      ? 'border-gray-900 scale-110'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* Wallet Selection */}
          <div>
            <Label className="block mb-2">
              Select Wallets ({formData.walletIds.length}/10)
            </Label>
            {fetchingWallets ? (
              <div className="text-sm text-gray-500 py-4 text-center">
                Loading wallets...
              </div>
            ) : wallets.length === 0 ? (
              <div className="text-sm text-gray-500 py-4 text-center">
                No wallets available
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
                {wallets.map((wallet) => (
                  <label
                    key={wallet.id}
                    className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors ${
                      formData.walletIds.includes(wallet.id)
                        ? 'bg-blue-50'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <Checkbox
                      checked={formData.walletIds.includes(wallet.id)}
                      onCheckedChange={() => handleWalletToggle(wallet.id)}
                      disabled={
                        !formData.walletIds.includes(wallet.id) &&
                        formData.walletIds.length >= 10
                      }
                    />
                    <div className="flex items-center ml-3 flex-1">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center mr-3"
                        style={{ backgroundColor: wallet.color || '#1976D2' }}
                      >
                        <FiCreditCard className="text-white" size={14} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {wallet.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatCurrency(wallet.balance)}
                          {wallet.type && ` • ${wallet.type}`}
                        </p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Saving...' : group ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
