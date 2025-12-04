import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { dismissReminder } from '@/lib/bill/reminder-service'

interface RouteParams {
  params: Promise<{ reminderId: string }>
}

// POST /api/bills/reminders/[reminderId]/dismiss - Dismiss a reminder
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { reminderId } = await params
    await dismissReminder(reminderId, session.user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error dismissing reminder:', error)
    
    if (error instanceof Error && error.message === 'Reminder not found') {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 })
    }
    
    return NextResponse.json(
      { error: 'Failed to dismiss reminder' },
      { status: 500 }
    )
  }
}
