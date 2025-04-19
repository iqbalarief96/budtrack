'use client';

import React, { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

type SpendingCategory = {
  id: string;
  name: string;
  amount: number;
  color: string;
  percentage: number;
};

interface TopSpendingWidgetProps {
  walletId?: string;
  limit?: number;
}

export default function TopSpendingWidget({ walletId, limit = 5 }: TopSpendingWidgetProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [topCategories, setTopCategories] = useState<SpendingCategory[]>([]);
  const [timeframe, setTimeframe] = useState('month');
  
  useEffect(() => {
    const fetchTopSpending = async () => {
      setIsLoading(true);
      try {
        // Build URL with query params
        let url = '/api/analytics/top-spending';
        const params = new URLSearchParams();
        
        if (walletId) {
          params.append('walletId', walletId);
        }
        
        params.append('timeframe', timeframe);
        params.append('limit', limit.toString());
        
        const response = await fetch(`${url}?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch top spending data');
        }
        
        const data = await response.json();
        
        // Transform data for display
        const total = data.reduce((sum: number, cat: any) => sum + cat.amount, 0);
        
        const formattedData = data.map((category: any) => ({
          id: category.id,
          name: category.name,
          amount: category.amount,
          color: category.color || getRandomColor(category.name),
          percentage: total > 0 ? Math.round((category.amount / total) * 100) : 0
        }));
        
        setTopCategories(formattedData);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching top spending:', error);
        // Using fallback data for now to show demo
        const fallbackData = [
          { id: 'c1', name: 'Makanan', amount: 2500000, color: '#4ade80', percentage: 35 },
          { id: 'c2', name: 'Transportasi', amount: 1800000, color: '#60a5fa', percentage: 25 },
          { id: 'c3', name: 'Hiburan', amount: 1000000, color: '#f97316', percentage: 14 },
          { id: 'c4', name: 'Belanja', amount: 950000, color: '#ec4899', percentage: 13 },
          { id: 'c5', name: 'Tagihan', amount: 900000, color: '#8b5cf6', percentage: 13 }
        ];
        setTopCategories(fallbackData);
        toast.error('Menggunakan data contoh karena API belum siap');
        setIsLoading(false);
      }
    };
    
    fetchTopSpending();
  }, [walletId, timeframe, limit]);
  
  // Generate random color based on string (for consistency)
  const getRandomColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const colors = [
      '#4ade80', // green
      '#60a5fa', // blue
      '#f97316', // orange
      '#8b5cf6', // purple
      '#ec4899', // pink
      '#14b8a6', // teal
      '#f43f5e', // rose
      '#facc15', // yellow
      '#0ea5e9', // sky
      '#a78bfa', // violet
    ];
    
    return colors[Math.abs(hash) % colors.length];
  };
  
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-2 border border-gray-200 shadow-sm rounded-md">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm">{formatCurrency(data.amount)}</p>
          <p className="text-xs text-gray-500">{data.percentage}% dari total</p>
        </div>
      );
    }
    return null;
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[200px]">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }
  
  if (topCategories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-gray-500">
        <p>Belum ada data pengeluaran</p>
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col">
      <div className="mb-3 flex justify-between items-center">
        <h3 className="text-base font-medium">Top Spending Categories</h3>
        <select 
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
          className="text-sm border border-gray-200 rounded py-1 px-2"
        >
          <option value="week">Minggu Ini</option>
          <option value="month">Bulan Ini</option>
          <option value="year">Tahun Ini</option>
        </select>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Chart */}
        <div className="h-[180px] flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={topCategories}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
                dataKey="amount"
              >
                {topCategories.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* List */}
        <div className="space-y-3">
          {topCategories.map((category) => (
            <div key={category.id} className="flex items-center justify-between">
              <div className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: category.color }}
                ></div>
                <span className="text-sm">{category.name}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{formatCurrency(category.amount)}</div>
                <div className="text-xs text-gray-500">{category.percentage}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 