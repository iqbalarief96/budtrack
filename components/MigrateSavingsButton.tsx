'use client'

import { useState } from 'react'
import { toast } from 'sonner'

type PreviewRow = {
  sourceTransactionId: string
  date: string
  description: string
  amount: number
  detectedLabel: string
  detectedIcon: string
  detectedColor: string
  confidence: string
  suggestedWalletId: string | null
  suggestedWalletName: string | null
  alreadyMigrated: boolean
  routingSource?: string
}

type SavingsWallet = {
  id: string
  name: string
  icon?: string | null
  color?: string | null
  balance: number
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}

export default function MigrateSavingsButton() {
  const [isLoading, setIsLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [preview, setPreview] = useState<any>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [newWalletNames, setNewWalletNames] = useState<Record<string, string>>({})

  const rows: PreviewRow[] = preview?.rows ?? []
  const wallets: SavingsWallet[] = preview?.savingsWallets ?? []
  const pendingRows = rows.filter((row) => !row.alreadyMigrated)
  const canMigrate = pendingRows.every((row) => mapping[row.sourceTransactionId])

  const handleDryRun = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/savings/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: true })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Preview gagal')

      const nextPreview = data.data?.summary ?? null
      const nextMapping: Record<string, string> = {}
      const nextNames: Record<string, string> = {}
      for (const row of nextPreview?.rows ?? []) {
        nextMapping[row.sourceTransactionId] = row.suggestedWalletId || 'CREATE_NEW'
        nextNames[row.sourceTransactionId] = row.suggestedWalletName || row.detectedLabel
      }
      setPreview(nextPreview)
      setMapping(nextMapping)
      setNewWalletNames(nextNames)
      toast.success('Preview selesai. Cek tabel mapping di bawah.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan saat preview')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const buildMappings = () => pendingRows.map((row) => {
    const destination = mapping[row.sourceTransactionId]
    if (destination === 'CREATE_NEW') {
      return {
        sourceTransactionId: row.sourceTransactionId,
        createWalletName: newWalletNames[row.sourceTransactionId] || row.detectedLabel,
        icon: row.detectedIcon,
        color: row.detectedColor,
      }
    }
    return {
      sourceTransactionId: row.sourceTransactionId,
      destinationWalletId: destination,
    }
  })

  const handleMigrate = async () => {
    if (!canMigrate) {
      toast.error('Pilih destination wallet untuk semua transaksi pending.')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/savings/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: false, mappings: buildMappings() })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Migrasi gagal')

      toast.success(`Migrasi selesai: ${data.data?.summary?.created ?? 0} dibuat, ${data.data?.summary?.skippedExisting ?? 0} dilewati.`)
      setShowConfirm(false)
      await handleDryRun()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan saat migrasi')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h3 className="font-semibold text-blue-800 mb-2">🔄 Migrasi Tabungan ke Wallet</h3>
      <p className="text-sm text-blue-700 mb-4">
        Sistem lama: tabungan dicatat sebagai transaksi expense.<br />
        Sistem baru: setiap tabungan punya wallet sendiri, dengan mapping manual sebelum migrasi.
      </p>

      {preview?.groupDetails?.length ? (
        <div className="mb-4 grid gap-2 md:grid-cols-2">
          {preview.groupDetails.map((group: any) => (
            <div key={group.label} className="rounded-lg border border-blue-200 bg-white p-3 text-sm">
              <div className="font-medium text-blue-900">{group.icon} {group.label}</div>
              <div className="text-blue-700">{group.pendingCount} pending • {group.alreadyMigrated} sudah migrated</div>
              <div className="font-semibold text-blue-900">{formatCurrency(group.pendingAmount)}</div>
            </div>
          ))}
        </div>
      ) : null}

      {rows.length ? (
        <div className="mb-4 overflow-x-auto rounded-lg border border-blue-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-blue-100 text-left text-blue-900">
              <tr>
                <th className="px-3 py-2">Tanggal</th>
                <th className="px-3 py-2">Transaksi Lama</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2">Detected</th>
                <th className="px-3 py-2">Destination Wallet</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.sourceTransactionId} className="border-t border-blue-100">
                  <td className="px-3 py-2 whitespace-nowrap">{new Date(row.date).toLocaleDateString('id-ID')}</td>
                  <td className="px-3 py-2 min-w-[220px]">{row.description}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">{formatCurrency(row.amount)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {row.detectedIcon} {row.detectedLabel}
                    <div className="text-xs text-gray-500">{row.routingSource || row.confidence}</div>
                  </td>
                  <td className="px-3 py-2 min-w-[240px]">
                    {row.alreadyMigrated ? (
                      <span className="text-gray-500">Sudah migrated</span>
                    ) : (
                      <div className="space-y-2">
                        <select
                          value={mapping[row.sourceTransactionId] || ''}
                          onChange={(event) => setMapping((prev) => ({ ...prev, [row.sourceTransactionId]: event.target.value }))}
                          className="w-full rounded border border-blue-200 px-2 py-1"
                        >
                          <option value="">Pilih wallet</option>
                          {wallets.map((wallet) => (
                            <option key={wallet.id} value={wallet.id}>{wallet.name}</option>
                          ))}
                          <option value="CREATE_NEW">Buat baru: {row.suggestedWalletName || row.detectedLabel}</option>
                        </select>
                        {mapping[row.sourceTransactionId] === 'CREATE_NEW' ? (
                          <input
                            value={newWalletNames[row.sourceTransactionId] || row.detectedLabel}
                            onChange={(event) => setNewWalletNames((prev) => ({ ...prev, [row.sourceTransactionId]: event.target.value }))}
                            className="w-full rounded border border-blue-200 px-2 py-1"
                          />
                        ) : null}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {row.alreadyMigrated ? '✅ Skipped' : '🟡 Pending'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {showConfirm ? (
        <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
          <div className="font-semibold mb-2">⚠️ Konfirmasi Migrasi</div>
          <p>{pendingRows.length} transaksi pending akan dimigrasi. Proses aman diklik ulang; transaksi yang sudah linked akan dilewati.</p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleDryRun}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {isLoading ? 'Loading...' : '👁️ Preview Dulu'}
        </button>
        {!showConfirm ? (
          <button
            onClick={() => setShowConfirm(true)}
            disabled={isLoading || !rows.length || !canMigrate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            Mulai Migrasi
          </button>
        ) : (
          <>
            <button
              onClick={handleMigrate}
              disabled={isLoading || !canMigrate}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isLoading ? 'Memproses...' : 'Ya, Lanjutkan Migrasi'}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 text-sm"
            >
              Batal
            </button>
          </>
        )}
      </div>
    </div>
  )
}
