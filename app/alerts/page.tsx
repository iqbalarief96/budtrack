'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { FiAlertTriangle, FiChevronDown, FiChevronUp, FiRefreshCw } from 'react-icons/fi'
import { useWallet } from '../providers/WalletProvider'
import WalletSelector from '../components/WalletSelector'
import { SpendingAnomaly } from '@/lib/anomaly-detection'

// Format currency helper
function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount)
}

// Format date helper
function formatDate(date: Date | string) {
  if (typeof date === 'string') {
    date = new Date(date)
  }
  return date.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// Component to display the spending anomalies
export default function AlertsPage() {
  const { data: session } = useSession()
  const { selectedWallet } = useWallet()
  
  const [anomalies, setAnomalies] = useState<SpendingAnomaly[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const [lookbackDays, setLookbackDays] = useState(90)
  const [threshold, setThreshold] = useState(50)
  
  // Fetch anomalies when session, wallet, or settings change
  useEffect(() => {
    if (session && selectedWallet) {
      fetchAnomalies()
    }
  }, [session, selectedWallet, lookbackDays, threshold])
  
  // Function to fetch anomalies from API
  const fetchAnomalies = async () => {
    if (!session || !selectedWallet) return
    
    setLoading(true)
    setError(null)
    
    try {
      const queryParams = new URLSearchParams({
        walletId: selectedWallet.id,
        lookbackDays: lookbackDays.toString(),
        threshold: threshold.toString()
      })
      
      const response = await fetch(`/api/alerts/anomalies?${queryParams.toString()}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch anomalies')
      }
      
      const data = await response.json()
      setAnomalies(data.anomalies)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching anomalies:', err)
    } finally {
      setLoading(false)
    }
  }
  
  // Toggle expanded state for an anomaly card
  const toggleExpand = (id: string) => {
    setExpandedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id) 
        : [...prev, id]
    )
  }
  
  // Get severity color for anomaly
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'text-red-600 bg-red-50'
      case 'medium':
        return 'text-orange-600 bg-orange-50'
      case 'low':
        return 'text-yellow-600 bg-yellow-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }
  
  if (!session) {
    return (
      <div className="container py-10">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p>Please sign in to view alerts</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">Spending Alerts & Anomalies</h1>
      
      <div className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Settings</CardTitle>
            <CardDescription>Adjust how anomalies are detected</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Wallet</label>
                <WalletSelector />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Analysis Period</label>
                <div className="flex items-center gap-4">
                  <Slider 
                    value={[lookbackDays]} 
                    min={30} 
                    max={365} 
                    step={30} 
                    onValueChange={(values: number[]) => setLookbackDays(values[0])}
                  />
                  <span className="text-sm w-16">{lookbackDays} days</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Anomaly Threshold</label>
                <div className="flex items-center gap-4">
                  <Slider 
                    value={[threshold]} 
                    min={20} 
                    max={200} 
                    step={10} 
                    onValueChange={(values: number[]) => setThreshold(values[0])}
                  />
                  <span className="text-sm w-16">+{threshold}%</span>
                </div>
              </div>
              
              <div className="flex items-end">
                <Button 
                  onClick={fetchAnomalies} 
                  disabled={loading || !selectedWallet}
                  className="gap-2"
                >
                  {loading ? (
                    <>
                      <FiRefreshCw className="animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <FiRefreshCw />
                      Refresh Analysis
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Results Section */}
      <div className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Detection Results</CardTitle>
            <CardDescription>
              Found {anomalies.length} unusual spending transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading && (
              <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em]"></div>
                <div className="mt-2">Analyzing your transactions...</div>
              </div>
            )}
            
            {error && (
              <div className="bg-red-50 text-red-700 p-4 rounded-lg">
                {error}
              </div>
            )}
            
            {!loading && !error && anomalies.length === 0 && (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center p-4 bg-green-50 rounded-full mb-4">
                  <FiAlertTriangle className="text-green-500 text-2xl" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">No Anomalies Detected</h3>
                <p className="text-gray-500 mt-2 max-w-md mx-auto">
                  We didn't find any unusual spending in your transactions. This is a positive sign that your spending patterns are consistent.
                </p>
              </div>
            )}
            
            {!loading && !error && anomalies.length > 0 && (
              <div className="space-y-4">
                {anomalies.map(anomaly => (
                  <div 
                    key={anomaly.id}
                    className="border rounded-lg bg-white overflow-hidden shadow-sm"
                  >
                    <div 
                      className="flex justify-between items-center p-4 cursor-pointer"
                      onClick={() => toggleExpand(anomaly.id)}
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`p-2.5 rounded-full ${getSeverityColor(anomaly.severity)}`}>
                          <FiAlertTriangle className="" />
                        </div>
                        <div>
                          <h3 className="font-medium">{anomaly.category.name}</h3>
                          <p className="text-sm text-gray-500">{formatDate(anomaly.date)}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        <div className="text-right mr-4">
                          <div className="font-bold text-red-600">{formatCurrency(anomaly.amount)}</div>
                          <div className="text-xs text-red-500">
                            +{anomaly.percentAboveAverage.toFixed(0)}% dari rata-rata
                          </div>
                        </div>
                        {expandedItems.includes(anomaly.id) ? (
                          <FiChevronUp className="text-gray-400" />
                        ) : (
                          <FiChevronDown className="text-gray-400" />
                        )}
                      </div>
                    </div>
                    
                    {expandedItems.includes(anomaly.id) && (
                      <div className="px-4 pb-4 pt-0 border-t">
                        <div className="p-4 bg-gray-50 rounded-lg mt-2">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-gray-500">Nilai Anomali</p>
                              <p className="font-medium">{formatCurrency(anomaly.amount)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Rata-rata Kategori</p>
                              <p className="font-medium">{formatCurrency(anomaly.average)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Perbedaan</p>
                              <p className="font-medium text-red-600">
                                +{formatCurrency(anomaly.amount - anomaly.average)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Persentase Perbedaan</p>
                              <p className="font-medium text-red-600">
                                +{anomaly.percentAboveAverage.toFixed(1)}%
                              </p>
                            </div>
                          </div>
                          
                          <div className="mt-4">
                            <p className="text-xs text-gray-500 mb-1">Deskripsi</p>
                            <p className="text-sm">{anomaly.description || "Tidak ada deskripsi"}</p>
                          </div>
                          
                          <div className="mt-4 text-sm text-gray-500">
                            <p>
                              Pengeluaran ini {anomaly.percentAboveAverage.toFixed(0)}% lebih tinggi dari 
                              rata-rata pengeluaran Anda untuk kategori {anomaly.category.name}.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 