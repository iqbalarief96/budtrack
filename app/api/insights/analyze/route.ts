import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

interface Transaction {
  type: string
  amount: number
  category?: {
    name: string
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

function generateSummaryPrompt(
  data: {
    totalIncome: number
    totalExpense: number
    netSavings: number
    topExpenses: Array<{ category: string; amount: number; percentage: number }>
    periodTrend: {
      incomeChange: number
      expenseChange: number
    }
  },
  context: {
    summaryTitle: string
    previousLabel: string
    displayName: string
    labelSingular: string
  }
) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  return `Sebagai seorang financial advisor profesional, buatkan ringkasan keuangan singkat dan informatif berdasarkan data berikut:

# Ringkasan Keuangan ${context.summaryTitle}

## Data Keuangan (${context.displayName})
- Total Pemasukan: ${formatCurrency(data.totalIncome)}
- Total Pengeluaran: ${formatCurrency(data.totalExpense)}
- Total Tabungan: ${formatCurrency(data.netSavings)}

## Top 3 Pengeluaran Terbesar
${data.topExpenses.map(exp => `- ${exp.category}: ${formatCurrency(exp.amount)} (${exp.percentage.toFixed(1)}%)`).join('\n')}

## Perubahan dari ${context.previousLabel}
- Pemasukan: ${data.periodTrend.incomeChange.toFixed(1)}%
- Pengeluaran: ${data.periodTrend.expenseChange.toFixed(1)}%

Berikan ringkasan dalam format berikut:

1. **Kondisi Keuangan**: Overview kondisi keuangan secara umum
2. **Highlight**: Pengeluaran yang perlu perhatian khusus
3. **Rekomendasi**: Saran berdasarkan tren

*Gunakan bahasa Jaksel Gaul, tapi jangan ada kata jaksel/kata kata yg norak. Fokus pada insight yang paling relevan.*`
}

function generateSmartAnalysisPrompt(
  data: {
    transactions: Transaction[]
    monthlyData: Record<string, { income: number; expense: number }>
    categories: Record<string, number>
    periodTotals: {
      income: number
      expense: number
      savings: number
    }
  },
  context: {
    displayName: string
    labelSingular: string
  }
) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const months = Object.keys(data.monthlyData)
  const avgIncome = months.length > 0
    ? months.reduce((sum, month) => sum + data.monthlyData[month].income, 0) / months.length
    : 0
  const avgExpense = months.length > 0
    ? months.reduce((sum, month) => sum + data.monthlyData[month].expense, 0) / months.length
    : 0

  const totalExpense = data.periodTotals.expense || 1
  const categoryPercentages = Object.entries(data.categories)
    .map(([category, amount]) => ({
      category,
      percentage: ((amount / totalExpense) * 100).toFixed(1)
    }))
    .sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage))

  return `Sebagai seorang financial analyst profesional, lakukan analisis mendalam terhadap data keuangan berikut:

# ANALISIS KEUANGAN MENDALAM (${context.displayName.toUpperCase()})

## RINGKASAN PERIODE
- Total Pemasukan: ${formatCurrency(data.periodTotals.income)}
- Total Pengeluaran: ${formatCurrency(data.periodTotals.expense)}
- Total Tabungan: ${formatCurrency(data.periodTotals.savings)}

## RATA-RATA PER ${context.labelSingular.toUpperCase()}
- Pemasukan: ${formatCurrency(avgIncome)}
- Pengeluaran: ${formatCurrency(avgExpense)}

## DISTRIBUSI PENGELUARAN
${categoryPercentages.map(cat => `- ${cat.category}: ${cat.percentage}%`).join('\n')}

### 1. ANALISIS POLA PENGELUARAN
- Identifikasi kategori pengeluaran yang perlu perhatian khusus
- Analisis apakah distribusi pengeluaran sudah ideal
- Rekomendasi untuk optimasi pengeluaran

### 2. ANALISIS TABUNGAN & KESEHATAN FINANSIAL
- Evaluasi rasio tabungan terhadap pemasukan
- Rekomendasi target tabungan yang ideal
- Saran untuk meningkatkan kesehatan finansial

### 3. REKOMENDASI STRATEGIS
- 2-3 langkah konkret untuk perbaikan keuangan
- Identifikasi potensi penghematan
- Saran alokasi dana yang lebih efektif

*Berikan analisis dalam format yang terstruktur dengan poin-poin yang jelas. Gunakan bahasa Jaksel Gaul, tapi jangan ada kata jaksel/kata kata yg norak.*`
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
            name: true
          }
        }
      }
    })

    const transactions: Transaction[] = transactionsRaw.map(t => ({
      type: t.type,
      amount: t.amount,
      category: t.category ? { name: t.category.name } : undefined,
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

    const incomeChange = trendSeries.income.length >= 2
      ? (() => {
          const prev = trendSeries.income[trendSeries.income.length - 2]
          const curr = trendSeries.income[trendSeries.income.length - 1]
          if (prev === 0) return curr > 0 ? 100 : 0
          return ((curr - prev) / Math.abs(prev)) * 100
        })()
      : 0

    const expenseChange = trendSeries.expense.length >= 2
      ? (() => {
          const prev = trendSeries.expense[trendSeries.expense.length - 2]
          const curr = trendSeries.expense[trendSeries.expense.length - 1]
          if (prev === 0) return curr > 0 ? 100 : 0
          return ((curr - prev) / Math.abs(prev)) * 100
        })()
      : 0

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

    const topExpenses = categoryBreakdown
      .slice(0, 3)
      .map(cat => ({
        category: cat.name,
        amount: cat.amount,
        percentage: cat.percentage
      }))

    const periodContext = PERIOD_CONFIG[selectedPeriod]

    const summaryPrompt = generateSummaryPrompt({
      totalIncome,
      totalExpense,
      netSavings,
      topExpenses,
      periodTrend: {
        incomeChange,
        expenseChange
      }
    }, periodContext)

    const smartAnalysisPrompt = generateSmartAnalysisPrompt({
      transactions,
      monthlyData: sortedMonthlyData,
      categories: summaryCategoryTotals,
      periodTotals: {
        income: totalIncome,
        expense: totalExpense,
        savings: netSavings
      }
    }, periodContext)

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
      summaryPrompt,
      smartAnalysisPrompt
    })

  } catch (error) {
    console.error('Error analyzing transactions:', error)
    return NextResponse.json(
      { error: 'Failed to analyze transactions' },
      { status: 500 }
    )
  }
}
