'use client'

import React, { useState } from 'react'
import { FiRefreshCw } from 'react-icons/fi'

export const MigrateWalletTypesButton: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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
      
      <button
        onClick={handleMigrate}
        disabled={isLoading}
        className="btn btn-primary flex items-center gap-2 disabled:opacity-50"
      >
        <FiRefreshCw className={isLoading ? 'animate-spin' : ''} />
        {isLoading ? 'Migrasi...' : 'Migrasi Wallet Types'}
      </button>
    </div>
  )
}
