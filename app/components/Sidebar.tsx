'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  FiHome, FiDollarSign, FiCreditCard, FiPieChart,
  FiLogOut, FiMenu, FiX, FiBell, FiUser, FiSettings, FiTarget, FiTrendingUp, FiZap, FiFileText, FiRepeat,
  FiBriefcase, FiUsers, FiHeart, FiChevronDown, FiChevronUp, FiSearch, FiCalendar, FiActivity, FiPlus
} from 'react-icons/fi'
import { signOut, useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { Session } from 'next-auth'
import { Bot, CreditCard } from 'lucide-react'
import AlertCenter from './AlertCenter'
import { useOptionalTransactionModal } from '../providers/TransactionModalProvider'

export interface SidebarProps {
  session: Session | null
}

interface MenuItem {
  path: string
  icon: React.ReactNode
  label: string
  badge?: string
}

interface MenuGroup {
  label: string
  items: MenuItem[]
  defaultOpen?: boolean
}

const Sidebar: React.FC<SidebarProps> = ({ session }) => {
  const pathname = usePathname()
  const transactionModal = useOptionalTransactionModal()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(['dashboard', 'finance']))

  // Organized menu groups
  const menuGroups: MenuGroup[] = [
    {
      label: 'Dashboard',
      defaultOpen: true,
      items: [
        { path: '/dashboard', icon: <FiHome size={20} />, label: 'Dashboard' },
        { path: '/household-inventory', icon: <FiPieChart size={20} />, label: 'Stok Rumah' },
        { path: '/household', icon: <FiUsers size={20} />, label: 'Household' },
      ]
    },
    {
      label: 'Finance',
      defaultOpen: true,
      items: [
        { path: '/transactions', icon: <FiDollarSign size={20} />, label: 'Transaksi' },
        { path: '/calendar', icon: <FiCalendar size={20} />, label: 'Kalender' },
        { path: '/wallets', icon: <FiCreditCard size={20} />, label: 'Dompet' },
        { path: '/savings', icon: <FiTrendingUp size={20} />, label: 'Tabungan' },
        { path: '/credit-cards', icon: <CreditCard size={20} />, label: 'Credit Cards' },
        { path: '/recurring', icon: <FiRepeat size={20} />, label: 'Recurring (Tetap)' },
        { path: '/subscriptions', icon: <CreditCard size={20} />, label: 'Subscriptions (Digital)' },
        { path: '/shared-bills', icon: <FiUsers size={20} />, label: 'Shared Bills' },
        { path: '/bills', icon: <FiBell size={20} />, label: 'Bills & Tagihan' },
      ]
    },
    {
      label: 'Planning',
      defaultOpen: false,
      items: [
        { path: '/salary-allocation', icon: <FiDollarSign size={20} />, label: 'Alokasi Gaji' },
        { path: '/budgets', icon: <FiTarget size={20} />, label: 'Budget' },
        { path: '/goals', icon: <FiTarget size={20} />, label: 'Savings Goals' },
        { path: '/wedding-planner', icon: <FiHeart size={20} />, label: 'Wedding Planner' },
      ]
    },
    {
      label: 'AI Tools',
      defaultOpen: false,
      items: [
        { path: '/chatbot', icon: <Bot size={20} />, label: 'Finance Assistant' },
        { path: '/categories/smart', icon: <FiZap size={20} />, label: 'Smart Kategorisasi' },
      ]
    },
    {
      label: 'Analytics',
      defaultOpen: false,
      items: [
        { path: '/health', icon: <FiActivity size={20} />, label: 'Kesehatan & Bugar' },
        { path: '/insights', icon: <FiTrendingUp size={20} />, label: 'Insights' },
        { path: '/monthly-review', icon: <FiFileText size={20} />, label: 'Monthly Review' },
        { path: '/spending-insights', icon: <FiZap size={20} />, label: 'Spending Insights' },
        { path: '/net-worth', icon: <FiBriefcase size={20} />, label: 'Net Worth' },
        { path: '/goals-timeline', icon: <FiTarget size={20} />, label: 'Goals Timeline' },
        { path: '/reports', icon: <FiFileText size={20} />, label: 'Laporan & Ekspor' },
      ]
    },
    {
      label: 'Management',
      defaultOpen: false,
      items: [
        { path: '/categories', icon: <FiPieChart size={20} />, label: 'Kategori' },
        { path: '/investments', icon: <FiBriefcase size={20} />, label: 'Investasi' },
        { path: '/groups', icon: <FiUsers size={20} />, label: 'Grup Bersama' },
        { path: '/alerts', icon: <FiBell size={20} />, label: 'Alerts' },
      ]
    },
  ]

  useEffect(() => {
    const checkIfMobile = () => {
      const mobile = window.innerWidth < 768
      const collapsed = window.innerWidth < 1280

      setIsMobile(mobile)
      setIsCollapsed(collapsed)

      if (mobile) {
        document.body.setAttribute('data-sidebar', isOpen ? 'mobile-open' : 'mobile-closed')
      } else {
        document.body.setAttribute('data-sidebar', collapsed ? 'collapsed' : 'expanded')
      }
    }

    checkIfMobile()
    window.addEventListener('resize', checkIfMobile)

    return () => {
      window.removeEventListener('resize', checkIfMobile)
    }
  }, [isOpen])

  useEffect(() => {
    if (isMobile) {
      document.body.setAttribute('data-sidebar', isOpen ? 'mobile-open' : 'mobile-closed')
    } else {
      document.body.setAttribute('data-sidebar', isCollapsed ? 'collapsed' : 'expanded')
    }
  }, [isCollapsed, isOpen, isMobile])

  const toggleSidebar = () => {
    if (isMobile) {
      setIsOpen(!isOpen)
    } else {
      setIsCollapsed(!isCollapsed)
    }
  }

  const closeSidebar = () => {
    if (isMobile) {
      setIsOpen(false)
    }
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/auth/signin' })
  }

  const isActive = (path: string) => {
    return pathname === path
  }

  const toggleGroup = (groupLabel: string) => {
    const newOpenGroups = new Set(openGroups)
    if (newOpenGroups.has(groupLabel)) {
      newOpenGroups.delete(groupLabel)
    } else {
      newOpenGroups.add(groupLabel)
    }
    setOpenGroups(newOpenGroups)
  }

  // Filter menu items based on search
  const filteredGroups = searchQuery
    ? menuGroups.map(group => ({
        ...group,
        items: group.items.filter(item =>
          item.label.toLowerCase().includes(searchQuery.toLowerCase())
        )
      })).filter(group => group.items.length > 0)
    : menuGroups

  if (!session) {
    return null
  }

  return (
    <>
      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 md:hidden z-50">
        <div className="flex items-center justify-between px-4 h-full">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {isOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>

          <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">BudTrack</h1>

          <div className="flex items-center space-x-2">
            {transactionModal && (
              <button
                onClick={() => transactionModal.openTransactionModal()}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                title="Catat Transaksi"
              >
                <FiPlus size={16} />
                <span>Transaksi</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 shadow-lg transition-all duration-300 z-40 flex flex-col`}
        style={{
          width: isMobile
            ? '280px'
            : isCollapsed ? '80px' : '280px',
          transform: isMobile && !isOpen ? 'translateX(-100%)' : 'translateX(0)'
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-blue-600/20 bg-gradient-to-r from-blue-600 to-blue-500">
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-blue-600" />
              </div>
              <h1 className="text-xl font-bold text-white">BudTrack</h1>
            </div>
          )}
          {!isMobile && (
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-md hover:bg-blue-700 text-white transition-colors cursor-pointer"
            >
              {isCollapsed ? <FiMenu size={20} /> : <FiX size={20} />}
            </button>
          )}
        </div>

        {/* User Profile Section */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40">
          {!isCollapsed || isMobile ? (
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center font-semibold text-lg shadow-md">
                {session?.user?.name?.charAt(0).toUpperCase() || <FiUser size={20} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {session?.user?.name || 'User'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{session?.user?.email}</p>
              </div>
              <AlertCenter />
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center font-semibold text-lg shadow-md">
                {session?.user?.name?.charAt(0).toUpperCase() || <FiUser size={20} />}
              </div>
            </div>
          )}
        </div>

        {/* Quick Transaction Action Button */}
        {transactionModal && (
          <div className="p-3 border-b border-gray-200 dark:border-gray-800">
            {!isCollapsed || isMobile ? (
              <button
                onClick={() => {
                  if (isMobile) setIsOpen(false)
                  transactionModal.openTransactionModal()
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-all shadow-xs active:scale-[0.98] cursor-pointer"
              >
                <FiPlus size={18} />
                <span>Catat Transaksi</span>
              </button>
            ) : (
              <div className="flex justify-center">
                <button
                  onClick={() => transactionModal.openTransactionModal()}
                  className="w-10 h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-all shadow-xs active:scale-[0.98] cursor-pointer"
                  title="Catat Transaksi"
                >
                  <FiPlus size={20} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Search Bar */}
        {(!isCollapsed || isMobile) && (
          <div className="p-3 border-b border-gray-200 dark:border-gray-800">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-sm bg-white dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
          </div>
        )}

        {/* Navigation Groups */}
        <div className="flex-1 overflow-y-auto py-2">
          <nav className="px-2 space-y-1">
            {filteredGroups.map((group) => (
              <div key={group.label} className="mb-2">
                {/* Group Header */}
                {(!isCollapsed || isMobile) && (
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                  >
                    <span>{group.label}</span>
                    {openGroups.has(group.label) ? (
                      <FiChevronUp size={14} />
                    ) : (
                      <FiChevronDown size={14} />
                    )}
                  </button>
                )}

                {/* Group Items */}
                {(openGroups.has(group.label) || searchQuery || isCollapsed) && (
                  <div className="space-y-0.5">
                    {group.items.map((item) => (
                      <Link
                        key={item.path}
                        href={item.path}
                        onClick={closeSidebar}
                        className={`flex items-center px-3 py-2 rounded-lg transition-all group
                                    ${isActive(item.path)
                                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-medium shadow-xs'
                                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60'}`}
                        title={isCollapsed && !isMobile ? item.label : undefined}
                      >
                        <span className={`${isActive(item.path) ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200'}`}>
                          {item.icon}
                        </span>
                        {(!isCollapsed || isMobile) && (
                          <span className="ml-3 text-sm">{item.label}</span>
                        )}
                        {item.badge && (!isCollapsed || isMobile) && (
                          <span className="ml-auto text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>

        {/* Settings & Logout */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 space-y-1">
          <Link
            href="/settings"
            onClick={closeSidebar}
            className={`flex items-center px-3 py-2.5 rounded-lg transition-colors ${
              isActive('/settings')
                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-medium'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60'
            }`}
          >
            <FiSettings size={20} />
            {(!isCollapsed || isMobile) && <span className="ml-3 text-sm">Pengaturan</span>}
          </Link>

          <button
            onClick={handleLogout}
            className="flex items-center w-full px-3 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors cursor-pointer"
          >
            <FiLogOut size={20} />
            {(!isCollapsed || isMobile) && <span className="ml-3 text-sm">Keluar</span>}
          </button>
        </div>
      </aside>

      {/* Content Padding for Mobile */}
      <div className="h-16 md:hidden" />
    </>
  )
}

export default Sidebar
