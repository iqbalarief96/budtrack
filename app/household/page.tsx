'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { CalendarDays, CreditCard, RefreshCw, Target, Users, WalletCards, TrendingDown, TrendingUp, ReceiptText } from 'lucide-react'
import { useWallet } from '@/app/providers/WalletProvider'
import { formatCurrency } from '@/app/lib/utils'

type HouseholdData = {
  scope: { type: string; id?: string; name: string }
  wallets: Array<{ id: string; name: string; balance: number; currencyCode: string; color?: string | null; type?: string | null }>
  walletGroups: Array<{ id: string; name: string; wallets?: Array<{ walletId: string; wallet: { id: string; name: string; balance: number; color?: string | null } }> }>
  summary: {
    balance: number
    income: number
    expense: number
    cashflow: number
    transactionCount: number
    budgetTotal: number
    budgetSpent: number
    budgetRemaining: number
    budgetUsagePercent: number
    dueBillsAmount: number
    dueBillsCount: number
    sharedOutstanding: number
    sharedOpenCount: number
    subscriptionMonthly: number
    activeSubscriptionCount: number
    goalTarget: number
    goalCurrent: number
    goalProgressPercent: number
  }
  topCategories: Array<{ id: string; name: string; color?: string | null; amount: number }>
  budgets: Array<{ id: string; amount: number; spent: number; remaining: number; usagePercent: number; endDate: string; category?: { name: string; color?: string | null } | null; wallet?: { name: string } | null }>
  bills: Array<{ id: string; name: string; amount: number; dueDate: string; wallet?: { name: string } | null; category?: { name: string } | null }>
  subscriptions: Array<{ id: string; name: string; amount: number; currencyCode: string; billingCycle: string; nextBillingAt?: string | null; trialEndsAt?: string | null; wallet?: { name: string } | null }>
  sharedBills: Array<{ id: string; title: string; ownership?: string | null; totalAmount: number; dueDate?: string | null; wallet?: { name: string } | null; walletGroup?: { name: string } | null; participants: Array<{ paidAmount: number; ownerRole?: string | null }> }>
  goals: Array<{ id: string; name: string; target: number; current: number; deadline?: string | null; color?: string | null; progressPercent: number }>
}

function formatDate(value?: string | null) {
  if (!value) return 'No date'
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
}

function ProgressBar({ value, color = 'bg-blue-600' }: { value: number; color?: string }) {
  const safeValue = Math.max(0, Math.min(100, value || 0))
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${safeValue}%` }} />
    </div>
  )
}

export default function HouseholdDashboardPage() {
  const { data: session, status } = useSession()
  const { wallets, walletGroups, refreshGroups } = useWallet()
  const [data, setData] = useState<HouseholdData | null>(null)
  const [scope, setScope] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') redirect('/auth/signin')
  }, [status])

  const fetchDashboard = useCallback(async () => {
    if (!session?.user?.id) return
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (scope.startsWith('group:')) params.set('walletGroupId', scope.replace('group:', ''))
      if (scope.startsWith('wallet:')) params.set('walletId', scope.replace('wallet:', ''))

      const response = await fetch(`/api/household-dashboard?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to load household dashboard')
      setData(await response.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load household dashboard')
    } finally {
      setLoading(false)
    }
  }, [scope, session?.user?.id])

  useEffect(() => {
    refreshGroups().catch(() => undefined)
  }, [refreshGroups])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  const sharedOutstanding = useMemo(() => {
    return data?.sharedBills.map((bill) => {
      const paid = bill.participants.reduce((sum, participant) => sum + Number(participant.paidAmount || 0), 0)
      return { ...bill, outstanding: Math.max(0, bill.totalAmount - paid) }
    }) || []
  }, [data?.sharedBills])

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <RefreshCw className="mx-auto mb-3 animate-spin text-blue-600" size={32} />
          <p className="text-gray-600">Loading household dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-col gap-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-500 p-6 text-white shadow-lg md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-blue-100">Household Dashboard</p>
          <h1 className="text-3xl font-bold">Ringkasan keluarga & shared finance</h1>
          <p className="mt-2 text-blue-100">Real aggregation dari wallet, wallet groups, bills, subscriptions, budgets, goals, dan shared bills.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={scope}
            onChange={(event) => setScope(event.target.value)}
            className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-white backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/70 [&_option]:text-gray-900"
          >
            <option value="all">All wallets</option>
            {walletGroups.map((group) => (
              <option key={group.id} value={`group:${group.id}`}>Group: {group.name}</option>
            ))}
            {wallets.map((wallet) => (
              <option key={wallet.id} value={`wallet:${wallet.id}`}>Wallet: {wallet.name}</option>
            ))}
          </select>
          <button onClick={fetchDashboard} className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 font-medium text-blue-700 hover:bg-blue-50">
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Total Balance</span>
                <WalletCards className="text-blue-600" size={22} />
              </div>
              <p className="mt-3 text-2xl font-bold text-gray-900">{formatCurrency(data.summary.balance)}</p>
              <p className="text-xs text-gray-500">{data.wallets.length} scoped wallets</p>
            </div>
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Monthly Cashflow</span>
                {data.summary.cashflow >= 0 ? <TrendingUp className="text-green-600" size={22} /> : <TrendingDown className="text-red-600" size={22} />}
              </div>
              <p className={`mt-3 text-2xl font-bold ${data.summary.cashflow >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatCurrency(data.summary.cashflow)}</p>
              <p className="text-xs text-gray-500">Income {formatCurrency(data.summary.income)} · Expense {formatCurrency(data.summary.expense)}</p>
            </div>
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Due Bills + Shared</span>
                <ReceiptText className="text-orange-600" size={22} />
              </div>
              <p className="mt-3 text-2xl font-bold text-orange-700">{formatCurrency(data.summary.dueBillsAmount + data.summary.sharedOutstanding)}</p>
              <p className="text-xs text-gray-500">{data.summary.dueBillsCount} due bills · {data.summary.sharedOpenCount} shared bills</p>
            </div>
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Subscriptions / Month</span>
                <CreditCard className="text-purple-600" size={22} />
              </div>
              <p className="mt-3 text-2xl font-bold text-purple-700">{formatCurrency(data.summary.subscriptionMonthly)}</p>
              <p className="text-xs text-gray-500">{data.summary.activeSubscriptionCount} active/trial subscriptions</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <section className="rounded-xl border bg-white p-5 shadow-sm lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Budget Health</h2>
                <span className="text-sm text-gray-500">{data.summary.budgetUsagePercent}% used</span>
              </div>
              <ProgressBar value={data.summary.budgetUsagePercent} color={data.summary.budgetUsagePercent > 100 ? 'bg-red-600' : data.summary.budgetUsagePercent > 80 ? 'bg-orange-500' : 'bg-green-600'} />
              <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                <div><p className="text-gray-500">Total</p><p className="font-semibold">{formatCurrency(data.summary.budgetTotal)}</p></div>
                <div><p className="text-gray-500">Spent</p><p className="font-semibold">{formatCurrency(data.summary.budgetSpent)}</p></div>
                <div><p className="text-gray-500">Remaining</p><p className="font-semibold">{formatCurrency(data.summary.budgetRemaining)}</p></div>
              </div>
              <div className="mt-5 space-y-3">
                {data.budgets.length === 0 ? <p className="text-sm text-gray-500">No active budgets in this scope.</p> : data.budgets.map((budget) => (
                  <div key={budget.id} className="rounded-lg border p-3">
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium">{budget.category?.name || 'Budget'} · {budget.wallet?.name || 'Wallet'}</span>
                      <span>{budget.usagePercent}%</span>
                    </div>
                    <ProgressBar value={budget.usagePercent} color={budget.usagePercent > 100 ? 'bg-red-600' : 'bg-blue-600'} />
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Goals</h2>
                <Target className="text-blue-600" size={20} />
              </div>
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600"><span>Total progress</span><span>{data.summary.goalProgressPercent}%</span></div>
                <ProgressBar value={data.summary.goalProgressPercent} color="bg-blue-600" />
              </div>
              <div className="space-y-3">
                {data.goals.length === 0 ? <p className="text-sm text-gray-500">No active goals.</p> : data.goals.map((goal) => (
                  <div key={goal.id} className="rounded-lg border p-3">
                    <div className="flex justify-between gap-2 text-sm"><span className="font-medium">{goal.name}</span><span>{goal.progressPercent}%</span></div>
                    <p className="text-xs text-gray-500">{formatCurrency(goal.current)} / {formatCurrency(goal.target)}</p>
                    <ProgressBar value={goal.progressPercent} color="bg-emerald-600" />
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <section className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900"><CalendarDays size={20} /> Due Bills</h2>
              <div className="space-y-3">
                {data.bills.length === 0 ? <p className="text-sm text-gray-500">No bills due in the next 14 days.</p> : data.bills.map((bill) => (
                  <div key={bill.id} className="rounded-lg border p-3">
                    <div className="flex justify-between gap-3"><span className="font-medium">{bill.name}</span><span>{formatCurrency(bill.amount)}</span></div>
                    <p className="text-xs text-gray-500">{formatDate(bill.dueDate)} · {bill.wallet?.name || 'Wallet'}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900"><Users size={20} /> Shared Bills</h2>
              <div className="space-y-3">
                {sharedOutstanding.length === 0 ? <p className="text-sm text-gray-500">No open shared bills.</p> : sharedOutstanding.map((bill) => (
                  <div key={bill.id} className="rounded-lg border p-3">
                    <div className="flex justify-between gap-3"><span className="font-medium">{bill.title}</span><span>{formatCurrency(bill.outstanding)}</span></div>
                    <p className="text-xs text-gray-500">{formatDate(bill.dueDate)} · {(bill.ownership || 'SHARED').toLowerCase()} · {bill.walletGroup?.name || bill.wallet?.name || 'General'}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900"><CreditCard size={20} /> Subscriptions</h2>
              <div className="space-y-3">
                {data.subscriptions.length === 0 ? <p className="text-sm text-gray-500">No active subscriptions.</p> : data.subscriptions.map((sub) => (
                  <div key={sub.id} className="rounded-lg border p-3">
                    <div className="flex justify-between gap-3"><span className="font-medium">{sub.name}</span><span>{formatCurrency(sub.amount, false, sub.currencyCode)}</span></div>
                    <p className="text-xs text-gray-500">{sub.billingCycle} · next {formatDate(sub.nextBillingAt || sub.trialEndsAt)}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Top Expense Categories This Month</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {data.topCategories.length === 0 ? <p className="text-sm text-gray-500">No expense transactions this month.</p> : data.topCategories.map((category) => (
                <div key={category.id} className="rounded-lg border p-3">
                  <div className="mb-2 flex justify-between gap-3 text-sm"><span className="font-medium">{category.name}</span><span>{formatCurrency(category.amount)}</span></div>
                  <ProgressBar value={data.summary.expense > 0 ? Math.round((category.amount / data.summary.expense) * 100) : 0} color="bg-sky-600" />
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
