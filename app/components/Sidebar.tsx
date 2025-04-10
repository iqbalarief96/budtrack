'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  FiHome, FiDollarSign, FiCreditCard, FiTag, FiPieChart, 
  FiLogOut, FiMenu, FiX, FiBell, FiUser, FiSettings, FiShield, FiTarget, FiTrendingUp, FiZap, FiFileText, FiRepeat,
  FiBriefcase, FiUsers
} from 'react-icons/fi'
import { signOut, useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { Session } from 'next-auth'
import {
  CreditCard,
  LineChart,
  ListTodo,
  Menu,
  Percent,
  PieChart,
  Target,
  Wallet,
  Home,
  Settings,
  LogOut,
  Users,
} from "lucide-react"

export interface SidebarProps {
  session: Session | null
}

const Sidebar: React.FC<SidebarProps> = ({ session }) => {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const checkIfMobile = () => {
      const mobile = window.innerWidth < 768;
      const collapsed = window.innerWidth < 1280;
      
      setIsMobile(mobile)
      setIsCollapsed(collapsed)
      
      // Update body class based on sidebar state
      if (mobile) {
        document.body.setAttribute('data-sidebar', isOpen ? 'mobile-open' : 'mobile-closed');
      } else {
        document.body.setAttribute('data-sidebar', collapsed ? 'collapsed' : 'expanded');
      }
    }

    checkIfMobile()
    window.addEventListener('resize', checkIfMobile)

    return () => {
      window.removeEventListener('resize', checkIfMobile)
    }
  }, [isOpen])

  // Update body class whenever sidebar state changes
  useEffect(() => {
    if (isMobile) {
      document.body.setAttribute('data-sidebar', isOpen ? 'mobile-open' : 'mobile-closed');
    } else {
      document.body.setAttribute('data-sidebar', isCollapsed ? 'collapsed' : 'expanded');
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
    await signOut({ callbackUrl: '/login' })
  }

  const isActive = (path: string) => {
    return pathname === path
  }

  const menuItems = [
    { path: '/dashboard', icon: <FiHome size={20} />, label: 'Dashboard' },
    { path: '/transactions', icon: <FiDollarSign size={20} />, label: 'Transaksi' },
    { path: '/wallets', icon: <FiCreditCard size={20} />, label: 'Dompet' },
    { path: '/categories', icon: <FiPieChart size={20} />, label: 'Kategori' },
    { path: '/budgets', icon: <FiTarget size={20} />, label: 'Anggaran' },
    { path: '/recurring', icon: <FiRepeat size={20} />, label: 'Recurring Transaction' },
    { path: '/investments', icon: <FiBriefcase size={20} />, label: 'Investasi' },
    { path: '/groups', icon: <FiUsers size={20} />, label: 'Group Budget' },
    { path: '/insights', icon: <FiTrendingUp size={20} />, label: 'Insight' },
    { path: '/categories/smart', icon: <FiZap size={20} />, label: 'Smart Kategorisasi' },
    { path: '/reports', icon: <FiFileText size={20} />, label: 'Laporan & Ekspor' },
    { path: '/settings', icon: <FiSettings size={20} />, label: 'Pengaturan' },
  ]

  if (!session) {
    return null;
  }

  return (
    <>
      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-white border-b md:hidden z-50">
        <div className="flex items-center justify-between px-4 h-full">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
          >
            {isOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
          
          <h1 className="text-xl font-bold text-blue-600">BudTrack</h1>
          
          <div className="flex items-center space-x-4">
            <button className="p-2 rounded-full text-gray-600 hover:bg-gray-100">
              <FiBell size={20} />
            </button>
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
        className={`fixed top-0 left-0 h-full bg-white shadow-lg transition-all duration-300 z-40`}
        style={{ 
          width: isMobile 
            ? '256px' 
            : isCollapsed ? '80px' : '256px',
          transform: isMobile && !isOpen ? 'translateX(-100%)' : 'translateX(0)'
        }}
      >
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-center p-4 border-b">
            {!isCollapsed && <h1 className="text-xl font-bold">Budtrack</h1>}
            {!isMobile && (
              <button onClick={toggleSidebar} className="p-2 rounded-md hover:bg-gray-100">
                {isCollapsed ? <FiMenu size={20} /> : <FiX size={20} />}
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto py-4">
            <nav className="px-2 space-y-1">
              {menuItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={closeSidebar}
                  className={`flex items-center px-4 py-3 rounded-md transition-colors
                              ${isActive(item.path) 
                                ? 'bg-blue-100 text-blue-600' 
                                : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  <span className="mr-3">{item.icon}</span>
                  {(!isCollapsed || isMobile) && <span>{item.label}</span>}
                </Link>
              ))}
            </nav>
          </div>

          <div className="p-4 border-t">
            {!isCollapsed && session?.user?.name ? (
              <Link
                href="/profile"
                className="flex items-center space-x-3 mb-4 px-4 py-2 rounded-md hover:bg-gray-100 transition-colors"
              >
                <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center">
                  {session.user.name?.charAt(0).toUpperCase() || <FiUser size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">{session.user.name}</p>
                  <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
                </div>
              </Link>
            ) : isCollapsed && (
              <Link
                href="/profile"
                className="flex justify-center mb-4 w-full"
              >
                <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center">
                  {session?.user?.name?.charAt(0).toUpperCase() || <FiUser size={16} />}
                </div>
              </Link>
            )}
            <button
              onClick={handleLogout}
              className={`flex items-center px-4 py-3 rounded-md text-red-500 hover:bg-red-50 w-full`}
            >
              <FiLogOut size={20} />
              {(!isCollapsed || isMobile) && <span className="ml-3">Keluar</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Content Padding for Mobile */}
      <div className="h-16 md:hidden" />
    </>
  )
}

export default Sidebar 