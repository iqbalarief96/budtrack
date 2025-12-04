import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { snapshotService } from '@/lib/net-worth/snapshot-service'

/**
 * POST /api/net-worth/snapshot
 * Creates a manual snapshot of current net worth
 * 
 * Body (optional):
 * - date: ISO date string (defaults to current date)
 * 
 * Requirements: 2.3
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse optional date from body
    let snapshotDate: Date | undefined
    
    try {
      const body = await request.json()
      if (body.date) {
        snapshotDate = new Date(body.date)
        // Validate date
        if (isNaN(snapshotDate.getTime())) {
          return NextResponse.json(
            { error: 'Invalid date format' },
            { status: 400 }
          )
        }
      }
    } catch {
      // No body or invalid JSON - use current date
    }

    // Create snapshot (Requirement: 2.3)
    const snapshot = await snapshotService.createSnapshot(
      session.user.id,
      snapshotDate
    )

    return NextResponse.json(snapshot, { status: 201 })
  } catch (error) {
    console.error('Error creating net worth snapshot:', error)
    return NextResponse.json(
      { error: 'Failed to create net worth snapshot' },
      { status: 500 }
    )
  }
}
