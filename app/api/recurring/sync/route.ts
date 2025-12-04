import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { processRecurringTransactions } from '@/lib/recurring-automation'

export const dynamic = 'force-dynamic'

// POST /api/recurring/sync - Auto-sync due recurring transactions for current user
export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`[RECURRING-SYNC] Auto-sync triggered by user ${session.user.id}`)
    
    // Process all due recurring transactions
    const results = await processRecurringTransactions()
    
    console.log(`[RECURRING-SYNC] Results: processed=${results.processed}, failed=${results.failed}`)
    
    return NextResponse.json({
      success: true,
      processed: results.processed,
      failed: results.failed,
      errors: results.errors,
    })
  } catch (error) {
    console.error('[RECURRING-SYNC] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync recurring transactions' },
      { status: 500 }
    )
  }
}
