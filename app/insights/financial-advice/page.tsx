'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useWallet } from '@/app/providers/WalletProvider'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { FiArrowRight, FiSettings, FiRefreshCw, FiBarChart2, FiTrendingUp, FiDollarSign, FiTarget, FiAlertTriangle, FiCheckCircle, FiPackage, FiShoppingBag, FiCreditCard, FiShield } from 'react-icons/fi'
import WalletSelector from '@/app/components/WalletSelector'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AdviceCard } from './AdviceCard'
import { useToast } from '@/components/ui/use-toast'
import { RefreshCw, PlusCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'

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

// Types for Product Recommendations
interface ProductRecommendation {
  type: string
  title: string
  description: string
  suitability: string
  benefits: string
}

export default function PersonalizedAdvicePage() {
  const { data: session } = useSession()
  const { selectedWallet } = useWallet()
  const [advice, setAdvice] = useState<FinancialAdvice[]>([])
  const [products, setProducts] = useState<ProductRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [productsLoading, setProductsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [productsError, setProductsError] = useState<string | null>(null)
  const [isAiConfigured, setIsAiConfigured] = useState(true)
  const [timeframe, setTimeframe] = useState<'month' | 'quarter' | 'year' | 'all'>('month')
  const [isTimeout, setIsTimeout] = useState(false)
  const [suggestedTimeframe, setSuggestedTimeframe] = useState<'month' | 'quarter' | 'year' | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [productsRefreshing, setProductsRefreshing] = useState(false)
  const [contentType, setContentType] = useState<'advice' | 'products'>('advice')
  const [productSource, setProductSource] = useState<'ai' | 'fallback' | null>(null)
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
  
  // Load product recommendations when tab is selected
  useEffect(() => {
    if (session && selectedWallet && contentType === 'products') {
      loadSavedProductRecommendations()
    }
  }, [session, selectedWallet, contentType])
  
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
  
  // Load product recommendations from localStorage or fetch if not available
  const loadSavedProductRecommendations = () => {
    setProductsLoading(true)
    setProductsError(null)
    
    try {
      // Create a unique key for this wallet
      const storageKey = `product-recommendations-${selectedWallet?.id}`
      const savedRecommendations = localStorage.getItem(storageKey)
      
      if (savedRecommendations) {
        // We have stored recommendations, use them
        const data = JSON.parse(savedRecommendations)
        setProducts(data.recommendations || [])
        setProductSource(data.source || null)
        setProductsLoading(false)
      } else {
        // No stored recommendations yet, fetch them for the first time
        fetchProductRecommendations()
      }
    } catch (err) {
      console.error('Error loading saved product recommendations:', err)
      setProductsError('Failed to load saved product recommendations')
      setProductsLoading(false)
    }
  }
  
  // Function to fetch product recommendations from API
  const fetchProductRecommendations = async () => {
    setProductsLoading(true)
    setProductsError(null)
    
    try {
      const response = await fetch('/api/ai/product-recommendations')
      
      if (!response.ok) {
        const responseData = await response.json()
        throw new Error(responseData.error || 'Failed to fetch product recommendations')
      }
      
      const data = await response.json()
      setProducts(data.recommendations || [])
      setProductSource(data.source || null)
      
      // Save to localStorage for this wallet
      const storageKey = `product-recommendations-${selectedWallet?.id}`
      localStorage.setItem(storageKey, JSON.stringify(data))
    } catch (err) {
      console.error('Error fetching product recommendations:', err)
      setProductsError('Failed to load product recommendations. Please try again.')
      toast({
        title: 'Error',
        description: 'Failed to load product recommendations. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setProductsLoading(false)
    }
  }
  
  // Refresh product recommendations
  const refreshProductRecommendations = async () => {
    try {
      setProductsRefreshing(true)
      setProductsError(null)
      
      // Use the generate endpoint to force AI regeneration
      const response = await fetch('/api/ai/product-recommendations/generate', {
        method: 'POST'
      })
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to refresh product recommendations')
      }
      
      // Success! We got recommendations (either AI or fallback)
      setProducts(responseData.recommendations || []);
      setProductSource(responseData.source || null);
      
      // Save to localStorage for this wallet
      const storageKey = `product-recommendations-${selectedWallet?.id}`
      localStorage.setItem(storageKey, JSON.stringify(responseData))
      
      // Show appropriate toast based on source
      if (responseData.source === 'fallback') {
        console.warn('Using fallback recommendations:', responseData.error || 'Unknown reason');
        
        toast({
          title: 'Using Basic Recommendations',
          description: 'AI-generated recommendations failed, using basic alternatives instead.',
          variant: 'default',
        });
      } else {
        toast({
          title: 'Recommendations Refreshed',
          description: 'New product recommendations have been generated for you.',
        });
      }
      
      setProductsRefreshing(false);
    } catch (error) {
      console.error('Error refreshing product recommendations:', error)
      setProductsError('Failed to refresh recommendations. Please try again.')
      
      // Attempt to fetch any existing recommendations
      loadSavedProductRecommendations()
      
      toast({
        title: 'Error',
        description: 'Failed to refresh product recommendations. Please try again.',
        variant: 'destructive',
      })
      
      setProductsRefreshing(false);
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
  
  // Get icon for product type
  const getProductIcon = (type: string) => {
    const lowerType = type.toLowerCase()
    
    if (lowerType.includes('saving') || lowerType.includes('tabungan')) {
      return <FiDollarSign className="h-5 w-5" />
    }
    if (lowerType.includes('invest') || lowerType.includes('reksadana') || lowerType.includes('reksa dana')) {
      return <FiTrendingUp className="h-5 w-5" />
    }
    if (lowerType.includes('insurance') || lowerType.includes('asuransi')) {
      return <FiShield className="h-5 w-5" />
    }
    if (lowerType.includes('card') || lowerType.includes('credit') || lowerType.includes('kredit')) {
      return <FiCreditCard className="h-5 w-5" />
    }
    
    // Default icon
    return <FiPackage className="h-5 w-5" />
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

  // Render product recommendations
  const renderProductsList = () => {
    if (productsLoading && !productsRefreshing) {
      return (
        <div className="w-full flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
        </div>
      );
    }
    
    if (productsError) {
      return (
        <div className="text-center py-16 bg-gray-50 rounded-lg border">
          <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
            <FiAlertTriangle className="h-8 w-8 text-red-400" />
          </div>
          <h3 className="text-lg font-medium mb-2">Error Loading Recommendations</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            {productsError}
          </p>
          <Button onClick={refreshProductRecommendations} disabled={productsRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${productsRefreshing ? 'animate-spin' : ''}`} />
            Try Again
          </Button>
        </div>
      );
    }
    
    if (products.length === 0) {
      return (
        <div className="text-center py-16 bg-gray-50 rounded-lg border">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <RefreshCw className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium mb-2">No recommendations available</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            We haven't generated any product recommendations yet.
          </p>
          <Button onClick={refreshProductRecommendations} disabled={productsRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${productsRefreshing ? 'animate-spin' : ''}`} />
            Generate Recommendations
          </Button>
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        <div className="flex justify-between mb-2 items-center">
          {productSource && (
            <Badge variant={productSource === 'ai' ? 'default' : 'outline'} className={productSource === 'ai' ? 'bg-blue-500' : 'bg-gray-100 text-gray-700'}>
              {productSource === 'ai' ? 'AI Generated' : 'Basic Recommendations'}
            </Badge>
          )}
          
          {productsRefreshing && (
            <div className="flex items-center text-sm text-blue-600">
              <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
              Updating recommendations...
            </div>
          )}
        </div>
        
        {products.map((product, index) => (
          <Card key={`product-${index}`} className="w-full overflow-hidden shadow-md hover:shadow-lg transition-all mb-4">
            <CardContent className="pt-6">
              <div className="flex flex-col space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-100 p-2 rounded-full">
                    {getProductIcon(product.type)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-semibold text-lg">{product.title}</h3>
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        {product.type}
                      </Badge>
                    </div>
                    <p className="text-gray-600 mt-1">{product.description}</p>
                    
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Why It's Suitable</h4>
                        <p className="text-sm text-gray-600">{product.suitability}</p>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg">
                        <h4 className="text-sm font-medium text-green-700 mb-1">Potential Benefits</h4>
                        <p className="text-sm text-gray-600">{product.benefits}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };
  
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Personal Financial Insights</h1>
          <p className="text-muted-foreground">
            Personalized recommendations for your financial journey
          </p>
        </div>
        
        <Button 
          variant="outline"
          onClick={contentType === 'advice' ? refreshAdvice : refreshProductRecommendations}
          disabled={contentType === 'advice' ? refreshing : productsRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${(contentType === 'advice' ? refreshing : productsRefreshing) ? 'animate-spin' : ''}`} />
          Refresh {contentType === 'advice' ? 'Advice' : 'Recommendations'}
        </Button>
      </div>
      
      {error && contentType === 'advice' && (
        <Card className="mb-6 bg-red-50 border-red-200">
          <CardContent className="p-4">
            <p className="text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}
      
      <Tabs 
        value={contentType} 
        onValueChange={(value) => setContentType(value as 'advice' | 'products')}
        className="w-full mb-6"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="advice">Financial Advice</TabsTrigger>
          <TabsTrigger value="products">Product Recommendations</TabsTrigger>
        </TabsList>
      </Tabs>
      
      {contentType === 'advice' ? (
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
      ) : (
        <div>
          {renderProductsList()}
        </div>
      )}
    </div>
  )
} 