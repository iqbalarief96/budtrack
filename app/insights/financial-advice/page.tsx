'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useWallet } from '@/app/providers/WalletProvider'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { FiArrowRight, FiSettings, FiRefreshCw, FiBarChart2, FiTrendingUp, FiDollarSign, FiTarget, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi'
import WalletSelector from '@/app/components/WalletSelector'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AdviceCard } from './AdviceCard'
import { useToast } from '@/components/ui/use-toast'
import { RefreshCw, PlusCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

// Types for our Financial Advice
interface FinancialAdvice {
  id: string
  title: string
  description: string
  type: string
  priority: string
  estimatedImpact?: number
  timeframe: string
  createdAt: string
}

export default function PersonalizedAdvicePage() {
  const { data: session } = useSession()
  const { selectedWallet } = useWallet()
  const [advice, setAdvice] = useState<FinancialAdvice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAiConfigured, setIsAiConfigured] = useState(true)
  const [timeframe, setTimeframe] = useState<'month' | 'quarter' | 'year' | 'all'>('month')
  const [isTimeout, setIsTimeout] = useState(false)
  const [suggestedTimeframe, setSuggestedTimeframe] = useState<'month' | 'quarter' | 'year' | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  
  // Load saved advice on initial load
  useEffect(() => {
    if (session && selectedWallet) {
      loadSavedAdvice()
    } else {
      setLoading(false)
    }
  }, [session, selectedWallet, timeframe])
  
  // Load advice from localStorage
  const loadSavedAdvice = () => {
    setLoading(true)
    setError(null)
    setIsTimeout(false)
    setSuggestedTimeframe(null)
    
    try {
      // Create a unique key for this wallet and timeframe
      const storageKey = `financial-advice-${selectedWallet?.id}-${timeframe}`
      const savedAdvice = localStorage.getItem(storageKey)
      
      if (savedAdvice) {
        // We have stored advice, use it
        setAdvice(JSON.parse(savedAdvice))
        setLoading(false)
      } else {
        // No stored advice yet, fetch it for the first time
        fetchAdvice()
      }
    } catch (err) {
      console.error('Error loading saved advice:', err)
      setError('Failed to load saved advice')
      setLoading(false)
    }
  }
  
  // Function to fetch financial advice from API
  const fetchAdvice = async () => {
    setLoading(true)
    setError(null)
    setIsAiConfigured(true)
    setIsTimeout(false)
    setSuggestedTimeframe(null)
    
    try {
      const response = await fetch(`/api/financial-advice?timeframe=${timeframe}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch advice')
      }
      
      const data = await response.json()
      setAdvice(data)
      
      // Save to localStorage for this wallet and timeframe
      const storageKey = `financial-advice-${selectedWallet?.id}-${timeframe}`
      localStorage.setItem(storageKey, JSON.stringify(data))
    } catch (err) {
      console.error('Error fetching financial advice:', err)
      setError('Failed to load advice. Please try again.')
      toast({
        title: 'Error',
        description: 'Failed to load financial advice. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }
  
  // Format currency helper
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }
  
  // Get icon for advice type
  const getAdviceIcon = (type: string) => {
    switch (type) {
      case 'saving':
        return <FiDollarSign className="h-5 w-5" />
      case 'budgeting':
        return <FiTarget className="h-5 w-5" />
      case 'investment':
        return <FiTrendingUp className="h-5 w-5" />
      default:
        return <FiBarChart2 className="h-5 w-5" />
    }
  }
  
  // Get color class for priority
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-100'
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-100'
      case 'low':
        return 'text-green-600 bg-green-50 border-green-100'
      default:
        return 'text-blue-600 bg-blue-50 border-blue-100'
    }
  }
  
  // Get type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'saving':
        return '💰'
      case 'budgeting':
        return '📊'
      case 'investment':
        return '📈'
      case 'general':
        return '💡'
      default:
        return '✨'
    }
  }
  
  // Handle timeframe change
  const handleTimeframeChange = (value: string) => {
    setTimeframe(value as 'month' | 'quarter' | 'year' | 'all')
  }
  
  const refreshAdvice = async () => {
    try {
      setRefreshing(true)
      setError(null)
      
      const response = await fetch(`/api/financial-advice/generate?timeframe=${timeframe}`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        throw new Error('Failed to generate new advice')
      }
      
      await fetchAdvice()
      
      toast({
        title: 'Advice Refreshed',
        description: 'New financial recommendations have been generated for you.',
      })
    } catch (error) {
      console.error('Error refreshing advice:', error)
      setError('Failed to refresh advice. Please try again.')
      toast({
        title: 'Error',
        description: 'Failed to refresh advice. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setRefreshing(false)
    }
  }
  
  // Show login prompt if not logged in
  if (!session) {
    return (
      <div className="container py-10">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p>Please sign in to view personalized financial advice</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  if (!selectedWallet) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <p className="text-gray-500">Please select a wallet to view financial advice</p>
        </div>
      </div>
    );
  }
  
  // Full rendering component with advice cards and UI 
  const renderAdviceList = () => {
    if (loading) {
      return (
        <div className="w-full flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
        </div>
      );
    }
    
    if (advice.length === 0) {
      return (
        <div className="text-center py-16 bg-gray-50 rounded-lg border">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <RefreshCw className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium mb-2">No advice available</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            We haven't generated any financial advice for this time period yet.
          </p>
          <Button onClick={refreshAdvice} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Generate Advice
          </Button>
        </div>
      );
    }
    
    // Sort advice by priority: high, medium, low
    const sortedAdvice = [...advice].sort((a, b) => {
      const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority.toLowerCase()] - priorityOrder[b.priority.toLowerCase()];
    });
    
    return (
      <div className="space-y-4">
        {sortedAdvice.map((item) => (
          <AdviceCard key={item.id} advice={item} />
        ))}
      </div>
    );
  };
  
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Personalized Financial Advice</h1>
          <p className="text-muted-foreground">
            Recommendations tailored to your financial habits and goals
          </p>
        </div>
        
        <Button 
          variant="outline" 
          onClick={refreshAdvice}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Advice
        </Button>
      </div>
      
      {error && (
        <Card className="mb-6 bg-red-50 border-red-200">
          <CardContent className="p-4">
            <p className="text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}
      
      <Tabs 
        defaultValue="month" 
        value={timeframe}
        onValueChange={handleTimeframeChange}
        className="w-full"
      >
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="month">Monthly</TabsTrigger>
            <TabsTrigger value="quarter">Quarterly</TabsTrigger>
            <TabsTrigger value="year">Yearly</TabsTrigger>
            <TabsTrigger value="all">All Time</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="month" className="mt-0">
          {renderAdviceList()}
        </TabsContent>
        <TabsContent value="quarter" className="mt-0">
          {renderAdviceList()}
        </TabsContent>
        <TabsContent value="year" className="mt-0">
          {renderAdviceList()}
        </TabsContent>
        <TabsContent value="all" className="mt-0">
          {renderAdviceList()}
        </TabsContent>
      </Tabs>
    </div>
  )
} 