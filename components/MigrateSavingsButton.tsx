'use client'

import { useState } from 'react'
import { toast } from 'sonner'

export default function MigrateSavingsButton() {
  const [isLoading, setIsLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleDryRun = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/savings/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: true })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Preview selesai! Cek console browser untuk detail.')
        console.log('Migration Preview:', data)
      } else {
        toast.error(data.message || 'Preview gagal')
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat preview')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleMigrate = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/savings/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: false })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Migrasi berhasil! Refresh halaman untuk melihat wallet baru.')
        setShowConfirm(false)
        // Refresh page after 2 seconds
        setTimeout(() => window.location.reload(), 2000)
      } else {
        toast.error(data.message || 'Migrasi gagal')
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat migrasi')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  if (showConfirm) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-semibold text-yellow-800 mb-2">
          ⚠️ Konfirmasi Migrasi
        </h3>
        <p className="text-sm text-yellow-700 mb-4">
          Proses ini akan:
        </p>
        <ul className="text-sm text-yellow-700 mb-4 list-disc list-inside space-y-1">
          <li>Membuat wallet SAVINGS baru untuk setiap jenis tabungan</li>
          <li>Memindahkan saldo dari transaksi lama ke wallet baru</li>
          <li>Menandai transaksi lama sebagai "MIGRATED"</li>
          <li>Proses ini TIDAK BISA dibatalkan</li>
        </ul>
        <div className="flex gap-2">
          <button
            onClick={handleMigrate}
            disabled={isLoading}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Memproses...' : 'Ya, Lanjutkan Migrasi'}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
          >
            Batal
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h3 className="font-semibold text-blue-800 mb-2">
        🔄 Migrasi Tabungan ke Wallet
      </h3>
      <p className="text-sm text-blue-700 mb-4">
        Sistem lama: Tabungan dicatat sebagai transaksi expense<br />
        Sistem baru: Setiap tabungan punya wallet sendiri
      </p>
      <div className="flex gap-2">
        <button
          onClick={handleDryRun}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {isLoading ? 'Loading...' : '👁️ Preview Dulu'}
        </button>
        <button
          onClick={() => setShowConfirm(true)}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          Mulai Migrasi
        </button>
      </div>
    </div>
  )
}
