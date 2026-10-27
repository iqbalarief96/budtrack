'use client';

import React from 'react';
import { useWallet, WalletTypeFilter } from '@/app/providers/WalletProvider';

export function WalletTypeTabs() {
  const { dashboardScope, viewWalletType, wallets } = useWallet();

  // Count wallets by type
  const counts = React.useMemo(() => {
    const main = wallets.filter(w => w.type === 'MAIN' || !w.type).length;
    const savings = wallets.filter(w => w.type === 'SAVINGS').length;
    const investment = wallets.filter(w => w.type === 'INVESTMENT').length;
    return { all: wallets.length, main, savings, investment };
  }, [wallets]);

  const tabs: { label: string; value: WalletTypeFilter; count: number }[] = [
    { label: 'Semua', value: 'ALL', count: counts.all },
    { label: 'Dompet Utama', value: 'MAIN', count: counts.main },
    { label: 'Tabungan', value: 'SAVINGS', count: counts.savings },
    { label: 'Investasi', value: 'INVESTMENT', count: counts.investment },
  ];

  // When scoped to one specific wallet, show it as an extra active chip.
  const activeWallet =
    dashboardScope?.kind === 'wallet'
      ? wallets.find((w) => w.id === dashboardScope.walletId)
      : undefined;

  const closeWalletChip = () => {
    // Back to the aggregate of the wallet's own type (fallback: all).
    const t = activeWallet && (activeWallet.type === 'SAVINGS' || activeWallet.type === 'INVESTMENT')
      ? (activeWallet.type as WalletTypeFilter)
      : (activeWallet ? 'MAIN' : 'ALL');
    viewWalletType(t);
  };

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
      {tabs.map((tab) => {
        const isActive = dashboardScope?.kind === 'type' && dashboardScope.type === tab.value;
        return (
          <button
            key={tab.value}
            onClick={() => viewWalletType(tab.value)}
            className={`
              px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors
              ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
            `}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-2 text-xs opacity-75">({tab.count})</span>
            )}
          </button>
        );
      })}

      {activeWallet && (
        <span className="flex items-center gap-1 pl-4 pr-2 py-2 rounded-lg font-medium text-sm whitespace-nowrap bg-blue-600 text-white">
          {activeWallet.name}
          <button
            type="button"
            aria-label="Tutup tampilan dompet ini"
            onClick={closeWalletChip}
            className="ml-1 rounded-full px-1.5 text-white/80 hover:bg-white/20 hover:text-white"
          >
            ✕
          </button>
        </span>
      )}
    </div>
  );
}
