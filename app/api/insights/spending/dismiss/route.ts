import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

/**
 * POST /api/insights/spending/dismiss - Mark an insight as dismissed
 * Requirements: 5.4
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const body = await request.json()
    
    const { insightId } = body
    
    if (!insightId) {
      return NextResponse.json(
        { error: 'Missing required field: insightId' },
        { status: 400 }
      )
    }

    // Find the insight and verify ownership
    const insight = await prisma.spendingInsight.findFirst({
      where: {
        id: insightId,
        userId,
      },
    })

    if (!insight) {
      return NextResponse.json(
        { error: 'Insight not found' },
        { status: 404 }
      )
    }

    // Update the insight to dismissed
    const updatedInsight = await prisma.spendingInsight.update({
      where: { id: insightId },
      data: { isDismissed: true },
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
    })

    return NextResponse.json({
      success: true,
      insight: {
        id: updatedInsight.id,
        userId: updatedInsight.userId,
        type: updatedInsight.type,
        categoryId: updatedInsight.categoryId,
        title: updatedInsight.title,
        description: updatedInsight.description,
        severity: updatedInsight.severity,
        data: JSON.parse(updatedInsight.data || '{}'),
        isRead: updatedInsight.isRead,
        isDismissed: updatedInsight.isDismissed,
        createdAt: updatedInsight.createdAt,
        category: updatedInsight.category,
      },
    })
  } catch (error) {
    console.error('Error dismissing insight:', error)
    return NextResponse.json(
      { error: 'Failed to dismiss insight' },
      { status: 500 }
    )
  }
}
