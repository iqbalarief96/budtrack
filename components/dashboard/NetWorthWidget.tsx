'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus, DollarSign, ChevronRight } from 'lucide-react'
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  YAxis,
} from 'recharts'
import type { 
  NetWorthResponse, 
  NetWorthHistoryResponse,
  PercentageChange 
} from '@/app/types/net-worth'

/**
 * NetWorthWidget Component
 * Dashboard widget displaying net worth summary with mini chart
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

interface ChartDataPoint {
  date: string
  value: number
  formattedDate: string
}

// Custom tooltip for mini chart
const MiniTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-white px-2 py-1 rounded shadow-lg border text-xs">
        <p className="text-gray-600">{data.formattedDate}</p>
        <p className="font-semibold">{formatCurrency(data.value)}</p>
      </div>
    )
  }
  return null
}

export default function NetWorthWidget() {
  const [netWorthData, setNetWorthData] = useState<NetWorthResponse | null>(null)
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchNetWorthData()
  }, [])


  const fetchNetWorthData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch current net worth and 6-month history in parallel
      // Requirements: 5.1, 5.2, 5.4
      const [netWorthRes, historyRes] = await Promise.all([
        fetch('/api/net-worth'),
        fetch('/api/net-worth/history?period=6M'),
      ])

      if (!netWorthRes.ok) {
        throw new Error('Failed to fetch net worth')
      }

      const netWorthJson: NetWorthResponse = await netWorthRes.json()
      setNetWorthData(netWorthJson)

      // Process history for mini chart (Requirement: 5.2)
      if (historyRes.ok) {
        const historyJson: NetWorthHistoryResponse = await historyRes.json()
        const processedData = historyJson.snapshots
          .map((snapshot) => ({
            date: snapshot.date.toString(),
            value: snapshot.netWorth,
            formattedDate: new Date(snapshot.date).toLocaleDateString('id-ID', {
              month: 'short',
              year: '2-digit',
            }),
          }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        
        setChartData(processedData)
      }
    } catch (err) {
      console.error('Error fetching net worth data:', err)
      setError('Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }

  // Get trend indicator based on change direction (Requirement: 5.5)
  const getTrendIndicator = (change: PercentageChange | null) => {
    if (!change) return null

    const { direction, value } = change

    if (direction === 'up') {
      return (
        <div className="flex items-center text-green-600 text-sm">
          <TrendingUp className="h-4 w-4 mr-1" />
          <span className="font-medium">+{value.toFixed(1)}%</span>
        </div>
      )
    }

    if (direction === 'down') {
      return (
        <div className="flex items-center text-red-600 text-sm">
          <TrendingDown className="h-4 w-4 mr-1" />
          <span className="font-medium">-{value.toFixed(1)}%</span>
        </div>
      )
    }

    return (
      <div className="flex items-center text-gray-500 text-sm">
        <Minus className="h-4 w-4 mr-1" />
        <span className="font-medium">0%</span>
      </div>
    )
  }

  // Determine chart line color based on trend
  const getChartColor = () => {
    if (chartData.length < 2) return '#3b82f6' // blue default
    const firstValue = chartData[0].value
    const lastValue = chartData[chartData.length - 1].value
    return lastValue >= firstValue ? '#22c55e' : '#ef4444' // green or red
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-5 w-5 bg-gray-200 rounded"></div>
          <div className="h-5 bg-gray-200 rounded w-24"></div>
        </div>
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-20 bg-gray-200 rounded"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Net Worth</h3>
        </div>
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    )
  }


  const netWorth = netWorthData?.calculation?.netWorth ?? 0
  const totalAssets = netWorthData?.calculation?.totalAssets ?? 0
  const totalLiabilities = netWorthData?.calculation?.totalLiabilities ?? 0
  const change = netWorthData?.change ?? null

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header with link to full page (Requirement: 5.3) */}
      <div className="flex justify-between items-center p-4 border-b">
        <div className="flex items-center gap-2">
          <DollarSign className="text-blue-600" size={20} />
          <h3 className="font-semibold text-gray-900">Net Worth</h3>
        </div>
        <Link
          href="/net-worth"
          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
        >
          Detail <ChevronRight size={14} />
        </Link>
      </div>

      {/* Main Content */}
      <div className="p-4">
        {/* Current Net Worth Value (Requirement: 5.1) */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div
              className={`text-2xl font-bold ${
                netWorth >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {formatCurrency(netWorth)}
            </div>
            <div className="text-sm text-gray-500 mt-1">Kekayaan Bersih</div>
          </div>
          {/* Trend Indicator (Requirement: 5.5) */}
          {getTrendIndicator(change)}
        </div>

        {/* Assets and Liabilities Summary */}
        <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
          <div>
            <div className="text-xs text-gray-500">Aset</div>
            <div className="text-sm font-semibold text-green-600">
              {formatCurrency(totalAssets)}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Liabilitas</div>
            <div className="text-sm font-semibold text-red-600">
              {formatCurrency(totalLiabilities)}
            </div>
          </div>
        </div>

        {/* Mini Trend Chart (Requirement: 5.2) */}
        {chartData.length > 0 ? (
          <div className="h-20">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <YAxis hide domain={['dataMin', 'dataMax']} />
                <Tooltip content={<MiniTooltip />} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={getChartColor()}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="text-xs text-gray-400 text-center mt-1">
              Trend 6 bulan terakhir
            </div>
          </div>
        ) : (
          <div className="h-20 flex items-center justify-center text-sm text-gray-400">
            Belum ada data historis
          </div>
        )}
      </div>
    </div>
  )
}
