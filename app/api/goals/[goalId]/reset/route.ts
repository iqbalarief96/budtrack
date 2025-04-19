import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

// Schema untuk reset goal
const resetGoalSchema = z.object({
  resetValue: z.number().nonnegative({ message: "Reset value must be a positive number" }),
})

// POST /api/goals/[goalId]/reset
// Reset goal progress to specific value
export async function POST(
  req: Request,
  { params }: { params: { goalId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const goalId = params.goalId
    
    // Check jika goal ada dan milik user
    const goal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        userId: session.user.id,
      },
    })

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    // Validasi input
    const body = await req.json()
    const result = resetGoalSchema.safeParse(body)
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.format() },
        { status: 400 }
      )
    }
    
    const { resetValue } = result.data
    
    // Hitung perbedaan antara nilai saat ini dan nilai reset
    const currentValue = goal.current || 0
    const difference = resetValue - currentValue
    const adjustmentDescription = difference >= 0 
      ? `Adjustment: +${difference}` 
      : `Adjustment: ${difference}`

    // Create adjustment activity
    await prisma.goalActivity.create({
      data: {
        goalId,
        amount: difference,
        description: `Manual reset: ${adjustmentDescription}`,
        date: new Date(),
        userId: session.user.id,
      },
    })

    // Update goal progress directly to new value
    await prisma.goal.update({
      where: {
        id: goalId,
      },
      data: {
        current: resetValue,
        status: resetValue >= goal.target ? 'COMPLETED' : 'ONGOING',
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ 
      success: true,
      message: 'Goal progress has been reset',
      newValue: resetValue
    }, { status: 200 })
  } catch (error) {
    console.error('Error resetting goal progress:', error)
    return NextResponse.json(
      { error: 'Failed to reset goal progress' },
      { status: 500 }
    )
  }
} 