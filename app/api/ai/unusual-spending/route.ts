import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { detectUnusualSpending } from '@/lib/ai';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user settings for AI provider
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id }
    });

    if (!userSettings?.apiKey || !userSettings?.provider || !userSettings?.selectedModel) {
      return NextResponse.json(
        { error: 'AI settings not configured. Please configure AI settings in your profile.' }, 
        { status: 400 }
      );
    }
    
    // Get recent transactions (last 2 weeks)
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    
    const recentTransactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        type: 'EXPENSE',
        date: {
          gte: twoWeeksAgo
        }
      },
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    });
    
    // Get historical data (last 3 months) grouped by category for analysis
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    // Get monthly spending by category for the past 3 months
    const historicalData = await prisma.$queryRaw`
      SELECT 
        c.name as category_name,
        EXTRACT(MONTH FROM t.date) as month,
        SUM(t.amount) as total_spending,
        COUNT(t.id) as transaction_count
      FROM "Transaction" t
      LEFT JOIN "Category" c ON t.category_id = c.id
      WHERE 
        t.user_id = ${session.user.id}
        AND t.type = 'EXPENSE'
        AND t.date >= ${threeMonthsAgo}
        AND t.date < ${twoWeeksAgo}
      GROUP BY c.name, EXTRACT(MONTH FROM t.date)
      ORDER BY c.name, EXTRACT(MONTH FROM t.date)
    `;
    
    // Format transactions for AI consumption
    const formattedTransactions = recentTransactions.map(tx => ({
      id: tx.id,
      amount: tx.amount,
      description: tx.description,
      date: tx.date.toISOString(),
      category: tx.category?.name || 'Uncategorized'
    }));
    
    // Detect unusual spending
    const unusualSpendingResult = await detectUnusualSpending({
      recentTransactions: formattedTransactions,
      historicalData,
      provider: userSettings.provider,
      apiKey: userSettings.apiKey,
      model: userSettings.selectedModel,
      prompt: '' // Not used directly, but required by the type
    });
    
    // Return appropriate response
    if (unusualSpendingResult.unusual) {
      // Create alert in database if unusual spending detected
      await createUnusualSpendingAlert(
        session.user.id, 
        unusualSpendingResult.category || 'Unknown',
        unusualSpendingResult.amount || 0,
        unusualSpendingResult.reason || 'Unusual spending detected',
        unusualSpendingResult.recommendation || ''
      );
      
      return NextResponse.json({
        detected: true,
        alert: unusualSpendingResult
      });
    } else {
      return NextResponse.json({
        detected: false
      });
    }
    
  } catch (error) {
    console.error('Error in unusual spending detection:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
}

async function createUnusualSpendingAlert(
  userId: string,
  category: string,
  amount: number,
  reason: string,
  recommendation: string
) {
  try {
    if (typeof (prisma as any).alert !== 'undefined') {
      await (prisma as any).alert.create({
        data: {
          userId,
          type: 'UNUSUAL_SPENDING',
          title: `Unusual spending in ${category}`,
          message: reason,
          additionalData: JSON.stringify({
            category,
            amount,
            recommendation
          }),
          isRead: false
        }
      });
    } else {
      console.log('Alert table not implemented yet. Could not save unusual spending alert.');
    }
  } catch (error) {
    console.error('Error creating unusual spending alert:', error);
  }
} 