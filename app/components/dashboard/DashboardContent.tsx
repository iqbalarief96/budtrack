import React, { useState, useEffect } from 'react'
import { useWallet } from '../../contexts/WalletContext'
import { Transaction, BudgetWithRelations } from '../../types'
import WalletSelector from '../WalletSelector'

const DashboardContent = ({ budgets = [] }: Props) => {
  const { wallets, selectedWallet, refreshWallets } = useWallet()
  const [summary, setSummary] = useState({ total: 0, income: 0, expense: 0 })
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([])
  const [savingsData, setSavingsData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingSavings, setIsLoadingSavings] = useState(true)
  const [chartData, setChartData] = useState({ income: 0, expense: 0 })
  const [recentBudgets, setRecentBudgets] = useState<BudgetWithRelations[]>([])
  const [showAllTransactions, setShowAllTransactions] = useState(false)
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false)
  const [transactionType, setTransactionType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE')
  const [selectedPeriod, setSelectedPeriod] = useState('all')
  
  // Fetch transactions
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const url = selectedPeriod === 'all' 
          ? '/api/transactions'
          : `/api/transactions?period=${selectedPeriod}`;
        
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setAllTransactions(data);
        }
      } catch (error) {
        console.error('Error fetching transactions:', error);
      }
    };

    fetchTransactions();
  }, [selectedPeriod]);

  // The rest of the calculateTotals useEffect can be simplified as the period filtering is now done on the server
  useEffect(() => {
    if (selectedWallet && allTransactions.length > 0) {
      // Filter transaksi untuk wallet yang dipilih
      const filteredTx = allTransactions.filter(
        (tx) => tx.walletId === selectedWallet.id
      );

      setFilteredTransactions(filteredTx);

      // Calculate income and expenses for the selected wallet
      let income = 0;
      let expense = 0;

      filteredTx.forEach((tx) => {
        if (tx.type === 'INCOME') {
          income += tx.amount;
        } else if (tx.type === 'EXPENSE') {
          // Count ALL expense transactions including savings
          expense += tx.amount;
        }
      });

      // Calculate total balance as income - expense
      const total = income - expense;
      
      // Set summary values
      setSummary({
        total,
        income,
        expense,
      });

      console.log('Summary updated:', { total, income, expense });

      // Set chart data
      setChartData({
        income,
        expense,
      });
    }
  }, [selectedWallet, allTransactions]);

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-blue-700 to-blue-500 rounded-xl p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Beranda</h1>
            <p className="text-blue-100 mt-1">Selamat datang kembali! Pantau keuangan Anda.</p>
          </div>
          
          <div className="mt-4 md:mt-0">
            <WalletSelector displayBalance={summary.total} />
          </div>
        </div>
        
        {/* Period Filter */}
        <div className="mb-4">
          <select 
            className="bg-white/20 text-white border border-white/40 rounded-md p-2 text-sm [&>option]:text-black"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
          >
            <option value="all">Semua Waktu</option>
            <option value="daily">Hari Ini</option>
            <option value="weekly">7 Hari Terakhir</option>
            <option value="monthly">Bulan Ini</option>
            <option value="quarterly">3 Bulan Terakhir</option>
            <option value="yearly">Tahun Ini</option>
          </select>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {/* ... existing code ... */}
        </div>
      </div>
      
      {/* ... rest of the component ... */}
    </div>
  );
}

export default DashboardContent 