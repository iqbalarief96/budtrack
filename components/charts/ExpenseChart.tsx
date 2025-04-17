'use client';

import React, { useEffect, useState } from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { useWallet } from '@/app/providers/WalletProvider';
import { formatCurrency } from '@/lib/utils';

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

type ExpenseChartProps = {
  period?: 'daily' | 'weekly' | 'monthly' | 'yearly';
};

export default function ExpenseChart({ period = 'monthly' }: ExpenseChartProps) {
  const { selectedWallet } = useWallet();
  const [isLoading, setIsLoading] = useState(true);
  const [expenseData, setExpenseData] = useState<{
    labels: string[];
    values: number[];
    total: number;
  }>({
    labels: [],
    values: [],
    total: 0,
  });

  // Fetch expense data for the selected wallet and period
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Placeholder data, you would normally fetch this from your API
        const dummyData = {
          labels: ['Makanan', 'Transportasi', 'Hiburan', 'Belanja', 'Tagihan'],
          values: [750000, 500000, 300000, 650000, 300000],
          total: 2500000,
        };

        // In real implementation, you would fetch data from API:
        // const response = await fetch(`/api/expense-analysis?walletId=${selectedWallet?.id}&period=${period}`);
        // const data = await response.json();
        
        // Simulate API delay
        setTimeout(() => {
          setExpenseData(dummyData);
          setIsLoading(false);
        }, 500);
        
      } catch (error) {
        console.error('Error fetching expense data:', error);
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedWallet, period]);

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
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          boxWidth: 12,
          padding: 15,
          font: {
            size: 12,
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
    maintainAspectRatio: false,
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[250px]">
        <div className="animate-pulse text-gray-400">Loading data...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-[250px]">
        <Pie data={chartData} options={options} />
      </div>
      <div className="mt-2 text-center text-sm text-gray-500">
        Total Pengeluaran: {formatCurrency(expenseData.total)}
      </div>
    </div>
  );
} 