'use client'

/**
 * Widgets that read the dashboard's shared numbers (DashboardMetricsContext),
 * so they always match the hero cards: same wallet scope, same period, and
 * savings transfers are never counted as spending.
 */
import React from 'react'
import Link from 'next/link'
import type { DashboardMetrics } from '@/app/dashboard/DashboardMetricsContext'

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
const compact = (n: number) =>
  new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(n)

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#94a3b8']

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-gray-500">{children}</p>
}

export function RatioWidget({ m }: { m: DashboardMetrics }) {
  const { income, expense, savingsRate } = m.flows
  const top = m.flows.byCategory[0]
  const items = [
    { label: 'Saving rate', value: savingsRate === null ? '—' : `${savingsRate.toFixed(1)}%`, hint: savingsRate === null ? 'Belum ada pemasukan' : savingsRate >= 20 ? 'Mantap, di atas 20%' : 'Target sehat: 20%+', good: savingsRate !== null && savingsRate >= 20 },
    { label: 'Rasio pengeluaran', value: income > 0 ? `${((expense / income) * 100).toFixed(1)}%` : '—', hint: 'Konsumsi ÷ pemasukan', good: income > 0 && expense / income <= 0.8 },
    { label: 'Kategori terbesar', value: top ? top.name : '—', hint: top ? rupiah(top.amount) : 'Belum ada pengeluaran', good: true },
  ]
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {items.map((it) => (
        <div key={it.label} className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">{it.label}</p>
          <p className={`mt-0.5 truncate text-lg font-semibold ${it.good ? 'text-gray-900' : 'text-amber-700'}`}>{it.value}</p>
          <p className="text-[11px] text-gray-500">{it.hint}</p>
        </div>
      ))}
    </div>
  )
}

/** Top categories as bars (clearer than a 13-slice pie); the rest grouped. */
export function CategoryBreakdownWidget({ m, maxItems = 6 }: { m: DashboardMetrics; maxItems?: number }) {
  const cats = m.flows.byCategory
  const total = m.flows.expense
  if (!cats.length || total <= 0) return <Empty>Belum ada pengeluaran ({m.periodLabel.toLowerCase()}).</Empty>
  const top = cats.slice(0, maxItems)
  const rest = cats.slice(maxItems).reduce((s, c) => s + c.amount, 0)
  const rows = rest > 0 ? [...top, { name: `Lainnya (${cats.length - maxItems})`, amount: rest }] : top
  return (
    <div className="space-y-2.5">
      <p className="text-xs text-gray-500">
        {m.periodLabel} · total {rupiah(total)}
        {m.flows.saved > 0 && <> · ditabung {rupiah(m.flows.saved)} (gak dihitung)</>}
      </p>
      {rows.map((c, i) => {
        const pct = (c.amount / total) * 100
        return (
          <div key={c.name}>
            <div className="flex justify-between gap-2 text-sm">
              <span className="truncate text-gray-700">{c.name}</span>
              <span className="shrink-0 font-medium text-gray-900">{rupiah(c.amount)} <span className="text-xs font-normal text-gray-500">{pct.toFixed(0)}%</span></span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full" style={{ width: `${Math.max(2, pct)}%`, backgroundColor: COLORS[i % COLORS.length] }} />
            </div>
          </div>
        )
      })}
      <Link href="/insights" className="block pt-1 text-xs text-blue-600 hover:underline">Analisis lengkap →</Link>
    </div>
  )
}

/** 6-month bars: income vs consumption vs saved. Current month marked partial. */
export function CashflowTrendWidget({ m }: { m: DashboardMetrics }) {
  const months = m.monthlyHistory
  const max = Math.max(1, ...months.flatMap((x) => [x.income, x.expense, x.saved]))
  if (months.every((x) => !x.income && !x.expense && !x.saved)) return <Empty>Belum ada data 6 bulan terakhir.</Empty>
  const series = [
    { key: 'income' as const, label: 'Pemasukan', color: 'bg-emerald-400' },
    { key: 'expense' as const, label: 'Pengeluaran', color: 'bg-rose-400' },
    { key: 'saved' as const, label: 'Ditabung', color: 'bg-sky-400' },
  ]
  return (
    <div>
      <div className="flex h-40 items-end gap-2 sm:gap-3">
        {months.map((x) => (
          <div key={x.key} className="flex h-full flex-1 flex-col justify-end">
            <div className="flex h-full items-end justify-center gap-0.5">
              {series.map((s) => (
                <div
                  key={s.key}
                  title={`${s.label} ${x.label}: ${rupiah(x[s.key])}`}
                  className={`w-full max-w-[14px] rounded-t ${s.color} ${x.partial ? 'opacity-50' : ''}`}
                  style={{ height: `${(x[s.key] / max) * 100}%` }}
                />
              ))}
            </div>
            <p className="mt-1 text-center text-[11px] text-gray-500">{x.label}{x.partial ? '*' : ''}</p>
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-gray-600">
        {series.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1"><span className={`h-2 w-2 rounded-sm ${s.color}`} />{s.label}</span>
        ))}
        <span className="text-gray-400">* bulan berjalan</span>
      </div>
      <p className="mt-1 text-[11px] text-gray-400">Skala: tertinggi {compact(max)}</p>
    </div>
  )
}

export function RecentTransactionsWidget({ m, limit = 5 }: { m: DashboardMetrics; limit?: number }) {
  const txs = m.transactions.slice(0, limit)
  if (!txs.length) return <Empty>Belum ada transaksi ({m.periodLabel.toLowerCase()}).</Empty>
  return (
    <div>
      <ul className="divide-y divide-gray-100">
        {txs.map((tx) => {
          const isIncome = (tx.type || '').toUpperCase() === 'INCOME'
          const saved = m.savedIds.has(tx.id)
          return (
            <li key={tx.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">{tx.description || tx.category?.name || 'Transaksi'}</p>
                <p className="text-xs text-gray-500">
                  {tx.category?.name || 'Tanpa kategori'} · {new Date(tx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                  {saved && <span className="ml-1.5 rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-700">Ditabung</span>}
                </p>
              </div>
              <span className={`shrink-0 text-sm font-semibold ${saved ? 'text-sky-700' : isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                {isIncome ? '+' : '-'}{rupiah(Math.abs(tx.amount))}
              </span>
            </li>
          )
        })}
      </ul>
      <Link href="/transactions" className="mt-2 block text-center text-xs text-blue-600 hover:underline">Lihat semua transaksi →</Link>
    </div>
  )
}
