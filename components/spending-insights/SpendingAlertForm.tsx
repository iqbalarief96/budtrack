'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { 
  SpendingAlert, 
  AlertType, 
  CreateAlertInput,
  UpdateAlertInput,
  ALERT_TYPE_OPTIONS 
} from '@/app/types/spending-insights'
import { FiX, FiBell, FiDollarSign } from 'react-icons/fi'

/**
 * SpendingAlertForm - Form for creating/editing alerts
 * Requirements: 4.1, 4.4, 4.5
 */

interface Category {
  id: string
  name: string
  icon?: string | null
  color?: string | null
}

interface SpendingAlertFormProps {
  alert?: SpendingAlert
  categories?: Category[]
  onSubmit: (data: CreateAlertInput | UpdateAlertInput) => Promise<void>
  onClose: () => void
}

export function SpendingAlertForm({ alert, categories: propCategories, onSubmit, onClose }: SpendingAlertFormProps) {
  const [categories, setCategories] = useState<Category[]>(propCategories || [])
  const [formData, setFormData] = useState({
    type: alert?.type || 'category_limit' as AlertType,
    categoryId: alert?.categoryId || '',
    threshold: alert?.threshold?.toString() || '',
    isActive: alert?.isActive ?? true,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!propCategories || propCategories.length === 0) {
      fetchCategories()
    }
  }, [propCategories])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      const result = await response.json()
      if (response.ok) {
        const categoriesData = Array.isArray(result) ? result : (result.data || [])
        setCategories(categoriesData)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!formData.threshold || parseFloat(formData.threshold) <= 0) {
      setError('Please enter a valid threshold amount')
      return
    }

    if (formData.type === 'category_limit' && !formData.categoryId) {
      setError('Please select a category for category limit alerts')
      return
    }

    setLoading(true)

    try {
      const data: CreateAlertInput | UpdateAlertInput = {
        type: formData.type,
        categoryId: formData.categoryId || undefined,
        threshold: parseFloat(formData.threshold),
        isActive: formData.isActive,
      }

      await onSubmit(data)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save alert')
    } finally {
      setLoading(false)
    }
  }

  const handleTypeChange = (type: AlertType) => {
    setFormData(prev => ({
      ...prev,
      type,
      // Clear category if not category_limit
      categoryId: type === 'category_limit' ? prev.categoryId : '',
    }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FiBell className="h-5 w-5" />
            {alert ? 'Edit Alert' : 'Create Spending Alert'}
          </h2>
          <button 
            onClick={onClose} 
            className="p-1 hover:bg-gray-100 rounded"
            aria-label="Close"
          >
            <FiX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Alert Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alert Type
            </label>
            <div className="grid grid-cols-1 gap-2">
              {ALERT_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleTypeChange(option.value)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    formData.type === option.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="font-medium">{option.label}</span>
                  <p className="text-xs text-gray-500 mt-1">
                    {getAlertTypeDescription(option.value)}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Category Selection (only for category_limit) */}
          {formData.type === 'category_limit' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                required
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Threshold Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Threshold Amount *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiDollarSign className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="number"
                value={formData.threshold}
                onChange={(e) => setFormData(prev => ({ ...prev, threshold: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2"
                placeholder="0"
                min="0"
                step="1000"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {formData.type === 'daily_limit' 
                ? 'Daily spending limit'
                : formData.type === 'category_limit'
                ? 'Monthly category spending limit'
                : 'Threshold for anomaly detection'
              }
            </p>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-700">Alert Active</p>
              <p className="text-xs text-gray-500">Receive notifications when threshold is reached</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Info Box */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>How it works:</strong> You&apos;ll receive a warning at 80% of your threshold 
              and an alert when you exceed 100%.
            </p>
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
              {loading ? 'Saving...' : alert ? 'Update Alert' : 'Create Alert'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function getAlertTypeDescription(type: AlertType): string {
  switch (type) {
    case 'category_limit':
      return 'Get notified when spending in a category exceeds your limit'
    case 'daily_limit':
      return 'Get notified when daily spending exceeds your limit'
    case 'anomaly':
      return 'Get notified when unusual spending patterns are detected'
    default:
      return ''
  }
}

export default SpendingAlertForm
