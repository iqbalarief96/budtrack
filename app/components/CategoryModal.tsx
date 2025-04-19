'use client'

import React, { useState, useEffect } from 'react'
import { FiX, FiShoppingBag, FiCoffee, FiHome, FiDollarSign, 
  FiCreditCard, FiGift, FiHeart, FiSmile, FiTruck, FiBookmark,
  FiShoppingCart, FiMusic, FiMonitor, FiActivity, FiAperture, FiAward, 
  FiBriefcase, FiCloud, FiCompass, FiEdit3, FiFilm, FiBook, FiAirplay,
  FiBell, FiCalendar, FiCamera, FiClipboard, FiClock } from 'react-icons/fi'

type CategoryModalProps = {
  isOpen: boolean
  onClose: () => void
  onSave: (category: any) => void
  initialData?: {
    id: string
    name: string
    type: 'INCOME' | 'EXPENSE'
    color: string
    icon?: string
  }
}

const AVAILABLE_ICONS = [
  { name: 'FiShoppingBag', component: FiShoppingBag },
  { name: 'FiCoffee', component: FiCoffee },
  { name: 'FiHome', component: FiHome },
  { name: 'FiAirplay', component: FiAirplay },
  { name: 'FiDollarSign', component: FiDollarSign },
  { name: 'FiCreditCard', component: FiCreditCard },
  { name: 'FiGift', component: FiGift },
  { name: 'FiHeart', component: FiHeart },
  { name: 'FiSmile', component: FiSmile },
  { name: 'FiTruck', component: FiTruck },
  { name: 'FiBookmark', component: FiBookmark },
  { name: 'FiShoppingCart', component: FiShoppingCart },
  { name: 'FiMusic', component: FiMusic },
  { name: 'FiMonitor', component: FiMonitor },
  { name: 'FiActivity', component: FiActivity },
  { name: 'FiAperture', component: FiAperture },
  { name: 'FiAward', component: FiAward },
  { name: 'FiBriefcase', component: FiBriefcase },
  { name: 'FiCloud', component: FiCloud },
  { name: 'FiCompass', component: FiCompass },
  { name: 'FiEdit3', component: FiEdit3 },
  { name: 'FiFilm', component: FiFilm },
  { name: 'FiBook', component: FiBook },
  { name: 'FiBell', component: FiBell },
  { name: 'FiCalendar', component: FiCalendar },
  { name: 'FiCamera', component: FiCamera },
  { name: 'FiClipboard', component: FiClipboard },
  { name: 'FiClock', component: FiClock }
]

const CategoryModal = ({ isOpen, onClose, onSave, initialData }: CategoryModalProps) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'EXPENSE' as 'INCOME' | 'EXPENSE',
    color: '#1976D2',
    icon: 'FiShoppingBag'
  })
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Update form data when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        type: initialData.type,
        color: initialData.color,
        icon: initialData.icon || 'FiShoppingBag'
      })
    } else {
      setFormData({
        name: '',
        type: 'EXPENSE',
        color: '#1976D2',
        icon: 'FiShoppingBag'
      })
    }
  }, [initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSaving(true)

    try {
      const response = await fetch('/api/categories' + (initialData ? `?id=${initialData.id}` : ''), {
        method: initialData ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          id: initialData?.id
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || `Failed to ${initialData ? 'update' : 'create'} category`)
      }

      const savedCategory = await response.json()
      onSave(savedCategory)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  // Render the selected icon component
  const SelectedIcon = AVAILABLE_ICONS.find(i => i.name === formData.icon)?.component || FiShoppingBag

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <FiX size={24} />
        </button>

        <h2 className="text-xl font-bold mb-6">
          {initialData ? 'Edit Kategori' : 'Tambah Kategori Baru'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Nama Kategori
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Contoh: Makanan"
              required
            />
          </div>

          {/* Category Type */}
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
              Tipe Kategori
            </label>
            <select
              id="type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as 'INCOME' | 'EXPENSE' })}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="EXPENSE">Pengeluaran</option>
              <option value="INCOME">Pemasukan</option>
            </select>
          </div>

          {/* Category Icon */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ikon
            </label>
            <div className="mb-2 p-3 border rounded-lg flex items-center">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center mr-3"
                style={{ backgroundColor: formData.color }}
              >
                <SelectedIcon className="text-white text-xl" />
              </div>
              <span className="text-gray-600 text-sm">Ikon terpilih</span>
            </div>
            <div className="grid grid-cols-6 gap-2 max-h-40 overflow-y-auto p-2 border rounded-lg">
              {AVAILABLE_ICONS.map((icon) => {
                const IconComponent = icon.component;
                return (
                  <button
                    key={icon.name}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon: icon.name })}
                    className={`w-full aspect-square flex items-center justify-center rounded-lg border ${
                      formData.icon === icon.name 
                        ? 'bg-blue-50 border-blue-500' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <IconComponent className="text-lg" style={{ color: formData.color }} />
                  </button>
                )
              })}
            </div>
          </div>

          {/* Category Color */}
          <div>
            <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-1">
              Warna
            </label>
            <input
              type="color"
              id="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="w-full h-10 p-1 rounded-lg border"
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              disabled={isSaving}
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={isSaving}
            >
              {isSaving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CategoryModal 