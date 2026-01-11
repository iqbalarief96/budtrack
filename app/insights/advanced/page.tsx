'use client';

import { useState, useEffect } from 'react';
import { FiBarChart2, FiAlertTriangle, FiCalendar, FiUsers } from 'react-icons/fi';
import { useWallet } from '@/app/providers/WalletProvider';
import { formatCurrency } from '@/lib/utils';
import PredictionChart from './components/PredictionChart';
import AnomalyDetection from './components/AnomalyDetection';
import SeasonalAnalysis from './components/SeasonalAnalysis';
import BenchmarkComparison from './components/BenchmarkComparison';

interface Transaction {
  id: string;
  amount: number;
  date: string;
  description: string;
  type: 'EXPENSE' | 'INCOME';
  category: {
    name: string;
    id: string;
  };
}

interface MonthData {
  name: string;
  amount: number;
}

interface CategoryComparison {
  name: string;
  userAmount: number;
  platformAmount: number;
}

interface BenchmarkData {
  userAverage: number;
  platformAverage: number;
  categories: CategoryComparison[];
}

interface AnomalyTransaction extends Transaction {
  average: number;
  percentAboveAverage: number;
}

type MonthlyExpensePoint = {
  date: Date;
  amount: number;
};

function monthKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}`;
}

function keyToMonthDate(key: string) {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, 1);
}

function addMonths(date: Date, count: number) {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

function clampPrediction(value: number, baseline: number) {
  if (!Number.isFinite(value)) {
    return Math.max(baseline, 0);
  }
  if (baseline <= 0) {
    return Math.max(value, 0);
  }
  const lowerBound = baseline * 0.5;
  const upperBound = baseline * 1.6;
  return Math.min(Math.max(value, lowerBound), upperBound);
}

function getMonthlyExpenseSeries(transactions: Transaction[]): MonthlyExpensePoint[] {
  const expenseTransactions = transactions.filter(tx => tx.type === 'EXPENSE');
  if (expenseTransactions.length === 0) {
    return [];
  }

  const monthlyTotals = expenseTransactions.reduce<Map<string, number>>((acc, tx) => {
    const txDate = new Date(tx.date);
    if (Number.isNaN(txDate.getTime())) {
      return acc;
    }
    const key = monthKey(txDate);
    acc.set(key, (acc.get(key) || 0) + tx.amount);
    return acc;
  }, new Map());

  if (monthlyTotals.size === 0) {
    return [];
  }

  const sortedKeys = Array.from(monthlyTotals.keys()).sort(
    (a, b) => keyToMonthDate(a).getTime() - keyToMonthDate(b).getTime()
  );

  const series: MonthlyExpensePoint[] = [];
  const startDate = keyToMonthDate(sortedKeys[0]);
  const endDate = keyToMonthDate(sortedKeys[sortedKeys.length - 1]);

  for (let cursor = new Date(startDate); cursor <= endDate; cursor = addMonths(cursor, 1)) {
    const key = monthKey(cursor);
    series.push({
      date: new Date(cursor),
      amount: monthlyTotals.get(key) || 0,
    });
  }

  return series;
}

function forecastNextMonth(amounts: number[]): number {
  if (amounts.length === 0) {
    return 0;
  }

  const recent = amounts.slice(-6);
  const n = recent.length;

  if (n >= 4) {
    const xValues = Array.from({ length: n }, (_, idx) => idx);
    const sumX = xValues.reduce((sum, x) => sum + x, 0);
    const sumY = recent.reduce((sum, y) => sum + y, 0);
    const sumXY = xValues.reduce((sum, x, idx) => sum + x * recent[idx], 0);
    const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);

    const denominator = n * sumX2 - sumX * sumX;
    const slope = Math.abs(denominator) < 1e-6
      ? 0
      : (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;

    let forecast = intercept + slope * n;
    if (!Number.isFinite(forecast)) {
      forecast = recent[n - 1];
    }

    const recentAverage = recent.reduce((sum, value) => sum + value, 0) / n;
    const blended = (forecast * 0.7) + (recentAverage * 0.3);
    const baseline = recentAverage > 0 ? recentAverage : forecast;

    return Math.max(clampPrediction(blended, baseline), 0);
  }

  if (n === 3) {
    const weighted =
      recent[0] * 0.1 +
      recent[1] * 0.3 +
      recent[2] * 0.6;
    const baseline = recent.reduce((sum, value) => sum + value, 0) / n;
    return Math.max(clampPrediction(weighted, baseline), 0);
  }

  if (n === 2) {
    const weighted = recent[0] * 0.35 + recent[1] * 0.65;
    const baseline = (recent[0] + recent[1]) / 2;
    return Math.max(clampPrediction(weighted, baseline), 0);
  }

  return Math.max(recent[0], 0);
}

export default function AdvancedAnalyticsPage() {
  const { selectedWallet } = useWallet();
  const [activeTab, setActiveTab] = useState('prediction');
  const [isLoading, setIsLoading] = useState(true);
  const [transactionsData, setTransactionsData] = useState<Transaction[]>([]);
  const [predictedExpense, setPredictedExpense] = useState(0);
  const [anomalies, setAnomalies] = useState<AnomalyTransaction[]>([]);
  const [seasonalData, setSeasonalData] = useState<MonthData[]>([]);
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkData>({
    userAverage: 0,
    platformAverage: 0,
    categories: []
  });

  useEffect(() => {
    if (selectedWallet) {
      fetchTransactionsData();
    }
  }, [selectedWallet]);

  const fetchTransactionsData = async () => {
    setIsLoading(true);
    try {
      // Fetch historical transaction data
      const response = await fetch(`/api/transactions?walletId=${selectedWallet?.id}`);
      if (!response.ok) throw new Error('Failed to fetch transactions');
      const responseData = await response.json();
      // Handle API response format: { success: true, data: [...] } or direct array
      const data = Array.isArray(responseData) ? responseData : (responseData.data || []);
      setTransactionsData(data);
      
      // Calculate predictions
      calculatePredictions(data);
      // Detect anomalies
      detectAnomalies(data);
      // Calculate seasonal patterns
      analyzeSeasonalPattern(data);
      // Get benchmark data
      fetchBenchmarkData(data);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculatePredictions = (data: Transaction[]) => {
    // Ensure data is an array
    const transactions = Array.isArray(data) ? data : [];
    const monthlySeries = getMonthlyExpenseSeries(transactions);

    if (monthlySeries.length === 0) {
      setPredictedExpense(0);
      return;
    }

    const recentAmounts = monthlySeries
      .slice(-6)
      .map(point => point.amount);

    const prediction = forecastNextMonth(recentAmounts);
    setPredictedExpense(prediction);
  };

  const detectAnomalies = (data: Transaction[]) => {
    // Ensure data is an array
    const transactions = Array.isArray(data) ? data : [];
    
    // Group by category
    const expensesByCategory = transactions
      .filter(tx => tx.type === 'EXPENSE' && tx.category && tx.category.name)
      .reduce<Record<string, Transaction[]>>((acc, tx) => {
        const catName = tx.category.name;
        if (!acc[catName]) acc[catName] = [];
        acc[catName].push(tx);
        return acc;
      }, {});
    
    // Detect anomalies per category (expenses that are 50% higher than average)
    const anomalies: AnomalyTransaction[] = [];
    Object.entries(expensesByCategory).forEach(([category, transactions]) => {
      const amounts = transactions.map(tx => tx.amount);
      const average = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
      
      transactions.forEach(tx => {
        if (tx.amount > average * 1.5) {
          anomalies.push({
            ...tx,
            average,
            percentAboveAverage: ((tx.amount / average) - 1) * 100
          });
        }
      });
    });
    
    setAnomalies(anomalies.sort((a, b) => b.percentAboveAverage - a.percentAboveAverage));
  };

  const analyzeSeasonalPattern = (data: Transaction[]) => {
    // Ensure data is an array
    const transactions = Array.isArray(data) ? data : [];
    
    // Group by month
    const monthlyData = transactions
      .filter(tx => tx.type === 'EXPENSE')
      .reduce<Record<number, number>>((acc, tx) => {
        const month = new Date(tx.date).getMonth();
        if (!acc[month]) acc[month] = 0;
        acc[month] += tx.amount;
        return acc;
      }, {});
    
    // Convert to array format for chart
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const result = monthNames.map((name, index) => ({
      name,
      amount: monthlyData[index] || 0
    }));
    
    setSeasonalData(result);
  };

  const fetchBenchmarkData = async (data: Transaction[]) => {
    try {
      if (!selectedWallet) return;
      
      // Use our real benchmark API to get platform-wide averages
      const response = await fetch(`/api/insights/benchmarks?walletId=${selectedWallet.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch benchmark data');
      }
      
      const benchmarkData = await response.json();
      console.log('Benchmark data:', benchmarkData);
      
      setBenchmarkData({
        userAverage: benchmarkData.userAverage || 0,
        platformAverage: benchmarkData.platformAverage || 0,
        categories: benchmarkData.categories || []
      });
    } catch (error) {
      console.error('Error fetching benchmark data:', error);
    }
  };

  if (!selectedWallet) {
    return (
      <div className="p-6 text-center text-gray-500">
        Pilih dompet terlebih dahulu untuk melihat analisis
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Analisis Lanjutan</h1>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('prediction')}
            className={`pb-4 px-2 flex items-center ${
              activeTab === 'prediction'
                ? 'text-blue-600 border-b-2 border-blue-600 font-medium'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FiBarChart2 className="mr-2" />
            Prediksi Pengeluaran
          </button>
          
          <button
            onClick={() => setActiveTab('anomaly')}
            className={`pb-4 px-2 flex items-center ${
              activeTab === 'anomaly'
                ? 'text-blue-600 border-b-2 border-blue-600 font-medium'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FiAlertTriangle className="mr-2" />
            Deteksi Anomali
          </button>
          
          <button
            onClick={() => setActiveTab('seasonal')}
            className={`pb-4 px-2 flex items-center ${
              activeTab === 'seasonal'
                ? 'text-blue-600 border-b-2 border-blue-600 font-medium'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FiCalendar className="mr-2" />
            Analisis Musiman
          </button>
          
          <button
            onClick={() => setActiveTab('benchmark')}
            className={`pb-4 px-2 flex items-center ${
              activeTab === 'benchmark'
                ? 'text-blue-600 border-b-2 border-blue-600 font-medium'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FiUsers className="mr-2" />
            Perbandingan
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {activeTab === 'prediction' && (
              <PredictionChart 
                transactionsData={transactionsData} 
                predictedExpense={predictedExpense} 
              />
            )}
            
            {activeTab === 'anomaly' && (
              <AnomalyDetection anomalies={anomalies} />
            )}
            
            {activeTab === 'seasonal' && (
              <SeasonalAnalysis seasonalData={seasonalData} />
            )}
            
            {activeTab === 'benchmark' && (
              <BenchmarkComparison benchmarkData={benchmarkData} />
            )}
          </>
        )}
      </div>
    </div>
  );
} 
