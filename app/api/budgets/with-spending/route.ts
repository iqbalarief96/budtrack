import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { calculateBudgetDetails, isActiveBudget } from '@/lib/budgetCalculations';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch all budgets for the user
    const budgets = await prisma.budget.findMany({
      where: {
        userId,
      },
      include: {
        category: true,
        wallet: true
      },
      orderBy: {
        startDate: 'desc'
      }
    });

    // Calculate spending using ACTUAL budget dates
    const budgetsWithSpending = await Promise.all(
      budgets.map(async (budget) => {
        const { spent, percentage, remaining } = await calculateBudgetDetails({
          id: budget.id,
          userId: budget.userId,
          walletId: budget.walletId,
          categoryId: budget.categoryId,
          amount: budget.amount,
          startDate: budget.startDate,
          endDate: budget.endDate,
        });

        const active = isActiveBudget({
          startDate: budget.startDate,
          endDate: budget.endDate,
        });

        return {
          ...budget,
          spent,
          percentage,
          remaining,
          isActive: active,
        };
      })
    );

    return NextResponse.json(budgetsWithSpending);
  } catch (error) {
    console.error('Error fetching budgets with spending:', error);
    return NextResponse.json(
      { error: 'Failed to fetch budgets' },
      { status: 500 }
    );
  }
} 
