'use client';

import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { useWallet } from '@/app/providers/WalletProvider';
import { formatCurrency } from '@/lib/utils';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

type IncomeExpenseChartProps = {
  period?: 'daily' | 'weekly' | 'monthly' | 'yearly';
};

type ChartDataType = {
  labels: string[];
  income: number[];
  expense: number[];
};

export default function IncomeExpenseChart({ period = 'monthly' }: IncomeExpenseChartProps) {
  const { selectedWallet } = useWallet();
  const [isLoading, setIsLoading] = useState(true);
  const [chartData, setChartData] = useState<ChartDataType>({
    labels: [],
    income: [],
    expense: [],
  });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Placeholder data - in real app, fetch from API
        let dummyData: ChartDataType;
        
        if (period === 'monthly') {
          dummyData = {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'],
            income: [7200000, 7500000, 7300000, 8100000, 7500000, 7800000],
            expense: [2100000, 2800000, 2300000, 2600000, 2500000, 2400000],
          };
        } else if (period === 'weekly') {
          dummyData = {
            labels: ['Minggu 1', 'Minggu 2', 'Minggu 3', 'Minggu 4'],
            income: [1900000, 1850000, 1800000, 1950000],
            expense: [650000, 600000, 620000, 630000],
          };
        } else if (period === 'yearly') {
          dummyData = {
            labels: ['2021', '2022', '2023', '2024'],
            income: [82000000, 85000000, 90000000, 93000000],
            expense: [25000000, 27000000, 28000000, 30000000],
          };
        } else { // daily
          dummyData = {
            labels: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'],
            income: [500000, 450000, 470000, 480000, 510000, 0, 0],
            expense: [150000, 130000, 145000, 160000, 170000, 80000, 50000],
          };
        }

        // Simulate API delay
        setTimeout(() => {
          setChartData(dummyData);
          setIsLoading(false);
        }, 500);
        
      } catch (error) {
        console.error('Error fetching income/expense data:', error);
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedWallet, period]);

  const data = {
    labels: chartData.labels,
    datasets: [
      {
        label: 'Pemasukan',
        data: chartData.income,
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
      {
        label: 'Pengeluaran',
        data: chartData.expense,
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
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
            const label = context.dataset.label || '';
            const value = context.raw;
            return `${label}: ${formatCurrency(value)}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            // Simplify the y-axis labels
            if (value >= 1000000) {
              return (value / 1000000).toFixed(1) + ' jt';
            }
            if (value >= 1000) {
              return (value / 1000).toFixed(0) + ' rb';
            }
            return value;
          }
        }
      },
    },
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
        <Bar data={data} options={options} />
      </div>
      <div className="mt-2 text-center text-sm text-gray-500">
        Perbandingan Pemasukan vs Pengeluaran
      </div>
    </div>
  );
} 