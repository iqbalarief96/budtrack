'use client'

import React, { useState, useEffect } from 'react'
import { FiCreditCard, FiChevronDown, FiUsers } from 'react-icons/fi'
import { useWallet } from '../providers/WalletProvider'

// Icon mapping for wallet groups
const GROUP_ICON_MAP: Record<string, string> = {
  users: '👥',
  heart: '💑',
  home: '🏠',
  briefcase: '💼',
  piggy: '🐷',
  star: '⭐',
}

// Wallet Group type
interface WalletGroup {
  id: string
  name: string
  description?: string | null
  icon?: string | null
  color?: string | null
  wallets?: { walletId: string; wallet: { id: string; name: string; balance: number; color?: string } }[]
}

// Define props interface to include displayBalance
interface WalletSelectorProps {
  displayBalance?: number; // Make it optional, it might not always be passed
}

const WalletSelector: React.FC<WalletSelectorProps> = ({ displayBalance }) => {
  const { 
    filteredWallets, 
    selectedWallet, 
    setSelectedWalletAndPersist,
    selectedGroup,
    setSelectedGroup,
  } = useWallet()
  const [isOpen, setIsOpen] = useState(false)
  const [walletGroups, setWalletGroups] = useState<WalletGroup[]>([])

  // Fetch wallet groups
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await fetch('/api/wallet-groups')
        if (response.ok) {
          const data = await response.json()
          setWalletGroups(Array.isArray(data) ? data : data.data || [])
        }
      } catch (error) {
        console.error('Error fetching wallet groups:', error)
      }
    }
    fetchGroups()
  }, [])

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  // Calculate total balance for a group
  const getGroupTotalBalance = (group: WalletGroup) => {
    if (!group.wallets) return 0
    return group.wallets.reduce((sum, member) => sum + (member.wallet?.balance || 0), 0)
  }

  // Function to determine the balance to display
  const getDisplayBalance = (wallet: typeof selectedWallet) => {
    if (!wallet) return 0
    // If displayBalance prop is provided and this is the selected wallet,
    // use the prop value (calculated balance from DashboardContent).
    if (displayBalance !== undefined && wallet.id === selectedWallet?.id) {
      return displayBalance;
    }
    // Otherwise, fall back to the wallet's stored balance.
    return wallet.balance;
  }

  // Handle group selection
  const handleGroupSelect = (group: WalletGroup) => {
    if (setSelectedGroup) {
      setSelectedGroup(group)
    }
    setIsOpen(false)
  }

  // Handle wallet selection (clears group selection)
  const handleWalletSelect = (wallet: typeof selectedWallet) => {
    if (!wallet) return
    if (setSelectedGroup) {
      setSelectedGroup(null)
    }
    setSelectedWalletAndPersist(wallet)
    setIsOpen(false)
  }

  // Determine what's currently selected (group or wallet)
  const isGroupSelected = selectedGroup !== null && selectedGroup !== undefined
  const currentSelection = isGroupSelected ? selectedGroup : selectedWallet

  if (!currentSelection) return null

  // Get display info based on selection type
  const getSelectionDisplay = () => {
    if (isGroupSelected && selectedGroup) {
      const groupIcon = selectedGroup.icon ? GROUP_ICON_MAP[selectedGroup.icon] || '📁' : '📁'
      return {
        name: selectedGroup.name,
        balance: getGroupTotalBalance(selectedGroup),
        color: selectedGroup.color || '#7B1FA2',
        icon: groupIcon,
        isGroup: true,
        walletCount: selectedGroup.wallets?.length || 0,
      }
    }
    if (selectedWallet) {
      return {
        name: selectedWallet.name,
        balance: getDisplayBalance(selectedWallet),
        color: selectedWallet.color || '#1976D2',
        icon: null,
        isGroup: false,
        walletCount: 0,
      }
    }
    return null
  }

  const display = getSelectionDisplay()
  if (!display) return null

  return (
    <div className="relative mb-6">
      <button
        className="flex items-center justify-between w-full p-3 bg-white/90 backdrop-blur-sm border rounded-lg shadow-sm hover:bg-white transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center">
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center mr-3"
            style={{ backgroundColor: display.color }}
          >
            {display.isGroup ? (
              <span className="text-lg">{display.icon}</span>
            ) : (
              <FiCreditCard className="text-white" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-black">{display.name}</p>
              {display.isGroup && (
                <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                  Group
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-black">
              {formatCurrency(display.balance)}
              {display.isGroup && (
                <span className="text-gray-500 font-normal ml-1">
                  ({display.walletCount} wallets)
                </span>
              )}
            </p>
          </div>
        </div>
        <FiChevronDown className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute mt-2 w-full bg-white border rounded-lg shadow-lg z-10 max-h-[400px] overflow-y-auto">
          {/* Wallet Groups Section */}
          {walletGroups.length > 0 && (
            <>
              <div className="px-4 py-2 bg-gray-50 border-b">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <FiUsers size={12} />
                  Wallet Groups
                </p>
              </div>
              <div className="py-1">
                {walletGroups.map((group) => {
                  const groupIcon = group.icon ? GROUP_ICON_MAP[group.icon] || '📁' : '📁'
                  const isSelected = isGroupSelected && selectedGroup?.id === group.id
                  return (
                    <button
                      key={`group-${group.id}`}
                      className={`flex items-center w-full px-4 py-3 text-left hover:bg-gray-50 ${
                        isSelected ? 'bg-purple-50' : ''
                      }`}
                      onClick={() => handleGroupSelect(group)}
                    >
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center mr-3"
                        style={{ backgroundColor: group.color || '#7B1FA2' }}
                      >
                        <span className="text-sm">{groupIcon}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`font-medium text-black ${isSelected ? 'text-purple-600' : ''}`}>
                            {group.name}
                          </p>
                          <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                            {group.wallets?.length || 0}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-black">
                          {formatCurrency(getGroupTotalBalance(group))}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {/* Individual Wallets Section */}
          <div className="px-4 py-2 bg-gray-50 border-b border-t">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
              <FiCreditCard size={12} />
              Individual Wallets
            </p>
          </div>
          <div className="py-1">
            {filteredWallets.map((wallet) => {
              const isSelected = !isGroupSelected && wallet.id === selectedWallet?.id
              return (
                <button
                  key={wallet.id}
                  className={`flex items-center w-full px-4 py-3 text-left hover:bg-gray-50 ${
                    isSelected ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleWalletSelect(wallet)}
                >
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center mr-3"
                    style={{ backgroundColor: wallet.color || '#1976D2' }}
                  >
                    <FiCreditCard className="text-white" size={14} />
                  </div>
                  <div>
                    <p className={`font-medium text-black ${isSelected ? 'text-blue-600' : ''}`}>
                      {wallet.name}
                    </p>
                    <p className="text-sm font-medium text-black">{formatCurrency(getDisplayBalance(wallet))}</p>
                  </div>
                </button>
              )
            })}
          </div>
          
          <div className="border-t px-4 py-2 space-y-2">
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
            <button 
              className="w-full text-left text-sm text-purple-600 hover:underline flex items-center gap-1"
              onClick={() => {
                window.location.href = '/wallets?createGroup=true'
                setIsOpen(false)
              }}
            >
              <FiUsers size={12} />
              + Buat Wallet Group
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default WalletSelector 