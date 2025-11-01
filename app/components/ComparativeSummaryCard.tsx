'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useWallet } from '@/app/providers/WalletProvider'
import { FiTrendingUp, FiTrendingDown, FiRefreshCw } from 'react-icons/fi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { LineChart } from 'lucide-react'

interface SummaryData {
  currentPeriod: { 
    income: number
    expense: number
    savings: number
  }
  previousPeriod: { 
    income: number
    expense: number
    savings: number
  }
}

interface ComparativeSummaryCardProps {
  period?: string
  onPeriodChange?: (period: string) => void
}

const ComparativeSummaryCard = ({ period = 'month', onPeriodChange }: ComparativeSummaryCardProps) => {
  const { selectedWallet } = useWallet()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<SummaryData | null>(null)
  const [localPeriod, setLocalPeriod] = useState(period)
  const lastFetchKeyRef = useRef<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPeriod = e.target.value
    setLocalPeriod(newPeriod)
    if (onPeriodChange) {
      onPeriodChange(newPeriod)
    }
  }
  
  useEffect(() => {
    setLocalPeriod(period)
  }, [period])

  const fetchData = async (fetchKey: string) => {
    if (!selectedWallet) return
    
    // Differentiate first-load vs manual refresh to keep UI snappy
    if (!data) {
      setIsLoading(true)
    } else {
      setIsRefreshing(true)
    }
    setError(null)
    
    try {
      const response = await fetch('/api/insights/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletId: selectedWallet.id, period: localPeriod })
      })
      
      if (!response.ok) throw new Error('Failed to fetch summary data')
      
      const result = await response.json()
      if (lastFetchKeyRef.current !== fetchKey) {
        return
      }
      setData(result)
    } catch (err) {
      console.error('Error fetching summary:', err)
      if (lastFetchKeyRef.current === fetchKey) {
        setError('Gagal load data summary')
      }
    } finally {
      if (lastFetchKeyRef.current === fetchKey && !data) {
        setIsLoading(false)
      }
      if (lastFetchKeyRef.current === fetchKey && data) {
        setIsRefreshing(false)
      }
    }
  }
  
  useEffect(() => {
    if (selectedWallet) {
      const fetchKey = `${selectedWallet.id}|${localPeriod}`
      if (lastFetchKeyRef.current === fetchKey) {
        return
      }
      lastFetchKeyRef.current = fetchKey
      fetchData(fetchKey)
    }
  }, [selectedWallet, localPeriod])
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }
  
  const getChangePercent = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / Math.abs(previous)) * 100
  }
  
  const formatDelta = (value: number) => {
    const sign = value >= 0 ? '+' : '-'
    return `${sign}${formatCurrency(Math.abs(value))}`
  }
  
  const getPeriodComparisonLabel = () => {
    switch (localPeriod) {
      case 'month':
        return 'bulan lalu'
      case 'quarter':
        return 'kuartal lalu'
      case 'year':
        return 'tahun lalu'
      default:
        return 'periode sebelumnya'
    }
  }

  const buildInsight = (
    incomeChangePct: number,
    expenseChangePct: number,
    incomeDeltaValue: number,
    expenseDeltaValue: number
  ) => {
    if (!data) return null

    if (data.meta?.insight?.text) {
      return {
        tone: data.meta.insight.tone,
        text: data.meta.insight.text,
        source: data.meta.insight.source
      }
    }

    const savingsRate = data.currentPeriod.income > 0 
      ? (data.currentPeriod.savings / data.currentPeriod.income) * 100
      : 0
    const periodLabel = getPeriodComparisonLabel()

    if (data.currentPeriod.savings > 0 && savingsRate >= 20) {
      return {
        tone: 'positive' as const,
        text: `Cashflow kamu tetap hijau dengan savings rate ${savingsRate.toFixed(1)}%. Pertahankan tempo nabung ini!`,
        source: 'fallback' as const
      }
    }

    if (expenseChangePct >= 20 && expenseDeltaValue > 0) {
      return {
        tone: 'warning' as const,
        text: `Pengeluaran naik ${expenseChangePct.toFixed(1)}% (${formatDelta(expenseDeltaValue)}). Cek kategori terbesar dan cari cara buat tekan biaya rutin.`,
        source: 'fallback' as const
      }
    }

    if (incomeChangePct <= -10 && incomeDeltaValue < 0) {
      return {
        tone: 'warning' as const,
        text: `Income turun ${Math.abs(incomeChangePct).toFixed(1)}%. Coba explore tambahan pemasukan atau pastikan pemasukan rutin tercatat.`,
        source: 'fallback' as const
      }
    }

    if (savingsRate >= 8) {
      return {
        tone: 'positive' as const,
        text: `Good job! Kamu masih catat surplus ${formatCurrency(data.currentPeriod.savings)} dengan savings rate ${savingsRate.toFixed(1)}%.`,
        source: 'fallback' as const
      }
    }

    if (data.currentPeriod.savings < 0) {
      const deficit = formatCurrency(Math.abs(data.currentPeriod.savings))
      return {
        tone: 'negative' as const,
        text: `Cashflow minus ${deficit}. Coba review pos pengeluaran yang lompat dari ${periodLabel} dan tunda biaya non-esensial.`,
        source: 'fallback' as const
      }
    }

    if (data.currentPeriod.income === 0 && data.currentPeriod.expense > 0) {
      return {
        tone: 'warning' as const,
        text: 'Belum ada pemasukan tercatat di periode ini. Pastikan income kamu sudah tercatat supaya insight makin akurat.',
        source: 'fallback' as const
      }
    }

    return {
      tone: 'neutral' as const,
      text: `Cashflow kamu nyaris seimbang. Kalau mau naikin tabungan, targetin surplus kecil tiap ${localPeriod === 'month' ? 'bulan' : 'periode'}.`,
      source: 'fallback' as const
    }
  }

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Ringkasan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-24 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  if (error) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Ringkasan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-24 flex items-center justify-center text-sm text-gray-500">
            {error}
          </div>
        </CardContent>
      </Card>
    )
  }
  
  if (!data) return null
  
  const incomeChange = getChangePercent(data.currentPeriod.income, data.previousPeriod.income)
  const expenseChange = getChangePercent(data.currentPeriod.expense, data.previousPeriod.expense)
  const savingsChange = data.previousPeriod.savings !== 0 
    ? getChangePercent(data.currentPeriod.savings, data.previousPeriod.savings)
    : data.currentPeriod.savings > 0 ? 100 : 0

  const incomeDelta = data.currentPeriod.income - data.previousPeriod.income
  const expenseDelta = data.currentPeriod.expense - data.previousPeriod.expense
  const savingsDelta = data.currentPeriod.savings - data.previousPeriod.savings
  const savingsRate = data.currentPeriod.income > 0
    ? (data.currentPeriod.savings / data.currentPeriod.income) * 100
    : 0
  const comparisonLabel = getPeriodComparisonLabel()
  const insight = buildInsight(incomeChange, expenseChange, incomeDelta, expenseDelta)
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
          <CardTitle className="text-lg">Ringkasan</CardTitle>
          <div className="flex items-center mt-2 sm:mt-0 gap-3">
            <select
              value={localPeriod}
              onChange={handlePeriodChange}
              className="text-sm rounded border border-gray-200 px-2 py-1 bg-white"
            >
              <option value="month">Bulanan</option>
              <option value="quarter">Kuartalan</option>
              <option value="year">Tahunan</option>
            </select>
            <Link 
              href="/insights/comparative" 
              className="text-xs text-blue-500 hover:underline flex items-center"
            >
              <LineChart size={14} className="mr-1" />
              Lihat Detail
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid gap-3">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-sm text-gray-500">Total Pemasukan</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{formatCurrency(data.currentPeriod.income)}</span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${incomeChange >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                    {incomeChange >= 0 ? <FiTrendingUp className="mr-1" size={12} /> : <FiTrendingDown className="mr-1" size={12} />}
                    {Math.abs(incomeChange).toFixed(1)}%
                  </span>
                </div>
              </div>
              <span className="text-xs text-gray-400 min-w-[120px] text-right">
                {formatDelta(incomeDelta)} vs {comparisonLabel}
              </span>
            </div>
            
            <div className="flex justify-between items-start">
              <div>
                <span className="text-sm text-gray-500">Total Pengeluaran</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{formatCurrency(data.currentPeriod.expense)}</span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${expenseChange <= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                    {expenseChange <= 0 ? <FiTrendingDown className="mr-1" size={12} /> : <FiTrendingUp className="mr-1" size={12} />}
                    {Math.abs(expenseChange).toFixed(1)}%
                  </span>
                </div>
              </div>
              <span className="text-xs text-gray-400 min-w-[120px] text-right">
                {formatDelta(expenseDelta)} vs {comparisonLabel}
              </span>
            </div>
            
            <div className="flex justify-between items-start border-t pt-3">
              <div>
                <span className="text-sm font-medium">Tabungan Bersih</span>
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${data.currentPeriod.savings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(data.currentPeriod.savings)}
                  </span>
                  {data.previousPeriod.savings !== 0 && (
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${savingsChange >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                      {savingsChange >= 0 ? <FiTrendingUp className="mr-1" size={12} /> : <FiTrendingDown className="mr-1" size={12} />}
                      {Math.abs(savingsChange).toFixed(1)}%
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                  <span>Rasio tabungan</span>
                  <span className={`font-semibold ${savingsRate >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                    {savingsRate.toFixed(1)}%
                  </span>
                </div>
              </div>
              <span className="text-xs text-gray-400 min-w-[120px] text-right">
                {formatDelta(savingsDelta)} vs {comparisonLabel}
              </span>
            </div>
          </div>
          
          {insight && (
            <div className={`rounded-lg border px-3 py-2 text-xs leading-relaxed ${insight.tone === 'positive'
              ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
              : insight.tone === 'negative'
              ? 'border-red-100 bg-red-50 text-red-700'
              : insight.tone === 'warning'
              ? 'border-amber-100 bg-amber-50 text-amber-700'
              : 'border-slate-200 bg-slate-50 text-slate-600'
            }`}>
              {insight.text}
              {insight.source === 'ai' && (
                <span className="ml-2 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-600">
                  AI
                </span>
              )}
            </div>
          )}
        </div>
        
        <button 
          onClick={() => {
            if (!selectedWallet) return
            const fetchKey = `${selectedWallet.id}|${localPeriod}|${Date.now()}`
            lastFetchKeyRef.current = fetchKey
            fetchData(fetchKey)
          }}
          className="mt-4 w-full text-xs flex items-center justify-center p-1 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-60"
          disabled={isRefreshing}
        >
          <FiRefreshCw className={`mr-1 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </CardContent>
    </Card>
  )
}

export default ComparativeSummaryCard 
