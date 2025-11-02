'use client'

import { useEffect, useState } from 'react'
import { ChevronRight, ChevronDown, Loader2 } from 'lucide-react'

interface Transaction {
  id: string
  description: string
  amount: number
  date: string
  walletName: string
}

interface SavingsBreakdown {
  type: string
  label: string
  icon: string
  total: number
  percentage: number
  transactions: Transaction[]
}

interface SavingsSummary {
  totalSavings: number
  transactionCount: number
  breakdown: SavingsBreakdown[]
}

interface WalletSavingsDetailProps {
  walletId: string
  timeRange?: 'this_month' | 'last_3_months' | 'all_time'
}

export default function WalletSavingsDetail({
  walletId,
  timeRange = 'all_time'
}: WalletSavingsDetailProps) {
  const [data, setData] = useState<SavingsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchSavingsData()
  }, [walletId, timeRange])

  const fetchSavingsData = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        walletId,
        timeRange
      })

      const response = await fetch(`/api/savings?${params}`)

      if (!response.ok) {
        throw new Error('Failed to fetch savings data')
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching savings:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const toggleCategory = (type: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(type)) {
        newSet.delete(type)
      } else {
        newSet.add(type)
      }
      return newSet
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading savings data...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">Error: {error}</p>
      </div>
    )
  }

  if (!data || data.breakdown.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <p className="text-gray-600">No savings data found for this wallet.</p>
        <p className="text-sm text-gray-500 mt-2">
          Create transactions with "Savings" category to track your savings.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Total Summary */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Total Savings</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(data.totalSavings)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Transactions</p>
            <p className="text-2xl font-bold text-gray-900">
              {data.transactionCount}
            </p>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="space-y-2">
        {data.breakdown.map((category) => {
          const isExpanded = expandedCategories.has(category.type)

          return (
            <div
              key={category.type}
              className="border border-gray-200 rounded-lg overflow-hidden bg-white hover:shadow-md transition-shadow"
            >
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category.type)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                  )}
                  <span className="text-2xl">{category.icon}</span>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">{category.label}</p>
                    <p className="text-sm text-gray-500">
                      {category.transactions.length} transaction{category.transactions.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">
                    {formatCurrency(category.total)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {category.percentage.toFixed(1)}%
                  </p>
                </div>
              </button>

              {/* Transaction List (Expandable) */}
              {isExpanded && (
                <div className="border-t border-gray-200 bg-gray-50">
                  {category.transactions.length > 0 ? (
                    <div className="divide-y divide-gray-200">
                      {category.transactions.map((transaction) => (
                        <div
                          key={transaction.id}
                          className="px-4 py-3 hover:bg-white transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">
                                {transaction.description || 'Unnamed transaction'}
                              </p>
                              <p className="text-sm text-gray-500">
                                {formatDate(transaction.date)} • {transaction.walletName}
                              </p>
                            </div>
                            <p className="font-semibold text-green-600 ml-4">
                              {formatCurrency(transaction.amount)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-6 text-center text-gray-500">
                      No transactions found
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
