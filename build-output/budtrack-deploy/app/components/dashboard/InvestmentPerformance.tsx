'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { useWallet } from '@/app/providers/WalletProvider';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';

export default function InvestmentPerformance() {
  const { selectedWallet } = useWallet();
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvestmentData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const params = new URLSearchParams();
        if (selectedWallet?.id) {
          params.append('walletId', selectedWallet.id);
        }
        
        const response = await fetch(`/api/investments?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch investment data');
        }
        
        const data = await response.json();
        
        // Calculate total value
        const total = data.reduce((sum: number, inv: any) => 
          sum + (inv.quantity * inv.averagePurchasePrice), 0);
        setTotalValue(total);
        
        // Generate dummy performance data for demonstration
        // In a real app, this would come from historical data
        const mockPerformance = generateMockPerformanceData(total);
        setPerformanceData(mockPerformance);
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching investment data:', error);
        setError('Failed to load investment data');
        setIsLoading(false);
      }
    };
    
    fetchInvestmentData();
  }, [selectedWallet]);
  
  // Generate mock performance data for demonstration
  const generateMockPerformanceData = (currentValue: number) => {
    const data = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const startValue = currentValue * 0.9; // Start 10% lower than current
    
    for (let i = 0; i < months.length; i++) {
      // Generate a value that trends upward but with some variance
      const randomFactor = 0.97 + Math.random() * 0.06; // Between 0.97 and 1.03
      const value = i === months.length - 1 
        ? currentValue 
        : startValue * (1 + (i * 0.02)) * randomFactor;
      
      data.push({
        month: months[i],
        value: Math.round(value),
      });
    }
    
    return data;
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performa Investasi</CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <p>Loading...</p>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performa Investasi</CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <p className="text-red-500">{error}</p>
        </CardContent>
      </Card>
    );
  }
  
  if (performanceData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performa Investasi</CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <p className="text-gray-500">Belum ada data investasi</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Performa Investasi</span>
          <span className="text-green-600">{formatCurrency(totalValue)}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-64 w-full px-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={performanceData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="month" />
              <YAxis 
                tickFormatter={(value) => formatCurrency(value, true)}
                width={80}
              />
              <Tooltip 
                formatter={(value) => [formatCurrency(Number(value)), 'Value']}
                labelFormatter={(label) => `${label}`} 
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
} 