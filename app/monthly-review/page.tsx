'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import {
  FiAlertCircle,
  FiCalendar,
  FiCheckCircle,
  FiCreditCard,
  FiDollarSign,
  FiRefreshCw,
  FiTarget,
  FiTrendingDown,
  FiTrendingUp,
  FiUsers,
} from 'react-icons/fi'
import WalletSelector from '@/app/components/WalletSelector'
import { useWallet } from '@/app/providers/WalletProvider'
import { formatCurrency, formatDate } from '@/app/lib/utils'

type MonthlyReview = {
  period: { month: string; start: string; end: string; label: string }
  scope: { type: 'all' | 'wallet' | 'walletGroup'; label: string; walletIds?: string[] }
  summary: {
    totalIncome: number
    totalExpense: number
    netCashflow: number
    savingsRate: number
    transactionCount: number
    incomeCount: number
    expenseCount: number
    previousIncome: number
    previousExpense: number
    previousNetCashflow: number
  }
  categories: Array<{ id: string | null; name: string; amount: number; count: number; percentage: number }>
  budgets: {
    total: number
    spent: number
    remaining: number
    usage: number
    count: number
    overBudgetCount: number
    atRisk: Array<{ id: string; category: string; wallet: string; amount: number; spent: number; remaining: number; percentage: number; endDate: string }>
  }
  bills: {
    total: number
    paid: number
    unpaid: number
    count: number
    paidCount: number
    unpaidCount: number
    overdue: Array<{ id: string; name: string; amount: number; dueDate: string }>
    dueSoon: Array<{ id: string; name: string; amount: number; dueDate: string }>
  }
  subscriptions: {
    monthlyEquivalent: number
    activeCount: number
    upcomingCount: number
    upcoming: Array<{ id: string; name: string; provider: string | null; amount: number; billingCycle: string; nextBillingAt: string | null; wallet: string | null }>
  }
  sharedBills: { total: number; paid: number; outstanding: number; count: number; openCount: number }
  goals: {
    activeCount: number
    completedCount: number
    targetTotal: number
    currentTotal: number
    progress: number
    top: Array<{ id: string; name: string; target: number; current: number; deadline: string | null; status: string; progress: number }>
  }
  highlights: {
    largestExpense: { id: string; amount: number; description: string | null; date: string; category: string; wallet: string } | null
    topCategory: { id: string | null; name: string; amount: number; count: number; percentage: number } | null
  }
  recentTransactions: Array<{ id: string; amount: number; type: 'INCOME' | 'EXPENSE'; description: string | null; date: string; category: string; wallet: string }>
}

function getCurrentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function getDelta(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100
  return ((current - previous) / Math.abs(previous)) * 100
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  tone = 'blue',
}: {
  title: string
  value: string
  subtitle?: string
  icon: React.ReactNode
  tone?: 'blue' | 'green' | 'red' | 'purple' | 'amber'
}) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>
        <div className={`rounded-lg border p-3 ${tones[tone]}`}>{icon}</div>
      </div>
    </div>
  )
}

function ProgressBar({ value, className = 'bg-blue-600' }: { value: number; className?: string }) {
  const safeValue = Math.max(0, Math.min(100, value || 0))
  return (
    <div className="h-2 w-full rounded-full bg-gray-100">
      <div className={`h-2 rounded-full ${className}`} style={{ width: `${safeValue}%` }} />
    </div>
  )
}

export default function MonthlyReviewPage() {
  const { data: session, status } = useSession()
  const { selectedWallet, selectedGroup, isGroupSelected } = useWallet()
  const [month, setMonth] = useState(getCurrentMonth())
  const [review, setReview] = useState<MonthlyReview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/signin')
    }
  }, [status])

  const query = useMemo(() => {
    const params = new URLSearchParams({ month })
    if (isGroupSelected && selectedGroup?.id) {
      params.set('walletGroupId', selectedGroup.id)
    } else if (selectedWallet?.id) {
      params.set('walletId', selectedWallet.id)
    }
    return params.toString()
  }, [isGroupSelected, month, selectedGroup?.id, selectedWallet?.id])

  const fetchReview = async () => {
    if (!session?.user?.id) return
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/monthly-review?${query}`)
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch monthly review')
      }
      setReview(data)
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to fetch monthly review')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, session?.user?.id])

  if (status === 'loading') {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>
  }

  const expenseDelta = review ? getDelta(review.summary.totalExpense, review.summary.previousExpense) : 0
  const incomeDelta = review ? getDelta(review.summary.totalIncome, review.summary.previousIncome) : 0

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
              <FiCalendar /> Monthly Review
            </div>
            <h1 className="mt-2 text-3xl font-bold text-gray-900">Review Bulanan</h1>
            <p className="mt-1 text-gray-600">
              Ringkasan real dari transaksi, subscription, bill, budget, shared bill, dan goal.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            <button
              onClick={fetchReview}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiRefreshCw className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        <WalletSelector />

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            <FiAlertCircle /> {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500 shadow-sm">
            Menghitung review bulanan dari data real...
          </div>
        ) : review ? (
          <>
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
              Scope: <span className="font-semibold">{review.scope.label}</span> · Period: <span className="font-semibold">{review.period.label}</span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Income"
                value={formatCurrency(review.summary.totalIncome)}
                subtitle={`${incomeDelta >= 0 ? '+' : ''}${incomeDelta.toFixed(1)}% vs bulan lalu`}
                icon={<FiTrendingUp size={22} />}
                tone="green"
              />
              <StatCard
                title="Expense"
                value={formatCurrency(review.summary.totalExpense)}
                subtitle={`${expenseDelta >= 0 ? '+' : ''}${expenseDelta.toFixed(1)}% vs bulan lalu`}
                icon={<FiTrendingDown size={22} />}
                tone={expenseDelta > 0 ? 'red' : 'green'}
              />
              <StatCard
                title="Net Cashflow"
                value={formatCurrency(review.summary.netCashflow)}
                subtitle={`Savings rate ${review.summary.savingsRate.toFixed(1)}%`}
                icon={<FiDollarSign size={22} />}
                tone={review.summary.netCashflow >= 0 ? 'blue' : 'red'}
              />
              <StatCard
                title="Transaksi"
                value={review.summary.transactionCount.toString()}
                subtitle={`${review.summary.incomeCount} income · ${review.summary.expenseCount} expense`}
                icon={<FiCreditCard size={22} />}
                tone="purple"
              />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm xl:col-span-2">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Top Expense Categories</h2>
                  {review.highlights.topCategory && (
                    <span className="text-sm text-gray-500">Top: {review.highlights.topCategory.name}</span>
                  )}
                </div>
                <div className="space-y-4">
                  {review.categories.length === 0 ? (
                    <p className="text-sm text-gray-500">Belum ada expense di periode ini.</p>
                  ) : (
                    review.categories.slice(0, 8).map((category) => (
                      <div key={category.id ?? category.name} className="space-y-2">
                        <div className="flex items-center justify-between gap-4 text-sm">
                          <span className="font-medium text-gray-700">{category.name}</span>
                          <span className="text-gray-600">
                            {formatCurrency(category.amount)} · {category.percentage.toFixed(1)}%
                          </span>
                        </div>
                        <ProgressBar value={category.percentage} className="bg-blue-600" />
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">Budget Health</h2>
                <div className="space-y-4">
                  <div>
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="text-gray-600">Usage</span>
                      <span className="font-medium text-gray-900">{review.budgets.usage.toFixed(1)}%</span>
                    </div>
                    <ProgressBar value={review.budgets.usage} className={review.budgets.usage > 100 ? 'bg-red-600' : review.budgets.usage >= 80 ? 'bg-amber-500' : 'bg-green-600'} />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-gray-500">Budget</p>
                      <p className="font-semibold text-gray-900">{formatCurrency(review.budgets.total)}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-gray-500">Spent</p>
                      <p className="font-semibold text-gray-900">{formatCurrency(review.budgets.spent)}</p>
                    </div>
                  </div>
                  {review.budgets.atRisk.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-amber-700">At-risk budgets</p>
                      {review.budgets.atRisk.slice(0, 4).map((budget) => (
                        <div key={budget.id} className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-sm">
                          <div className="flex justify-between gap-2">
                            <span className="font-medium text-amber-900">{budget.category}</span>
                            <span className="text-amber-800">{budget.percentage.toFixed(0)}%</span>
                          </div>
                          <p className="mt-1 text-amber-700">{budget.wallet} · sisa {formatCurrency(budget.remaining)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <FiCreditCard className="text-blue-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Bills</h2>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Total</span><span className="font-semibold">{formatCurrency(review.bills.total)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Paid</span><span className="font-semibold text-green-700">{formatCurrency(review.bills.paid)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Unpaid</span><span className="font-semibold text-red-700">{formatCurrency(review.bills.unpaid)}</span></div>
                  {review.bills.overdue.length > 0 && <p className="rounded-lg bg-red-50 p-3 text-red-700">{review.bills.overdue.length} overdue bill butuh follow-up.</p>}
                  {review.bills.dueSoon.length > 0 && <p className="rounded-lg bg-amber-50 p-3 text-amber-700">{review.bills.dueSoon.length} bill jatuh tempo 7 hari ke depan.</p>}
                </div>
              </section>

              <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <FiRefreshCw className="text-purple-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Subscriptions</h2>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Monthly run-rate</span><span className="font-semibold">{formatCurrency(review.subscriptions.monthlyEquivalent)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Active</span><span className="font-semibold">{review.subscriptions.activeCount}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Upcoming this month</span><span className="font-semibold">{review.subscriptions.upcomingCount}</span></div>
                  {review.subscriptions.upcoming.slice(0, 3).map((subscription) => (
                    <div key={subscription.id} className="rounded-lg bg-gray-50 p-3">
                      <div className="flex justify-between gap-2">
                        <span className="font-medium text-gray-800">{subscription.name}</span>
                        <span>{formatCurrency(subscription.amount)}</span>
                      </div>
                      <p className="mt-1 text-gray-500">{subscription.nextBillingAt ? formatDate(subscription.nextBillingAt) : 'No billing date'}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <FiUsers className="text-indigo-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Shared Bills</h2>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Total</span><span className="font-semibold">{formatCurrency(review.sharedBills.total)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Paid by participants</span><span className="font-semibold text-green-700">{formatCurrency(review.sharedBills.paid)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Outstanding</span><span className="font-semibold text-red-700">{formatCurrency(review.sharedBills.outstanding)}</span></div>
                  <p className="rounded-lg bg-indigo-50 p-3 text-indigo-700">{review.sharedBills.openCount} shared bill masih open/partial.</p>
                </div>
              </section>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <FiTarget className="text-green-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Goals Progress</h2>
                </div>
                <div className="mb-4">
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="text-gray-600">Total active progress</span>
                    <span className="font-medium">{review.goals.progress.toFixed(1)}%</span>
                  </div>
                  <ProgressBar value={review.goals.progress} className="bg-green-600" />
                </div>
                <div className="space-y-3">
                  {review.goals.top.length === 0 ? (
                    <p className="text-sm text-gray-500">Belum ada goal aktif.</p>
                  ) : (
                    review.goals.top.map((goal) => (
                      <div key={goal.id} className="rounded-lg bg-gray-50 p-3 text-sm">
                        <div className="mb-2 flex justify-between gap-2">
                          <span className="font-medium text-gray-800">{goal.name}</span>
                          <span>{goal.progress.toFixed(0)}%</span>
                        </div>
                        <ProgressBar value={goal.progress} className="bg-green-600" />
                        <p className="mt-2 text-gray-500">{formatCurrency(goal.current)} / {formatCurrency(goal.target)}</p>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">Highlights & Recent Activity</h2>
                <div className="space-y-4">
                  {review.highlights.largestExpense && (
                    <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm">
                      <p className="font-medium text-red-900">Largest expense</p>
                      <p className="mt-1 text-red-800">
                        {formatCurrency(review.highlights.largestExpense.amount)} · {review.highlights.largestExpense.category}
                      </p>
                      <p className="text-red-700">{review.highlights.largestExpense.description || 'No description'} · {review.highlights.largestExpense.wallet}</p>
                    </div>
                  )}
                  <div className="space-y-2">
                    {review.recentTransactions.length === 0 ? (
                      <p className="text-sm text-gray-500">Belum ada transaksi di periode ini.</p>
                    ) : (
                      review.recentTransactions.slice(0, 8).map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between gap-4 rounded-lg bg-gray-50 p-3 text-sm">
                          <div>
                            <div className="flex items-center gap-2">
                              {transaction.type === 'INCOME' ? <FiCheckCircle className="text-green-600" /> : <FiAlertCircle className="text-red-600" />}
                              <span className="font-medium text-gray-800">{transaction.description || transaction.category}</span>
                            </div>
                            <p className="mt-1 text-gray-500">{formatDate(transaction.date)} · {transaction.wallet}</p>
                          </div>
                          <span className={transaction.type === 'INCOME' ? 'font-semibold text-green-700' : 'font-semibold text-red-700'}>
                            {transaction.type === 'INCOME' ? '+' : '-'}{formatCurrency(transaction.amount)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
