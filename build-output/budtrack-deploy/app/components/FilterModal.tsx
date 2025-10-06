'use client'

import React, { useState, useEffect } from 'react'
import { FiX } from 'react-icons/fi'

type FilterValues = {
  type?: 'INCOME' | 'EXPENSE';
  categoryId?: string;
  dateRange?: { start?: string; end?: string };
  amountRange?: { min?: number; max?: number };
};

type FilterModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: FilterValues) => void;
  initialFilters?: FilterValues;
};

type Category = {
  id: string;
  name: string;
  type: string;
};

const FilterModal = ({ isOpen, onClose, onApply, initialFilters = {} }: FilterModalProps) => {
  const [filters, setFilters] = useState<FilterValues>(initialFilters)
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories')
        if (!response.ok) throw new Error('Failed to fetch categories')
        const data = await response.json()
        setCategories(data)
      } catch (error) {
        console.error('Error fetching categories:', error)
      }
    }

    fetchCategories()
  }, [])

  const handleApply = () => {
    // Clean up empty values
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => {
        if (typeof value === 'object') {
          return Object.values(value).some(v => v !== undefined && v !== '')
        }
        return value !== undefined && value !== ''
      })
    )
    onApply(cleanFilters as FilterValues)
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

        <h2 className="text-xl font-bold mb-6">Filter Transaksi</h2>

        <div className="space-y-4">
          {/* Transaction Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipe Transaksi
            </label>
            <select
              value={filters.type || ''}
              onChange={(e) => setFilters({ ...filters, type: e.target.value as 'INCOME' | 'EXPENSE' | undefined })}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua</option>
              <option value="INCOME">Pemasukan</option>
              <option value="EXPENSE">Pengeluaran</option>
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kategori
            </label>
            <select
              value={filters.categoryId || ''}
              onChange={(e) => setFilters({ ...filters, categoryId: e.target.value || undefined })}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua</option>
              {categories
                .filter(cat => !filters.type || cat.type === filters.type || cat.type === 'BOTH')
                .map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))
              }
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rentang Tanggal
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={filters.dateRange?.start || ''}
                onChange={(e) => setFilters({
                  ...filters,
                  dateRange: { ...filters.dateRange, start: e.target.value || undefined }
                })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="date"
                value={filters.dateRange?.end || ''}
                onChange={(e) => setFilters({
                  ...filters,
                  dateRange: { ...filters.dateRange, end: e.target.value || undefined }
                })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Amount Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rentang Jumlah
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Min"
                value={filters.amountRange?.min || ''}
                onChange={(e) => setFilters({
                  ...filters,
                  amountRange: { ...filters.amountRange, min: e.target.value ? Number(e.target.value) : undefined }
                })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                placeholder="Max"
                value={filters.amountRange?.max || ''}
                onChange={(e) => setFilters({
                  ...filters,
                  amountRange: { ...filters.amountRange, max: e.target.value ? Number(e.target.value) : undefined }
                })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Batal
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Terapkan
          </button>
        </div>
      </div>
    </div>
  )
}

export default FilterModal 