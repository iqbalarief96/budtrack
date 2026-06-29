import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import {
  comparePayoffStrategies,
  calculateSnowballPayoff,
  calculateAvalanchePayoff,
  calculateExtraPaymentImpact,
  generateDebtRecommendations,
  type DebtInput,
  type PayoffStrategy,
} from '@/lib/debtPayoffCalculator'

/**
 * POST /api/debts/payoff-plan
 * Calculate debt payoff strategies
 *
 * Body:
 * - strategy?: 'SNOWBALL' | 'AVALANCHE' | 'COMPARE' (default: 'COMPARE')
 * - extraMonthlyPayment?: number (default: 0)
 * - customDebts?: DebtInput[] (optional - use custom debts instead of user's actual debts)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const body = await req.json()

    const {
      strategy = 'COMPARE',
      extraMonthlyPayment = 0,
      customDebts,
    }: {
      strategy?: 'SNOWBALL' | 'AVALANCHE' | 'COMPARE'
      extraMonthlyPayment?: number
      customDebts?: DebtInput[]
    } = body

    // Validate extra payment
    if (extraMonthlyPayment < 0) {
      return NextResponse.json({ error: 'Extra payment must be positive' }, { status: 400 })
    }

    // Get debts - either custom or from database
    let debts: DebtInput[]

    if (customDebts && Array.isArray(customDebts) && customDebts.length > 0) {
      // Use custom debts for scenario analysis
      debts = customDebts
    } else {
      // Fetch user's active debts from database
      const userDebts = await prisma.debt.findMany({
        where: {
          userId,
          isActive: true,
        },
      })

      if (userDebts.length === 0) {
        return NextResponse.json(
          { error: 'No active debts found. Add debts or provide customDebts for scenario analysis.' },
          { status: 400 }
        )
      }

      // Convert to DebtInput format
      debts = userDebts.map((debt) => ({
        id: debt.id,
        name: debt.name,
        type: debt.type as any,
        currentBalance: debt.currentBalance,
        interestRate: debt.interestRate,
        minimumPayment: debt.minimumPayment,
      }))
    }

    // Calculate based on strategy
    if (strategy === 'COMPARE') {
      const comparison = comparePayoffStrategies(debts, extraMonthlyPayment)
      const recommendations = generateDebtRecommendations(debts, comparison)

      return NextResponse.json({
        strategy: 'COMPARE',
        comparison,
        recommendations,
        debtsAnalyzed: debts.length,
      })
    } else if (strategy === 'SNOWBALL') {
      const plan = calculateSnowballPayoff(debts, extraMonthlyPayment)
      const avalanchePlan = calculateAvalanchePayoff(debts, extraMonthlyPayment)
      const savings = {
        interestSaved: plan.totalInterestPaid - avalanchePlan.totalInterestPaid,
        monthsSaved: plan.monthsToPayoff - avalanchePlan.monthsToPayoff,
      }

      return NextResponse.json({
        strategy: 'SNOWBALL',
        plan,
        savings,
        debtsAnalyzed: debts.length,
      })
    } else if (strategy === 'AVALANCHE') {
      const plan = calculateAvalanchePayoff(debts, extraMonthlyPayment)
      const snowballPlan = calculateSnowballPayoff(debts, extraMonthlyPayment)
      const savings = {
        interestSaved: snowballPlan.totalInterestPaid - plan.totalInterestPaid,
        monthsSaved: snowballPlan.monthsToPayoff - plan.monthsToPayoff,
      }

      return NextResponse.json({
        strategy: 'AVALANCHE',
        plan,
        savings,
        debtsAnalyzed: debts.length,
      })
    } else {
      return NextResponse.json({ error: 'Invalid strategy' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Error calculating payoff plan:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to calculate payoff plan' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/debts/payoff-plan
 * Quick payoff comparison for user's current debts
 *
 * Query params:
 * - extraPayment?: number (default: 0)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const { searchParams } = new URL(req.url)
    const extraPayment = Number(searchParams.get('extraPayment')) || 0

    // Fetch user's active debts
    const userDebts = await prisma.debt.findMany({
      where: {
        userId,
        isActive: true,
      },
    })

    if (userDebts.length === 0) {
      return NextResponse.json({
        hasDebts: false,
        message: 'No active debts found',
      })
    }

    // Convert to DebtInput format
    const debts: DebtInput[] = userDebts.map((debt) => ({
      id: debt.id,
      name: debt.name,
      type: debt.type as any,
      currentBalance: debt.currentBalance,
      interestRate: debt.interestRate,
      minimumPayment: debt.minimumPayment,
    }))

    // Calculate comparison
    const comparison = comparePayoffStrategies(debts, extraPayment)
    const recommendations = generateDebtRecommendations(debts, comparison)

    return NextResponse.json({
      hasDebts: true,
      debtsCount: debts.length,
      totalDebt: debts.reduce((sum, d) => sum + d.currentBalance, 0),
      totalMinimumPayment: debts.reduce((sum, d) => sum + d.minimumPayment, 0),
      comparison,
      recommendations,
    })
  } catch (error: any) {
    console.error('Error fetching payoff plan:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch payoff plan' },
      { status: 500 }
    )
  }
}
