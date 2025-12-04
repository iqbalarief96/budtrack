import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import {
  generateSpendingIncreaseInsight,
  generateSpendingDecreaseInsight,
  generateAbsenceInsight,
  generateTransactionSizeInsight,
  generateWeekendPatternInsight,
  calculateWeekendWeekdaySpending,
  calculateDaysSince,
  filterActiveInsights,
  sortInsightsBySeverity,
} from '@/lib/spending-insights/insight-service'
import { InsightsResponse, SpendingInsight } from '@/app/types/spending-insights'

/**
 * GET /api/insights/spending - Get spending insights for the user
 * Requirements: 3.1, 3.2, 3.3, 3.4
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
    const includeRead = searchParams.get('includeRead') === 'true'
    const includeDismissed = searchParams.get('includeDismissed') === 'true'
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    // Get stored insights from database
    const storedInsights = await prisma.spendingInsight.findMany({
      where: {
        userId,
        ...(includeDismissed ? {} : { isDismissed: false }),
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
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    // Transform stored insights
    const insights: SpendingInsight[] = storedInsights.map((insight: {
      id: string
      userId: string
      type: string
      categoryId: string | null
      title: string
      description: string
      severity: string
      data: string
      isRead: boolean
      isDismissed: boolean
      createdAt: Date
      category: { id: string; name: string; icon: string | null; color: string | null } | null
    }) => ({
      id: insight.id,
      userId: insight.userId,
      type: insight.type as SpendingInsight['type'],
      categoryId: insight.categoryId,
      title: insight.title,
      description: insight.description,
      severity: insight.severity as SpendingInsight['severity'],
      data: JSON.parse(insight.data || '{}'),
      isRead: insight.isRead,
      isDismissed: insight.isDismissed,
      createdAt: insight.createdAt,
      category: insight.category,
    }))

    // Generate new insights if no stored insights exist
    if (insights.length === 0) {
      const generatedInsights = await generateNewInsights(userId)
      
      // Store generated insights
      for (const insight of generatedInsights) {
        await prisma.spendingInsight.create({
          data: {
            userId: insight.userId,
            type: insight.type,
            categoryId: insight.categoryId,
            title: insight.title,
            description: insight.description,
            severity: insight.severity,
            data: JSON.stringify(insight.data),
            isRead: false,
            isDismissed: false,
          },
        })
      }
      
      // Return generated insights
      const response: InsightsResponse = {
        insights: generatedInsights.slice(0, limit),
        unreadCount: generatedInsights.filter(i => !i.isRead).length,
      }
      return NextResponse.json(response)
    }

    // Filter and sort
    let filteredInsights = includeDismissed ? insights : filterActiveInsights(insights)
    if (!includeRead) {
      filteredInsights = filteredInsights.filter(i => !i.isRead)
    }
    const sortedInsights = sortInsightsBySeverity(filteredInsights)

    const response: InsightsResponse = {
      insights: sortedInsights,
      unreadCount: insights.filter(i => !i.isRead && !i.isDismissed).length,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching spending insights:', error)
    return NextResponse.json(
      { error: 'Failed to fetch spending insights' },
      { status: 500 }
    )
  }
}

/**
 * Generate new insights based on transaction data
 */
async function generateNewInsights(userId: string): Promise<SpendingInsight[]> {
  const insights: SpendingInsight[] = []
  const now = new Date()
  
  // Get date ranges
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1)

  // Get transactions for current and previous month
  const [currentMonthTx, previousMonthTx, allRecentTx] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        userId,
        type: { in: ['expense', 'EXPENSE'] },
        date: { gte: currentMonthStart },
      },
      include: {
        category: {
          select: { id: true, name: true, icon: true, color: true },
        },
      },
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        type: { in: ['expense', 'EXPENSE'] },
        date: { gte: previousMonthStart, lt: currentMonthStart },
      },
      include: {
        category: {
          select: { id: true, name: true, icon: true, color: true },
        },
      },
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        type: { in: ['expense', 'EXPENSE'] },
        date: { gte: threeMonthsAgo },
      },
      include: {
        category: {
          select: { id: true, name: true, icon: true, color: true },
        },
      },
    }),
  ])

  // Group by category
  const currentByCategory = groupByCategory(currentMonthTx)
  const previousByCategory = groupByCategory(previousMonthTx)

  // Get all categories
  const allCategories = new Set([
    ...currentByCategory.keys(),
    ...previousByCategory.keys(),
  ])

  // Generate spending increase/decrease insights (Requirements 3.1)
  for (const categoryId of allCategories) {
    const currentTxs = currentByCategory.get(categoryId) || []
    const previousTxs = previousByCategory.get(categoryId) || []
    
    const currentAmount = currentTxs.reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
    const previousAmount = previousTxs.reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
    
    const categoryName = currentTxs[0]?.category?.name || previousTxs[0]?.category?.name || 'Unknown'

    // Check for spending increase
    const increaseInsight = generateSpendingIncreaseInsight(
      categoryId,
      categoryName,
      currentAmount,
      previousAmount,
      userId
    )
    if (increaseInsight) {
      insights.push(increaseInsight)
    }

    // Check for spending decrease
    const decreaseInsight = generateSpendingDecreaseInsight(
      categoryId,
      categoryName,
      currentAmount,
      previousAmount,
      userId
    )
    if (decreaseInsight) {
      insights.push(decreaseInsight)
    }

    // Check for transaction size changes (Requirements 3.3)
    const currentAvgSize = currentTxs.length > 0 
      ? currentAmount / currentTxs.length 
      : 0
    const previousAvgSize = previousTxs.length > 0 
      ? previousAmount / previousTxs.length 
      : 0

    const sizeInsight = generateTransactionSizeInsight(
      categoryId,
      categoryName,
      currentAvgSize,
      previousAvgSize,
      userId
    )
    if (sizeInsight) {
      insights.push(sizeInsight)
    }
  }

  // Generate absence insights (Requirements 3.2)
  // Find categories with regular spending that haven't been used recently
  const recentByCategory = groupByCategory(allRecentTx)
  for (const [categoryId, txs] of recentByCategory) {
    if (txs.length >= 3) { // Only for regular categories
      const lastTxDate = txs.reduce((latest, tx) => {
        const txDate = new Date(tx.date)
        return txDate > latest ? txDate : latest
      }, new Date(0))
      
      const daysSince = calculateDaysSince(lastTxDate, now)
      const categoryName = txs[0]?.category?.name || 'Unknown'
      
      const absenceInsight = generateAbsenceInsight(
        categoryId,
        categoryName,
        daysSince,
        userId
      )
      if (absenceInsight) {
        insights.push(absenceInsight)
      }
    }
  }

  // Generate weekend pattern insight (Requirements 3.4)
  const weekendWeekdayData = calculateWeekendWeekdaySpending(
    allRecentTx.map(tx => ({
      id: tx.id,
      amount: tx.amount,
      date: tx.date,
      categoryId: tx.categoryId,
      category: tx.category,
    }))
  )
  
  const weekendInsight = generateWeekendPatternInsight(
    weekendWeekdayData.weekendAverage,
    weekendWeekdayData.weekdayAverage,
    userId
  )
  if (weekendInsight) {
    insights.push(weekendInsight)
  }

  return sortInsightsBySeverity(insights)
}

/**
 * Group transactions by category
 */
function groupByCategory(transactions: Array<{
  id: string
  amount: number
  date: Date
  categoryId: string | null
  category: { id: string; name: string; icon: string | null; color: string | null } | null
}>): Map<string, typeof transactions> {
  const grouped = new Map<string, typeof transactions>()
  
  for (const tx of transactions) {
    const categoryId = tx.categoryId || 'uncategorized'
    const existing = grouped.get(categoryId) || []
    existing.push(tx)
    grouped.set(categoryId, existing)
  }
  
  return grouped
}
