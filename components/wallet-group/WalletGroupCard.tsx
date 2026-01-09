'use client'

import { FiEdit2, FiTrash2, FiCreditCard, FiUsers, FiChevronRight } from 'react-icons/fi'

// Icon mapping for display
const ICON_MAP: Record<string, string> = {
  users: '👥',
  heart: '💑',
  home: '🏠',
  briefcase: '💼',
  piggy: '🐷',
  star: '⭐',
}

interface Wallet {
  id: string
  name: string
  balance: number
  color?: string | null
  type?: string
}

interface WalletGroupMember {
  walletId: string
  wallet: Wallet
}

interface WalletGroup {
  id: string
  name: string
  description?: string | null
  icon?: string | null
  color?: string | null
  wallets: WalletGroupMember[]
}

interface WalletGroupCardProps {
  group: WalletGroup
  onEdit: () => void
  onDelete: () => void
  onSelect?: () => void
}

export default function WalletGroupCard({ 
  group, 
  onEdit, 
  onDelete, 
  onSelect 
}: WalletGroupCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  // Calculate total balance from all linked wallets
  const totalBalance = (group.wallets || []).reduce(
    (sum, member) => sum + (member.wallet?.balance || 0),
    0
  )

  const walletCount = group.wallets?.length || 0
  const displayIcon = group.icon ? ICON_MAP[group.icon] || '📁' : '📁'

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="p-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
              style={{ backgroundColor: group.color || '#1976D2' }}
            >
              {displayIcon}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{group.name}</h3>
              {group.description && (
                <p className="text-xs text-gray-500 line-clamp-1">
                  {group.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Total Balance */}
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-1">Total Balance</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(totalBalance)}
          </p>
        </div>

        {/* Linked Wallets */}
        <div className="mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <FiUsers size={14} />
            <span>{walletCount} wallet{walletCount !== 1 ? 's' : ''} linked</span>
          </div>
          
          {walletCount > 0 && group.wallets && (
            <div className="flex flex-wrap gap-1">
              {group.wallets.slice(0, 4).map((member) => (
                <div
                  key={member.walletId}
                  className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-xs"
                >
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: member.wallet?.color || '#1976D2' }}
                  >
                    <FiCreditCard className="text-white" size={8} />
                  </div>
                  <span className="text-gray-700 truncate max-w-[80px]">
                    {member.wallet?.name}
                  </span>
                </div>
              ))}
              {walletCount > 4 && (
                <span className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-500">
                  +{walletCount - 4} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-3 border-t border-gray-100">
          {onSelect && (
            <button
              onClick={onSelect}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm font-medium"
            >
              View Details
              <FiChevronRight size={14} />
            </button>
          )}
          <button
            onClick={onEdit}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
            title="Edit"
          >
            <FiEdit2 size={16} />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
            title="Delete"
          >
            <FiTrash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
