'use client'

import { ReactNode, useEffect, useState } from 'react'
import { useSidebar } from './Sidebar'
import { FiMenu } from 'react-icons/fi'

interface ResponsiveLayoutProps {
  children: ReactNode
}

export default function ResponsiveLayout({ children }: ResponsiveLayoutProps) {
  const { isCollapsed, isMobile, toggleSidebar } = useSidebar()
  const [mounted, setMounted] = useState(false)

  // Menghitung width sidebar (dalam px)
  const sidebarWidth = isCollapsed ? 80 : 256;
  
  // Pastikan component sudah di-mount untuk menghindari perbedaan server/client rendering
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="p-4">Loading...</div>; // Simple loading state
  }
  
  return (
    <div 
      className="bg-gray-50"
      style={{
        position: 'fixed',
        top: 0,
        bottom: 0,
        right: 0,
        left: isMobile ? 0 : sidebarWidth,
        transition: 'left 0.3s ease-in-out, width 0.3s ease-in-out',
        overflow: 'auto',
      }}
    >
      {/* Button to toggle sidebar from content area */}
      {!isMobile && (
        <button 
          className="fixed p-2 m-4 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all"
          onClick={toggleSidebar}
          style={{
            left: isCollapsed ? `${sidebarWidth + 4}px` : '0.5rem',
            top: '0.5rem',
            zIndex: 30,
            transition: 'left 0.3s ease-in-out'
          }}
        >
          <FiMenu size={20} />
        </button>
      )}
      
      <main className="p-4 md:p-8 pt-16">
        {children}
      </main>
    </div>
  )
} 