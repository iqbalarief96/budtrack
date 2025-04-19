'use client'

import React, { useState, useEffect } from 'react'
import { FiPlusCircle, FiTag, FiTrash, FiEdit, FiArrowDown, FiArrowUp, FiZap, 
  FiShoppingBag, FiCoffee, FiHome, FiDollarSign, FiCreditCard, FiGift, FiHeart, FiSmile, 
  FiTruck, FiBookmark, FiShoppingCart, FiMusic, FiMonitor, FiActivity, FiAperture, 
  FiAward, FiBriefcase, FiCloud, FiCompass, FiEdit3, FiFilm, FiBook, FiAirplay,
  FiBell, FiCalendar, FiCamera, FiClipboard, FiClock } from 'react-icons/fi'
import CategoryModal from '../components/CategoryModal'
import Link from 'next/link'

// Define Category type
type Category = {
  id: string
  name: string
  type: 'INCOME' | 'EXPENSE'
  color: string
  icon?: string
}

// Icon mapping - keep in sync with CategoryModal
const ICON_COMPONENTS: Record<string, React.ComponentType> = {
  FiShoppingBag, FiCoffee, FiHome, FiDollarSign, FiCreditCard, FiGift, FiHeart, 
  FiSmile, FiTruck, FiBookmark, FiShoppingCart, FiMusic, FiMonitor, FiActivity,
  FiAperture, FiAward, FiBriefcase, FiCloud, FiCompass, FiEdit3, FiFilm, FiBook,
  FiAirplay, FiBell, FiCalendar, FiCamera, FiClipboard, FiClock, FiTag
}

const CategoriesPage = () => {
  const [categories, setCategories] = useState<Category[]>([])
  const [activeTab, setActiveTab] = useState<'EXPENSE' | 'INCOME'>('EXPENSE')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  
  const fetchCategories = async () => {
    setIsLoading(true)
    setError('')
    try {
      const response = await fetch('/api/categories')
      if (!response.ok) throw new Error('Failed to fetch categories')
      const data = await response.json()
      setCategories(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch categories')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])
  
  // Filter categories by type
  const filteredCategories = categories.filter(
    category => category.type === activeTab
  )

  const handleSave = async (categoryData: any) => {
    await fetchCategories()
    setIsModalOpen(false)
    setEditingCategory(null)
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus kategori ini? Kategori yang sedang digunakan dalam transaksi tidak dapat dihapus.')) return

    try {
      const response = await fetch(`/api/categories?id=${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete category')
      }

      await fetchCategories()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete category')
    }
  }

  // Get icon component by name, or default to FiTag
  const getIconComponent = (iconName: string | undefined) => {
    if (!iconName || !ICON_COMPONENTS[iconName]) return FiTag;
    return ICON_COMPONENTS[iconName];
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Kategori</h1>
        <div className="flex gap-2">
          <Link
            href="/categories/smart"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
          >
            <FiZap />
            <span>Smart Categorization</span>
          </Link>
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            onClick={() => {
              setEditingCategory(null)
              setIsModalOpen(true)
            }}
          >
            <FiPlusCircle />
            <span>Tambah Kategori</span>
          </button>
        </div>
      </div>
      
      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}
      
      {/* Tab Selector */}
      <div className="flex border-b">
        <button 
          className={`px-4 py-2 font-medium ${activeTab === 'EXPENSE' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('EXPENSE')}
        >
          <div className="flex items-center gap-1">
            <FiArrowUp />
            <span>Pengeluaran</span>
          </div>
        </button>
        <button 
          className={`px-4 py-2 font-medium ${activeTab === 'INCOME' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('INCOME')}
        >
          <div className="flex items-center gap-1">
            <FiArrowDown />
            <span>Pemasukan</span>
          </div>
        </button>
      </div>
      
      {/* Categories Grid */}
      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : filteredCategories.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Tidak ada kategori
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map((category) => {
            const IconComponent = getIconComponent(category.icon);
            return (
              <div key={category.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center mr-3" 
                      style={{ backgroundColor: category.color || '#1976D2' }}
                    >
                      <IconComponent className="text-white text-xl" />
                    </div>
                    <h3 className="font-medium">{category.name}</h3>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100"
                      onClick={() => handleEdit(category)}
                    >
                      <FiEdit size={16} />
                    </button>
                    <button 
                      className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-gray-100"
                      onClick={() => handleDelete(category.id)}
                    >
                      <FiTrash size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Category Modal */}
      <CategoryModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingCategory(null)
        }}
        onSave={handleSave}
        initialData={editingCategory || undefined}
      />
    </div>
  )
}

export default CategoriesPage 