import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import {
  buildDeepAnalysisPrompt,
  buildSmartAnalysisFacts,
  buildStructuredAnalysisPrompt,
  isSavingsTransaction,
  percentChange,
} from '@/lib/smart-analysis'

interface Transaction {
  type: string
  amount: number
  category?: {
    name: string
    type?: string | null
  }
  description?: string
  date: Date
}

type PeriodKey = 'month' | 'quarter' | 'year'

const PERIOD_CONFIG: Record<PeriodKey, {
  displayName: string
  summaryTitle: string
  previousLabel: string
  labelSingular: string
  periodCount: number
  monthsPerPeriod: number
}> = {
  month: {
    displayName: 'Bulanan',
    summaryTitle: 'Bulan Ini',
    previousLabel: 'Bulan Sebelumnya',
    labelSingular: 'bulan',
    periodCount: 6,
    monthsPerPeriod: 1
  },
  quarter: {
    displayName: 'Kuartalan',
    summaryTitle: 'Kuartal Ini',
    previousLabel: 'Kuartal Sebelumnya',
    labelSingular: 'kuartal',
    periodCount: 6,
    monthsPerPeriod: 3
  },
  year: {
    displayName: 'Tahunan',
    summaryTitle: 'Tahun Ini',
    previousLabel: 'Tahun Sebelumnya',
    labelSingular: 'tahun',
    periodCount: 5,
    monthsPerPeriod: 12
  }
}

const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
const endOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)
const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
const startOfQuarter = (date: Date) => {
  const quarter = Math.floor(date.getMonth() / 3) * 3
  return new Date(date.getFullYear(), quarter, 1)
}
const endOfQuarter = (date: Date) => new Date(startOfQuarter(date).getFullYear(), startOfQuarter(date).getMonth() + 3, 0, 23, 59, 59, 999)
const startOfYear = (date: Date) => new Date(date.getFullYear(), 0, 1)
const endOfYear = (date: Date) => new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999)
const addMonths = (date: Date, months: number) => new Date(date.getFullYear(), date.getMonth() + months, 1)
const addYears = (date: Date, years: number) => new Date(date.getFullYear() + years, 0, 1)
const getQuarter = (date: Date) => Math.floor(date.getMonth() / 3) + 1

const formatMonthLabel = (date: Date) =>
  new Intl.DateTimeFormat('id-ID', { month: 'short', year: 'numeric' }).format(date)
const formatQuarterLabel = (date: Date) => `Q${getQuarter(date)} ${date.getFullYear()}`
const formatYearLabel = (date: Date) => `${date.getFullYear()}`

const startOfPeriod = (date: Date, period: PeriodKey) => {
  if (period === 'quarter') return startOfQuarter(date)
  if (period === 'year') return startOfYear(date)
  return startOfMonth(date)
}

function sumMonthsData(
  monthlyMap: Map<string, { income: number; expense: number }>,
  periodStart: Date,
  months: number,
  summaryEnd: Date
) {
  let income = 0
  let expense = 0
  for (let offset = 0; offset < months; offset++) {
    const currentMonth = addMonths(periodStart, offset)
    if (currentMonth > summaryEnd) break
    const data = monthlyMap.get(monthKey(currentMonth))
    if (data) {
      income += data.income
      expense += data.expense
    }
  }
  return { income, expense }
}

function buildTrendSeries(
  monthlyMap: Map<string, { income: number; expense: number }>,
  trendStart: Date,
  summaryEnd: Date,
  period: PeriodKey
) {
  const config = PERIOD_CONFIG[period]
  const labels: string[] = []
  const incomeSeries: number[] = []
  const expenseSeries: number[] = []
  const netSeries: number[] = []

  const startBoundary = startOfPeriod(trendStart, period)
  const endPeriodStart = startOfPeriod(summaryEnd, period)
  const monthsBack = config.monthsPerPeriod * (config.periodCount - 1)
  let currentStart = addMonths(endPeriodStart, -monthsBack)
  if (currentStart < startBoundary) {
    currentStart = startBoundary
  }

  const maxIterations = config.periodCount + 3
  let iterations = 0

  while (currentStart <= summaryEnd && labels.length < config.periodCount && iterations < maxIterations) {
    const { income, expense } = sumMonthsData(
      monthlyMap,
      currentStart,
      config.monthsPerPeriod,
      summaryEnd
    )

    let label: string
    if (period === 'quarter') {
      label = formatQuarterLabel(currentStart)
    } else if (period === 'year') {
      label = formatYearLabel(currentStart)
    } else {
      label = formatMonthLabel(currentStart)
    }

    labels.push(label)
    incomeSeries.push(income)
    expenseSeries.push(expense)
    netSeries.push(income - expense)

    currentStart = addMonths(currentStart, config.monthsPerPeriod)
    iterations += 1
  }

  // Trim leading zero periods if there is data in later periods
  while (
    labels.length > 1 &&
    incomeSeries[0] === 0 &&
    expenseSeries[0] === 0 &&
    (incomeSeries.slice(1).some(value => value !== 0) || expenseSeries.slice(1).some(value => value !== 0))
  ) {
    labels.shift()
    incomeSeries.shift()
    expenseSeries.shift()
    netSeries.shift()
  }

  return {
    labels,
    income: incomeSeries,
    expense: expenseSeries,
    net: netSeries,
    grouping: period
  }
}

const getPeriodConfig = (period?: string): PeriodKey => {
  if (period === 'quarter' || period === 'year') return period
  return 'month'
}

function resolveDateRanges(
  period: PeriodKey,
  startDate?: string,
  endDate?: string
) {
  const now = new Date()
  const config = PERIOD_CONFIG[period]
  const hasCustomRange = Boolean(startDate && endDate)

  let summaryStart: Date
  let summaryEnd: Date

  if (hasCustomRange) {
    summaryStart = startOfDay(new Date(startDate!))
    summaryEnd = endOfDay(new Date(endDate!))
  } else {
    if (period === 'quarter') {
      summaryStart = startOfQuarter(now)
      summaryEnd = endOfQuarter(now)
    } else if (period === 'year') {
      summaryStart = startOfYear(now)
      summaryEnd = endOfYear(now)
    } else {
      summaryStart = startOfMonth(now)
      summaryEnd = endOfMonth(now)
    }
  }

  if (summaryEnd > now) {
    summaryEnd = endOfDay(now)
  }

  const endPeriodStart = startOfPeriod(summaryEnd, period)
  const monthsBack = config.monthsPerPeriod * (config.periodCount - 1)
  let trendStart = addMonths(endPeriodStart, -monthsBack)
  if (trendStart > summaryStart) {
    trendStart = summaryStart
  }
  if (trendStart < startOfPeriod(summaryStart, period)) {
    trendStart = startOfPeriod(summaryStart, period)
  }

  return {
    summaryStart,
    summaryEnd,
    trendStart
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const walletId = body.walletId as string | undefined
    const selectedPeriod = getPeriodConfig(body.period)
    const startDate = body.startDate as string | undefined
    const endDate = body.endDate as string | undefined

    if (!walletId) {
      return NextResponse.json(
        { error: 'Wallet ID is required' },
        { status: 400 }
      )
    }

    const { summaryStart, summaryEnd, trendStart } = resolveDateRanges(selectedPeriod, startDate, endDate)

    const transactionsRaw = await prisma.transaction.findMany({
      where: {
        walletId,
        userId: session.user.id,
        date: {
          gte: trendStart,
          lte: summaryEnd,
        }
      },
      include: {
        category: {
          select: {
            name: true,
            type: true
          }
        }
      }
    })

    const transactions: Transaction[] = transactionsRaw.map(t => ({
      type: t.type,
      amount: t.amount,
      category: t.category ? { name: t.category.name, type: t.category.type } : undefined,
      description: t.description || undefined,
      date: t.date
    }))

    const summaryTransactions = transactions.filter(t => t.date >= summaryStart && t.date <= summaryEnd)

    const totalIncome = summaryTransactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0)

    const totalExpense = summaryTransactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0)

    const netSavings = totalIncome - totalExpense

    // Build monthly data map for trend calculations
    const monthlyMap = new Map<string, { income: number; expense: number }>()
    transactions.forEach(t => {
      if (t.date < trendStart || t.date > summaryEnd) return
      const key = monthKey(t.date)
      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, { income: 0, expense: 0 })
      }
      const item = monthlyMap.get(key)!
      if (t.type === 'INCOME') {
        item.income += t.amount
      } else if (t.type === 'EXPENSE') {
        item.expense += t.amount
      }
      monthlyMap.set(key, item)
    })

    const sortedMonthlyData: Record<string, { income: number; expense: number }> = {}
    Array.from(monthlyMap.entries())
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .forEach(([key, value]) => {
        sortedMonthlyData[key] = value
      })

    // Build trend series
    const trendSeries = buildTrendSeries(monthlyMap, trendStart, summaryEnd, selectedPeriod)

    // null = no previous-period baseline (previously reported as a fake +100%)
    const lastTwo = (series: number[]) =>
      series.length >= 2 ? percentChange(series[series.length - 2], series[series.length - 1]) : null
    const incomeChange = lastTwo(trendSeries.income)
    const expenseChange = lastTwo(trendSeries.expense)

    const summaryCategoryTotals = summaryTransactions
      .filter(t => t.type === 'EXPENSE' && t.category)
      .reduce<Record<string, number>>((acc, t) => {
        const categoryName = t.category?.name || 'Uncategorized'
        acc[categoryName] = (acc[categoryName] || 0) + t.amount
        return acc
      }, {})

    const totalExpenseSafe = totalExpense === 0 ? 1 : totalExpense

    const categoriesOrdered = Object.entries(summaryCategoryTotals)
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: (amount / totalExpenseSafe) * 100
      }))
      .sort((a, b) => b.amount - a.amount)

    let categoryBreakdown = categoriesOrdered
    if (categoriesOrdered.length > 8) {
      const topCategories = categoriesOrdered.slice(0, 7)
      const others = categoriesOrdered.slice(7)
      const othersAmount = others.reduce((sum, cat) => sum + cat.amount, 0)
      if (othersAmount > 0) {
        topCategories.push({
          name: 'Lainnya',
          amount: othersAmount,
          percentage: (othersAmount / totalExpenseSafe) * 100
        })
      }
      categoryBreakdown = topCategories
    }

    const incomeByCategory = summaryTransactions
      .filter(t => t.type === 'INCOME' && t.category)
      .reduce((acc: Record<string, number>, t: Transaction) => {
        const categoryName = t.category?.name || 'Uncategorized'
        acc[categoryName] = (acc[categoryName] || 0) + t.amount
        return acc
      }, {})

    const periodContext = PERIOD_CONFIG[selectedPeriod]

    // Average per SELECTED period (month/quarter/year): trendSeries is already
    // aggregated per period, so average its buckets (not raw months).
    const avgPeriods = trendSeries.income.length
    const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
    const avgIncome = mean(trendSeries.income)
    const avgExpense = mean(trendSeries.expense)

    // Savings transfers per transaction, with the same rule the transaction
    // flow uses to auto-route into a savings wallet (incl. generic categories
    // whose description says "tabungan"), plus category type SAVINGS.
    const summaryExpenses = summaryTransactions.filter(t => t.type === 'EXPENSE')
    const savingsTransfers = summaryExpenses
      .filter(t => isSavingsTransaction({ description: t.description, categoryName: t.category?.name, categoryType: t.category?.type }))
      .reduce((sum, t) => sum + t.amount, 0)
    const savingsCategoryNames = Array.from(new Set(
      summaryExpenses
        .filter(t => (t.category?.type || '').toUpperCase() === 'SAVINGS' && t.category?.name)
        .map(t => t.category!.name)
    ))

    // Single set of server-computed facts feeds BOTH prompts and the UI, so
    // the cards and the long analysis can't disagree on numbers.
    const facts = buildSmartAnalysisFacts({
      periodLabel: periodContext.summaryTitle,
      previousLabel: periodContext.previousLabel,
      unitLabel: periodContext.labelSingular,
      totalIncome,
      totalExpense,
      categoryTotals: summaryCategoryTotals,
      incomeChange,
      expenseChange,
      avgIncome,
      avgExpense,
      avgPeriods,
      savingsCategoryNames,
      savingsTransfers,
    })
    const structuredPrompt = buildStructuredAnalysisPrompt(facts)
    const deepAnalysisPrompt = buildDeepAnalysisPrompt(facts)

    return NextResponse.json({
      data: {
        totalIncome,
        totalExpense,
        netSavings,
        period: selectedPeriod,
        summaryRange: {
          start: summaryStart,
          end: summaryEnd
        },
        trend: trendSeries,
        categoryBreakdown: categoryBreakdown.map(cat => ({
          name: cat.name,
          amount: Number(cat.amount.toFixed(2)),
          percentage: Number(cat.percentage.toFixed(1))
        })),
        incomeByCategory,
        expensesByCategory: summaryCategoryTotals,
        monthlyData: sortedMonthlyData
      },
      facts,
      structuredPrompt,
      deepAnalysisPrompt,
      // Legacy alias: a client bundle loaded before this deploy sends this as
      // `analysisPrompt` to /generate (which still accepts it).
      smartAnalysisPrompt: deepAnalysisPrompt
    })

  } catch (error) {
    console.error('Error analyzing transactions:', error)
    return NextResponse.json(
      { error: 'Failed to analyze transactions' },
      { status: 500 }
    )
  }
}
