'use client'

import React, { useState } from 'react'
import { FiRefreshCw } from 'react-icons/fi'

export const MigrateWalletTypesButton: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleReset = async () => {
    if (!confirm('Reset semua wallet ke tipe MAIN? Ini akan menghapus semua perubahan tipe wallet.')) {
      return
    }

    setIsResetting(true)
    setMessage(null)
    setError(null)

    try {
      const response = await fetch('/api/wallets/reset-types', {
        method: 'POST'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset wallet types')
      }

      setMessage(data.message)
      
      // Refresh page after 2 seconds
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (err) {
      console.error('Error resetting wallet types:', err)
      setError(err instanceof Error ? err.message : 'Gagal reset wallet types')
    } finally {
      setIsResetting(false)
    }
  }

  const handleMigrate = async () => {
    if (!confirm('Migrasi wallet types akan mengubah tipe wallet yang memiliki transaksi tabungan. Lanjutkan?')) {
      return
    }

    setIsLoading(true)
    setMessage(null)
    setError(null)

    try {
      const response = await fetch('/api/wallets/migrate-types', {
        method: 'POST'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to migrate wallet types')
      }

      setMessage(data.message)
      
      // Refresh page after 2 seconds
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (err) {
      console.error('Error migrating wallet types:', err)
      setError(err instanceof Error ? err.message : 'Gagal migrasi wallet types')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="card">
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Migrasi Tipe Wallet
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Otomatis update tipe wallet berdasarkan transaksi tabungan yang ada. 
        Wallet dengan transaksi EXPENSE kategori "Savings" akan diubah menjadi tipe "SAVINGS".
      </p>
      
      {message && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">{message}</p>
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
      
      <div className="flex gap-2">
        <button
          onClick={handleMigrate}
          disabled={isLoading || isResetting}
          className="btn btn-primary flex items-center gap-2 disabled:opacity-50"
        >
          <FiRefreshCw className={isLoading ? 'animate-spin' : ''} />
          {isLoading ? 'Migrasi...' : 'Migrasi Wallet Types'}
        </button>
        
        <button
          onClick={handleReset}
          disabled={isLoading || isResetting}
          className="btn bg-gray-500 hover:bg-gray-600 text-white flex items-center gap-2 disabled:opacity-50"
        >
          <FiRefreshCw className={isResetting ? 'animate-spin' : ''} />
          {isResetting ? 'Reset...' : 'Reset ke MAIN'}
        </button>
      </div>
    </div>
  )
}
