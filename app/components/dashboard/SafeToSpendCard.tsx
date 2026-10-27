'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/utils';
import { Wallet, Calendar, Target, Shield, DollarSign, Repeat, CreditCard, Users } from 'lucide-react';
import { useWallet } from '@/app/providers/WalletProvider';

type ObligationBreakdown = {
  bills: number;
  recurring: number;
  subscriptions: number;
  creditCards: number;
  sharedBills: number;
  total: number;
};

type SafeToSpendResult = {
  safeToSpend: number;
  balance: number;
  expectedIncome: number;
  goalReserve: number;
  buffer: number;
  obligations: ObligationBreakdown;
  mode: 'conservative' | 'forward';
  confidence: 'low' | 'medium' | 'high';
};

export default function SafeToSpendCard() {
  // Mirror the dashboard's active scope so this widget never disagrees with the
  // hero Safe-to-Spend card (type aggregate, single wallet, or group).
  const { dashboardScope, dashboardScopeWalletIds, isGroupSelected, selectedGroup } = useWallet();
  const [data, setData] = useState<SafeToSpendResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const isAllWalletsScope = dashboardScope?.kind === 'type' && dashboardScope.type === 'ALL';
  const scopeKey = dashboardScopeWalletIds.join(',');

  useEffect(() => {
    const fetchSafeToSpend = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (isGroupSelected && selectedGroup?.id) params.set('walletGroupId', selectedGroup.id);
        else if (isAllWalletsScope) { /* no param → all wallets */ }
        else if (dashboardScopeWalletIds.length > 0) params.set('walletIds', dashboardScopeWalletIds.join(','));

        const response = await fetch(`/api/safe-to-spend/breakdown?${params.toString()}`);
        if (!response.ok) {
          // 404 = no wallets in scope yet; treat as empty, not an error.
          if (response.status === 404) {
            setData(null);
          } else {
            throw new Error('Failed to fetch safe-to-spend data');
          }
          return;
        }
        setData(await response.json());
      } catch (err) {
        console.error('Error fetching safe-to-spend:', err);
        setError('Gagal memuat data safe-to-spend');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSafeToSpend();
  }, [scopeKey, isAllWalletsScope, isGroupSelected, selectedGroup?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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

  if (!data) {
    return null;
  }

  const totalAllocated = data.obligations.total + data.goalReserve + data.buffer;
  const safeToSpendPercentage = data.balance > 0
    ? Math.round((data.safeToSpend / data.balance) * 100)
    : 0;

  const getStatusColor = () => {
    if (safeToSpendPercentage >= 30) return 'text-green-600';
    if (safeToSpendPercentage >= 10) return 'text-yellow-600';
    return 'text-red-600';
  };

  const confidenceLabel =
    data.confidence === 'high' ? 'Tinggi' : data.confidence === 'medium' ? 'Sedang' : 'Rendah';

  const obligationRows: Array<{ icon: React.ReactNode; label: string; amount: number }> = [
    { icon: <Calendar className="h-3.5 w-3.5 text-orange-600" />, label: 'Tagihan', amount: data.obligations.bills },
    { icon: <Repeat className="h-3.5 w-3.5 text-blue-600" />, label: 'Transaksi berulang', amount: data.obligations.recurring },
    { icon: <DollarSign className="h-3.5 w-3.5 text-purple-600" />, label: 'Langganan', amount: data.obligations.subscriptions },
    { icon: <CreditCard className="h-3.5 w-3.5 text-rose-600" />, label: 'Minimum kartu kredit', amount: data.obligations.creditCards },
    { icon: <Users className="h-3.5 w-3.5 text-teal-600" />, label: 'Shared bills', amount: data.obligations.sharedBills },
  ].filter((r) => r.amount > 0);

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
          <p className="text-sm text-gray-600 mb-1">Aman untuk dibelanjakan sampai akhir bulan</p>
          <p className={`text-3xl font-bold ${getStatusColor()}`}>
            {formatCurrency(data.safeToSpend)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {safeToSpendPercentage}% dari total saldo • akurasi {confidenceLabel.toLowerCase()}
          </p>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Saldo yang sudah dialokasikan</span>
            <span className="font-medium">{formatCurrency(totalAllocated)}</span>
          </div>
          <Progress
            value={data.balance > 0 ? Math.min(100, (totalAllocated / data.balance) * 100) : 0}
            className="h-2"
          />
        </div>

        {/* Breakdown summary */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-start gap-2">
            <Wallet className="h-4 w-4 text-blue-600 mt-0.5" />
            <div>
              <p className="text-gray-500">Total Saldo</p>
              <p className="font-medium">{formatCurrency(data.balance)}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Calendar className="h-4 w-4 text-orange-600 mt-0.5" />
            <div>
              <p className="text-gray-500">Kewajiban bulan ini</p>
              <p className="font-medium">{formatCurrency(data.obligations.total)}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Target className="h-4 w-4 text-green-600 mt-0.5" />
            <div>
              <p className="text-gray-500">Reserve goal</p>
              <p className="font-medium">{formatCurrency(data.goalReserve)}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 text-yellow-600 mt-0.5" />
            <div>
              <p className="text-gray-500">Buffer kas</p>
              <p className="font-medium">{formatCurrency(data.buffer)}</p>
            </div>
          </div>
        </div>

        {data.expectedIncome > 0 && (
          <p className="text-xs text-gray-500">
            + perkiraan pemasukan {formatCurrency(data.expectedIncome)} (mode forward)
          </p>
        )}

        {/* Detailed obligations breakdown */}
        {showDetails && (
          <div className="pt-4 border-t space-y-2">
            <p className="text-xs font-medium text-gray-600">Rincian kewajiban (jatuh tempo bulan ini):</p>
            {obligationRows.length > 0 ? (
              obligationRows.map((row, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs">
                  <span className="flex items-center gap-1.5 text-gray-600">
                    {row.icon}
                    {row.label}
                  </span>
                  <span className="font-medium">{formatCurrency(row.amount)}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-400">Tidak ada kewajiban yang jatuh tempo bulan ini.</p>
            )}
            <p className="text-[11px] text-gray-400 pt-1">
              Budget sengaja tidak dikurangi: budget adalah rencana belanja, bukan kewajiban.
            </p>
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
