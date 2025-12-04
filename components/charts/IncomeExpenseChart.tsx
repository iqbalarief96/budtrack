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
import { toast } from 'react-hot-toast';

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
        // Fetch transactions from API (get all for accurate history)
        const response = await fetch('/api/transactions?limit=-1', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error('Failed to fetch transactions');
        }

        const json = await response.json();
        // Handle both array and paginated response formats
        const transactions = Array.isArray(json) ? json : json.data || [];

        // Filter by selected wallet if available
        let filteredTransactions = transactions;
        if (selectedWallet?.id) {
          filteredTransactions = transactions.filter((tx: any) => tx.walletId === selectedWallet.id);
        }

        let labels: string[] = [];
        let incomeData: number[] = [];
        let expenseData: number[] = [];

        // Format data based on selected period
        if (period === 'monthly') {
          // Last 6 months
          labels = getLastNMonths(6);

          // Group transactions by month
          const monthlyData = groupTransactionsByMonth(filteredTransactions, 6);

          // Extract income and expense data
          labels.forEach(month => {
            const monthData = monthlyData[month] || { income: 0, expense: 0 };
            incomeData.push(monthData.income);
            expenseData.push(monthData.expense);
          });
        } else if (period === 'weekly') {
          // Last 4 weeks
          labels = getLastNWeeks(4);

          // Group transactions by week
          const weeklyData = groupTransactionsByWeek(filteredTransactions, 4);

          // Extract income and expense data
          labels.forEach((week, i) => {
            const weekData = weeklyData[i] || { income: 0, expense: 0 };
            incomeData.push(weekData.income);
            expenseData.push(weekData.expense);
          });
        } else if (period === 'yearly') {
          // Last 4 years
          const currentYear = new Date().getFullYear();
          labels = [
            (currentYear - 3).toString(),
            (currentYear - 2).toString(),
            (currentYear - 1).toString(),
            currentYear.toString()
          ];

          // Group transactions by year
          const yearlyData = groupTransactionsByYear(filteredTransactions, 4);

          // Extract income and expense data
          labels.forEach(year => {
            const yearData = yearlyData[year] || { income: 0, expense: 0 };
            incomeData.push(yearData.income);
            expenseData.push(yearData.expense);
          });
        } else { // daily
          // Last 7 days
          labels = getLastNDays(7);

          // Group transactions by day
          const dailyData = groupTransactionsByDay(filteredTransactions, 7);

          // Extract income and expense data
          labels.forEach((day, i) => {
            const dayData = dailyData[i] || { income: 0, expense: 0 };
            incomeData.push(dayData.income);
            expenseData.push(dayData.expense);
          });
        }

        setChartData({
          labels,
          income: incomeData,
          expense: expenseData
        });
      } catch (error) {
        console.error('Error fetching income/expense data:', error);
        toast.error('Gagal memuat data grafik');
      } finally {
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
          label: function (context: any) {
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
          callback: function (value: any) {
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

// Helper functions for date processing
function getLastNMonths(n: number): string[] {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
  const today = new Date();
  const result = [];

  for (let i = n - 1; i >= 0; i--) {
    const monthIndex = (today.getMonth() - i + 12) % 12;
    result.push(months[monthIndex]);
  }

  return result;
}

function getLastNWeeks(n: number): string[] {
  const result = [];
  for (let i = n; i > 0; i--) {
    result.push(`Minggu ${i}`);
  }
  return result;
}

function getLastNDays(n: number): string[] {
  const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const today = new Date();
  const result = [];

  for (let i = n - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    result.push(days[date.getDay()]);
  }

  return result;
}

function groupTransactionsByMonth(transactions: any[], months: number) {
  const result: Record<string, { income: number, expense: number }> = {};
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
  const today = new Date();

  // Initialize result with last n months
  for (let i = months - 1; i >= 0; i--) {
    const monthIndex = (today.getMonth() - i + 12) % 12;
    result[monthNames[monthIndex]] = { income: 0, expense: 0 };
  }

  // Process transactions
  transactions.forEach((tx: any) => {
    const txDate = new Date(tx.date);
    const monthName = monthNames[txDate.getMonth()];

    // Only include transactions from the last n months
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const txMonth = txDate.getMonth();
    const txYear = txDate.getFullYear();

    const monthDiff = (currentYear - txYear) * 12 + (currentMonth - txMonth);

    if (monthDiff < months && monthDiff >= 0) {
      if (tx.type === 'INCOME') {
        result[monthName].income += tx.amount;
      } else if (tx.type === 'EXPENSE') {
        result[monthName].expense += tx.amount;
      }
    }
  });

  return result;
}

function groupTransactionsByWeek(transactions: any[], weeks: number) {
  // Create an array to hold data for each week
  const result: { income: number, expense: number }[] = Array(weeks).fill(null).map(() => ({ income: 0, expense: 0 }));

  // Calculate date limits
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - (weeks * 7));

  // Process transactions
  transactions.forEach((tx: any) => {
    const txDate = new Date(tx.date);

    // Only include transactions from the specified period
    if (txDate >= startDate && txDate <= today) {
      // Calculate which week this transaction belongs to
      const daysDiff = Math.floor((today.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24));
      const weekIndex = Math.floor(daysDiff / 7);

      if (weekIndex < weeks) {
        if (tx.type === 'INCOME') {
          result[weekIndex].income += tx.amount;
        } else if (tx.type === 'EXPENSE') {
          result[weekIndex].expense += tx.amount;
        }
      }
    }
  });

  return result;
}

function groupTransactionsByDay(transactions: any[], days: number) {
  // Create an array to hold data for each day
  const result: { income: number, expense: number }[] = Array(days).fill(null).map(() => ({ income: 0, expense: 0 }));

  // Calculate date limits
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today

  // Process transactions
  transactions.forEach((tx: any) => {
    const txDate = new Date(tx.date);

    // Calculate days difference
    const daysDiff = Math.floor((today.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24));

    // Only include transactions from the last n days
    if (daysDiff < days && daysDiff >= 0) {
      if (tx.type === 'INCOME') {
        result[daysDiff].income += tx.amount;
      } else if (tx.type === 'EXPENSE') {
        result[daysDiff].expense += tx.amount;
      }
    }
  });

  // Reverse the array so it's chronological
  return result.reverse();
}

function groupTransactionsByYear(transactions: any[], years: number) {
  const result: Record<string, { income: number, expense: number }> = {};
  const currentYear = new Date().getFullYear();

  // Initialize result with last n years
  for (let i = years - 1; i >= 0; i--) {
    const year = currentYear - i;
    result[year.toString()] = { income: 0, expense: 0 };
  }

  // Process transactions
  transactions.forEach((tx: any) => {
    const txDate = new Date(tx.date);
    const txYear = txDate.getFullYear().toString();

    // Only include transactions from the last n years
    if (txYear >= (currentYear - years + 1).toString() && txYear <= currentYear.toString()) {
      if (tx.type === 'INCOME') {
        result[txYear].income += tx.amount;
      } else if (tx.type === 'EXPENSE') {
        result[txYear].expense += tx.amount;
      }
    }
  });

  return result;
}