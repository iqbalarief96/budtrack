'use client'

import React, { useState } from 'react'
import { FiCreditCard, FiChevronDown } from 'react-icons/fi'
import { useWallet } from '../providers/WalletProvider'

const WalletSelector = () => {
  const { wallets, selectedWallet, setSelectedWallet } = useWallet()
  const [isOpen, setIsOpen] = useState(false)

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  if (!selectedWallet) return null

  return (
    <div className="relative mb-6">
      <button
        className="flex items-center justify-between w-full p-3 bg-white/90 backdrop-blur-sm border rounded-lg shadow-sm hover:bg-white transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center">
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center mr-3"
            style={{ backgroundColor: selectedWallet.color || '#1976D2' }}
          >
            <FiCreditCard className="text-white" />
          </div>
          <div>
            <p className="font-medium text-black">{selectedWallet.name}</p>
            <p className="text-sm font-medium text-black">{formatCurrency(selectedWallet.balance)}</p>
          </div>
        </div>
        <FiChevronDown className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute mt-2 w-full bg-white border rounded-lg shadow-lg z-10">
          <div className="py-1">
            {wallets.map((wallet) => (
              <button
                key={wallet.id}
                className={`flex items-center w-full px-4 py-3 text-left hover:bg-gray-50 ${
                  wallet.id === selectedWallet.id ? 'bg-blue-50' : ''
                }`}
                onClick={() => {
                  setSelectedWallet(wallet)
                  setIsOpen(false)
                }}
              >
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center mr-3"
                  style={{ backgroundColor: wallet.color || '#1976D2' }}
                >
                  <FiCreditCard className="text-white" size={14} />
                </div>
                <div>
                  <p className={`font-medium text-black ${wallet.id === selectedWallet.id ? 'text-blue-600' : ''}`}>
                    {wallet.name}
                  </p>
                  <p className="text-sm font-medium text-black">{formatCurrency(wallet.balance)}</p>
                </div>
              </button>
            ))}
          </div>
          
          <div className="border-t px-4 py-2">
            <button 
              className="w-full text-left text-sm text-blue-600 hover:underline"
              onClick={() => {
                // Handle adding new wallet (in real app would open a form)
                console.log('Add new wallet')
                setIsOpen(false)
              }}
            >
              + Tambah Dompet Baru
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default WalletSelector 