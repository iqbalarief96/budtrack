import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'

/**
 * GET /api/debts
 * Fetch all debts for the current user
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    const debts = await prisma.debt.findMany({
      where: {
        userId,
      },
      include: {
        payments: {
          orderBy: {
            paymentDate: 'desc',
          },
          take: 5, // Last 5 payments
        },
      },
      orderBy: [
        { isActive: 'desc' },
        { interestRate: 'desc' }, // Highest interest first
      ],
    })

    return NextResponse.json(debts)
  } catch (error: any) {
    console.error('Error fetching debts:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch debts' }, { status: 500 })
  }
}

/**
 * POST /api/debts
 * Create a new debt entry
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
      name,
      type,
      originalAmount,
      currentBalance,
      interestRate,
      minimumPayment,
      dueDay,
      startDate,
      notes,
    } = body

    // Validation
    if (!name || !type || originalAmount == null || currentBalance == null || interestRate == null || minimumPayment == null) {
      return NextResponse.json(
        { error: 'Missing required fields: name, type, originalAmount, currentBalance, interestRate, minimumPayment' },
        { status: 400 }
      )
    }

    if (originalAmount < 0 || currentBalance < 0 || interestRate < 0 || minimumPayment < 0) {
      return NextResponse.json({ error: 'Amounts and rates must be positive' }, { status: 400 })
    }

    const debt = await prisma.debt.create({
      data: {
        userId,
        name,
        type,
        originalAmount,
        currentBalance,
        interestRate,
        minimumPayment,
        dueDay: dueDay || null,
        startDate: startDate ? new Date(startDate) : new Date(),
        notes: notes || null,
        isActive: true,
      },
    })

    return NextResponse.json(debt, { status: 201 })
  } catch (error: any) {
    console.error('Error creating debt:', error)
    return NextResponse.json({ error: error.message || 'Failed to create debt' }, { status: 500 })
  }
}
