import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

const getCurrentPeriod = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
};

async function calculateBudgetSpending(params: {
  userId: string;
  walletId: string;
  categoryId: string;
  amount: number;
  periodStart: Date;
  periodEnd: Date;
}) {
  const whereClause: any = {
    userId: params.userId,
    walletId: params.walletId,
    type: 'EXPENSE',
    date: {
      gte: params.periodStart,
      lt: params.periodEnd,
    },
  };

  if (params.categoryId) {
    whereClause.categoryId = params.categoryId;
  }

  const spending = await prisma.transaction.aggregate({
    where: whereClause,
    _sum: {
      amount: true,
    },
  });

  const spent = Math.abs(spending._sum.amount ?? 0);
  const percentage =
    params.amount > 0 ? Math.min(100, Math.round((spent / params.amount) * 100)) : 0;

  return { spent, percentage };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    
    const budgets = await prisma.budget.findMany({
      where: {
        userId,
        // Remove endDate filter to show all budgets, not just active ones
        // Budgets will reset monthly regardless of their original period
      },
      include: {
        category: true,
        wallet: true
      },
      orderBy: {
        startDate: 'desc'
      }
    });

    // Calculate spending for each budget
    const { start: periodStart, end: periodEnd } = getCurrentPeriod();

    const budgetsWithSpending = await Promise.all(
      budgets.map(async (budget) => {
        const { spent, percentage } = await calculateBudgetSpending({
          userId,
          walletId: budget.walletId,
          categoryId: budget.categoryId,
          amount: budget.amount,
          periodStart,
          periodEnd,
        });

        return {
          ...budget,
          spent,
          percentage
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
