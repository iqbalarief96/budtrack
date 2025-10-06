import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// Custom interface for transactions
interface Transaction {
  type: string
  amount: number
  category?: {
    name: string
  }
  description?: string
  date: Date
}

function generateSummaryPrompt(data: {
  totalIncome: number,
  totalExpense: number,
  netSavings: number,
  topExpenses: Array<{category: string, amount: number, percentage: number}>,
  monthlyTrend: {
    incomeChange: number,
    expenseChange: number
  }
}) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  return `Sebagai seorang financial advisor profesional, buatkan ringkasan keuangan singkat dan informatif berdasarkan data berikut:

# Ringkasan Keuangan Bulan Ini

## Data Keuangan
- Total Pemasukan: ${formatCurrency(data.totalIncome)}
- Total Pengeluaran: ${formatCurrency(data.totalExpense)}
- Total Tabungan: ${formatCurrency(data.netSavings)}

## Top 3 Pengeluaran Terbesar
${data.topExpenses.map(exp => `- ${exp.category}: ${formatCurrency(exp.amount)} (${exp.percentage.toFixed(1)}%)`).join('\n')}

## Perubahan dari Bulan Sebelumnya
- Pemasukan: ${data.monthlyTrend.incomeChange.toFixed(1)}%
- Pengeluaran: ${data.monthlyTrend.expenseChange.toFixed(1)}%

Berikan ringkasan dalam format berikut:

1. **Kondisi Keuangan**: Overview kondisi keuangan secara umum
2. **Highlight**: Pengeluaran yang perlu perhatian khusus
3. **Rekomendasi**: Saran berdasarkan tren

*Gunakan bahasa Jaksel Gaul, tapi jangan ada kata jaksel/kata kata yg norak. Fokus pada insight yang paling relevan.*`
}

function generateSmartAnalysisPrompt(data: {
  transactions: Transaction[],
  monthlyData: Record<string, { income: number; expense: number }>,
  categories: Record<string, number>,
  yearlyTotals: {
    income: number,
    expense: number,
    savings: number
  }
}) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  // Calculate monthly averages
  const months = Object.keys(data.monthlyData)
  const avgIncome = months.reduce((sum, month) => sum + data.monthlyData[month].income, 0) / months.length
  const avgExpense = months.reduce((sum, month) => sum + data.monthlyData[month].expense, 0) / months.length

  // Get spending patterns
  const categoryPercentages = Object.entries(data.categories)
    .map(([category, amount]) => ({
      category,
      percentage: ((amount / data.yearlyTotals.expense) * 100).toFixed(1)
    }))
    .sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage))

  return `Sebagai seorang financial analyst profesional, lakukan analisis mendalam terhadap data keuangan berikut:

# ANALISIS KEUANGAN MENDALAM

## RINGKASAN TAHUNAN
- Total Pemasukan: ${formatCurrency(data.yearlyTotals.income)}
- Total Pengeluaran: ${formatCurrency(data.yearlyTotals.expense)}
- Total Tabungan: ${formatCurrency(data.yearlyTotals.savings)}

## RATA-RATA BULANAN
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

    const { walletId, startDate, endDate } = await request.json()

    if (!walletId) {
      return NextResponse.json(
        { error: 'Wallet ID is required' },
        { status: 400 }
      )
    }

    // Get transactions for the period
    const transactions = await prisma.transaction.findMany({
      where: {
        walletId,
        userId: session.user.id,
        date: {
          gte: startDate ? new Date(startDate) : undefined,
          lte: endDate ? new Date(endDate) : undefined,
        }
      },
      include: {
        category: true
      }
    })

    // Calculate insights
    const totalIncome = transactions
      .filter((t: Transaction) => t.type === 'INCOME')
      .reduce((sum: number, t: Transaction) => sum + t.amount, 0)

    const totalExpense = transactions
      .filter((t: Transaction) => t.type === 'EXPENSE')
      .reduce((sum: number, t: Transaction) => sum + t.amount, 0)

    const netSavings = totalIncome - totalExpense

    // Calculate monthly data
    const monthlyData: Record<string, { income: number; expense: number }> = {}
    
    transactions.forEach((t: Transaction) => {
      const monthKey = t.date.toISOString().slice(0, 7) // Format: YYYY-MM
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { income: 0, expense: 0 }
      }
      if (t.type === 'INCOME') {
        monthlyData[monthKey].income += t.amount
      } else {
        monthlyData[monthKey].expense += t.amount
      }
    })

    // Sort monthly data by date
    const sortedMonthlyData: Record<string, { income: number; expense: number }> = {}
    Object.keys(monthlyData)
      .sort()
      .forEach(key => {
        sortedMonthlyData[key] = monthlyData[key]
      })

    // Calculate expenses by category
    const expensesByCategory = transactions
      .filter((t: Transaction) => t.type === 'EXPENSE' && t.category)
      .reduce((acc: Record<string, number>, t: Transaction) => {
        const categoryName = t.category?.name || 'Uncategorized'
        acc[categoryName] = (acc[categoryName] || 0) + t.amount
        return acc
      }, {})

    // Calculate income by category
    const incomeByCategory = transactions
      .filter((t: Transaction) => t.type === 'INCOME' && t.category)
      .reduce((acc: Record<string, number>, t: Transaction) => {
        const categoryName = t.category?.name || 'Uncategorized'
        acc[categoryName] = (acc[categoryName] || 0) + t.amount
        return acc
      }, {})

    // Get settings to check if AI is configured
    const settings = await prisma.userSettings.findUnique({
      where: {
        userId: session.user.id
      }
    })

    // Prepare data for summary prompt
    const months = Object.keys(sortedMonthlyData)
    const lastMonth = months[months.length - 1]
    const previousMonth = months[months.length - 2]
    
    let monthlyTrend = {
      incomeChange: 0,
      expenseChange: 0
    }

    if (lastMonth && previousMonth) {
      const currentData = sortedMonthlyData[lastMonth]
      const previousData = sortedMonthlyData[previousMonth]
      
      monthlyTrend = {
        incomeChange: ((currentData.income - previousData.income) / previousData.income * 100),
        expenseChange: ((currentData.expense - previousData.expense) / previousData.expense * 100)
      }
    }

    // Get top expenses
    const topExpenses = Object.entries(expensesByCategory)
      .map(([category, amount]) => ({
        category,
        amount: amount as number,
        percentage: ((amount as number / totalExpense) * 100)
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3)

    // Generate prompts
    const summaryPrompt = generateSummaryPrompt({
      totalIncome,
      totalExpense,
      netSavings,
      topExpenses,
      monthlyTrend
    })

    const smartAnalysisPrompt = generateSmartAnalysisPrompt({
      transactions,
      monthlyData: sortedMonthlyData,
      categories: expensesByCategory,
      yearlyTotals: {
        income: totalIncome,
        expense: totalExpense,
        savings: netSavings
      }
    })

    // For now, we'll use the summary as the analysis
    // In a real implementation, you would send these prompts to an AI service
    // and get back the generated text
    const analysis = summaryPrompt

    // Return the data and analysis
    return NextResponse.json({
      data: {
        totalIncome,
        totalExpense,
        netSavings,
        expensesByCategory,
        incomeByCategory,
        monthlyData: sortedMonthlyData
      },
      analysis,
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