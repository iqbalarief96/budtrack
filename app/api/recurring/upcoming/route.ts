import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { previewRecurringTransactions, getRecurringNotifications } from '@/lib/recurring-automation';

export const dynamic = 'force-dynamic';

// GET /api/recurring/upcoming - Get upcoming recurring transactions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const notificationsOnly = searchParams.get('notifications') === 'true';

    if (notificationsOnly) {
      const notifications = await getRecurringNotifications(session.user.id);
      return NextResponse.json({ notifications });
    }

    const upcoming = await previewRecurringTransactions(session.user.id, days);
    return NextResponse.json({ upcoming });
  } catch (error) {
    console.error('[RECURRING-UPCOMING] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get upcoming recurring transactions' },
      { status: 500 }
    );
  }
}
