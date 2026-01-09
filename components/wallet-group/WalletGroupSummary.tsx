'use client'

import { useState, useEffect } from 'react'
import { FiTrendingUp, FiTrendingDown, FiCreditCard, FiRefreshCw } from 'react-icons/fi'

interface WalletBreakdown {
  walletId: string
  walletName: string
  balance: number
  income: number
  expense: number
  percentage: number
}

interface AggregatedSummary {
  totalBalance: number
  totalIncome: number
  totalExpense: number
  walletBreakdown: WalletBreakdown[]
  currencyCode: string
}

interface WalletGroupSummaryProps {
  groupId: string
  groupName?: string
  groupColor?: string
}

export default function WalletGroupSummary({ 
  groupId, 
  groupName,
  groupColor = '#7B1FA2'
}: WalletGroupSummaryProps) {
  const [summary, setSummary] = useState<AggregatedSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSummary = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/wallet-groups/${groupId}/summary`)
      if (!response.ok) {
        throw new Error('Failed to fetch summary')
      }
      const responseData = await response.json()
      // API returns { success: true, data: {...} } format
      const data = responseData.data || responseData
      setSummary(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load summary')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (groupId) {
      fetchSummary()
    }
  }, [groupId])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="text-center text-red-600">
          <p>{error}</p>
          <button
            onClick={fetchSummary}
            className="mt-2 text-sm text-blue-600 hover:underline flex items-center justify-center gap-1"
          >
            <FiRefreshCw size={14} />
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (!summary) {
    return null
  }

  const netChange = summary.totalIncome - summary.totalExpense
  const isPositive = netChange >= 0

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Header with total balance */}
      <div 
        className="p-6 text-white"
        style={{ backgroundColor: groupColor }}
      >
        {groupName && (
          <p className="text-sm opacity-90 mb-1">{groupName}</p>
        )}
        <p className="text-sm opacity-75">Total Balance</p>
        <p className="text-3xl font-bold mt-1">
          {formatCurrency(summary.totalBalance)}
        </p>
        <p className="text-sm opacity-75 mt-2">
          {summary.walletBreakdown?.length || 0} wallet{(summary.walletBreakdown?.length || 0) !== 1 ? 's' : ''} linked
        </p>
      </div>

      {/* Income and Expense */}
      <div className="grid grid-cols-2 divide-x divide-gray-200">
        <div className="p-4">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <FiTrendingUp size={16} />
            <span className="text-sm font-medium">Income</span>
          </div>
          <p className="text-xl font-semibold text-gray-900">
            {formatCurrency(summary.totalIncome)}
          </p>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-2 text-red-600 mb-1">
            <FiTrendingDown size={16} />
            <span className="text-sm font-medium">Expense</span>
          </div>
          <p className="text-xl font-semibold text-gray-900">
            {formatCurrency(summary.totalExpense)}
          </p>
        </div>
      </div>

      {/* Net Change */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Net Change</span>
          <span className={`font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? '+' : ''}{formatCurrency(netChange)}
          </span>
        </div>
      </div>

      {/* Wallet Breakdown */}
      {summary.walletBreakdown && summary.walletBreakdown.length > 0 && (
        <div className="border-t border-gray-200">
          <div className="px-4 py-3 bg-gray-50">
            <p className="text-sm font-medium text-gray-700">Wallet Breakdown</p>
          </div>
          <div className="divide-y divide-gray-100">
            {summary.walletBreakdown.map((wallet) => (
              <div key={wallet.walletId} className="px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FiCreditCard size={14} className="text-gray-400" />
                    <span className="text-sm font-medium text-gray-900">
                      {wallet.walletName}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(wallet.balance)}
                  </span>
                </div>
                
                {/* Progress bar showing percentage */}
                <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="absolute left-0 top-0 h-full rounded-full transition-all"
                    style={{ 
                      width: `${Math.min(wallet.percentage, 100)}%`,
                      backgroundColor: groupColor
                    }}
                  />
                </div>
                
                <div className="flex justify-between mt-1 text-xs text-gray-500">
                  <span>{wallet.percentage.toFixed(1)}% of total</span>
                  <span>
                    <span className="text-green-600">+{formatCurrency(wallet.income)}</span>
                    {' / '}
                    <span className="text-red-600">-{formatCurrency(wallet.expense)}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
