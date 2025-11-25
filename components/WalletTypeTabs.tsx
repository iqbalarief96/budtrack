'use client';

import React from 'react';
import { useWallet, WalletTypeFilter } from '@/app/providers/WalletProvider';

export function WalletTypeTabs() {
  const { walletTypeFilter, setWalletTypeFilter, wallets } = useWallet();

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

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => setWalletTypeFilter(tab.value)}
          className={`
            px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors
            ${
              walletTypeFilter === tab.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }
          `}
        >
          {tab.label}
          {tab.count > 0 && (
            <span className="ml-2 text-xs opacity-75">({tab.count})</span>
          )}
        </button>
      ))}
    </div>
  );
}
