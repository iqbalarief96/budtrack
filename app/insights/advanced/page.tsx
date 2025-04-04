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
      const data = await response.json();
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
    // Group transactions by month
    const expensesByMonth = data
      .filter(tx => tx.type === 'EXPENSE')
      .reduce<Record<string, number>>((acc, tx) => {
        const month = new Date(tx.date).getMonth();
        const year = new Date(tx.date).getFullYear();
        const key = `${year}-${month}`;
        if (!acc[key]) acc[key] = 0;
        acc[key] += tx.amount;
        return acc;
      }, {});
    
    // Convert to array and sort by date
    const monthlyExpenses = Object.entries(expensesByMonth)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    // Simple prediction based on average of last 3 months
    if (monthlyExpenses.length >= 3) {
      const lastThreeMonths = monthlyExpenses.slice(-3);
      const average = lastThreeMonths.reduce((sum, item) => sum + item.amount, 0) / 3;
      setPredictedExpense(average);
    } else if (monthlyExpenses.length > 0) {
      setPredictedExpense(monthlyExpenses[monthlyExpenses.length - 1].amount);
    }
  };

  const detectAnomalies = (data: Transaction[]) => {
    // Group by category
    const expensesByCategory = data
      .filter(tx => tx.type === 'EXPENSE')
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
    // Group by month
    const monthlyData = data
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
      // In a real app, this would be an API call to get platform averages
      // For demo, we'll simulate some comparison data
      const userTotal = data
        .filter(tx => tx.type === 'EXPENSE')
        .reduce((sum, tx) => sum + tx.amount, 0);
      
      const userAverage = userTotal / 
        (data.filter(tx => tx.type === 'EXPENSE').length || 1);
      
      // Simulated platform average (20% higher than user's)
      const platformAverage = userAverage * 1.2;
      
      // Category comparisons
      const userCategoryData = data
        .filter(tx => tx.type === 'EXPENSE')
        .reduce<Record<string, number>>((acc, tx) => {
          const category = tx.category.name;
          if (!acc[category]) acc[category] = 0;
          acc[category] += tx.amount;
          return acc;
        }, {});
      
      const categories = Object.entries(userCategoryData).map(([name, amount]) => ({
        name,
        userAmount: amount,
        platformAmount: amount * (0.8 + Math.random() * 0.8) // Random between 80-160% of user's amount
      }));
      
      setBenchmarkData({
        userAverage,
        platformAverage,
        categories
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