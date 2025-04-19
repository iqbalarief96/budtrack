'use client';

import React, { useEffect, useState } from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { useWallet } from '@/app/providers/WalletProvider';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend);

// Random colors for chart segments
const COLORS = [
  'rgba(255, 99, 132, 0.7)',
  'rgba(54, 162, 235, 0.7)',
  'rgba(255, 206, 86, 0.7)',
  'rgba(75, 192, 192, 0.7)',
  'rgba(153, 102, 255, 0.7)',
  'rgba(255, 159, 64, 0.7)',
  'rgba(199, 199, 199, 0.7)',
  'rgba(83, 102, 255, 0.7)',
  'rgba(78, 205, 196, 0.7)',
  'rgba(255, 99, 71, 0.7)',
];

// Borders for chart segments
const BORDER_COLORS = COLORS.map(color => color.replace('0.7', '1'));

type TimeFrame = 'week' | 'month' | 'quarter' | 'year' | 'all';

export default function ExpenseChart() {
  const { selectedWallet } = useWallet();
  const [isLoading, setIsLoading] = useState(true);
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('month');
  const [expenseData, setExpenseData] = useState<{
    labels: string[];
    values: number[];
    total: number;
  }>({
    labels: [],
    values: [],
    total: 0,
  });
  const [transactions, setTransactions] = useState<any[]>([]);

  // Fetch transactions first
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!selectedWallet) return;
      
      setIsLoading(true);
      try {
        const response = await fetch('/api/transactions');
        if (!response.ok) {
          throw new Error('Failed to fetch transactions');
        }
        
        const data = await response.json();
        setTransactions(data);
      } catch (error) {
        console.error('Error fetching transactions:', error);
        toast.error('Gagal mengambil data transaksi');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [selectedWallet]);

  // Process transactions to get expense data
  useEffect(() => {
    if (!selectedWallet || transactions.length === 0) return;
    
    // Filter transactions for the current wallet and EXPENSE type
    const walletTransactions = transactions.filter(tx => 
      tx.walletId === selectedWallet.id && 
      tx.type === 'EXPENSE' &&
      tx.category !== null
    );

    // Get date range based on timeFrame
    const now = new Date();
    let startDate = new Date();
    
    if (timeFrame === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (timeFrame === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    } else if (timeFrame === 'quarter') {
      startDate.setMonth(now.getMonth() - 3);
    } else if (timeFrame === 'year') {
      startDate.setFullYear(now.getFullYear() - 1);
    } else if (timeFrame === 'all') {
      startDate = new Date(0); // Beginning of time
    }

    // Filter transactions by date
    const filteredTransactions = walletTransactions.filter(tx => 
      new Date(tx.date) >= startDate
    );

    // Group by category
    const categoryMap: Record<string, number> = {};
    filteredTransactions.forEach(tx => {
      const categoryName = tx.category?.name || 'Uncategorized';
      if (!categoryMap[categoryName]) {
        categoryMap[categoryName] = 0;
      }
      categoryMap[categoryName] += tx.amount;
    });

    // Convert to format needed for chart
    const categories = Object.entries(categoryMap)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
    
    const total = categories.reduce((sum, cat) => sum + cat.amount, 0);

    setExpenseData({
      labels: categories.map(cat => cat.name),
      values: categories.map(cat => cat.amount),
      total
    });
    
  }, [selectedWallet, transactions, timeFrame]);

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

  // Prepare chart data
  const chartData = {
    labels: expenseData.labels,
    datasets: [
      {
        data: expenseData.values,
        backgroundColor: COLORS.slice(0, expenseData.labels.length),
        borderColor: BORDER_COLORS.slice(0, expenseData.labels.length),
        borderWidth: 1,
      },
    ],
  };

  // Chart options
  const options = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 1.3,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          boxWidth: 10,
          padding: 10,
          font: {
            size: 10,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const value = context.raw;
            const percentage = ((value / expenseData.total) * 100).toFixed(1);
            return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
          }
        }
      }
    },
  };

  if (isLoading) {
    return (
      <div className="flex flex-col">
        <div className="flex flex-wrap gap-1 mb-3 justify-center">
          {renderTimeFrameButton('week', 'Minggu Ini')}
          {renderTimeFrameButton('month', 'Bulan Ini')}
          {renderTimeFrameButton('quarter', 'Quarter')}
          {renderTimeFrameButton('year', 'Tahun Ini')}
          {renderTimeFrameButton('all', 'Semua')}
        </div>
        <div className="flex justify-center items-center h-48">
          <div className="animate-pulse text-gray-400">Loading data...</div>
        </div>
      </div>
    );
  }

  if (expenseData.labels.length === 0) {
    return (
      <div className="flex flex-col">
        <div className="flex flex-wrap gap-1 mb-3 justify-center">
          {renderTimeFrameButton('week', 'Minggu Ini')}
          {renderTimeFrameButton('month', 'Bulan Ini')}
          {renderTimeFrameButton('quarter', 'Quarter')}
          {renderTimeFrameButton('year', 'Tahun Ini')}
          {renderTimeFrameButton('all', 'Semua')}
        </div>
        <div className="flex items-center justify-center h-48 text-gray-500">
          <p>Belum ada data pengeluaran untuk periode ini</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap gap-1 mb-3 justify-center">
        {renderTimeFrameButton('week', 'Minggu Ini')}
        {renderTimeFrameButton('month', 'Bulan Ini')}
        {renderTimeFrameButton('quarter', 'Quarter')}
        {renderTimeFrameButton('year', 'Tahun Ini')}
        {renderTimeFrameButton('all', 'Semua')}
      </div>
      <div className="h-48 w-full">
        <Pie data={chartData} options={options} />
      </div>
      <div className="mt-2 text-center text-xs text-gray-500">
        Total Pengeluaran: {formatCurrency(expenseData.total)}
      </div>
    </div>
  );
} 