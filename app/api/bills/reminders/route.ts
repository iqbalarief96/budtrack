import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveReminders, processReminders } from '@/lib/bill/reminder-service'

// GET /api/bills/reminders - Get active reminders for the user
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const reminders = await getActiveReminders(session.user.id)

    return NextResponse.json({ reminders })
  } catch (error) {
    console.error('Error fetching reminders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reminders' },
      { status: 500 }
    )
  }
}

// POST /api/bills/reminders - Process all pending reminders (for cron job)
export async function POST() {
  try {
    // This endpoint could be called by a cron job
    // For security, you might want to add an API key check here
    
    const result = await processReminders()

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error processing reminders:', error)
    return NextResponse.json(
      { error: 'Failed to process reminders' },
      { status: 500 }
    )
  }
}
