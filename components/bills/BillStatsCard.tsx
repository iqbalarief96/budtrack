'use client'

import { useState, useEffect } from 'react'
import { FiTrendingUp, FiClock, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi'
import { BillStats } from '@/app/types/bill'

export default function BillStatsCard() {
  const [stats, setStats] = useState<BillStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/bills/stats')
      const data = await response.json()
      if (response.ok) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Bill Statistics</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Monthly Total */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <FiTrendingUp size={18} />
            <span className="text-sm font-medium">Monthly Bills</span>
          </div>
          <div className="text-xl font-bold text-gray-900">
            Rp {stats.totalMonthlyAmount.toLocaleString('id-ID')}
          </div>
          <div className="text-xs text-gray-500">{stats.totalBillsCount} bills</div>
        </div>

        {/* On-Time Rate */}
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <FiCheckCircle size={18} />
            <span className="text-sm font-medium">On-Time Rate</span>
          </div>
          <div className="text-xl font-bold text-gray-900">
            {stats.paidOnTimePercentage.toFixed(0)}%
          </div>
          <div className="text-xs text-gray-500">payments on time</div>
        </div>

        {/* Average Days Early */}
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-purple-600 mb-1">
            <FiClock size={18} />
            <span className="text-sm font-medium">Avg. Days Early</span>
          </div>
          <div className="text-xl font-bold text-gray-900">
            {stats.averageDaysBeforeDue > 0 ? '+' : ''}{stats.averageDaysBeforeDue.toFixed(1)}
          </div>
          <div className="text-xs text-gray-500">
            {stats.averageDaysBeforeDue >= 0 ? 'days before due' : 'days late'}
          </div>
        </div>

        {/* Overdue */}
        <div className={`rounded-lg p-4 ${stats.overdueTotal > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
          <div className={`flex items-center gap-2 mb-1 ${stats.overdueTotal > 0 ? 'text-red-600' : 'text-gray-600'}`}>
            <FiAlertTriangle size={18} />
            <span className="text-sm font-medium">Overdue</span>
          </div>
          <div className="text-xl font-bold text-gray-900">
            Rp {stats.overdueTotal.toLocaleString('id-ID')}
          </div>
          <div className="text-xs text-gray-500">needs attention</div>
        </div>
      </div>

      {/* Category Breakdown */}
      {stats.byCategory.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">By Category</h3>
          <div className="space-y-2">
            {stats.byCategory.slice(0, 5).map((cat) => (
              <div key={cat.categoryId || 'uncategorized'} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{cat.categoryName}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    Rp {cat.totalAmount.toLocaleString('id-ID')}
                  </span>
                  <span className="text-xs text-gray-500">({cat.count})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
