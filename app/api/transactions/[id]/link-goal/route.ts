import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { linkTransactionToGoal, unlinkTransactionFromGoal } from '@/lib/savingsGoalAutoLink'

/**
 * POST /api/transactions/[id]/link-goal
 * Manually link a transaction to a goal
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const body = await req.json()
    const { goalId } = body

    if (!goalId) {
      return NextResponse.json(
        { error: 'Goal ID is required' },
        { status: 400 }
      )
    }

    await linkTransactionToGoal(params.id, goalId, userId)

    return NextResponse.json({ success: true, goalId })
  } catch (error: any) {
    console.error('Error linking transaction to goal:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to link transaction to goal' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/transactions/[id]/link-goal
 * Unlink a transaction from its goal
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    await unlinkTransactionFromGoal(params.id, userId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error unlinking transaction from goal:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to unlink transaction from goal' },
      { status: 500 }
    )
  }
}
