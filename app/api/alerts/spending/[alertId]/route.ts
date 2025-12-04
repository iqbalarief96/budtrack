import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { validateAlertInput } from '@/lib/spending-insights/alert-service'
import { SpendingAlert, AlertType } from '@/app/types/spending-insights'

interface RouteParams {
  params: Promise<{ alertId: string }>
}

/**
 * GET /api/alerts/spending/[alertId] - Get a single spending alert
 * Requirements: 4.1
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { alertId } = await params
    const userId = session.user.id

    const alert = await prisma.spendingAlert.findFirst({
      where: {
        id: alertId,
        userId,
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
    })

    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
    }

    const transformedAlert: SpendingAlert = {
      id: alert.id,
      userId: alert.userId,
      type: alert.type as AlertType,
      categoryId: alert.categoryId,
      threshold: alert.threshold,
      isActive: alert.isActive,
      createdAt: alert.createdAt,
      updatedAt: alert.updatedAt,
      category: alert.category,
    }

    return NextResponse.json(transformedAlert)
  } catch (error) {
    console.error('Error fetching spending alert:', error)
    return NextResponse.json(
      { error: 'Failed to fetch spending alert' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/alerts/spending/[alertId] - Update a spending alert
 * Requirements: 4.4, 4.5
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { alertId } = await params
    const userId = session.user.id
    const body = await request.json()

    // Find existing alert
    const existingAlert = await prisma.spendingAlert.findFirst({
      where: {
        id: alertId,
        userId,
      },
    })

    if (!existingAlert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
    }

    // Validate input
    const validation = validateAlertInput(body)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors.join(', ') },
        { status: 400 }
      )
    }

    // Validate threshold if provided
    if (body.threshold !== undefined && (typeof body.threshold !== 'number' || body.threshold < 0)) {
      return NextResponse.json(
        { error: 'Threshold must be a non-negative number' },
        { status: 400 }
      )
    }

    // Validate category exists if provided
    if (body.categoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: body.categoryId,
          userId,
        },
      })
      if (!category) {
        return NextResponse.json(
          { error: 'Category not found' },
          { status: 404 }
        )
      }
    }

    // Update alert
    const updatedAlert = await prisma.spendingAlert.update({
      where: { id: alertId },
      data: {
        ...(body.type !== undefined && { type: body.type }),
        ...(body.categoryId !== undefined && { categoryId: body.categoryId }),
        ...(body.threshold !== undefined && { threshold: body.threshold }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
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
    })

    const transformedAlert: SpendingAlert = {
      id: updatedAlert.id,
      userId: updatedAlert.userId,
      type: updatedAlert.type as AlertType,
      categoryId: updatedAlert.categoryId,
      threshold: updatedAlert.threshold,
      isActive: updatedAlert.isActive,
      createdAt: updatedAlert.createdAt,
      updatedAt: updatedAlert.updatedAt,
      category: updatedAlert.category,
    }

    return NextResponse.json(transformedAlert)
  } catch (error) {
    console.error('Error updating spending alert:', error)
    return NextResponse.json(
      { error: 'Failed to update spending alert' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/alerts/spending/[alertId] - Delete a spending alert
 * Requirements: 4.5
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { alertId } = await params
    const userId = session.user.id

    // Find existing alert
    const existingAlert = await prisma.spendingAlert.findFirst({
      where: {
        id: alertId,
        userId,
      },
    })

    if (!existingAlert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
    }

    // Delete alert
    await prisma.spendingAlert.delete({
      where: { id: alertId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting spending alert:', error)
    return NextResponse.json(
      { error: 'Failed to delete spending alert' },
      { status: 500 }
    )
  }
}
