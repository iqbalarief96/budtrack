'use client'

import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useToast } from '@/components/ui/use-toast'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader } from 'lucide-react'

// Helper for formatting currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export default function RecalculatePage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [isRecalculating, setIsRecalculating] = useState(false)
  const [recalcResult, setRecalcResult] = useState<any>(null)

  const handleRecalculateBalances = async () => {
    if (isRecalculating) return
    
    try {
      setIsRecalculating(true)
      setRecalcResult(null)
      
      const response = await fetch('/api/wallets/recalculate-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setRecalcResult(data)
        toast({
          title: "Berhasil recalculate saldo",
          description: data.message,
        })
      } else {
        toast({
          title: "Error",
          description: data.error || "Gagal merecalculate saldo wallet",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error recalculating balances:', error)
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat merecalculate saldo wallet",
        variant: "destructive",
      })
    } finally {
      setIsRecalculating(false)
    }
  }

  if (!session) {
    return (
      <div className="container py-10">
        <h1 className="text-2xl font-bold mb-6">Admin Access Required</h1>
        <p>You need to be logged in to access this page.</p>
      </div>
    )
  }

  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">Balance Recalculation Tool</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Utility Tools</CardTitle>
          <CardDescription>Tools untuk memperbaiki masalah pada aplikasi</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Recalculate Wallet Balances</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Menghitung ulang saldo semua dompet berdasarkan history transaksi.
                Gunakan jika ada ketidaksesuaian saldo.
              </p>
              <Button 
                onClick={handleRecalculateBalances} 
                disabled={isRecalculating}
                className="flex items-center gap-2"
              >
                {isRecalculating ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  'Recalculate All Balances'
                )}
              </Button>
              
              {recalcResult && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Hasil:</h4>
                  <div className="border rounded-md p-3 bg-muted/50 text-sm overflow-auto max-h-60">
                    <p>✅ {recalcResult.message}</p>
                    
                    {recalcResult.results && recalcResult.results.length > 0 && (
                      <div className="mt-2">
                        <p className="font-medium">Detail perubahan:</p>
                        <ul className="space-y-1 mt-1">
                          {recalcResult.results.map((result: any, index: number) => (
                            <li key={index} className="flex items-start">
                              <span className={result.status === 'Updated' ? 'text-orange-500' : 'text-green-500'}>
                                {result.status === 'Updated' ? '🔄' : '✓'}
                              </span>
                              <span className="ml-2">
                                <strong>{result.walletName}</strong>: 
                                {result.status === 'Updated' 
                                  ? ` Updated from ${formatCurrency(result.oldBalance)} to ${formatCurrency(result.newBalance)}`
                                  : ' No change needed'}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 