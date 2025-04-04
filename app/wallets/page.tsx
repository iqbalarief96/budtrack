'use client'

import React, { useState } from 'react'
import { FiPlusCircle, FiCreditCard, FiTrash, FiEdit, FiX } from 'react-icons/fi'
import { useWallet } from '../providers/WalletProvider'
import { formatCurrency } from '../lib/utils'

// Define Wallet type
type Wallet = {
  id: string
  name: string
  balance: number
  icon?: string
  color?: string
  isDefault: boolean
  currencyCode: string
}

const WalletsPage = () => {
  const { wallets, isLoading, refreshWallets } = useWallet()
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    color: '#1976D2',
    isDefault: false
  })
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  
  // Calculate total balance
  const totalBalance = wallets.reduce((sum, wallet) => sum + wallet.balance, 0)

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      color: '#1976D2',
      isDefault: false
    })
    setEditingWallet(null)
    setError('')
  }

  // Handle edit wallet
  const handleEditWallet = (wallet: Wallet) => {
    setEditingWallet(wallet)
    setFormData({
      name: wallet.name,
      color: wallet.color || '#1976D2',
      isDefault: wallet.isDefault
    })
    setIsAddModalOpen(true)
  }

  // Handle delete wallet
  const handleDeleteWallet = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus dompet ini? Semua transaksi terkait juga akan dihapus.')) return

    try {
      const response = await fetch(`/api/wallets?id=${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete wallet')
      }

      await refreshWallets()
    } catch (err) {
      console.error('Error deleting wallet:', err)
      alert('Gagal menghapus dompet. Silakan coba lagi.')
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSaving(true)

    try {
      const response = await fetch('/api/wallets' + (editingWallet ? `?id=${editingWallet.id}` : ''), {
        method: editingWallet ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          id: editingWallet?.id
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || `Failed to ${editingWallet ? 'update' : 'create'} wallet`)
      }

      await refreshWallets()
      setIsAddModalOpen(false)
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${editingWallet ? 'update' : 'create'} wallet`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCloseModal = () => {
    setIsAddModalOpen(false)
    resetForm()
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dompet</h1>
        <button 
          className="btn btn-primary flex items-center gap-1"
          onClick={() => setIsAddModalOpen(true)}
        >
          <FiPlusCircle />
          <span>Tambah Dompet</span>
        </button>
      </div>
      
      {/* Total Balance */}
      <div className="card">
        <h2 className="text-lg font-medium text-gray-700 mb-1">Total Saldo</h2>
        <p className="text-3xl font-bold">{formatCurrency(totalBalance)}</p>
      </div>
      
      {/* Wallets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {wallets.map((wallet) => (
          <div key={wallet.id} className="card">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center mr-3" 
                  style={{ backgroundColor: wallet.color || '#1976D2' }}
                >
                  <FiCreditCard className="text-white text-xl" />
                </div>
                <div>
                  <h3 className="font-medium">{wallet.name}</h3>
                  {wallet.isDefault && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Default</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100"
                  onClick={() => handleEditWallet(wallet)}
                >
                  <FiEdit size={16} />
                </button>
                <button 
                  className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-gray-100"
                  onClick={() => handleDeleteWallet(wallet.id)}
                  disabled={wallet.isDefault}
                  title={wallet.isDefault ? 'Dompet default tidak dapat dihapus' : ''}
                >
                  <FiTrash size={16} />
                </button>
              </div>
            </div>
            <div className="border-t pt-3">
              <p className="text-gray-500 text-sm">Saldo</p>
              <p className="text-xl font-bold">{formatCurrency(wallet.balance, wallet.currencyCode)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Wallet Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <FiX size={24} />
            </button>

            <h2 className="text-xl font-bold mb-6">
              {editingWallet ? 'Edit Dompet' : 'Tambah Dompet Baru'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Wallet Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Dompet
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Contoh: Dompet Utama"
                  required
                />
              </div>

              {/* Wallet Color */}
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

              {/* Is Default */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={editingWallet?.isDefault}
                />
                <label htmlFor="isDefault" className="ml-2 block text-sm text-gray-700">
                  Jadikan dompet default
                </label>
              </div>

              {error && (
                <div className="text-red-500 text-sm">{error}</div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
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
      )}
    </div>
  )
}

export default WalletsPage 