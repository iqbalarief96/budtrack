import './globals.css'
import './themes.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AuthProvider } from './providers/AuthProvider'
import { WalletProvider } from './providers/WalletProvider'
import { ThemeProvider } from './providers/ThemeProvider'
import Sidebar from './components/Sidebar'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import './sidebar.css'
import { Toaster } from 'sonner'
import ChatbotButton from './components/ChatbotButton'
import { TransactionModalProvider } from './providers/TransactionModalProvider'
import SessionClientProvider from './providers/SessionClientProvider'
// Validate environment variables on startup
import '@/lib/env'

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
        <SessionClientProvider>
          <AuthProvider session={session}>
            <ThemeProvider>
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
                <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
                  {children}
                  <Toaster />
                </main>
              )}
            </ThemeProvider>
          </AuthProvider>
        </SessionClientProvider>
      </body>
    </html>
  )
} 