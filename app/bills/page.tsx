'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { FiPlus, FiFilter, FiDownload, FiAlertCircle, FiCheckCircle } from 'react-icons/fi'
import { Bill, BillStatus, BILL_STATUS_CONFIG } from '@/app/types/bill'
import BillCard from '@/components/bills/BillCard'
import BillForm from '@/components/bills/BillForm'
import BillStatsCard from '@/components/bills/BillStatsCard'
import BillImportModal from '@/components/bills/BillImportModal'
import WalletSelector from '@/app/components/WalletSelector'
import { useWallet } from '@/app/providers/WalletProvider'

// Aggregated bill type for group view
interface AggregatedBill extends Bill {
  walletName?: string;
  walletColor?: string;
}

export default function BillsPage() {
  const { data: session, status } = useSession()
  const { selectedWallet, selectedGroup, isGroupSelected } = useWallet()
  const [bills, setBills] = useState<Bill[]>([])
  const [groupBills, setGroupBills] = useState<AggregatedBill[]>([])
  const [loading, setLoading] = useState(true)
  const [isLoadingGroupBills, setIsLoadingGroupBills] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editingBill, setEditingBill] = useState<Bill | null>(null)
  const [statusFilter, setStatusFilter] = useState<BillStatus | 'ALL'>('ALL')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/signin')
    }
  }, [status])

  useEffect(() => {
    if (session?.user?.id && !isGroupSelected) {
      fetchBills()
      fetchCategories()
    }
  }, [session?.user?.id, statusFilter, categoryFilter, selectedWallet, isGroupSelected])

  // Fetch group bills when a group is selected
  useEffect(() => {
    const fetchGroupBills = async () => {
      if (!isGroupSelected || !selectedGroup) {
        setGroupBills([])
        return
      }

      try {
        setIsLoadingGroupBills(true)
        const response = await fetch(`/api/wallet-groups/${selectedGroup.id}/bills`)
        if (response.ok) {
          const responseData = await response.json()
          // API returns { success: true, data: {...} } format
          const data = responseData.data || responseData
          setGroupBills(data.bills || data || [])
        }
      } catch (error) {
        console.error('Error fetching group bills:', error)
      } finally {
        setIsLoadingGroupBills(false)
      }
    }

    fetchGroupBills()
  }, [isGroupSelected, selectedGroup])

  const fetchBills = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      
      if (statusFilter !== 'ALL') {
        params.append('status', statusFilter)
      }
      if (categoryFilter !== 'ALL') {
        params.append('categoryId', categoryFilter)
      }
      if (selectedWallet) {
        params.append('walletId', selectedWallet.id)
      }

      const response = await fetch(`/api/bills?${params.toString()}`)
      const data = await response.json()
      
      if (response.ok) {
        setBills(data.bills)
      }
    } catch (error) {
      console.error('Error fetching bills:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      const result = await response.json()
      if (response.ok) {
        // Handle both wrapped response { data: [...] } and direct array response
        const categoriesData = Array.isArray(result) ? result : (result.data || [])
        setCategories(categoriesData)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const handleCreateBill = async (billData: any) => {
    try {
      const response = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(billData),
      })

      if (response.ok) {
        setShowForm(false)
        fetchBills()
      }
    } catch (error) {
      console.error('Error creating bill:', error)
    }
  }

  const handleUpdateBill = async (billData: any) => {
    if (!editingBill) return

    try {
      const response = await fetch(`/api/bills/${editingBill.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(billData),
      })

      if (response.ok) {
        setEditingBill(null)
        fetchBills()
      }
    } catch (error) {
      console.error('Error updating bill:', error)
    }
  }

  const handleDeleteBill = async (billId: string) => {
    if (!confirm('Are you sure you want to delete this bill?')) return

    try {
      const response = await fetch(`/api/bills/${billId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchBills()
      }
    } catch (error) {
      console.error('Error deleting bill:', error)
    }
  }

  const handleMarkAsPaid = async (billId: string) => {
    try {
      const response = await fetch(`/api/bills/${billId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (response.ok) {
        fetchBills()
      }
    } catch (error) {
      console.error('Error marking bill as paid:', error)
    }
  }

  const handleImportComplete = () => {
    setShowImport(false)
    fetchBills()
  }

  if (status === 'loading' || loading || isLoadingGroupBills) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Use group bills when group is selected, otherwise use regular bills
  const displayBills = isGroupSelected ? groupBills : bills

  const statusCounts = {
    UPCOMING: displayBills.filter(b => b.status === 'UPCOMING').length,
    DUE_SOON: displayBills.filter(b => b.status === 'DUE_SOON').length,
    OVERDUE: displayBills.filter(b => b.status === 'OVERDUE').length,
    PAID: displayBills.filter(b => b.status === 'PAID').length,
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bill Reminders</h1>
          <p className="text-gray-600">Track and manage your upcoming bills</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <FiDownload size={18} />
            Import from Recurring
          </button>
          {!isGroupSelected && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <FiPlus size={18} />
              Add Bill
            </button>
          )}
        </div>
      </div>

      {/* Wallet/Group Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <WalletSelector />
        {isGroupSelected && selectedGroup && (
          <div className="flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
            <span>Group: {selectedGroup.name}</span>
            <span className="bg-purple-200 px-2 py-0.5 rounded-full text-xs">
              {selectedGroup.wallets?.length || 0} wallets
            </span>
          </div>
        )}
      </div>

      {/* Stats Card */}
      <BillStatsCard />

      {/* Status Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {(Object.keys(BILL_STATUS_CONFIG) as BillStatus[]).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(statusFilter === status ? 'ALL' : status)}
            className={`p-4 rounded-lg border-2 transition-all ${
              statusFilter === status
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className={`text-2xl font-bold ${BILL_STATUS_CONFIG[status].color}`}>
              {statusCounts[status]}
            </div>
            <div className="text-sm text-gray-600">{BILL_STATUS_CONFIG[status].label}</div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-2">
          <FiFilter className="text-gray-500" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="ALL">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
        {(statusFilter !== 'ALL' || categoryFilter !== 'ALL') && (
          <button
            onClick={() => {
              setStatusFilter('ALL')
              setCategoryFilter('ALL')
            }}
            className="text-sm text-blue-600 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Bills List */}
      {displayBills.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FiCheckCircle className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No bills found</h3>
          <p className="text-gray-600 mb-4">
            {statusFilter !== 'ALL' || categoryFilter !== 'ALL'
              ? 'Try adjusting your filters'
              : isGroupSelected
              ? 'No bills found for this wallet group'
              : 'Add your first bill to start tracking'}
          </p>
          {!isGroupSelected && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <FiPlus size={18} />
              Add Bill
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displayBills.map((bill) => (
            <div key={bill.id} className="relative">
              {/* Wallet indicator for group view */}
              {isGroupSelected && (bill as AggregatedBill).walletName && (
                <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-0.5 bg-white/90 rounded-full text-xs shadow-sm">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: (bill as AggregatedBill).walletColor || '#6366f1' }}
                  />
                  <span className="text-gray-600">{(bill as AggregatedBill).walletName}</span>
                </div>
              )}
              <BillCard
                bill={bill}
                onEdit={() => !isGroupSelected && setEditingBill(bill)}
                onDelete={() => !isGroupSelected && handleDeleteBill(bill.id)}
                onMarkAsPaid={() => !isGroupSelected && handleMarkAsPaid(bill.id)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {(showForm || editingBill) && (
        <BillForm
          bill={editingBill || undefined}
          categories={categories}
          onSubmit={editingBill ? handleUpdateBill : handleCreateBill}
          onClose={() => {
            setShowForm(false)
            setEditingBill(null)
          }}
        />
      )}

      {/* Import Modal */}
      {showImport && (
        <BillImportModal
          onClose={() => setShowImport(false)}
          onImportComplete={handleImportComplete}
        />
      )}
    </div>
  )
}
