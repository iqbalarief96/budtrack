'use client'

import { Bar } from 'react-chartjs-2'
import { useMemo } from 'react'

/**
 * WalletContributionChart
 *
 * Stacked bar chart that breaks down each spending category by which wallet
 * the spending came from. Built for the personal Wallet Group (Wallet Linking)
 * view, where a user has merged multiple wallets and wants to see, per category,
 * "who spent how much" — e.g. for a couple: Makan = Selly 64rb / Dompet Utama 48rb.
 *
 * Data source: groupDashboardData.spendingByCategory[].walletContributions
 *   CategorySpending = { categoryName, amount, walletContributions: [{ walletId, walletName, amount }] }
 */

export interface WalletContribution {
  walletId: string
  walletName: string
  amount: number
}

export interface CategorySpending {
  categoryId?: string
  categoryName: string
  amount: number
  walletContributions: WalletContribution[]
}

interface Props {
  spendingByCategory: CategorySpending[]
  currencyCode?: string
  maxCategories?: number
}

// Stable, readable palette for wallet segments.
const WALLET_COLORS = [
  '#6366f1', // indigo
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
]

function formatCurrency(value: number, currencyCode = 'IDR') {
  try {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(value)
  } catch {
    return `Rp ${Math.round(value).toLocaleString('id-ID')}`
  }
}

export default function WalletContributionChart({
  spendingByCategory,
  currencyCode = 'IDR',
  maxCategories = 8,
}: Props) {
  const { chartData, options, walletTotals, isEmpty } = useMemo(() => {
    const categories = [...(spendingByCategory || [])]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, maxCategories)

    // Collect the distinct wallets across all category contributions.
    const walletMap = new Map<string, string>() // walletId -> walletName
    for (const cat of categories) {
      for (const wc of cat.walletContributions || []) {
        if (!walletMap.has(wc.walletId)) walletMap.set(wc.walletId, wc.walletName)
      }
    }
    const walletIds = Array.from(walletMap.keys())

    // Per-wallet grand totals (for the summary legend below the chart).
    const walletTotals = walletIds.map((id, i) => {
      const total = categories.reduce((sum, cat) => {
        const wc = cat.walletContributions?.find((w) => w.walletId === id)
        return sum + (wc?.amount || 0)
      }, 0)
      return {
        walletId: id,
        walletName: walletMap.get(id) || 'Wallet',
        total,
        color: WALLET_COLORS[i % WALLET_COLORS.length],
      }
    })

    const labels = categories.map((c) => c.categoryName)

    const datasets = walletIds.map((id, i) => ({
      label: walletMap.get(id) || 'Wallet',
      data: categories.map((cat) => {
        const wc = cat.walletContributions?.find((w) => w.walletId === id)
        return wc?.amount || 0
      }),
      backgroundColor: WALLET_COLORS[i % WALLET_COLORS.length],
      borderWidth: 0,
      borderRadius: 4,
      stack: 'spending',
    }))

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y' as const, // horizontal bars: easier to read category names
      plugins: {
        legend: { position: 'bottom' as const },
        tooltip: {
          callbacks: {
            label: (ctx: any) =>
              `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.x, currencyCode)}`,
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          ticks: {
            callback: (v: any) =>
              Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}rb` : `${v}`,
          },
        },
        y: { stacked: true },
      },
    }

    return {
      chartData: { labels, datasets },
      options,
      walletTotals,
      isEmpty: categories.length === 0 || walletIds.length === 0,
    }
  }, [spendingByCategory, currencyCode, maxCategories])

  if (isEmpty) {
    return (
      <div className="flex items-center justify-center h-80 text-gray-400">
        Belum ada data kontribusi per dompet
      </div>
    )
  }

  return (
    <div>
      <div className="h-80">
        <Bar data={chartData} options={options} />
      </div>

      {/* Per-wallet grand totals */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {walletTotals
          .sort((a, b) => b.total - a.total)
          .map((w) => (
            <div
              key={w.walletId}
              className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
            >
              <span className="flex items-center gap-2 text-sm text-gray-700">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: w.color }}
                />
                {w.walletName}
              </span>
              <span className="text-sm font-semibold text-gray-900">
                {formatCurrency(w.total, currencyCode)}
              </span>
            </div>
          ))}
      </div>
    </div>
  )
}
