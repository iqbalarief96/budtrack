import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import {
  checkAlerts,
  validateAlertInput,
} from '@/lib/spending-insights/alert-service'
import { AlertsResponse, SpendingAlert, AlertType } from '@/app/types/spending-insights'

/**
 * GET /api/alerts/spending - Get all spending alerts for the user
 * Requirements: 4.1, 4.5
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const { searchParams } = new URL(request.url)
    
    // Query params
    const activeOnly = searchParams.get('activeOnly') !== 'false'
    const checkNotifications = searchParams.get('checkNotifications') === 'true'

    // Get alerts from database
    const alerts = await prisma.spendingAlert.findMany({
      where: {
        userId,
        ...(activeOnly ? { isActive: true } : {}),
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
      orderBy: { createdAt: 'desc' },
    })

    // Transform to SpendingAlert type
    const transformedAlerts: SpendingAlert[] = alerts.map((alert: {
      id: string
      userId: string
      type: string
      categoryId: string | null
      threshold: number
      isActive: boolean
      createdAt: Date
      updatedAt: Date
      category: { id: string; name: string; icon: string | null; color: string | null } | null
    }) => ({
      id: alert.id,
      userId: alert.userId,
      type: alert.type as AlertType,
      categoryId: alert.categoryId,
      threshold: alert.threshold,
      isActive: alert.isActive,
      createdAt: alert.createdAt,
      updatedAt: alert.updatedAt,
      category: alert.category,
    }))

    // Check for notifications if requested
    let notifications: AlertsResponse['notifications'] = []
    if (checkNotifications && transformedAlerts.length > 0) {
      // Get current month spending by category
      const now = new Date()
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      const [monthlySpending, dailySpending] = await Promise.all([
        prisma.transaction.groupBy({
          by: ['categoryId'],
          where: {
            userId,
            type: { in: ['expense', 'EXPENSE'] },
            date: { gte: currentMonthStart },
          },
          _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
          where: {
            userId,
            type: { in: ['expense', 'EXPENSE'] },
            date: { gte: todayStart },
          },
          _sum: { amount: true },
        }),
      ])

      // Build spending map
      const spendingByCategory = new Map<string, number>()
      for (const item of monthlySpending) {
        if (item.categoryId) {
          spendingByCategory.set(item.categoryId, Math.abs(item._sum.amount || 0))
        }
      }

      const totalDailySpending = Math.abs(dailySpending._sum.amount || 0)

      // Check alerts
      notifications = checkAlerts(transformedAlerts, spendingByCategory, totalDailySpending)
    }

    const response: AlertsResponse = {
      alerts: transformedAlerts,
      notifications,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching spending alerts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch spending alerts' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/alerts/spending - Create a new spending alert
 * Requirements: 4.1
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const body = await request.json()

    // Validate required fields
    if (!body.type || body.threshold === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: type, threshold' },
        { status: 400 }
      )
    }

    // Validate input
    const validation = validateAlertInput(body)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors.join(', ') },
        { status: 400 }
      )
    }

    // Validate threshold
    if (typeof body.threshold !== 'number' || body.threshold < 0) {
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

    // Create alert
    const alert = await prisma.spendingAlert.create({
      data: {
        userId,
        type: body.type,
        categoryId: body.categoryId || null,
        threshold: body.threshold,
        isActive: body.isActive !== undefined ? body.isActive : true,
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

    return NextResponse.json(transformedAlert, { status: 201 })
  } catch (error) {
    console.error('Error creating spending alert:', error)
    return NextResponse.json(
      { error: 'Failed to create spending alert' },
      { status: 500 }
    )
  }
}
