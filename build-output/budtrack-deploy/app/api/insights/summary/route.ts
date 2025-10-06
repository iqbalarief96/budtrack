import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// Calculate start and end dates for periods
function getDateRange(period: string) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  switch (period) {
    case 'month': {
      // Current month
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      
      // Previous month
      const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
      
      return {
        current: { start: currentMonthStart, end: currentMonthEnd },
        previous: { start: previousMonthStart, end: previousMonthEnd }
      }
    }
    
    case 'week': {
      // Current week (starting Sunday)
      const currentWeekStart = new Date(today)
      currentWeekStart.setDate(today.getDate() - today.getDay())
      const currentWeekEnd = new Date(today)
      
      // Previous week
      const previousWeekStart = new Date(currentWeekStart)
      previousWeekStart.setDate(currentWeekStart.getDate() - 7)
      const previousWeekEnd = new Date(currentWeekStart)
      previousWeekEnd.setDate(previousWeekEnd.getDate() - 1)
      
      return {
        current: { start: currentWeekStart, end: currentWeekEnd },
        previous: { start: previousWeekStart, end: previousWeekEnd }
      }
    }
    
    case '30days': {
      // Last 30 days
      const currentPeriodStart = new Date(today)
      currentPeriodStart.setDate(today.getDate() - 30)
      
      // Previous 30 days before that
      const previousPeriodStart = new Date(currentPeriodStart)
      previousPeriodStart.setDate(currentPeriodStart.getDate() - 30)
      const previousPeriodEnd = new Date(currentPeriodStart)
      previousPeriodEnd.setDate(previousPeriodEnd.getDate() - 1)
      
      return {
        current: { start: currentPeriodStart, end: today },
        previous: { start: previousPeriodStart, end: previousPeriodEnd }
      }
    }
    
    default: {
      // Default to month
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      
      // Previous month
      const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
      
      return {
        current: { start: currentMonthStart, end: currentMonthEnd },
        previous: { start: previousMonthStart, end: previousMonthEnd }
      }
    }
  }
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

    // Determine current and previous period dates
    const now = new Date()
    let currentPeriodStart: Date
    let currentPeriodEnd: Date = now
    let previousPeriodStart: Date
    let previousPeriodEnd: Date

    if (period === 'month') {
      // Current period: this month
      currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1)
      
      // Previous period: last month
      previousPeriodEnd = new Date(currentPeriodStart)
      previousPeriodEnd.setDate(previousPeriodEnd.getDate() - 1)
      previousPeriodStart = new Date(previousPeriodEnd.getFullYear(), previousPeriodEnd.getMonth(), 1)
    } else if (period === 'quarter') {
      // Current period: this quarter
      const currentQuarter = Math.floor(now.getMonth() / 3)
      currentPeriodStart = new Date(now.getFullYear(), currentQuarter * 3, 1)
      
      // Previous period: last quarter
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
      // Default to 'year'
      // Current period: this year
      currentPeriodStart = new Date(now.getFullYear(), 0, 1)
      
      // Previous period: last year
      previousPeriodStart = new Date(now.getFullYear() - 1, 0, 1)
      previousPeriodEnd = new Date(now.getFullYear() - 1, 11, 31)
    }

    // Get current period data
    const currentPeriodIncome = await prisma.transaction.aggregate({
      where: {
        walletId,
        userId: session.user.id,
        type: 'INCOME',
        date: {
          gte: currentPeriodStart,
          lte: currentPeriodEnd
        }
      },
      _sum: {
        amount: true
      }
    })

    const currentPeriodExpense = await prisma.transaction.aggregate({
      where: {
        walletId,
        userId: session.user.id,
        type: 'EXPENSE',
        date: {
          gte: currentPeriodStart,
          lte: currentPeriodEnd
        }
      },
      _sum: {
        amount: true
      }
    })

    // Get previous period data
    const previousPeriodIncome = await prisma.transaction.aggregate({
      where: {
        walletId,
        userId: session.user.id,
        type: 'INCOME',
        date: {
          gte: previousPeriodStart,
          lte: previousPeriodEnd
        }
      },
      _sum: {
        amount: true
      }
    })

    const previousPeriodExpense = await prisma.transaction.aggregate({
      where: {
        walletId,
        userId: session.user.id,
        type: 'EXPENSE',
        date: {
          gte: previousPeriodStart,
          lte: previousPeriodEnd
        }
      },
      _sum: {
        amount: true
      }
    })

    // Calculate totals and savings
    const currentIncome = currentPeriodIncome._sum.amount || 0
    const currentExpense = currentPeriodExpense._sum.amount || 0
    const previousIncome = previousPeriodIncome._sum.amount || 0
    const previousExpense = previousPeriodExpense._sum.amount || 0

    const response = {
      currentPeriod: {
        income: currentIncome,
        expense: currentExpense,
        savings: currentIncome - currentExpense
      },
      previousPeriod: {
        income: previousIncome,
        expense: previousExpense,
        savings: previousIncome - previousExpense
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error calculating summary:', error)
    return NextResponse.json({ error: 'Failed to calculate summary data' }, { status: 500 })
  }
} 