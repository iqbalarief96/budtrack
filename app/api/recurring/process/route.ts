import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { 
  processRecurringTransactions, 
  processRecurringTransaction,
  triggerRecurringNow,
  skipNextRecurring 
} from '@/lib/recurring-automation';

export const dynamic = 'force-dynamic';

// POST /api/recurring/process - Process all due recurring transactions
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // This endpoint can be called by cron job without auth
    // Or by admin user
    const { searchParams } = new URL(request.url);
    const cronSecret = searchParams.get('secret');
    
    // Check if it's a cron job call
    if (cronSecret === process.env.CRON_SECRET) {
      const results = await processRecurringTransactions();
      return NextResponse.json(results);
    }

    // Otherwise require authentication
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, recurringId } = body;

    if (action === 'trigger' && recurringId) {
      // Manually trigger a specific recurring transaction
      const transaction = await triggerRecurringNow(recurringId, session.user.id);
      return NextResponse.json({ 
        success: true, 
        transaction,
        message: 'Transaction created successfully' 
      });
    }

    if (action === 'skip' && recurringId) {
      // Skip next occurrence
      const nextDate = await skipNextRecurring(recurringId, session.user.id);
      return NextResponse.json({ 
        success: true, 
        nextDate,
        message: 'Next occurrence skipped' 
      });
    }

    if (action === 'process' && recurringId) {
      // Process specific recurring transaction
      const transaction = await processRecurringTransaction(recurringId);
      return NextResponse.json({ 
        success: true, 
        transaction,
        message: 'Transaction processed' 
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[RECURRING-PROCESS] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process recurring transaction' },
      { status: 500 }
    );
  }
}
