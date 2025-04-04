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
  setSelectedWallet: (wallet: Wallet) => void
  isLoading: boolean
  refreshWallets: () => Promise<void>
}

// Create the context with default values
const WalletContext = createContext<WalletContextType>({
  wallets: [],
  selectedWallet: null,
  setSelectedWallet: () => {},
  isLoading: true,
  refreshWallets: async () => {}
})

// Custom hook to use the wallet context
export const useWallet = () => useContext(WalletContext)

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchWallets = async () => {
    try {
      const response = await fetch('/api/wallets')
      if (!response.ok) throw new Error('Failed to fetch wallets')
      const data = await response.json()
      setWallets(data)
      
      // Set the default wallet
      const defaultWallet = data.find((wallet: Wallet) => wallet.isDefault) || data[0]
      if (defaultWallet && (!selectedWallet || !data.find((w: Wallet) => w.id === selectedWallet.id))) {
        setSelectedWallet(defaultWallet)
      }
    } catch (error) {
      console.error('Error fetching wallets:', error)
      setWallets([])
    } finally {
      setIsLoading(false)
    }
  }

  // Load wallets on mount
  useEffect(() => {
    fetchWallets()
  }, [])

  return (
    <WalletContext.Provider value={{ 
      wallets, 
      selectedWallet, 
      setSelectedWallet, 
      isLoading,
      refreshWallets: fetchWallets
    }}>
      {children}
    </WalletContext.Provider>
  )
} 