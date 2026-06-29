'use client'

import { useEffect, useState } from 'react'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount || 0)
}

export default function SavingsDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/savings/dashboard')
      .then((res) => res.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-6">Loading tabungan...</div>
  if (!data || data.error) return <div className="p-6 text-red-600">Gagal load dashboard tabungan</div>

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="text-sm text-gray-500">Total Tabungan</div>
          <div className="text-2xl font-bold text-blue-700">{formatCurrency(data.totalBalance)}</div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="text-sm text-gray-500">Setoran Bulan Ini</div>
          <div className="text-2xl font-bold text-green-700">{formatCurrency(data.totalContributedThisMonth)}</div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="text-sm text-gray-500">Bucket Tabungan</div>
          <div className="text-2xl font-bold text-gray-900">{data.walletCount}</div>
        </div>
      </div>

      <div className="rounded-lg bg-white p-4 shadow">
        <h2 className="mb-3 text-lg font-semibold">Saving apa aja</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.wallets.map((wallet: any) => (
            <div key={wallet.walletId} className="rounded-lg border p-3">
              <div className="font-semibold">{wallet.icon || '💵'} {wallet.name}</div>
              <div className="text-xl font-bold text-blue-700">{formatCurrency(wallet.balance)}</div>
              <div className="text-sm text-gray-500">Bulan ini {formatCurrency(wallet.contributedThisMonth)}</div>
              <div className="text-xs text-gray-400">Last: {wallet.lastContributionDate ? new Date(wallet.lastContributionDate).toLocaleDateString('id-ID') : '-'}</div>
            </div>
          ))}
          {!data.wallets.length ? <p className="text-sm text-gray-500">Belum ada wallet tabungan.</p> : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-4 shadow">
          <h2 className="mb-3 text-lg font-semibold">Trend Setoran Bulanan</h2>
          <div className="space-y-2">
            {data.monthlyTrend.map((item: any) => (
              <div key={item.month} className="flex justify-between rounded bg-gray-50 px-3 py-2 text-sm">
                <span>{item.month}</span>
                <strong>{formatCurrency(item.amount)}</strong>
              </div>
            ))}
            {!data.monthlyTrend.length ? <p className="text-sm text-gray-500">Belum ada kontribusi.</p> : null}
          </div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <h2 className="mb-3 text-lg font-semibold">Belum Termigrasi</h2>
          <div className="space-y-2">
            {data.unmapped.map((item: any) => (
              <div key={item.transactionId} className="rounded border px-3 py-2 text-sm">
                <div className="font-medium">{item.description}</div>
                <div className="text-gray-500">{new Date(item.date).toLocaleDateString('id-ID')} • {formatCurrency(item.amount)} • {item.detectedLabel}</div>
              </div>
            ))}
            {!data.unmapped.length ? <p className="text-sm text-gray-500">Semua savings transaction sudah rapi.</p> : null}
          </div>
        </div>
      </div>
    </div>
  )
}
