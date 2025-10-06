import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

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
        endDate: {
          gte: new Date() // Only active budgets
        }
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
    const budgetsWithSpending = await Promise.all(
      budgets.map(async (budget) => {
        const spending = await prisma.transaction.aggregate({
          where: {
            userId,
            categoryId: budget.categoryId || undefined,
            walletId: budget.walletId,
            date: {
              gte: budget.startDate,
              lte: budget.endDate
            },
            type: "EXPENSE"
          },
          _sum: {
            amount: true
          }
        });

        const spent = spending._sum.amount || 0;
        const percentage = budget.amount > 0 
          ? Math.min(100, Math.round((spent / budget.amount) * 100)) 
          : 0;

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