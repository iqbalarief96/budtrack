import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { checkBudgetAlerts } from '@/lib/budgetAlerts';
import { revalidatePath } from 'next/cache';

/**
 * Bulk delete transactions using POST body (avoids URL length limits)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No transaction IDs provided' }, { status: 400 });
    }

    console.log(`[BULK-DELETE] Deleting ${ids.length} transactions`);

    // Fetch all transactions to be deleted and validate ownership
    const transactions = await prisma.transaction.findMany({
      where: {
        id: { in: ids },
        userId: session.user.id,
      },
      include: {
        wallet: true,
      },
    });

    if (transactions.length === 0) {
      return NextResponse.json({ error: 'Transactions not found' }, { status: 404 });
    }

    // Process deletions in batches to avoid timeout
    const BATCH_SIZE = 50;
    let deleted = 0;

    for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
      const batch = transactions.slice(i, i + BATCH_SIZE);
      
      await prisma.$transaction(async (tx) => {
        for (const t of batch) {
          // CASCADE DELETE: If this is a savings EXPENSE, find and delete paired INCOME transaction
          if (t.type === 'EXPENSE' && t.categoryId) {
            const category = await tx.category.findUnique({
              where: { id: t.categoryId }
            });

            if (category && category.name.toLowerCase().includes('saving')) {
              // Find paired INCOME transaction in savings wallet
              const pairedTransaction = await tx.transaction.findFirst({
                where: {
                  userId: session.user.id,
                  type: 'INCOME',
                  amount: t.amount,
                  date: {
                    gte: new Date(t.date.setHours(0, 0, 0, 0)),
                    lte: new Date(t.date.setHours(23, 59, 59, 999))
                  },
                  description: {
                    contains: t.description || ''
                  },
                  wallet: {
                    type: 'SAVINGS'
                  }
                },
                include: {
                  wallet: true
                }
              });

              if (pairedTransaction) {
                console.log(`[CASCADE DELETE] Found paired transaction: ${pairedTransaction.id} in ${pairedTransaction.wallet.name}`);
                
                // Update paired wallet balance
                await tx.wallet.update({
                  where: { id: pairedTransaction.walletId },
                  data: {
                    balance: {
                      decrement: pairedTransaction.amount
                    }
                  }
                });

                // Delete paired transaction
                await tx.transaction.delete({
                  where: { id: pairedTransaction.id }
                });

                console.log(`[CASCADE DELETE] Deleted paired transaction`);
              }
            }
          }

          // Adjust wallet balance reversal
          await tx.wallet.update({
            where: { id: t.walletId },
            data: {
              balance: {
                [t.type === 'INCOME' ? 'decrement' : 'increment']: t.amount,
              },
            },
          });

          // If this was an expense tied to a budget window, recompute spent
          if (t.type === 'EXPENSE' && t.categoryId) {
            const budget = await tx.budget.findFirst({
              where: {
                userId: session.user.id,
                categoryId: t.categoryId,
                walletId: t.walletId,
                startDate: { lte: t.date },
                endDate: { gte: t.date },
              },
            });

            if (budget) {
              const spending = await tx.transaction.aggregate({
                where: {
                  userId: session.user.id,
                  categoryId: budget.categoryId,
                  walletId: budget.walletId,
                  type: 'EXPENSE',
                  date: { gte: budget.startDate, lte: budget.endDate },
                  id: { notIn: [t.id] }, // Exclude current transaction
                },
                _sum: { amount: true },
              });

              await tx.budget.update({
                where: { id: budget.id },
                data: { spent: spending._sum.amount || 0 },
              });
            }
          }

          // Delete the transaction
          await tx.transaction.delete({ where: { id: t.id } });
          deleted++;
        }
      });

      console.log(`[BULK-DELETE] Processed batch ${i / BATCH_SIZE + 1}, deleted ${deleted}/${transactions.length}`);
    }

    // Revalidate all paths that depend on transaction data
    revalidatePath('/');
    revalidatePath('/transactions');
    revalidatePath('/wallets');
    revalidatePath('/goals');
    revalidatePath('/budgets');

    return NextResponse.json({
      success: true,
      deleted,
      message: `${deleted} transaksi berhasil dihapus`,
    });
  } catch (error) {
    console.error('[BULK-DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete transactions' },
      { status: 500 }
    );
  }
}
