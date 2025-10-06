'use client'

import React, { useState, useEffect } from 'react'
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

  const fetchData = async () => {
    if (!selectedWallet) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/insights/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletId: selectedWallet.id, period: localPeriod })
      })
      
      if (!response.ok) throw new Error('Failed to fetch summary data')
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching summary:', err)
      setError('Gagal load data summary')
    } finally {
      setIsLoading(false)
    }
  }
  
  useEffect(() => {
    if (selectedWallet) {
      fetchData()
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
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Total Pemasukan:</span>
            <div className="flex items-center">
              <span className="font-medium">{formatCurrency(data.currentPeriod.income)}</span>
              <span className={`ml-2 text-xs flex items-center ${incomeChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {incomeChange >= 0 ? 
                  <FiTrendingUp className="mr-1" /> : 
                  <FiTrendingDown className="mr-1" />
                }
                {Math.abs(incomeChange).toFixed(1)}%
              </span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Total Pengeluaran:</span>
            <div className="flex items-center">
              <span className="font-medium">{formatCurrency(data.currentPeriod.expense)}</span>
              <span className={`ml-2 text-xs flex items-center ${expenseChange <= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {expenseChange <= 0 ? 
                  <FiTrendingDown className="mr-1" /> : 
                  <FiTrendingUp className="mr-1" />
                }
                {Math.abs(expenseChange).toFixed(1)}%
              </span>
            </div>
          </div>
          
          <div className="flex justify-between items-center pt-1 border-t">
            <span className="text-sm font-medium">Tabungan Bersih:</span>
            <div className="flex items-center">
              <span className={`font-bold ${data.currentPeriod.savings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(data.currentPeriod.savings)}
              </span>
              {data.previousPeriod.savings !== 0 && (
                <span className={`ml-2 text-xs flex items-center ${
                  // For savings we want higher savings to be green
                  savingsChange >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {savingsChange >= 0 ? 
                    <FiTrendingUp className="mr-1" /> : 
                    <FiTrendingDown className="mr-1" />
                  }
                  {Math.abs(savingsChange).toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        </div>
        
        <button 
          onClick={fetchData}
          className="mt-4 w-full text-xs flex items-center justify-center p-1 text-gray-500 hover:bg-gray-100 rounded"
        >
          <FiRefreshCw className="mr-1" /> Refresh
        </button>
      </CardContent>
    </Card>
  )
}

export default ComparativeSummaryCard 