import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'

/**
 * GET /api/debts/[debtId]
 * Fetch a specific debt with all payment history
 */
export async function GET(req: NextRequest, { params }: { params: { debtId: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const { debtId } = params

    const debt = await prisma.debt.findFirst({
      where: {
        id: debtId,
        userId,
      },
      include: {
        payments: {
          orderBy: {
            paymentDate: 'desc',
          },
        },
      },
    })

    if (!debt) {
      return NextResponse.json({ error: 'Debt not found' }, { status: 404 })
    }

    return NextResponse.json(debt)
  } catch (error: any) {
    console.error('Error fetching debt:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch debt' }, { status: 500 })
  }
}

/**
 * PATCH /api/debts/[debtId]
 * Update a debt entry
 */
export async function PATCH(req: NextRequest, { params }: { params: { debtId: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const { debtId } = params
    const body = await req.json()

    // Verify ownership
    const existingDebt = await prisma.debt.findFirst({
      where: {
        id: debtId,
        userId,
      },
    })

    if (!existingDebt) {
      return NextResponse.json({ error: 'Debt not found' }, { status: 404 })
    }

    // Validate numeric fields if provided
    const numericFields = ['currentBalance', 'interestRate', 'minimumPayment', 'originalAmount']
    for (const field of numericFields) {
      if (body[field] != null && body[field] < 0) {
        return NextResponse.json({ error: `${field} must be positive` }, { status: 400 })
      }
    }

    const updatedDebt = await prisma.debt.update({
      where: {
        id: debtId,
      },
      data: {
        ...body,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
      },
    })

    return NextResponse.json(updatedDebt)
  } catch (error: any) {
    console.error('Error updating debt:', error)
    return NextResponse.json({ error: error.message || 'Failed to update debt' }, { status: 500 })
  }
}

/**
 * DELETE /api/debts/[debtId]
 * Delete a debt entry (or mark as inactive)
 */
export async function DELETE(req: NextRequest, { params }: { params: { debtId: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const { debtId } = params

    // Verify ownership
    const existingDebt = await prisma.debt.findFirst({
      where: {
        id: debtId,
        userId,
      },
    })

    if (!existingDebt) {
      return NextResponse.json({ error: 'Debt not found' }, { status: 404 })
    }

    // Soft delete - mark as inactive instead of deleting
    const updatedDebt = await prisma.debt.update({
      where: {
        id: debtId,
      },
      data: {
        isActive: false,
      },
    })

    return NextResponse.json({ success: true, debt: updatedDebt })
  } catch (error: any) {
    console.error('Error deleting debt:', error)
    return NextResponse.json({ error: error.message || 'Failed to delete debt' }, { status: 500 })
  }
}
