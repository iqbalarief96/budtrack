import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// POST a new activity to a goal
export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Parse request body
    const body = await request.json()
    
    // Validate required fields
    const { goalId, amount, transactionId } = body
    if (!goalId || amount === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields (goalId, amount)' },
        { status: 400 }
      )
    }
    
    // Verify the goal belongs to the user
    const goal = await prisma.goal.findUnique({
      where: {
        id: goalId,
        userId: session.user.id
      }
    })
    
    if (!goal) {
      return NextResponse.json(
        { error: 'Goal not found or does not belong to user' },
        { status: 404 }
      )
    }
    
    // Create activity
    const activity = await prisma.goalActivity.create({
      data: {
        goalId,
        // For savings goals, use absolute value to ensure positive contribution
        amount: parseFloat(amount) < 0 && (goal.category === 'SAVINGS' || !goal.category) 
          ? Math.abs(parseFloat(amount)) 
          : parseFloat(amount),
        description: body.description || (amount > 0 ? 'Contribution' : 'Withdrawal'),
        date: body.date ? new Date(body.date) : new Date(),
      }
    })
    
    // Update goal progress with the same logic
    const activityAmount = parseFloat(amount) < 0 && (goal.category === 'SAVINGS' || !goal.category)
      ? Math.abs(parseFloat(amount))
      : parseFloat(amount);
      
    const updatedGoal = await prisma.goal.update({
      where: { id: goalId },
      data: {
        current: {
          increment: activityAmount
        },
        // Update status if goal is achieved
        ...(goal.current + activityAmount >= goal.target 
          ? { status: 'COMPLETED' } 
          : {})
      }
    })
    
    // If a transaction ID was provided, update the transaction to link it to this goal
    if (transactionId) {
      try {
        // First verify the transaction belongs to the user
        const transaction = await prisma.transaction.findFirst({
          where: {
            id: transactionId,
            userId: session.user.id
          }
        })
        
        if (transaction) {
          // Update the transaction to link it to the goal
          await prisma.transaction.update({
            where: { id: transactionId },
            data: { 
              goalId 
            }
          })
        }
      } catch (transactionError) {
        console.error('Error linking transaction to goal:', transactionError)
        // Continue execution even if linking transaction fails
      }
    }
    
    return NextResponse.json({
      activity,
      goal: updatedGoal
    }, { status: 201 })
    
  } catch (error) {
    console.error('Error adding goal activity:', error)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
} 