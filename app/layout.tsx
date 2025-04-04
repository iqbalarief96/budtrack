import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AuthProvider } from './providers/AuthProvider'
import { WalletProvider } from './providers/WalletProvider'
import Sidebar from './components/Sidebar'
import { getServerSession } from 'next-auth'
import { authOptions } from './api/auth/[...nextauth]/route'
import './sidebar.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'BudTrack - Financial Tracker',
  description: 'Track your finances, budgets, and savings',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  return (
    <html lang="id">
      <body className={inter.className}>
        <AuthProvider session={session}>
          {session ? (
            <WalletProvider>
              <Sidebar session={session} />
              <main className="content-area">
                {children}
              </main>
            </WalletProvider>
          ) : (
            <main className="min-h-screen bg-gray-50">
              {children}
            </main>
          )}
        </AuthProvider>
      </body>
    </html>
  )
} 