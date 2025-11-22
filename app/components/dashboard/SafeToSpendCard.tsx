'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/utils';
import { Wallet, TrendingDown, Calendar, Target, Shield, DollarSign } from 'lucide-react';
import { useWallet } from '@/app/providers/WalletProvider';

interface SafeToSpendData {
  walletId: string;
  walletName: string;
  totalBalance: number;
  upcomingBills: number;
  budgetAllocations: number;
  savingsGoals: number;
  emergencyBuffer: number;
  safeToSpend: number;
  currencyCode: string;
  breakdown: {
    upcomingBillsDetails: Array<{
      name: string;
      amount: number;
      nextDate: Date;
      daysUntilDue: number;
    }>;
    budgetDetails: Array<{
      categoryName: string;
      budgetAmount: number;
      spent: number;
      remaining: number;
    }>;
    goalDetails: Array<{
      goalName: string;
      target: number;
      current: number;
      remaining: number;
    }>;
    emergencyFundDetails: {
      targetAmount: number;
      currentBalance: number;
      shortfall: number;
    } | null;
  };
}

interface AllWalletsSafeToSpend {
  wallets: SafeToSpendData[];
  totals: {
    totalBalance: number;
    upcomingBills: number;
    budgetAllocations: number;
    savingsGoals: number;
    emergencyBuffer: number;
    safeToSpend: number;
  };
  primaryCurrency: string;
}

export default function SafeToSpendCard() {
  const { selectedWallet } = useWallet();
  const [safeToSpendData, setSafeToSpendData] = useState<SafeToSpendData | AllWalletsSafeToSpend | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const fetchSafeToSpend = async () => {
      try {
        setIsLoading(true);
        setError(null);

        let response;
        if (selectedWallet) {
          // Fetch for specific wallet
          response = await fetch(`/api/wallets/${selectedWallet.id}/safe-to-spend`);
        } else {
          // Fetch for all wallets
          response = await fetch('/api/safe-to-spend');
        }

        if (!response.ok) {
          throw new Error('Failed to fetch safe-to-spend data');
        }

        const data = await response.json();
        setSafeToSpendData(data);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching safe-to-spend:', error);
        setError('Gagal memuat data safe-to-spend');
        setIsLoading(false);
      }
    };

    fetchSafeToSpend();
  }, [selectedWallet]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Safe to Spend
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <p>Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Safe to Spend
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-red-500">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!safeToSpendData) {
    return null;
  }

  // Check if this is all wallets data or single wallet data
  const isAllWallets = 'totals' in safeToSpendData && 'wallets' in safeToSpendData;

  let displayData: {
    balance: number;
    upcomingBills: number;
    budgetAllocations: number;
    savingsGoals: number;
    emergencyBuffer: number;
    safeToSpend: number;
    currency: string;
  };

  if (isAllWallets) {
    const allWalletsData = safeToSpendData as AllWalletsSafeToSpend;
    displayData = {
      balance: allWalletsData.totals.totalBalance,
      upcomingBills: allWalletsData.totals.upcomingBills,
      budgetAllocations: allWalletsData.totals.budgetAllocations,
      savingsGoals: allWalletsData.totals.savingsGoals,
      emergencyBuffer: allWalletsData.totals.emergencyBuffer,
      safeToSpend: allWalletsData.totals.safeToSpend,
      currency: allWalletsData.primaryCurrency,
    };
  } else {
    const singleWalletData = safeToSpendData as SafeToSpendData;
    displayData = {
      balance: singleWalletData.totalBalance,
      upcomingBills: singleWalletData.upcomingBills,
      budgetAllocations: singleWalletData.budgetAllocations,
      savingsGoals: singleWalletData.savingsGoals,
      emergencyBuffer: singleWalletData.emergencyBuffer,
      safeToSpend: singleWalletData.safeToSpend,
      currency: singleWalletData.currencyCode,
    };
  }

  const totalAllocated =
    displayData.upcomingBills +
    displayData.budgetAllocations +
    displayData.savingsGoals +
    displayData.emergencyBuffer;

  const safeToSpendPercentage = displayData.balance > 0
    ? Math.round((displayData.safeToSpend / displayData.balance) * 100)
    : 0;

  // Determine color based on safe-to-spend percentage
  const getStatusColor = () => {
    if (safeToSpendPercentage >= 30) return 'text-green-600';
    if (safeToSpendPercentage >= 10) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressColor = () => {
    if (safeToSpendPercentage >= 30) return 'bg-green-500';
    if (safeToSpendPercentage >= 10) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Safe to Spend
          </span>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-blue-600 hover:underline"
          >
            {showDetails ? 'Sembunyikan' : 'Detail'}
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main safe-to-spend amount */}
        <div className="text-center py-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Aman untuk dibelanjakan</p>
          <p className={`text-3xl font-bold ${getStatusColor()}`}>
            {formatCurrency(displayData.safeToSpend, displayData.currency)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {safeToSpendPercentage}% dari total saldo
          </p>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Saldo yang dialokasikan</span>
            <span className="font-medium">
              {formatCurrency(totalAllocated, displayData.currency)}
            </span>
          </div>
          <Progress
            value={displayData.balance > 0 ? (totalAllocated / displayData.balance) * 100 : 0}
            className="h-2"
          />
        </div>

        {/* Breakdown summary */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-start gap-2">
            <Wallet className="h-4 w-4 text-blue-600 mt-0.5" />
            <div>
              <p className="text-gray-500">Total Saldo</p>
              <p className="font-medium">{formatCurrency(displayData.balance, displayData.currency)}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Calendar className="h-4 w-4 text-orange-600 mt-0.5" />
            <div>
              <p className="text-gray-500">Tagihan</p>
              <p className="font-medium">{formatCurrency(displayData.upcomingBills, displayData.currency)}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <TrendingDown className="h-4 w-4 text-purple-600 mt-0.5" />
            <div>
              <p className="text-gray-500">Budget</p>
              <p className="font-medium">{formatCurrency(displayData.budgetAllocations, displayData.currency)}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Target className="h-4 w-4 text-green-600 mt-0.5" />
            <div>
              <p className="text-gray-500">Goals</p>
              <p className="font-medium">{formatCurrency(displayData.savingsGoals, displayData.currency)}</p>
            </div>
          </div>
        </div>

        {displayData.emergencyBuffer > 0 && (
          <div className="flex items-start gap-2 text-sm p-2 bg-yellow-50 rounded">
            <Shield className="h-4 w-4 text-yellow-600 mt-0.5" />
            <div>
              <p className="text-gray-500">Dana Darurat Kurang</p>
              <p className="font-medium">{formatCurrency(displayData.emergencyBuffer, displayData.currency)}</p>
            </div>
          </div>
        )}

        {/* Detailed breakdown */}
        {showDetails && !isAllWallets && (
          <div className="pt-4 border-t space-y-3">
            {(safeToSpendData as SafeToSpendData).breakdown.upcomingBillsDetails.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">Tagihan 30 Hari Ke Depan:</p>
                <div className="space-y-1">
                  {(safeToSpendData as SafeToSpendData).breakdown.upcomingBillsDetails.slice(0, 3).map((bill, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <span className="text-gray-600">
                        {bill.name} <span className="text-gray-400">({bill.daysUntilDue}h)</span>
                      </span>
                      <span className="font-medium">{formatCurrency(bill.amount, displayData.currency)}</span>
                    </div>
                  ))}
                  {(safeToSpendData as SafeToSpendData).breakdown.upcomingBillsDetails.length > 3 && (
                    <p className="text-xs text-gray-400">
                      +{(safeToSpendData as SafeToSpendData).breakdown.upcomingBillsDetails.length - 3} tagihan lainnya
                    </p>
                  )}
                </div>
              </div>
            )}

            {(safeToSpendData as SafeToSpendData).breakdown.budgetDetails.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">Budget Aktif:</p>
                <div className="space-y-1">
                  {(safeToSpendData as SafeToSpendData).breakdown.budgetDetails.slice(0, 3).map((budget, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <span className="text-gray-600">{budget.categoryName}</span>
                      <span className="font-medium">{formatCurrency(budget.remaining, displayData.currency)}</span>
                    </div>
                  ))}
                  {(safeToSpendData as SafeToSpendData).breakdown.budgetDetails.length > 3 && (
                    <p className="text-xs text-gray-400">
                      +{(safeToSpendData as SafeToSpendData).breakdown.budgetDetails.length - 3} budget lainnya
                    </p>
                  )}
                </div>
              </div>
            )}

            {(safeToSpendData as SafeToSpendData).breakdown.goalDetails.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">Savings Goals:</p>
                <div className="space-y-1">
                  {(safeToSpendData as SafeToSpendData).breakdown.goalDetails.slice(0, 3).map((goal, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <span className="text-gray-600">{goal.goalName}</span>
                      <span className="font-medium">{formatCurrency(goal.remaining, displayData.currency)}</span>
                    </div>
                  ))}
                  {(safeToSpendData as SafeToSpendData).breakdown.goalDetails.length > 3 && (
                    <p className="text-xs text-gray-400">
                      +{(safeToSpendData as SafeToSpendData).breakdown.goalDetails.length - 3} goals lainnya
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tip based on status */}
        <div className="pt-3 border-t">
          <p className="text-xs text-gray-500">
            {safeToSpendPercentage >= 30 && (
              <span className="text-green-600">✓ Financial health bagus! Anda punya cukup buffer untuk pengeluaran.</span>
            )}
            {safeToSpendPercentage >= 10 && safeToSpendPercentage < 30 && (
              <span className="text-yellow-600">⚠ Perhatian: Safe-to-spend Anda mulai menipis.</span>
            )}
            {safeToSpendPercentage < 10 && (
              <span className="text-red-600">⚠ Warning: Safe-to-spend sangat rendah. Pertimbangkan untuk mengurangi pengeluaran.</span>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
