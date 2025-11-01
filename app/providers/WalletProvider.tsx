'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

// Define the wallet type
type Wallet = {
  id: string
  name: string
  balance: number
  color?: string
  isDefault: boolean
}

// Define the wallet context type
type WalletContextType = {
  wallets: Wallet[]
  selectedWallet: Wallet | null
  setSelectedWalletAndPersist: (wallet: Wallet) => void
  isLoading: boolean
  refreshWallets: () => Promise<void>
}

// Create the context with default values
const WalletContext = createContext<WalletContextType>({
  wallets: [],
  selectedWallet: null,
  setSelectedWalletAndPersist: () => {},
  isLoading: true,
  refreshWallets: async () => {}
})

// Custom hook to use the wallet context
export const useWallet = () => useContext(WalletContext)

// Key for localStorage
const LOCAL_STORAGE_KEY = 'selectedWalletId'

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchWallets = async () => {
    setIsLoading(true); // Set loading true when fetching
    try {
      const response = await fetch('/api/wallets')
      if (!response.ok) throw new Error('Failed to fetch wallets')
      const data: Wallet[] = await response.json()
      console.log('[DEBUG] WalletProvider fetched wallets:', data);
      setWallets(data)
      
      // Determine the initial selected wallet
      const persistedWalletId = localStorage.getItem(LOCAL_STORAGE_KEY);
      let initialWallet: Wallet | undefined = undefined;

      if (persistedWalletId) {
        initialWallet = data.find((wallet) => wallet.id === persistedWalletId);
      }

      // If no persisted or persisted is invalid, find default or first
      if (!initialWallet) {
        initialWallet = data.find((wallet) => wallet.isDefault) || data[0];
      }
      
      // Set the selected wallet state
      if (initialWallet) {
        setSelectedWallet(initialWallet)
      }
      
    } catch (error) {
      console.error('Error fetching wallets:', error)
      setWallets([])
      setSelectedWallet(null); // Reset selected wallet on error
    } finally {
      setIsLoading(false)
    }
  }
  
  // Function to set selected wallet and persist to localStorage
  const setSelectedWalletAndPersist = (wallet: Wallet) => {
    console.log('[DEBUG] Setting selected wallet:', wallet);
    setSelectedWallet(wallet);
    localStorage.setItem(LOCAL_STORAGE_KEY, wallet.id);
  };

  // Load wallets on mount
  useEffect(() => {
    fetchWallets()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Run only once on mount

  return (
    <WalletContext.Provider value={{ 
      wallets, 
      selectedWallet, 
      setSelectedWalletAndPersist, // Provide the updated function
      isLoading,
      refreshWallets: fetchWallets
    }}>
      {children}
    </WalletContext.Provider>
  )
} 