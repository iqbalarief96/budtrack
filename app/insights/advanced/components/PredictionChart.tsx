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

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat('id-ID', {
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function parseKeyToDate(key: string) {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, 1);
}

function buildKeyFromDate(date: Date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}`;
}

export default function PredictionChart({ transactionsData, predictedExpense }: PredictionChartProps) {
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  
  // Process data for chart
  const processData = () => {
    // Ensure transactionsData is an array
    const transactions = Array.isArray(transactionsData) ? transactionsData : [];
    
    // Group by month
    const monthlyTotals = transactions
      .filter(tx => tx.type === 'EXPENSE')
      .reduce<Map<string, number>>((acc, tx) => {
        const date = new Date(tx.date);
        if (Number.isNaN(date.getTime())) {
          return acc;
        }
        const key = buildKeyFromDate(date);
        acc.set(key, (acc.get(key) || 0) + tx.amount);
        return acc;
      }, new Map());
    
    const sortedKeys = Array.from(monthlyTotals.keys()).sort((a, b) => {
      return parseKeyToDate(a).getTime() - parseKeyToDate(b).getTime();
    });

    let filledMonths: { date: Date; amount: number }[] = [];

    if (sortedKeys.length > 0) {
      const startDate = parseKeyToDate(sortedKeys[0]);
      const endDate = parseKeyToDate(sortedKeys[sortedKeys.length - 1]);

      let cursor = new Date(startDate);
      while (cursor <= endDate) {
        const key = buildKeyFromDate(cursor);
        filledMonths.push({
          date: new Date(cursor),
          amount: monthlyTotals.get(key) || 0,
        });
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      }
    } else {
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        filledMonths.push({ date, amount: 0 });
      }
    }

    if (filledMonths.length > 6) {
      filledMonths = filledMonths.slice(-6);
    }

    const labels = filledMonths.map(item => formatMonthLabel(item.date));
    const actualValues = filledMonths.map(item => item.amount);

    const lastActualDate = filledMonths.length > 0
      ? filledMonths[filledMonths.length - 1].date
      : new Date();

    const predictedLabelDate = new Date(
      lastActualDate.getFullYear(),
      lastActualDate.getMonth() + 1,
      1
    );

    const predictedLabel = formatMonthLabel(predictedLabelDate);

    return {
      labels: [...labels, predictedLabel],
      actualValues,
      lastActualValue: actualValues[actualValues.length - 1] || 0
    };
  };
  
  const { labels, actualValues, lastActualValue } = processData();
  const predictedValue = predictedExpense;

  const baseActualDataset = labels.map((_, idx) =>
    idx < actualValues.length ? actualValues[idx] : null
  );

  const predictedLineDataset = labels.map((_, idx) => {
    if (actualValues.length === 0) {
      return idx === labels.length - 1 ? predictedValue : null;
    }

    if (idx === actualValues.length - 1) {
      return lastActualValue;
    }
    if (idx === labels.length - 1) {
      return predictedValue;
    }
    return null;
  });

  const predictedBarDataset = labels.map((_, idx) =>
    idx === labels.length - 1 ? predictedValue : null
  );

  const lineChartData = {
    labels,
    datasets: [
      {
        label: 'Pengeluaran Bulanan',
        data: baseActualDataset,
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.15)',
        tension: 0.2,
        cubicInterpolationMode: 'monotone' as const,
        spanGaps: false,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
      },
      {
        label: 'Prediksi Bulan Depan',
        data: predictedLineDataset,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        borderDash: [5, 5],
        tension: 0.2,
        cubicInterpolationMode: 'monotone' as const,
        spanGaps: true,
        pointRadius: (ctx: any) =>
          ctx.dataIndex === labels.length - 1 ? 5 : 0,
        pointHoverRadius: (ctx: any) =>
          ctx.dataIndex === labels.length - 1 ? 7 : 0,
        fill: false,
      }
    ],
  };

  const barChartData = {
    labels,
    datasets: [
      {
        label: 'Pengeluaran Bulanan',
        data: baseActualDataset,
        backgroundColor: 'rgba(53, 162, 235, 0.7)',
        borderRadius: 6,
      },
      {
        label: 'Prediksi Bulan Depan',
        data: predictedBarDataset,
        backgroundColor: 'rgba(255, 99, 132, 0.7)',
        borderRadius: 6,
      }
    ]
  };

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          title: function(context: any) {
            return context[0]?.label || '';
          },
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
        grid: {
          color: 'rgba(148, 163, 184, 0.2)',
        },
        ticks: {
          callback: function(value: any) {
            return formatCurrency(value);
          }
        }
      },
      x: {
        grid: {
          display: false,
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
            <Line options={commonOptions} data={lineChartData} />
          ) : (
            <Bar options={commonOptions} data={barChartData} />
          )}
        </div>
        
        <div className="mt-8 p-4 bg-yellow-50 rounded-lg border border-yellow-100">
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
