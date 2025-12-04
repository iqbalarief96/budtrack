import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import {
  buildSpendingPatterns,
  getTopCategories,
  calculateDayOfWeekPatterns,
  compareMonths,
} from '@/lib/spending-insights/pattern-service'
import { SpendingPatternsResponse, DayOfWeekPattern } from '@/app/types/spending-insights'

/**
 * GET /api/insights/patterns - Get spending patterns for the user
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const { searchParams } = new URL(request.url)
    
    // Query params
    const months = parseInt(searchParams.get('months') || '3', 10)
    const topCategoriesLimit = parseInt(searchParams.get('topCategories') || '5', 10)

    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth() - months, 1)

    // Get transactions for the specified period
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        type: { in: ['expense', 'EXPENSE'] }, // Support both cases
        date: { gte: startDate },
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    })
    
    console.log('Found transactions:', transactions.length)

    // Build category map
    const categoryMap = new Map<string, { id: string; name: string; icon: string | null; color: string | null }>()
    for (const tx of transactions) {
      if (tx.category && tx.categoryId) {
        categoryMap.set(tx.categoryId, tx.category)
      }
    }
    categoryMap.set('uncategorized', {
      id: 'uncategorized',
      name: 'Uncategorized',
      icon: null,
      color: null,
    })

    // Transform transactions for pattern analysis
    const txForAnalysis = transactions.map(tx => ({
      id: tx.id,
      amount: tx.amount,
      date: tx.date,
      categoryId: tx.categoryId,
      category: tx.category,
    }))

    // Build spending patterns (Requirements 1.1, 1.2)
    const patterns = buildSpendingPatterns(txForAnalysis, months, categoryMap)

    // Get top categories (Requirements 1.4)
    const topCategories = getTopCategories(patterns, topCategoriesLimit)

    // Calculate day-of-week patterns (Requirements 1.5)
    // Only if we have at least 3 months of data
    let dayOfWeekPatterns: DayOfWeekPattern[] = []
    if (months >= 3 && transactions.length > 0) {
      dayOfWeekPatterns = calculateDayOfWeekPatterns(txForAnalysis)
    }

    // Add month-over-month comparison to patterns (Requirements 1.3)
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    
    const currentMonthTx = transactions.filter(tx => new Date(tx.date) >= currentMonthStart)
    const previousMonthTx = transactions.filter(tx => {
      const txDate = new Date(tx.date)
      return txDate >= previousMonthStart && txDate < currentMonthStart
    })

    const currentTotal = currentMonthTx.reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
    const previousTotal = previousMonthTx.reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
    const monthComparison = compareMonths(currentTotal, previousTotal)

    const response: SpendingPatternsResponse & { monthComparison: typeof monthComparison } = {
      patterns,
      topCategories,
      dayOfWeekPatterns,
      monthComparison,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching spending patterns:', error)
    return NextResponse.json(
      { error: 'Failed to fetch spending patterns' },
      { status: 500 }
    )
  }
}
