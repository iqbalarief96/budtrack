'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
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

// Define wallet group type
export type WalletGroup = {
  id: string
  name: string
  description?: string | null
  icon?: string | null
  color?: string | null
  wallets?: { walletId: string; wallet: { id: string; name: string; balance: number; color?: string } }[]
}

// Define wallet type filter
export type WalletTypeFilter = 'ALL' | 'MAIN' | 'SAVINGS' | 'INVESTMENT'

// Define selection mode - either individual wallet or group
export type SelectionMode = 'wallet' | 'group'

// Dashboard scope: either an aggregate of a wallet TYPE, or one specific wallet.
export type DashboardScope =
  | { kind: 'type'; type: WalletTypeFilter }
  | { kind: 'wallet'; walletId: string }

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
  // Wallet group support
  selectedGroup: WalletGroup | null
  setSelectedGroup: (group: WalletGroup | null) => void
  // Enhanced group support
  selectionMode: SelectionMode
  isGroupSelected: boolean
  clearGroupSelection: () => void
  selectGroup: (group: WalletGroup) => void
  selectWallet: (wallet: Wallet) => void
  getSelectedWalletIds: () => string[]
  refreshGroups: () => Promise<void>
  walletGroups: WalletGroup[]
  isLoadingGroups: boolean
  // Dashboard scope (type aggregate vs single wallet). Default = last-used MAIN wallet.
  dashboardScope: DashboardScope | null
  viewWalletType: (type: WalletTypeFilter) => void
  viewWallet: (walletId: string) => void
  dashboardScopeWalletIds: string[]
  dashboardScopeLabel: string
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
  filteredWallets: [],
  // Wallet group defaults
  selectedGroup: null,
  setSelectedGroup: () => {},
  // Enhanced group support defaults
  selectionMode: 'wallet',
  isGroupSelected: false,
  clearGroupSelection: () => {},
  selectGroup: () => {},
  selectWallet: () => {},
  getSelectedWalletIds: () => [],
  refreshGroups: async () => {},
  walletGroups: [],
  isLoadingGroups: false,
  dashboardScope: null,
  viewWalletType: () => {},
  viewWallet: () => {},
  dashboardScopeWalletIds: [],
  dashboardScopeLabel: '',
})

// Custom hook to use the wallet context
export const useWallet = () => useContext(WalletContext)

// Key for localStorage
const LOCAL_STORAGE_KEY = 'selectedWalletId'
const WALLET_TYPE_FILTER_KEY = 'walletTypeFilter'
const SELECTED_GROUP_KEY = 'selectedWalletGroupId'
// Last individually-selected MAIN wallet — the dashboard's default landing scope.
const LAST_MAIN_WALLET_KEY = 'lastMainWalletId'

const isMainWallet = (w?: { type?: string } | null) => !!w && (w.type === 'MAIN' || !w.type)

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
  // Use React Query hook
  const { data: wallets = [], isLoading, refetch } = useWallets()
  
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null)
  const [walletTypeFilter, setWalletTypeFilterState] = useState<WalletTypeFilter>('ALL')
  const [selectedGroup, setSelectedGroupState] = useState<WalletGroup | null>(null)
  const [walletGroups, setWalletGroups] = useState<WalletGroup[]>([])
  const [isLoadingGroups, setIsLoadingGroups] = useState(false)
  const [dashboardScope, setDashboardScope] = useState<DashboardScope | null>(null)

  // Derived state for selection mode
  const selectionMode: SelectionMode = selectedGroup ? 'group' : 'wallet'
  const isGroupSelected = selectedGroup !== null

  // Fetch wallet groups
  const refreshGroups = useCallback(async () => {
    try {
      setIsLoadingGroups(true)
      const response = await fetch('/api/wallet-groups')
      if (response.ok) {
        const data = await response.json()
        setWalletGroups(Array.isArray(data) ? data : data.data || [])
      }
    } catch (error) {
      console.error('Error fetching wallet groups:', error)
    } finally {
      setIsLoadingGroups(false)
    }
  }, [])

  // Load wallet groups on mount
  useEffect(() => {
    refreshGroups()
  }, [refreshGroups])

  // Update selected wallet when wallets data changes
  useEffect(() => {
    if (wallets.length === 0) return

    // Check if a group was previously selected
    const persistedGroupId = localStorage.getItem(SELECTED_GROUP_KEY)
    if (persistedGroupId) {
      // Group selection is handled separately, just set a default wallet
      const defaultWallet = wallets.find((wallet) => wallet.isDefault) || wallets[0]
      if (defaultWallet) {
        setSelectedWallet(defaultWallet)
      }
      return
    }

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

  // Load persisted group on mount
  useEffect(() => {
    const persistedGroupId = localStorage.getItem(SELECTED_GROUP_KEY)
    console.log('[WalletProvider] Loading persisted group:', persistedGroupId)
    if (persistedGroupId) {
      // Fetch the group data
      fetch(`/api/wallet-groups/${persistedGroupId}`)
        .then(res => {
          if (res.ok) return res.json()
          throw new Error('Group not found')
        })
        .then(responseData => {
          // API returns { success: true, data: {...} } format
          const data = responseData.data || responseData
          console.log('[WalletProvider] Setting selectedGroup:', data)
          setSelectedGroupState(data)
        })
        .catch((error) => {
          console.error('[WalletProvider] Error loading group:', error)
          // Group no longer exists, clear the persisted value
          localStorage.removeItem(SELECTED_GROUP_KEY)
        })
    }
  }, [])
  
  // Function to set selected wallet and persist to localStorage. Picking a
  // specific wallet also scopes the dashboard to it and (for MAIN wallets)
  // records it as the default landing scope.
  const setSelectedWalletAndPersist = (wallet: Wallet) => {
    console.log('[DEBUG] Setting selected wallet:', wallet);
    setSelectedWallet(wallet);
    localStorage.setItem(LOCAL_STORAGE_KEY, wallet.id);
    setDashboardScope({ kind: 'wallet', walletId: wallet.id });
    if (isMainWallet(wallet)) localStorage.setItem(LAST_MAIN_WALLET_KEY, wallet.id);
  };

  // Scope the dashboard to a wallet TYPE (aggregate of all wallets of that type).
  const viewWalletType = (type: WalletTypeFilter) => {
    setDashboardScope({ kind: 'type', type });
    setWalletTypeFilterState(type);
    localStorage.setItem(WALLET_TYPE_FILTER_KEY, type);
  };

  // Scope the dashboard to one specific wallet (and keep selectedWallet in sync).
  const viewWallet = (walletId: string) => {
    const wallet = wallets.find((w) => w.id === walletId);
    if (wallet) setSelectedWalletAndPersist(wallet);
    else setDashboardScope({ kind: 'wallet', walletId });
  };

  // Function to set wallet type filter and persist
  const setWalletTypeFilter = (filter: WalletTypeFilter) => {
    setWalletTypeFilterState(filter);
    localStorage.setItem(WALLET_TYPE_FILTER_KEY, filter);
  };

  // Function to set selected group and persist
  const setSelectedGroup = useCallback((group: WalletGroup | null) => {
    setSelectedGroupState(group);
    if (group) {
      localStorage.setItem(SELECTED_GROUP_KEY, group.id);
      // Clear wallet selection when group is selected
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } else {
      localStorage.removeItem(SELECTED_GROUP_KEY);
    }
  }, []);

  // Enhanced group selection method
  const selectGroup = useCallback((group: WalletGroup) => {
    setSelectedGroupState(group);
    localStorage.setItem(SELECTED_GROUP_KEY, group.id);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }, []);

  // Enhanced wallet selection method (clears group)
  const selectWallet = useCallback((wallet: Wallet) => {
    setSelectedGroupState(null);
    setSelectedWallet(wallet);
    localStorage.setItem(LOCAL_STORAGE_KEY, wallet.id);
    localStorage.removeItem(SELECTED_GROUP_KEY);
    setDashboardScope({ kind: 'wallet', walletId: wallet.id });
    if (isMainWallet(wallet)) localStorage.setItem(LAST_MAIN_WALLET_KEY, wallet.id);
  }, []);

  // Clear group selection and revert to wallet
  const clearGroupSelection = useCallback(() => {
    setSelectedGroupState(null);
    localStorage.removeItem(SELECTED_GROUP_KEY);
    // Restore default wallet selection
    if (wallets.length > 0) {
      const defaultWallet = wallets.find((w) => w.isDefault) || wallets[0];
      if (defaultWallet) {
        setSelectedWallet(defaultWallet);
        localStorage.setItem(LOCAL_STORAGE_KEY, defaultWallet.id);
      }
    }
  }, [wallets]);

  // Get wallet IDs for current selection (single wallet or all wallets in group)
  const getSelectedWalletIds = useCallback((): string[] => {
    if (selectedGroup && selectedGroup.wallets) {
      return selectedGroup.wallets.map(m => m.walletId);
    }
    if (selectedWallet) {
      return [selectedWallet.id];
    }
    return [];
  }, [selectedGroup, selectedWallet]);

  // Filter wallets by type
  const filteredWallets = React.useMemo(() => {
    if (walletTypeFilter === 'ALL') return wallets;
    return wallets.filter(w => w.type === walletTypeFilter);
  }, [wallets, walletTypeFilter]);

  // Default dashboard scope (option B): land on the last-used MAIN wallet, even
  // if the most recent individual selection was a non-MAIN wallet.
  useEffect(() => {
    if (wallets.length === 0 || dashboardScope !== null) return;
    const mains = wallets.filter(isMainWallet);
    const lastMainId = localStorage.getItem(LAST_MAIN_WALLET_KEY);
    const target =
      (lastMainId && mains.find((w) => w.id === lastMainId)) ||
      mains.find((w) => w.isDefault) ||
      mains[0] ||
      wallets[0];
    if (target) setDashboardScope({ kind: 'wallet', walletId: target.id });
  }, [wallets, dashboardScope]);

  // Resolve the scope to a concrete set of wallet ids.
  const dashboardScopeWalletIds = React.useMemo((): string[] => {
    if (!dashboardScope) return selectedWallet ? [selectedWallet.id] : [];
    if (dashboardScope.kind === 'wallet') return [dashboardScope.walletId];
    if (dashboardScope.type === 'ALL') return wallets.map((w) => w.id);
    if (dashboardScope.type === 'MAIN') return wallets.filter(isMainWallet).map((w) => w.id);
    return wallets.filter((w) => w.type === dashboardScope.type).map((w) => w.id);
  }, [dashboardScope, wallets, selectedWallet]);

  const dashboardScopeLabel = React.useMemo((): string => {
    if (!dashboardScope) return selectedWallet?.name ?? '';
    if (dashboardScope.kind === 'wallet') {
      return wallets.find((w) => w.id === dashboardScope.walletId)?.name ?? 'Dompet';
    }
    const n = dashboardScopeWalletIds.length;
    switch (dashboardScope.type) {
      case 'ALL': return `Semua Dompet (${n})`;
      case 'MAIN': return `Dompet Utama (${n})`;
      case 'SAVINGS': return `Tabungan (${n})`;
      case 'INVESTMENT': return `Investasi (${n})`;
      default: return 'Dompet';
    }
  }, [dashboardScope, wallets, selectedWallet, dashboardScopeWalletIds]);

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
        selectedGroup,
        setSelectedGroup,
        // Enhanced group support
        selectionMode,
        isGroupSelected,
        clearGroupSelection,
        selectGroup,
        selectWallet,
        getSelectedWalletIds,
        refreshGroups,
        walletGroups,
        isLoadingGroups,
        dashboardScope,
        viewWalletType,
        viewWallet,
        dashboardScopeWalletIds,
        dashboardScopeLabel,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
} 