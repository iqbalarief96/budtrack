import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * Fix transaction types based on category
 * Income categories: Gaji, Bonus, Hadiah, Freelance, Investment, etc.
 * This endpoint will update transactions that have wrong types
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Define income category names
    const incomeCategoryNames = [
      'Gaji',
      'Salary',
      'Bonus',
      'Hadiah',
      'Gift',
      'Freelance',
      'Investment',
      'Investasi',
      'Pendapatan',
      'Income',
      'Bunga',
      'Interest',
      'Dividen',
      'Dividend',
    ];

    // Get all categories for this user
    const categories = await prisma.category.findMany({
      where: { userId },
    });

    // Find income category IDs
    const incomeCategoryIds = categories
      .filter(cat => incomeCategoryNames.some(name => 
        cat.name.toLowerCase().includes(name.toLowerCase())
      ))
      .map(cat => cat.id);

    console.log('[FIX-TYPES] Income category IDs:', incomeCategoryIds);

    // Find transactions with wrong types
    const wrongTypeTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        categoryId: {
          in: incomeCategoryIds,
        },
        type: 'EXPENSE', // These should be INCOME
      },
      include: {
        category: true,
      },
    });

    console.log('[FIX-TYPES] Found', wrongTypeTransactions.length, 'transactions with wrong types');

    // Fix them
    const fixed = [];
    for (const tx of wrongTypeTransactions) {
      await prisma.transaction.update({
        where: { id: tx.id },
        data: { type: 'INCOME' },
      });
      fixed.push({
        id: tx.id,
        description: tx.description,
        category: tx.category?.name,
        amount: tx.amount,
      });
    }

    // Also fix recurring transactions
    const wrongRecurring = await prisma.recurringTransaction.findMany({
      where: {
        userId,
        category: {
          in: incomeCategoryNames,
        },
        type: 'EXPENSE',
      },
    });

    console.log('[FIX-TYPES] Found', wrongRecurring.length, 'recurring with wrong types');

    const fixedRecurring = [];
    for (const rec of wrongRecurring) {
      await prisma.recurringTransaction.update({
        where: { id: rec.id },
        data: { type: 'INCOME' },
      });
      fixedRecurring.push({
        id: rec.id,
        name: rec.name,
        category: rec.category,
        amount: rec.amount,
      });
    }

    return NextResponse.json({
      success: true,
      fixed: {
        transactions: fixed,
        recurring: fixedRecurring,
      },
      message: `Fixed ${fixed.length} transactions and ${fixedRecurring.length} recurring transactions`,
    });
  } catch (error) {
    console.error('[FIX-TYPES] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fix transaction types' },
      { status: 500 }
    );
  }
}
