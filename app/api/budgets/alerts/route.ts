import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getUnreadAlerts,
  markAlertAsRead,
  markAllAlertsAsRead,
  checkAllBudgetAlerts,
} from '@/lib/budgetAlerts'

/**
 * GET /api/budgets/alerts
 * Get unread budget alerts for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const alerts = await getUnreadAlerts(session.user.id)

    return NextResponse.json(alerts)
  } catch (error) {
    console.error('Error fetching budget alerts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/budgets/alerts
 * Check all budgets for alerts (can be called after transactions)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const results = await checkAllBudgetAlerts(session.user.id)

    return NextResponse.json({
      success: true,
      message: 'Budget alerts checked',
      results,
    })
  } catch (error) {
    console.error('Error checking budget alerts:', error)
    return NextResponse.json(
      { error: 'Failed to check alerts' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/budgets/alerts
 * Mark alerts as read
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { alertId, markAll } = await request.json()

    if (markAll) {
      const result = await markAllAlertsAsRead(session.user.id)
      return NextResponse.json({
        success: true,
        message: `Marked ${result.count} alerts as read`,
      })
    } else if (alertId) {
      const alert = await markAlertAsRead(alertId, session.user.id)
      return NextResponse.json(alert)
    } else {
      return NextResponse.json(
        { error: 'alertId or markAll is required' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error marking alerts as read:', error)
    return NextResponse.json(
      { error: 'Failed to mark alerts as read' },
      { status: 500 }
    )
  }
}
