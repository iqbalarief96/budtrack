'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { cn } from "@/lib/utils";
import { useWallet } from '@/app/providers/WalletProvider';
import { toast } from 'react-hot-toast';

type Category = {
  id: string;
  name: string;
  amount: number;
  percentage: number;
  color: string;
};

type TimeFrame = 'week' | 'month' | 'quarter' | 'year' | 'all';

export const TopSpendingWidget = () => {
  const { selectedWallet } = useWallet();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('month');
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setHasError(false);
      
      try {
        // Fetch transactions from API
        const response = await fetch('/api/transactions');
        if (!response.ok) {
          throw new Error('Failed to fetch transactions');
        }
        
        const transactions = await response.json();
        
        // Filter transactions
        let filteredTransactions = transactions.filter((tx: any) => 
          tx.type === 'EXPENSE' && 
          (selectedWallet ? tx.walletId === selectedWallet.id : true)
        );
        
        // Apply time filter
        const now = new Date();
        if (timeFrame === 'week') {
          const oneWeekAgo = new Date(now);
          oneWeekAgo.setDate(now.getDate() - 7);
          filteredTransactions = filteredTransactions.filter((tx: any) => 
            new Date(tx.date) >= oneWeekAgo
          );
        } else if (timeFrame === 'month') {
          const oneMonthAgo = new Date(now);
          oneMonthAgo.setMonth(now.getMonth() - 1);
          filteredTransactions = filteredTransactions.filter((tx: any) => 
            new Date(tx.date) >= oneMonthAgo
          );
        } else if (timeFrame === 'quarter') {
          const threeMonthsAgo = new Date(now);
          threeMonthsAgo.setMonth(now.getMonth() - 3);
          filteredTransactions = filteredTransactions.filter((tx: any) => 
            new Date(tx.date) >= threeMonthsAgo
          );
        } else if (timeFrame === 'year') {
          const oneYearAgo = new Date(now);
          oneYearAgo.setFullYear(now.getFullYear() - 1);
          filteredTransactions = filteredTransactions.filter((tx: any) => 
            new Date(tx.date) >= oneYearAgo
          );
        }
        
        // Group by category
        const categoryMap = new Map<string, { id: string, name: string, amount: number }>();
        
        filteredTransactions.forEach((tx: any) => {
          if (!tx.category) return;
          
          const { id, name } = tx.category;
          const existing = categoryMap.get(id);
          
          if (existing) {
            existing.amount += tx.amount;
          } else {
            categoryMap.set(id, { id, name, amount: tx.amount });
          }
        });
        
        // Convert to array and sort by amount
        let categoriesArray = Array.from(categoryMap.values())
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 5); // Top 5 categories
        
        // Calculate total amount
        const totalAmount = categoriesArray.reduce((sum, cat) => sum + cat.amount, 0);
        
        // Add percentage and color
        const formattedCategories = categoriesArray.map((cat, index) => ({
          ...cat,
          percentage: totalAmount > 0 ? (cat.amount / totalAmount) * 100 : 0,
          color: generateColor(index)
        }));
        
        setCategories(formattedCategories);
      } catch (error) {
        console.error('Error fetching top spending data:', error);
        setHasError(true);
        toast.error('Gagal memuat data pengeluaran terbesar');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedWallet, timeFrame]);

  const generateColor = (index: number) => {
    const colors = [
      '#FF6384', // Pink
      '#36A2EB', // Blue
      '#FFCE56', // Yellow
      '#4BC0C0', // Teal
      '#9966FF', // Purple
      '#FF9F40', // Orange
    ];
    
    return colors[index % colors.length];
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-2 shadow rounded border text-sm">
          <p className="font-semibold">{data.name}</p>
          <p>Rp {data.amount.toLocaleString('id-ID')}</p>
          <p>{data.percentage.toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  const renderTimeFrameButton = (value: TimeFrame, label: string) => (
    <button
      onClick={() => setTimeFrame(value)}
      className={cn(
        "px-2 py-1 text-xs rounded-md",
        timeFrame === value
          ? "bg-primary text-white"
          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
      )}
    >
      {label}
    </button>
  );

  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-lg font-semibold">Kategori Pengeluaran Terbesar</CardTitle>
        <CardDescription>
          <div className="flex flex-wrap gap-1 mt-1 justify-start">
            {renderTimeFrameButton('week', 'Minggu Ini')}
            {renderTimeFrameButton('month', 'Bulan Ini')}
            {renderTimeFrameButton('quarter', 'Quarter')}
            {renderTimeFrameButton('year', 'Tahun Ini')}
            {renderTimeFrameButton('all', 'Semua')}
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-1">
        {isLoading ? (
          <div className="h-[200px] flex items-center justify-center">
            <div className="text-gray-400 animate-pulse">Loading data...</div>
          </div>
        ) : hasError ? (
          <div className="h-[200px] flex items-center justify-center">
            <div className="text-red-500">Terjadi kesalahan saat memuat data</div>
          </div>
        ) : categories.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center">
            <div className="text-gray-500">Belum ada data pengeluaran</div>
          </div>
        ) : (
          <div>
            <div className="h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categories}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    fill="#8884d8"
                    paddingAngle={1}
                    dataKey="amount"
                  >
                    {categories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 space-y-1">
              {categories.map((category) => (
                <div key={category.id} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div 
                      className="w-2 h-2 rounded-full mr-1" 
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-xs text-gray-700">{category.name}</span>
                  </div>
                  <div className="text-xs font-medium">
                    {category.percentage.toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TopSpendingWidget; 