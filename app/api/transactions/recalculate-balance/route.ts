import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * Recalculate wallet balance from all transactions
 * This fixes balance issues when transactions were created without updating wallet
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get all wallets for this user
    const wallets = await prisma.wallet.findMany({
      where: { userId },
    });

    const results = [];

    for (const wallet of wallets) {
      // Get all transactions for this wallet
      const transactions = await prisma.transaction.findMany({
        where: {
          walletId: wallet.id,
          userId,
        },
        orderBy: {
          date: 'asc',
        },
      });

      // Calculate correct balance from transactions
      let calculatedBalance = 0;
      for (const tx of transactions) {
        if (tx.type === 'INCOME') {
          calculatedBalance += tx.amount;
        } else if (tx.type === 'EXPENSE') {
          calculatedBalance -= tx.amount;
        }
      }

      const oldBalance = wallet.balance;
      const difference = calculatedBalance - oldBalance;

      // Update wallet with correct balance
      await prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: calculatedBalance },
      });

      results.push({
        walletId: wallet.id,
        walletName: wallet.name,
        oldBalance,
        newBalance: calculatedBalance,
        difference,
        transactionCount: transactions.length,
      });

      console.log(`[RECALC] ${wallet.name}: ${oldBalance} -> ${calculatedBalance} (diff: ${difference})`);
    }

    return NextResponse.json({
      success: true,
      results,
      message: `Recalculated balance for ${wallets.length} wallet(s)`,
    });
  } catch (error) {
    console.error('[RECALC] Error:', error);
    return NextResponse.json(
      { error: 'Failed to recalculate balance' },
      { status: 500 }
    );
  }
}
