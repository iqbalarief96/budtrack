import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { generateAIResponse } from '@/lib/ai'

function getPeriodContext(period?: string) {
  switch (period) {
    case 'month':
      return { summaryTitle: 'Bulan Ini', previousLabel: 'bulan lalu', displayName: 'Bulanan', labelSingular: 'bulan' }
    case 'quarter':
      return { summaryTitle: 'Kuartal Ini', previousLabel: 'kuartal lalu', displayName: 'Kuartalan', labelSingular: 'kuartal' }
    case 'year':
    default:
      return { summaryTitle: 'Tahun Ini', previousLabel: 'tahun lalu', displayName: 'Tahunan', labelSingular: 'tahun' }
  }
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)

const buildFallbackInsight = (
  currentIncome: number,
  currentExpense: number,
  currentSavings: number,
  incomeChangePct: number,
  expenseChangePct: number
) => {
  if (currentSavings > 0) {
    const savingsRate = currentIncome > 0 ? (currentSavings / currentIncome) * 100 : 0
    return {
      tone: (savingsRate >= 20 ? 'positive' : 'neutral') as 'positive' | 'neutral',
      text:
        savingsRate >= 20
          ? `Cashflow kamu surplus ${formatCurrency(currentSavings)} dengan savings rate ${savingsRate.toFixed(1)}%. Pertahankan strategi ini!`
          : `Kamu berhasil catat surplus ${formatCurrency(currentSavings)}. Coba boost tabungan sedikit lagi supaya savings rate makin cakep.`
    }
  }

  if (currentSavings < 0) {
    return {
      tone: 'negative' as 'negative',
      text: `Cashflow defisit ${formatCurrency(Math.abs(currentSavings))}. Tinjau pos pengeluaran yang naik ${expenseChangePct.toFixed(1)}% dari periode lalu.`
    }
  }

  if (incomeChangePct < -10) {
    return {
      tone: 'warning' as 'warning',
      text: `Income turun ${Math.abs(incomeChangePct).toFixed(1)}%. Pastikan pemasukan rutin sudah tercatat atau cari peluang income tambahan.`
    }
  }

  if (expenseChangePct > 15) {
    return {
      tone: 'warning' as 'warning',
      text: `Pengeluaran naik ${expenseChangePct.toFixed(1)}%. Cek kategori terbesar dan coba rem biaya yang nggak urgent.`
    }
  }

  return {
    tone: 'neutral' as 'neutral',
    text: 'Cashflow kamu stabil. Kalau mau meningkatkan tabungan, targetkan surplus kecil secara konsisten tiap periode.'
  }
}

function generateMiniSummaryPrompt(
  data: {
    totalIncome: number
    totalExpense: number
    netSavings: number
    periodTrend: {
      incomeChange: number
      expenseChange: number
    }
  },
  context: {
    summaryTitle: string
    previousLabel: string
    displayName: string
  }
) {
  return `Buat ringkasan keuangan singkat (maks 2 kalimat) untuk pengguna Budtrack. Gaya bahasa profesional santai, campuran Indo dan sedikit English yang natural. Fokuskan pada highlight utama dan perbandingan dari ${context.previousLabel}.

Data:
- Periode: ${context.summaryTitle} (${context.displayName})
- Total Pemasukan: ${formatCurrency(data.totalIncome)}
- Total Pengeluaran: ${formatCurrency(data.totalExpense)}
- Tabungan Bersih: ${formatCurrency(data.netSavings)}
- Perubahan pemasukan: ${data.periodTrend.incomeChange.toFixed(1)}%
- Perubahan pengeluaran: ${data.periodTrend.expenseChange.toFixed(1)}%

Output:
- Jangan pakai bullet atau heading
- Panjang maksimal 220 karakter
- Jangan sebut 'AI' atau 'asisten'`
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { walletId, period } = await req.json()

    if (!walletId) {
      return NextResponse.json({ error: 'Wallet ID is required' }, { status: 400 })
    }

    const now = new Date()
    let currentPeriodStart: Date
    let currentPeriodEnd: Date = now
    let previousPeriodStart: Date
    let previousPeriodEnd: Date

    if (period === 'month') {
      currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1)
      previousPeriodEnd = new Date(currentPeriodStart)
      previousPeriodEnd.setDate(previousPeriodEnd.getDate() - 1)
      previousPeriodStart = new Date(previousPeriodEnd.getFullYear(), previousPeriodEnd.getMonth(), 1)
    } else if (period === 'quarter') {
      const currentQuarter = Math.floor(now.getMonth() / 3)
      currentPeriodStart = new Date(now.getFullYear(), currentQuarter * 3, 1)
      previousPeriodEnd = new Date(currentPeriodStart)
      previousPeriodEnd.setDate(previousPeriodEnd.getDate() - 1)
      const previousQuarter = previousPeriodEnd.getMonth() < 3
        ? 3
        : Math.floor(previousPeriodEnd.getMonth() / 3) * 3
      previousPeriodStart = new Date(
        previousPeriodEnd.getMonth() < 3 ? previousPeriodEnd.getFullYear() - 1 : previousPeriodEnd.getFullYear(),
        previousQuarter,
        1
      )
    } else {
      currentPeriodStart = new Date(now.getFullYear(), 0, 1)
      previousPeriodStart = new Date(now.getFullYear() - 1, 0, 1)
      previousPeriodEnd = new Date(now.getFullYear() - 1, 11, 31)
    }

    const currentPeriodIncome = await prisma.transaction.aggregate({
      where: {
        walletId,
        userId: session.user.id,
        type: { in: ['income', 'INCOME'] },
        date: {
          gte: currentPeriodStart,
          lte: currentPeriodEnd
        }
      },
      _sum: { amount: true }
    })

    const currentPeriodExpense = await prisma.transaction.aggregate({
      where: {
        walletId,
        userId: session.user.id,
        type: { in: ['expense', 'EXPENSE'] },
        date: {
          gte: currentPeriodStart,
          lte: currentPeriodEnd
        }
      },
      _sum: { amount: true }
    })

    const previousPeriodIncome = await prisma.transaction.aggregate({
      where: {
        walletId,
        userId: session.user.id,
        type: { in: ['income', 'INCOME'] },
        date: {
          gte: previousPeriodStart,
          lte: previousPeriodEnd
        }
      },
      _sum: { amount: true }
    })

    const previousPeriodExpense = await prisma.transaction.aggregate({
      where: {
        walletId,
        userId: session.user.id,
        type: { in: ['expense', 'EXPENSE'] },
        date: {
          gte: previousPeriodStart,
          lte: previousPeriodEnd
        }
      },
      _sum: { amount: true }
    })

    const currentIncome = currentPeriodIncome._sum.amount || 0
    const currentExpense = currentPeriodExpense._sum.amount || 0
    const currentSavings = currentIncome - currentExpense

    const previousIncome = previousPeriodIncome._sum.amount || 0
    const previousExpense = previousPeriodExpense._sum.amount || 0
    const previousSavings = previousIncome - previousExpense

    const incomeChange = previousIncome !== 0 ? ((currentIncome - previousIncome) / Math.abs(previousIncome)) * 100 : currentIncome > 0 ? 100 : 0
    const expenseChange = previousExpense !== 0 ? ((currentExpense - previousExpense) / Math.abs(previousExpense)) * 100 : currentExpense > 0 ? 100 : 0

    let summaryInsight: { text: string; tone: 'positive' | 'negative' | 'warning' | 'neutral'; source: 'fallback' | 'ai' } | null = null

    try {
      const userSettings = await prisma.userSettings.findUnique({
        where: { userId: session.user.id }
      })

      if (userSettings?.provider && userSettings?.apiKey && userSettings?.selectedModel) {
        const periodContext = getPeriodContext(period)
        const miniPrompt = generateMiniSummaryPrompt(
          {
            totalIncome: currentIncome,
            totalExpense: currentExpense,
            netSavings: currentSavings,
            periodTrend: {
              incomeChange,
              expenseChange
            }
          },
          periodContext
        )

        const aiResponse = await generateAIResponse({
          prompt: miniPrompt,
          provider: userSettings.provider,
          apiKey: userSettings.apiKey,
          model: userSettings.selectedModel
        })

        const trimmed = aiResponse.trim().replace(/^[\s"'`]+|[\s"'`]+$/g, '')
        if (trimmed.length > 0) {
          summaryInsight = {
            text: trimmed.length > 220 ? `${trimmed.slice(0, 217)}...` : trimmed,
            tone: currentSavings >= 0 ? (currentSavings > 0 ? 'positive' : 'neutral') : 'negative',
            source: 'ai'
          }
        }
      }
    } catch (aiError) {
      console.warn('Failed to generate AI summary insight:', aiError)
      summaryInsight = null
    }

    if (!summaryInsight) {
      const fallback = buildFallbackInsight(currentIncome, currentExpense, currentSavings, incomeChange, expenseChange)
      summaryInsight = { ...fallback, source: 'fallback' }
    }

    const response = {
      currentPeriod: {
        income: currentIncome,
        expense: currentExpense,
        savings: currentSavings
      },
      previousPeriod: {
        income: previousIncome,
        expense: previousExpense,
        savings: previousSavings
      },
      meta: {
        insight: summaryInsight,
        comparison: {
          incomeChangePct: incomeChange,
          expenseChangePct: expenseChange
        }
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error calculating summary:', error)
    return NextResponse.json({ error: 'Failed to calculate summary data' }, { status: 500 })
  }
} 
