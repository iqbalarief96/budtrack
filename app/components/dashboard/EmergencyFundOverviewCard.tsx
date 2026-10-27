'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useWallet } from '@/app/providers/WalletProvider'

type Overview = {
  source: { mode: 'manual' | 'auto'; wallets: Array<{ id: string; name: string; type: string }> } | null
  usesSpendingWallet: boolean
  recommendedWallet: { id: string; name: string; balance: number } | null
  targetAmount: number
  targetSource: 'wallet' | 'user' | 'suggested'
  currentAmount: number
  percentage: number | null
  monthlyConsumption: number
  monthsCovered: number | null
  savingsWallets: Array<{ id: string; name: string; type: string; balance: number }>
  totalSavings: number
}

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)

const QUERY_KEY = ['emergency-fund-overview']

/**
 * Emergency fund (user-level, not tied to the dashboard's selected wallet)
 * plus the savings/investment wallets with their real balances.
 */
export default function EmergencyFundOverviewCard() {
  const { wallets } = useWallet()
  const qc = useQueryClient()
  const [editingTarget, setEditingTarget] = useState(false)
  const [targetInput, setTargetInput] = useState('')

  // Balances change on every transaction; keying on them keeps the card fresh
  // even for writes that don't go through the react-query mutation hooks.
  const balanceKey = wallets.map((w) => `${w.id}:${w.balance ?? 0}`).join('|')
  const { data, isLoading, error } = useQuery<Overview>({
    queryKey: [...QUERY_KEY, balanceKey],
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const res = await fetch('/api/emergency-fund/overview')
      if (!res.ok) throw new Error('Gagal memuat dana darurat')
      return res.json()
    },
  })

  const setSource = useMutation({
    mutationFn: async (body: { walletId: string; targetAmount?: number }) => {
      const res = await fetch('/api/emergency-fund/overview', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan')
      return json
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY })
      qc.invalidateQueries({ queryKey: ['emergency-fund'] })
      setEditingTarget(false)
    },
  })

  if (isLoading) return <p className="py-6 text-center text-sm text-gray-500">Memuat dana darurat…</p>
  if (error || !data) return <p className="py-6 text-center text-sm text-red-600">Gagal memuat dana darurat.</p>

  const sourceWallet = data.source?.wallets[0] ?? null
  const pct = data.percentage ?? 0
  const barColor = pct >= 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-blue-500' : 'bg-amber-500'
  // Savings wallets first in the picker, then spending wallets.
  const pickable = [...wallets].sort((a, b) => Number((a.type || 'MAIN') === 'MAIN') - Number((b.type || 'MAIN') === 'MAIN'))

  const saveTarget = () => {
    const n = Number(targetInput.replace(/\D/g, ''))
    if (!sourceWallet || !Number.isFinite(n) || n <= 0) return
    setSource.mutate({ walletId: sourceWallet.id, targetAmount: n })
  }

  return (
    <div className="space-y-4 text-sm">
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-2xl font-bold text-gray-900">{rupiah(data.currentAmount)}</p>
          <p className="text-xs text-gray-500">
            dari {rupiah(data.targetAmount)}
            {data.targetSource === 'suggested' && ' (saran: 3× pengeluaran bulanan)'}
          </p>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div className={`h-full ${barColor}`} style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
        <p className="mt-1 text-xs text-gray-600">
          {pct.toFixed(0)}% target
          {data.monthsCovered !== null && ` · cukup ≈ ${data.monthsCovered.toFixed(1)} bulan pengeluaran`}
        </p>
      </div>

      {data.usesSpendingWallet && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
          Dompet harian dipakai sebagai dana darurat, jadi uangnya juga kehitung di Safe to spend.
          {data.recommendedWallet && (
            <button
              type="button"
              disabled={setSource.isPending}
              onClick={() => setSource.mutate({ walletId: data.recommendedWallet!.id })}
              className="mt-1.5 block rounded bg-amber-600 px-2 py-1 font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              Pakai {data.recommendedWallet.name} ({rupiah(data.recommendedWallet.balance)})
            </button>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
        <span>Sumber:</span>
        <select
          aria-label="Dompet dana darurat"
          className="rounded border border-gray-300 bg-white px-2 py-1 text-xs"
          value={sourceWallet?.id ?? ''}
          disabled={setSource.isPending}
          onChange={(e) => e.target.value && setSource.mutate({ walletId: e.target.value })}
        >
          {!sourceWallet && <option value="">Pilih dompet…</option>}
          {pickable.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}{(w.type || 'MAIN') === 'MAIN' ? ' (harian)' : ''}
            </option>
          ))}
        </select>
        {data.source?.mode === 'auto' && <span className="text-gray-400">(otomatis)</span>}
        {sourceWallet && !editingTarget && (
          <button type="button" className="text-blue-600 hover:underline" onClick={() => { setTargetInput(String(Math.round(data.targetAmount))); setEditingTarget(true) }}>
            Ubah target
          </button>
        )}
      </div>

      {editingTarget && (
        <div className="flex items-center gap-2">
          <input
            inputMode="numeric"
            aria-label="Target dana darurat"
            className="w-36 rounded border border-gray-300 px-2 py-1 text-xs"
            value={targetInput}
            onChange={(e) => setTargetInput(e.target.value)}
          />
          {data.monthlyConsumption > 0 && (
            <button type="button" className="text-xs text-blue-600 hover:underline" onClick={() => setTargetInput(String(data.monthlyConsumption * 3))}>
              Pakai 3× ({rupiah(data.monthlyConsumption * 3)})
            </button>
          )}
          <button type="button" onClick={saveTarget} disabled={setSource.isPending} className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-50">Simpan</button>
          <button type="button" onClick={() => setEditingTarget(false)} className="text-xs text-gray-500">Batal</button>
        </div>
      )}
      {setSource.error && <p className="text-xs text-red-600">{(setSource.error as Error).message}</p>}

      {data.savingsWallets.length > 0 && (
        <div className="border-t pt-3">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Tabungan & investasi</p>
          <ul className="space-y-1">
            {data.savingsWallets.map((w) => (
              <li key={w.id} className="flex justify-between gap-2">
                <span className="truncate text-gray-700">{w.name}</span>
                <span className={`font-medium ${w.balance < 0 ? 'text-red-600' : 'text-gray-900'}`}>{rupiah(w.balance)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex justify-between border-t pt-2 font-semibold">
            <span>Total</span>
            <span>{rupiah(data.totalSavings)}</span>
          </div>
        </div>
      )}
      <Link href="/savings" className="block text-xs text-blue-600 hover:underline">Lihat detail tabungan →</Link>
    </div>
  )
}
