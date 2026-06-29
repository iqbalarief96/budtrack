'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  FiPlusCircle, FiTrash, FiEdit, FiX, FiShoppingBag, FiCoffee, FiHome, FiDollarSign,
  FiCreditCard as FiCreditCardIcon, FiGift, FiHeart, FiSmile, FiTruck, FiBookmark,
  FiShoppingCart, FiMusic, FiMonitor, FiActivity, FiArrowRight, FiUsers
} from 'react-icons/fi'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { useWallet } from '../providers/WalletProvider'
import { formatCurrency } from '../lib/utils'
import { EmergencyFundCard } from '@/components/dashboard/EmergencyFundCard'
import WalletSavingsDetail from '@/app/components/wallet/WalletSavingsDetail'
import { WalletTypeTabs } from '@/components/WalletTypeTabs'
import { MigrateWalletTypesButton } from '@/components/MigrateWalletTypesButton'
import WalletGroupForm from '@/components/wallet-group/WalletGroupForm'
import WalletGroupCard from '@/components/wallet-group/WalletGroupCard'

// Define Icon mapping
const AVAILABLE_ICONS = [
  { name: 'FiCreditCard', component: FiCreditCardIcon },
  { name: 'FiDollarSign', component: FiDollarSign },
  { name: 'FiShoppingBag', component: FiShoppingBag },
  { name: 'FiCoffee', component: FiCoffee },
  { name: 'FiHome', component: FiHome },
  { name: 'FiGift', component: FiGift },
  { name: 'FiHeart', component: FiHeart },
  { name: 'FiSmile', component: FiSmile },
  { name: 'FiActivity', component: FiActivity },
  { name: 'FiBookmark', component: FiBookmark },
  { name: 'FiMusic', component: FiMusic },
  { name: 'FiMonitor', component: FiMonitor },
  { name: 'FiShoppingCart', component: FiShoppingCart }
]

type BudgetSummary = {
  id: string
  name: string
  amount: number
  spent: number
  percentage: number
  walletId: string
  category?: {
    name: string
  }
}

type WalletEmergencyFundSummary = {
  walletId: string
  walletName: string
  currentAmount: number
  walletBalance: number
  targetRemaining: number
  percentageOfTarget: number
  totalSavings: number
  savingsByType: Record<string, number>
  currencyCode?: string
}

type EmergencyFundResponse = {
  targetAmount: number
  currentAmount: number
  monthlyContribution: number
  isActive: boolean
  totalSavings: number
  savingsByType: Record<string, number>
  walletBreakdown?: WalletEmergencyFundSummary[]
}

// Define Wallet type
type Wallet = {
  id: string
  name: string
  balance: number
  icon?: string
  color?: string
  isDefault: boolean
  currencyCode: string
}

// Wallet Group type
type WalletGroup = {
  id: string
  name: string
  description?: string | null
  icon?: string | null
  color?: string | null
  wallets: { walletId: string; wallet: { id: string; name: string; balance: number } }[]
}

const WalletsPage = () => {
  const { wallets, filteredWallets, isLoading, refreshWallets } = useWallet()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    color: '#1976D2',
    isDefault: false,
    icon: 'FiCreditCard'
  })
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [budgets, setBudgets] = useState<BudgetSummary[]>([])
  const [isBudgetsLoading, setIsBudgetsLoading] = useState(false)
  const [budgetsError, setBudgetsError] = useState<string | null>(null)
  const [emergencyFundData, setEmergencyFundData] = useState<EmergencyFundResponse | null>(null)
  const [isEmergencyFundLoading, setIsEmergencyFundLoading] = useState(false)
  const [emergencyFundError, setEmergencyFundError] = useState<string | null>(null)
  const [walletEmergencyData, setWalletEmergencyData] = useState<Record<string, EmergencyFundResponse>>({})
  
  // Wallet Group states
  const [walletGroups, setWalletGroups] = useState<WalletGroup[]>([])
  const [isGroupFormOpen, setIsGroupFormOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<WalletGroup | null>(null)
  const [isLoadingGroups, setIsLoadingGroups] = useState(false)
  const [walletEmergencyLoading, setWalletEmergencyLoading] = useState(false)
  const [walletEmergencyErrors, setWalletEmergencyErrors] = useState<Record<string, string>>({})

  // Calculate total balance (use filteredWallets for display)
  const totalBalance = useMemo(
    () => filteredWallets.reduce((sum, wallet) => sum + wallet.balance, 0),
    [filteredWallets]
  )

  const walletCount = filteredWallets.length
  const largestWallet = useMemo(
    () => filteredWallets.slice().sort((a, b) => b.balance - a.balance)[0] || null,
    [filteredWallets]
  )

  const averageBalance = useMemo(() => {
    if (!filteredWallets.length) return 0
    return totalBalance / filteredWallets.length
  }, [totalBalance, filteredWallets.length])

  const defaultWallet = useMemo(
    () => filteredWallets.find((wallet) => wallet.isDefault) || null,
    [filteredWallets]
  )

  const negativeWallets = useMemo(
    () => filteredWallets.filter((wallet) => wallet.balance < 0),
    [filteredWallets]
  )

  const positiveTotalBalance = useMemo(
    () => filteredWallets.reduce((sum, wallet) => sum + Math.max(wallet.balance, 0), 0),
    [filteredWallets]
  )

  const walletShares = useMemo(() => {
    return filteredWallets
      .filter((wallet) => wallet.balance > 0)
      .map((wallet) => ({
        id: wallet.id,
        name: wallet.name,
        balance: wallet.balance,
        percentage: positiveTotalBalance > 0 ? Math.round((wallet.balance / positiveTotalBalance) * 100) : 0,
        color: wallet.color,
        currencyCode: wallet.currencyCode
      }))
  }, [filteredWallets, positiveTotalBalance])

  const totalNegativeBalance = useMemo(
    () => negativeWallets.reduce((sum, wallet) => sum + Math.abs(wallet.balance), 0),
    [negativeWallets]
  )

  const largestNegativeWallet = useMemo(
    () => negativeWallets.slice().sort((a, b) => a.balance - b.balance)[0] || null,
    [negativeWallets]
  )

  const walletScopeLabel = filteredWallets.length === wallets.length ? 'Semua dompet aktif' : `${filteredWallets.length} dompet terfilter`;

  const emergencyTargetAmount = emergencyFundData?.targetAmount ?? 0
  const emergencyCurrentAmount = emergencyFundData?.currentAmount ?? 0
  const emergencyRemainingAmount = Math.max(0, emergencyTargetAmount - emergencyCurrentAmount)
  const emergencyProgress =
    emergencyTargetAmount > 0
      ? Math.min(100, Math.round((emergencyCurrentAmount / emergencyTargetAmount) * 100))
      : 0
  const emergencySavingsEntries = Object.entries(emergencyFundData?.savingsByType ?? {})
    .filter(([, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
  const totalEmergencyCategories = emergencyFundData ? Object.keys(emergencyFundData.savingsByType ?? {}).length : 0
  const emergencyExtraCount = Math.max(0, totalEmergencyCategories - emergencySavingsEntries.length)
  const showEmergencyOverview =
    Boolean(emergencyFundData?.isActive && emergencyTargetAmount > 0 && emergencyCurrentAmount >= 0)

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      color: '#1976D2',
      isDefault: false,
      icon: 'FiCreditCard'
    })
    setEditingWallet(null)
    setError('')
  }

  // Handle edit wallet
  const handleEditWallet = (wallet: Wallet) => {
    setEditingWallet(wallet)
    setFormData({
      name: wallet.name,
      color: wallet.color || '#1976D2',
      isDefault: wallet.isDefault,
      icon: wallet.icon || 'FiCreditCard'
    })
    setIsAddModalOpen(true)
  }

  // Handle delete wallet
  const handleDeleteWallet = async (id: string, force = false) => {
    try {
      const response = await fetch(`/api/wallets?id=${id}${force ? '&force=true' : ''}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()

        // If wallet has transactions, offer force delete option
        if (data.transactionCount && !force) {
          const forceDelete = confirm(
            `Dompet ini memiliki ${data.transactionCount} transaksi.\n\n` +
            `Klik OK untuk HAPUS PAKSA (dompet + semua transaksi)\n` +
            `Klik Cancel untuk batal\n\n` +
            `⚠️ PERHATIAN: Ini akan menghapus semua data transaksi!`
          )

          if (forceDelete) {
            // Retry with force=true
            return handleDeleteWallet(id, true)
          }
          return
        }

        throw new Error(data.error || 'Failed to delete wallet')
      }

      const result = await response.json()
      await refreshWallets()

      if (result.deletedTransactions > 0) {
        alert(`Dompet dan ${result.deletedTransactions} transaksi berhasil dihapus!`)
      } else {
        alert('Dompet berhasil dihapus!')
      }
    } catch (err) {
      console.error('Error deleting wallet:', err)
      alert('Gagal menghapus dompet. Silakan coba lagi.')
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSaving(true)

    try {
      const response = await fetch('/api/wallets' + (editingWallet ? `?id=${editingWallet.id}` : ''), {
        method: editingWallet ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          id: editingWallet?.id
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || `Failed to ${editingWallet ? 'update' : 'create'} wallet`)
      }

      await refreshWallets()
      setIsAddModalOpen(false)
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${editingWallet ? 'update' : 'create'} wallet`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCloseModal = () => {
    setIsAddModalOpen(false)
    resetForm()
  }

  // Get the icon component for a wallet
  const getWalletIcon = (iconName: string = 'FiCreditCard') => {
    const icon = AVAILABLE_ICONS.find(i => i.name === iconName);
    const IconComponent = icon?.component || FiCreditCardIcon;
    return IconComponent;
  }

  // Fetch wallet groups
  const fetchWalletGroups = async () => {
    try {
      setIsLoadingGroups(true)
      const response = await fetch('/api/wallet-groups')
      if (response.ok) {
        const data = await response.json()
        const groups = Array.isArray(data) ? data : data.data || []
        setWalletGroups(groups)
      }
    } catch (error) {
      console.error('Error fetching wallet groups:', error)
    } finally {
      setIsLoadingGroups(false)
    }
  }

  // Handle createGroup query param
  useEffect(() => {
    if (searchParams.get('createGroup') === 'true') {
      setIsGroupFormOpen(true)
      // Clear the query param
      router.replace('/wallets', { scroll: false })
    }
  }, [searchParams, router])

  // Fetch wallet groups on mount
  useEffect(() => {
    fetchWalletGroups()
  }, [])

  // Handle wallet group form submit
  const handleGroupSubmit = async (data: {
    name: string
    description?: string
    icon?: string
    color?: string
    walletIds: string[]
  }) => {
    const url = editingGroup ? `/api/wallet-groups/${editingGroup.id}` : '/api/wallet-groups'
    const method = editingGroup ? 'PUT' : 'POST'
    
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to save wallet group')
    }
    
    await fetchWalletGroups()
    setIsGroupFormOpen(false)
    setEditingGroup(null)
  }

  // Handle wallet group delete
  const handleGroupDelete = async (groupId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus wallet group ini?')) return
    
    try {
      const response = await fetch(`/api/wallet-groups/${groupId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete wallet group')
      }
      
      await fetchWalletGroups()
    } catch (error) {
      console.error('Error deleting wallet group:', error)
      alert('Gagal menghapus wallet group')
    }
  }

  // Handle wallet group edit
  const handleGroupEdit = (group: WalletGroup) => {
    setEditingGroup(group)
    setIsGroupFormOpen(true)
  }

  useEffect(() => {
    const controller = new AbortController()

    const fetchBudgets = async () => {
      setIsBudgetsLoading(true)
      setBudgetsError(null)
      try {
        const response = await fetch('/api/budgets', { signal: controller.signal })
        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw new Error(data.error || 'Failed to fetch budgets')
        }
        const json = await response.json()
        const budgetsData = Array.isArray(json) ? json : (json.data || [])
        if (!controller.signal.aborted) {
          setBudgets(budgetsData)
        }
      } catch (err) {
        if (controller.signal.aborted) return
        console.error('Error fetching budgets:', err)
        setBudgetsError(err instanceof Error ? err.message : 'Gagal memuat anggaran')
      } finally {
        if (!controller.signal.aborted) {
          setIsBudgetsLoading(false)
        }
      }
    }

    fetchBudgets()

    return () => {
      controller.abort()
    }
  }, [wallets])

  useEffect(() => {
    const controller = new AbortController()

    const fetchEmergencyFund = async () => {
      setIsEmergencyFundLoading(true)
      setEmergencyFundError(null)
      try {
        const response = await fetch('/api/emergency-fund', { signal: controller.signal })
        const data: EmergencyFundResponse = await response.json()

        if (!response.ok) {
          throw new Error((data as any)?.error || 'Failed to fetch emergency fund data')
        }

        if (!controller.signal.aborted) {
          setEmergencyFundData(data)
        }
      } catch (err) {
        if (controller.signal.aborted) return
        console.error('Error fetching emergency fund data:', err)
        setEmergencyFundError(err instanceof Error ? err.message : 'Gagal memuat data dana darurat')
      } finally {
        if (!controller.signal.aborted) {
          setIsEmergencyFundLoading(false)
        }
      }
    }

    fetchEmergencyFund()

    return () => {
      controller.abort()
    }
  }, [wallets.length])

  useEffect(() => {
    if (!wallets.length) {
      setWalletEmergencyData({})
      setWalletEmergencyErrors({})
      setWalletEmergencyLoading(false)
      return
    }

    const controller = new AbortController()

    const fetchWalletEmergency = async () => {
      setWalletEmergencyLoading(true)
      setWalletEmergencyErrors({})
      try {
        const results = await Promise.all(
          wallets.map(async (wallet) => {
            try {
              const response = await fetch(`/api/emergency-fund?walletId=${wallet.id}`, {
                signal: controller.signal,
              })
              if (!response.ok) {
                const data = await response.json().catch(() => ({}))
                throw new Error((data as any).error || 'Failed to fetch emergency fund data')
              }
              const data: EmergencyFundResponse = await response.json()
              return { id: wallet.id, data }
            } catch (err) {
              if (controller.signal.aborted) return null
              console.error(`Error fetching emergency fund for wallet ${wallet.id}:`, err)
              return { id: wallet.id, error: err instanceof Error ? err.message : 'Unknown error' }
            }
          })
        )

        if (controller.signal.aborted) return

        const dataMap: Record<string, EmergencyFundResponse> = {}
        const errorMap: Record<string, string> = {}

        for (const result of results) {
          if (!result) continue
          if ('data' in result) {
            dataMap[result.id] = result.data
          } else if ('error' in result) {
            errorMap[result.id] = result.error
          }
        }

        setWalletEmergencyData(dataMap)
        setWalletEmergencyErrors(errorMap)
      } finally {
        if (!controller.signal.aborted) {
          setWalletEmergencyLoading(false)
        }
      }
    }

    fetchWalletEmergency()

    return () => {
      controller.abort()
    }
  }, [wallets])

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dompet</h1>
        <button
          className="btn btn-primary flex items-center gap-1"
          onClick={() => setIsAddModalOpen(true)}
        >
          <FiPlusCircle />
          <span>Tambah Dompet</span>
        </button>
      </div>

      {/* Total Balance */}
      <div className="card">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-medium text-gray-700">Total Saldo</h2>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">{walletScopeLabel}</span>
        </div>
        <p className="text-3xl font-bold">{formatCurrency(totalBalance)}</p>
        {totalNegativeBalance > 0 && (
          <p className="mt-1 text-xs text-red-500">
            Termasuk saldo negatif {formatCurrency(totalNegativeBalance)} dari {negativeWallets.length} dompet
          </p>
        )}
      </div>

      {/* Quick stats */}
      {walletCount > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card">
            <p className="text-sm text-gray-500 mb-1">Jumlah Dompet</p>
            <p className="text-2xl font-semibold">{walletCount}</p>
            {defaultWallet && (
              <p className="text-xs text-gray-500 mt-1">
                Default: <span className="font-medium text-gray-700">{defaultWallet.name}</span>
              </p>
            )}
          </div>
          <div className="card">
            <p className="text-sm text-gray-500 mb-1">Dompet Terbesar</p>
            {largestWallet ? (
              <>
                <p className="text-lg font-semibold">{largestWallet.name}</p>
                <p className="text-sm text-gray-500">
                  {formatCurrency(largestWallet.balance, largestWallet.currencyCode)}
                </p>
              </>
            ) : (
              <p className="text-base text-gray-400">Belum ada dompet</p>
            )}
          </div>
          <div className="card">
            <p className="text-sm text-gray-500 mb-1">Saldo Rata-rata</p>
            <p className="text-lg font-semibold">{formatCurrency(averageBalance)}</p>
            <p className="text-xs text-gray-500 mt-1">
              Menggunakan semua dompet aktif
            </p>
          </div>
        </div>
      )}

      {/* Emergency fund & balance distribution */}
      <div className={`grid grid-cols-1 gap-4 ${showEmergencyOverview ? 'lg:grid-cols-2' : ''}`}>
        {showEmergencyOverview && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-700">Dana Darurat</h2>
              {isEmergencyFundLoading && <span className="text-xs text-gray-400">memuat…</span>}
            </div>

            {emergencyFundError ? (
              <p className="text-sm text-red-500">{emergencyFundError}</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-2xl font-semibold">{formatCurrency(emergencyCurrentAmount)}</p>
                  <p className="text-xs text-gray-500">
                    dari target {formatCurrency(emergencyTargetAmount)}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Progress</span>
                    <span>{emergencyProgress}%</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-blue-500 transition-all"
                      style={{ width: `${emergencyProgress}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Sisa target {formatCurrency(emergencyRemainingAmount)}
                  </p>
                </div>

                {emergencySavingsEntries.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Tabungan Teratas
                    </p>
                    <div className="space-y-1">
                      {emergencySavingsEntries.map(([label, amount]) => (
                        <div key={label} className="flex justify-between text-xs text-gray-600">
                          <span>{label}</span>
                          <span>{formatCurrency(amount)}</span>
                        </div>
                      ))}
                      {emergencyExtraCount > 0 && (
                        <p className="text-[11px] text-gray-400">
                          +{emergencyExtraCount} kategori tabungan lainnya
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {(walletShares.length > 0 || negativeWallets.length > 0) && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-700">Distribusi Saldo</h2>
              <span className="text-xs text-gray-400">Saldo positif saja</span>
            </div>
            <div className="space-y-4">
              {walletShares.map((walletShare) => (
                <div key={walletShare.id} className="space-y-1">
                  <div className="flex justify-between text-sm font-medium text-gray-700">
                    <span>{walletShare.name}</span>
                    <span>{walletShare.percentage}%</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min(walletShare.percentage, 100)}%`,
                        backgroundColor: walletShare.color || '#2563EB'
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    {formatCurrency(walletShare.balance, walletShare.currencyCode)}
                  </p>
                </div>
              ))}

              {negativeWallets.length > 0 && (
                <div className="rounded-2xl border border-red-100 bg-red-50 p-3">
                  <p className="text-sm font-semibold text-red-700">Saldo negatif perlu diberesin</p>
                  <p className="mt-1 text-xs text-red-600">
                    {largestNegativeWallet?.name} lagi negatif {largestNegativeWallet ? formatCurrency(Math.abs(largestNegativeWallet.balance), largestNegativeWallet.currencyCode) : ''}. Total owed {formatCurrency(totalNegativeBalance)}.
                  </p>
                  <button type="button" onClick={() => router.push('/transactions')} className="mt-3 text-xs font-medium text-red-700 underline underline-offset-2">
                    Cek transaksi penyebabnya
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Budgets fetch error */}
      {budgetsError && (
        <div className="card border border-red-100 bg-red-50 text-red-700">
          <p className="text-sm font-medium">Gagal memuat data anggaran</p>
          <p className="text-xs mt-1">{budgetsError}</p>
        </div>
      )}

      {/* Migration Button */}
      <MigrateWalletTypesButton />

      {/* Wallet Type Tabs */}
      <WalletTypeTabs />

      {/* Wallet Groups Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FiUsers className="text-purple-600" />
            Wallet Groups
          </h2>
          <button
            className="btn btn-outline flex items-center gap-1 text-purple-600 border-purple-600 hover:bg-purple-50"
            onClick={() => setIsGroupFormOpen(true)}
          >
            <FiPlusCircle />
            <span>Buat Group</span>
          </button>
        </div>
        
        {isLoadingGroups ? (
          <div className="text-sm text-gray-500">Memuat wallet groups...</div>
        ) : walletGroups.length === 0 ? (
          <div className="card bg-purple-50 border border-purple-100">
            <p className="text-sm text-purple-700">
              Belum ada wallet group. Buat wallet group untuk menggabungkan beberapa dompet dan melihat laporan gabungan.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {walletGroups.map((group) => (
              <WalletGroupCard
                key={group.id}
                group={group}
                onEdit={() => handleGroupEdit(group)}
                onDelete={() => handleGroupDelete(group.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Wallets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredWallets.map((wallet) => {
          const WalletIcon = getWalletIcon(wallet.icon);
          const walletBudgets = budgets.filter((budget) => budget.walletId === wallet.id);
          const displayedBudgets = walletBudgets.slice(0, 3);
          const hasMoreBudgets = walletBudgets.length > displayedBudgets.length;
          return (
            <div key={wallet.id} className="space-y-4">
              <div className="card">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center flex-1">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center mr-3"
                      style={{ backgroundColor: wallet.color || '#1976D2' }}
                    >
                      <WalletIcon className="text-white text-xl" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">{wallet.name}</h3>
                        <Link
                          href={`/wallets/${wallet.id}`}
                          className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100"
                          title="View wallet details"
                        >
                          <FiArrowRight size={16} />
                        </Link>
                      </div>
                      {wallet.isDefault && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Default</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100"
                      onClick={() => handleEditWallet(wallet)}
                    >
                      <FiEdit size={16} />
                    </button>
                    <button
                      className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-gray-100"
                      onClick={() => handleDeleteWallet(wallet.id)}
                      disabled={wallet.isDefault}
                      title={wallet.isDefault ? 'Dompet default tidak dapat dihapus' : ''}
                    >
                      <FiTrash size={16} />
                    </button>
                  </div>
                </div>
                <div className="border-t pt-3">
                  <p className="text-gray-500 text-sm">Saldo</p>
                  <p className="text-xl font-bold">{formatCurrency(wallet.balance, wallet.currencyCode)}</p>
                </div>

                <div className="mt-4 border-t pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-700">Anggaran Aktif</p>
                    {isBudgetsLoading && (
                      <span className="text-xs text-gray-400">memuat…</span>
                    )}
                  </div>
                  {displayedBudgets.length === 0 && !isBudgetsLoading ? (
                    <p className="text-xs text-gray-500">
                      Belum ada anggaran yang dikaitkan dengan dompet ini.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {displayedBudgets.map((budget) => (
                        <div key={budget.id} className="space-y-1">
                          <div className="flex justify-between text-xs font-medium text-gray-600">
                            <span>{budget.name}</span>
                            <span>{budget.percentage}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-1.5 rounded-full bg-blue-500 transition-all"
                              style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                            />
                          </div>
                          <p className="text-[11px] text-gray-500">
                            {formatCurrency(budget.spent)} dari {formatCurrency(budget.amount)}
                            {budget.category?.name ? ` • ${budget.category.name}` : ''}
                          </p>
                        </div>
                      ))}
                      {hasMoreBudgets && (
                        <p className="text-[11px] text-blue-600">
                          +{walletBudgets.length - displayedBudgets.length} anggaran lainnya
                        </p>
                      )}
                    </div>
                  )}
                </div>

              </div>

              <EmergencyFundCard
                walletId={wallet.id}
                className="shadow-none border border-gray-200 bg-white"
              />

              <div className="card">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Detail Tabungan</h3>
                <WalletSavingsDetail
                  walletId={wallet.id}
                  timeRange="all_time"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit Wallet Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <FiX size={24} />
            </button>

            <h2 className="text-xl font-bold mb-6">
              {editingWallet ? 'Edit Dompet' : 'Tambah Dompet Baru'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Wallet Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Dompet
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Contoh: Dompet Utama"
                  required
                />
              </div>

              {/* Wallet Icon */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ikon
                </label>
                <div className="mb-2 p-3 border rounded-lg flex items-center">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center mr-3"
                    style={{ backgroundColor: formData.color }}
                  >
                    {React.createElement(getWalletIcon(formData.icon), { className: "text-white text-xl" })}
                  </div>
                  <span className="text-gray-600 text-sm">Ikon terpilih</span>
                </div>
                <div className="grid grid-cols-6 gap-2 max-h-40 overflow-y-auto p-2 border rounded-lg">
                  {AVAILABLE_ICONS.map((icon) => {
                    const IconComponent = icon.component;
                    return (
                      <button
                        key={icon.name}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon: icon.name })}
                        className={`w-full aspect-square flex items-center justify-center rounded-lg border ${formData.icon === icon.name
                            ? 'bg-blue-50 border-blue-500'
                            : 'hover:bg-gray-50'
                          }`}
                      >
                        <IconComponent className="text-lg" style={{ color: formData.color }} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Wallet Color */}
              <div>
                <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-1">
                  Warna
                </label>
                <input
                  type="color"
                  id="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-full h-10 p-1 rounded-lg border"
                />
              </div>

              {/* Is Default */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={editingWallet?.isDefault}
                />
                <label htmlFor="isDefault" className="ml-2 block text-sm text-gray-700">
                  Jadikan dompet default
                </label>
              </div>

              {error && (
                <div className="text-red-500 text-sm">{error}</div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  disabled={isSaving}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  disabled={isSaving}
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Wallet Group Form Modal */}
      {isGroupFormOpen && (
        <WalletGroupForm
          group={editingGroup || undefined}
          onSubmit={handleGroupSubmit}
          onClose={() => {
            setIsGroupFormOpen(false)
            setEditingGroup(null)
          }}
        />
      )}
    </div>
  )
}

export default WalletsPage 
