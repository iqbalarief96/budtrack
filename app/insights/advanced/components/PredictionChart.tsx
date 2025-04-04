'use client';

import { useState } from 'react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement,
  Title, 
  Tooltip, 
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { formatCurrency } from '@/lib/utils';

// Register ChartJS components
ChartJS.register(
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement,
  Title, 
  Tooltip, 
  Legend,
  Filler
);

interface Transaction {
  id: string;
  amount: number;
  date: string;
  type: 'EXPENSE' | 'INCOME';
  category: {
    name: string;
  };
}

interface PredictionChartProps {
  transactionsData: Transaction[];
  predictedExpense: number;
}

export default function PredictionChart({ transactionsData, predictedExpense }: PredictionChartProps) {
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  
  // Process data for chart
  const processData = () => {
    // Group by month
    const monthlyData: Record<string, number> = {};
    
    transactionsData
      .filter(tx => tx.type === 'EXPENSE')
      .forEach(tx => {
        const date = new Date(tx.date);
        const month = date.getMonth();
        const year = date.getFullYear();
        const key = `${year}-${month + 1}`;
        
        if (!monthlyData[key]) {
          monthlyData[key] = 0;
        }
        
        monthlyData[key] += tx.amount;
      });
    
    // Sort by date
    const sortedData = Object.entries(monthlyData)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    // Get last 6 months + prediction
    const last6Months = sortedData.slice(-6);
    
    // Format dates for display
    const labels = last6Months.map(item => {
      const [year, month] = item.date.split('-');
      return `${parseInt(month)}/${year}`;
    });
    
    // Add next month for prediction
    let nextMonthDate = '';
    if (labels.length > 0) {
      const lastDate = labels[labels.length - 1];
      const [lastMonth, lastYear] = lastDate.split('/');
      const nextMonth = parseInt(lastMonth) % 12 + 1;
      const nextYear = nextMonth === 1 ? parseInt(lastYear) + 1 : lastYear;
      nextMonthDate = `${nextMonth}/${nextYear}`;
    } else {
      const now = new Date();
      const nextMonth = now.getMonth() + 2; // +1 for 0-based index, +1 for next month
      const nextYear = nextMonth > 12 ? now.getFullYear() + 1 : now.getFullYear();
      nextMonthDate = `${nextMonth % 12 || 12}/${nextYear}`;
    }
    
    labels.push(nextMonthDate);
    
    // Prepare datasets
    const expenses = last6Months.map(item => item.amount);
    expenses.push(predictedExpense);
    
    return {
      labels,
      expenses,
    };
  };
  
  const { labels, expenses } = processData();
  
  const chartData = {
    labels,
    datasets: [
      {
        label: 'Pengeluaran Bulanan',
        data: expenses.slice(0, -1),
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        tension: 0.3,
      },
      {
        label: 'Prediksi Bulan Depan',
        data: [...Array(expenses.length - 1).fill(null), expenses[expenses.length - 1]],
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        borderDash: [5, 5],
        tension: 0.3,
      }
    ],
  };
  
  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += formatCurrency(context.parsed.y);
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        ticks: {
          callback: function(value: any) {
            return formatCurrency(value);
          }
        }
      }
    }
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1">Prediksi Pengeluaran Bulan Depan</h2>
        <p className="text-gray-500 mb-4">
          Berdasarkan pola pengeluaran 3 bulan terakhir, prediksi pengeluaran bulan depan:
        </p>
        <div className="bg-blue-50 p-6 rounded-xl text-center">
          <span className="text-gray-600 text-lg">Perkiraan Pengeluaran:</span>
          <div className="text-3xl font-bold text-blue-600 mt-2">
            {formatCurrency(predictedExpense)}
          </div>
        </div>
      </div>
      
      <div className="border-t pt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Tren Pengeluaran Bulanan</h3>
          <div className="flex space-x-2">
            <button 
              onClick={() => setChartType('bar')}
              className={`px-3 py-1 rounded ${
                chartType === 'bar' 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              Bar
            </button>
            <button 
              onClick={() => setChartType('line')}
              className={`px-3 py-1 rounded ${
                chartType === 'line' 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              Line
            </button>
          </div>
        </div>
        
        <div className="h-80">
          {chartType === 'line' ? (
            <Line options={options} data={chartData} />
          ) : (
            <Bar options={options} data={chartData} />
          )}
        </div>
        
        <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-100">
          <h4 className="font-medium text-yellow-800">Tentang Prediksi</h4>
          <p className="text-sm text-yellow-700 mt-1">
            Prediksi ini didasarkan pada rata-rata pengeluaran 3 bulan terakhir. 
            Akurasi prediksi akan meningkat seiring dengan bertambahnya data transaksi Anda.
          </p>
        </div>
      </div>
    </div>
  );
} 