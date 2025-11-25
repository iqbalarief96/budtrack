'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useWallets } from '@/lib/hooks/useWallets'

// Define the wallet type
type Wallet = {
  id: string
  name: string
  balance: number
  color?: string
  isDefault: boolean
  type?: string // MAIN, SAVINGS, INVESTMENT
}

// Define wallet type filter
export type WalletTypeFilter = 'ALL' | 'MAIN' | 'SAVINGS' | 'INVESTMENT'

// Define the wallet context type
type WalletContextType = {
  wallets: Wallet[]
  selectedWallet: Wallet | null
  setSelectedWalletAndPersist: (wallet: Wallet) => void
  isLoading: boolean
  refreshWallets: () => Promise<void>
  walletTypeFilter: WalletTypeFilter
  setWalletTypeFilter: (filter: WalletTypeFilter) => void
  filteredWallets: Wallet[]
}

// Create the context with default values
const WalletContext = createContext<WalletContextType>({
  wallets: [],
  selectedWallet: null,
  setSelectedWalletAndPersist: () => {},
  isLoading: true,
  refreshWallets: async () => {},
  walletTypeFilter: 'ALL',
  setWalletTypeFilter: () => {},
  filteredWallets: []
})

// Custom hook to use the wallet context
export const useWallet = () => useContext(WalletContext)

// Key for localStorage
const LOCAL_STORAGE_KEY = 'selectedWalletId'
const WALLET_TYPE_FILTER_KEY = 'walletTypeFilter'

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
  // Use React Query hook
  const { data: wallets = [], isLoading, refetch } = useWallets()
  
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null)
  const [walletTypeFilter, setWalletTypeFilterState] = useState<WalletTypeFilter>('ALL')

  // Update selected wallet when wallets data changes
  useEffect(() => {
    if (wallets.length === 0) return

    const persistedWalletId = localStorage.getItem(LOCAL_STORAGE_KEY)
    let initialWallet: Wallet | undefined = undefined

    if (persistedWalletId) {
      initialWallet = wallets.find((wallet) => wallet.id === persistedWalletId)
    }

    // If no persisted or persisted is invalid, find default or first
    if (!initialWallet) {
      initialWallet = wallets.find((wallet) => wallet.isDefault) || wallets[0]
    }

    // Set the selected wallet state
    if (initialWallet) {
      setSelectedWallet(initialWallet)
    }
  }, [wallets])
  
  // Function to set selected wallet and persist to localStorage
  const setSelectedWalletAndPersist = (wallet: Wallet) => {
    console.log('[DEBUG] Setting selected wallet:', wallet);
    setSelectedWallet(wallet);
    localStorage.setItem(LOCAL_STORAGE_KEY, wallet.id);
  };

  // Function to set wallet type filter and persist
  const setWalletTypeFilter = (filter: WalletTypeFilter) => {
    setWalletTypeFilterState(filter);
    localStorage.setItem(WALLET_TYPE_FILTER_KEY, filter);
  };

  // Filter wallets by type
  const filteredWallets = React.useMemo(() => {
    if (walletTypeFilter === 'ALL') return wallets;
    return wallets.filter(w => w.type === walletTypeFilter);
  }, [wallets, walletTypeFilter]);

  // Load wallet type filter from localStorage on mount
  useEffect(() => {
    const savedFilter = localStorage.getItem(WALLET_TYPE_FILTER_KEY) as WalletTypeFilter
    if (savedFilter && ['ALL', 'MAIN', 'SAVINGS', 'INVESTMENT'].includes(savedFilter)) {
      setWalletTypeFilterState(savedFilter)
    }
  }, [])

  return (
    <WalletContext.Provider
      value={{
        wallets,
        selectedWallet,
        setSelectedWalletAndPersist,
        isLoading,
        refreshWallets: () => refetch().then(() => {}),
        walletTypeFilter,
        setWalletTypeFilter,
        filteredWallets,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
} 