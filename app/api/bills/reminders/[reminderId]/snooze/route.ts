import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { snoozeReminder } from '@/lib/bill/reminder-service'

interface RouteParams {
  params: Promise<{ reminderId: string }>
}

// POST /api/bills/reminders/[reminderId]/snooze - Snooze a reminder
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { reminderId } = await params
    const body = await request.json()

    const hours = body.hours || 24 // Default to 24 hours

    if (typeof hours !== 'number' || hours < 1 || hours > 168) {
      return NextResponse.json(
        { error: 'Hours must be a number between 1 and 168 (1 week)' },
        { status: 400 }
      )
    }

    const reminder = await snoozeReminder(reminderId, session.user.id, hours)

    return NextResponse.json(reminder)
  } catch (error) {
    console.error('Error snoozing reminder:', error)
    
    if (error instanceof Error && error.message === 'Reminder not found') {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 })
    }
    
    return NextResponse.json(
      { error: 'Failed to snooze reminder' },
      { status: 500 }
    )
  }
}
