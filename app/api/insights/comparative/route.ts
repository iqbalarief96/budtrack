import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

interface PeriodOption {
  startDate: Date
  endDate: Date
  label: string
}

// Helper to get date ranges for comparative analysis
function getDateRanges(period: string): PeriodOption[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  switch (period) {
    case '7days': {
      // Compare last 7 days for 4 weeks
      const periods: PeriodOption[] = []
      for (let i = 0; i < 4; i++) {
        const endDate = new Date(today)
        endDate.setDate(today.getDate() - (i * 7))
        const startDate = new Date(endDate)
        startDate.setDate(endDate.getDate() - 6)
        periods.push({
          startDate,
          endDate,
          label: `Week ${i + 1}`
        })
      }
      return periods
    }
    
    case '30days': {
      // Compare last 30 days for past 4 months
      const periods: PeriodOption[] = []
      for (let i = 0; i < 4; i++) {
        const endDate = new Date(today)
        endDate.setDate(today.getDate() - (i * 30))
        const startDate = new Date(endDate)
        startDate.setDate(endDate.getDate() - 29)
        periods.push({
          startDate,
          endDate,
          label: `Month ${i + 1}`
        })
      }
      return periods
    }
    
    case 'month': {
      // Compare last 6 months
      const periods: PeriodOption[] = []
      for (let i = 0; i < 6; i++) {
        const year = now.getFullYear()
        const month = now.getMonth() - i
        const adjustedYear = month < 0 ? year - 1 : year
        const adjustedMonth = month < 0 ? 12 + month : month
        
        const startDate = new Date(adjustedYear, adjustedMonth, 1)
        const endDate = new Date(adjustedYear, adjustedMonth + 1, 0)
        
        const monthNames = [
          'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ]
        periods.push({
          startDate,
          endDate,
          label: `${monthNames[adjustedMonth]} ${adjustedYear}`
        })
      }
      return periods
    }
    
    case '3months': {
      // Compare last 4 quarters
      const periods: PeriodOption[] = []
      for (let i = 0; i < 4; i++) {
        const endDate = new Date(today)
        endDate.setMonth(now.getMonth() - (i * 3))
        const startDate = new Date(endDate)
        startDate.setMonth(endDate.getMonth() - 2)
        startDate.setDate(1)
        endDate.setDate(new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate())
        
        periods.push({
          startDate,
          endDate,
          label: `Q${4 - i} ${endDate.getFullYear()}`
        })
      }
      return periods
    }
    
    case '6months': {
      // Compare last 4 half-years
      const periods: PeriodOption[] = []
      for (let i = 0; i < 4; i++) {
        const endDate = new Date(today)
        endDate.setMonth(now.getMonth() - (i * 6))
        const startDate = new Date(endDate)
        startDate.setMonth(endDate.getMonth() - 5)
        startDate.setDate(1)
        endDate.setDate(new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate())
        
        const half = endDate.getMonth() < 6 ? 'H1' : 'H2'
        periods.push({
          startDate,
          endDate,
          label: `${half} ${endDate.getFullYear()}`
        })
      }
      return periods
    }
    
    case 'year': {
      // Compare last 3 years by quarter
      const periods: PeriodOption[] = []
      const currentYear = now.getFullYear()
      
      for (let year = currentYear; year > currentYear - 3; year--) {
        for (let quarter = 0; quarter < 4; quarter++) {
          const startMonth = quarter * 3
          const startDate = new Date(year, startMonth, 1)
          const endDate = new Date(year, startMonth + 3, 0)
          
          // Skip future quarters
          if (endDate > now) continue
          
          periods.push({
            startDate,
            endDate,
            label: `Q${quarter + 1} ${year}`
          })
        }
      }
      return periods
    }
    
    default: {
      // Default to last 6 months
      const periods: PeriodOption[] = []
      for (let i = 0; i < 6; i++) {
        const year = now.getFullYear()
        const month = now.getMonth() - i
        const adjustedYear = month < 0 ? year - 1 : year
        const adjustedMonth = month < 0 ? 12 + month : month
        
        const startDate = new Date(adjustedYear, adjustedMonth, 1)
        const endDate = new Date(adjustedYear, adjustedMonth + 1, 0)
        
        const monthNames = [
          'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ]
        periods.push({
          startDate,
          endDate,
          label: `${monthNames[adjustedMonth]} ${adjustedYear}`
        })
      }
      return periods
    }
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

    const { walletId, period } = await request.json()

    if (!walletId) {
      return NextResponse.json(
        { error: 'Wallet ID is required' },
        { status: 400 }
      )
    }

    // Get date ranges for the selected period
    const dateRanges = getDateRanges(period || 'month')
    
    // Process data for each period
    const periodLabels: string[] = []
    const incomeData: number[] = []
    const expenseData: number[] = []
    const savingsData: number[] = []
    const savingsRateData: number[] = []
    
    const earliestStart = dateRanges.reduce(
      (earliest, range) => (range.startDate < earliest ? range.startDate : earliest),
      dateRanges[0].startDate
    )
    const latestEnd = dateRanges.reduce(
      (latest, range) => (range.endDate > latest ? range.endDate : latest),
      dateRanges[0].endDate
    )

    const allTransactions = await prisma.transaction.findMany({
      where: {
        walletId,
        userId: session.user.id,
        date: {
          gte: earliestStart,
          lte: latestEnd,
        }
      }
    })

    const now = new Date()

    for (const range of dateRanges) {
      const periodStart = new Date(range.startDate.getFullYear(), range.startDate.getMonth(), range.startDate.getDate(), 0, 0, 0, 0)
      const rawEnd = new Date(range.endDate.getFullYear(), range.endDate.getMonth(), range.endDate.getDate(), 23, 59, 59, 999)
      const periodEnd = rawEnd > now ? now : rawEnd

      const transactions = allTransactions.filter(tx => {
        const txDate = new Date(tx.date)
        return txDate >= periodStart && txDate <= periodEnd
      })
      
      // Calculate totals
      const totalIncome = transactions
        .filter(t => t.type === 'INCOME')
        .reduce((sum, t) => sum + t.amount, 0)
        
      const totalExpense = transactions
        .filter(t => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + t.amount, 0)
        
      const netSavings = totalIncome - totalExpense
      
      // Calculate savings rate (as percentage)
      const savingsRate = totalIncome > 0 
        ? (netSavings / totalIncome) * 100 
        : 0
      
      // Add to datasets
      periodLabels.push(range.label)
      incomeData.push(Number(totalIncome.toFixed(2)))
      expenseData.push(Number(totalExpense.toFixed(2)))
      savingsData.push(Number(netSavings.toFixed(2)))
      savingsRateData.push(parseFloat(savingsRate.toFixed(1)))
    }
    
    // Return data in reverse order (most recent first)
    return NextResponse.json({
      periods: periodLabels.reverse(),
      incomeData: incomeData.reverse(),
      expenseData: expenseData.reverse(),
      savingsData: savingsData.reverse(),
      savingsRateData: savingsRateData.reverse()
    })
    
  } catch (error) {
    console.error('Error generating comparative insights:', error)
    return NextResponse.json(
      { error: 'Failed to generate comparative insights' },
      { status: 500 }
    )
  }
} 
