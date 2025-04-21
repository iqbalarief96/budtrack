import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AuthProvider } from './providers/AuthProvider'
import { WalletProvider } from './providers/WalletProvider'
import Sidebar from './components/Sidebar'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import './sidebar.css'
import { Toaster } from '@/components/ui/toast'
import ChatbotButton from './components/ChatbotButton'
import { TransactionModalProvider } from './providers/TransactionModalProvider'

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
              <TransactionModalProvider>
                <Sidebar session={session} />
                <main className="content-area">
                  {children}
                </main>
                <Toaster />
                <ChatbotButton />
              </TransactionModalProvider>
            </WalletProvider>
          ) : (
            <main className="min-h-screen bg-gray-50">
              {children}
              <Toaster />
            </main>
          )}
        </AuthProvider>
      </body>
    </html>
  )
} 