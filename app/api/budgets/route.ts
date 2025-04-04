import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import type { Budget } from '@/app/types/budget';
import type { Category } from '@/app/types/category';
import type { Wallet } from '@/app/types/wallet';

type BudgetWithRelations = Budget & {
  category: Category;
  wallet: Wallet;
  spent: number;
  percentage: number;
}

// GET /api/budgets - Get all budgets for the current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get all active budgets for the user
    const budgets = await prisma.budget.findMany({
      where: {
        userId: session.user.id,
        endDate: {
          gte: new Date()
        }
      },
      include: {
        category: true,
        wallet: true,
      }
    });

    // For each budget, calculate the current spending
    const budgetsWithSpending = await Promise.all(
      budgets.map(async (budget: Budget & { category: Category; wallet: Wallet }) => {
        // Get total spending for this budget's category in this wallet
        const spending = await prisma.transaction.aggregate({
          where: {
            userId: session.user.id,
            categoryId: budget.categoryId,
            walletId: budget.walletId,
            type: 'EXPENSE',
            date: {
              gte: budget.startDate,
              lte: budget.endDate
            }
          },
          _sum: {
            amount: true
          }
        });

        const spent = spending._sum.amount || 0;
        const percentage = (spent / budget.amount) * 100;

        return {
          ...budget,
          spent,
          percentage
        } as BudgetWithRelations;
      })
    );

    return NextResponse.json(budgetsWithSpending);
  } catch (error) {
    console.error('Error fetching budgets:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// POST /api/budgets - Create a new budget
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const data = await request.json();
    const { categoryId, walletId, amount, startDate, endDate } = data;

    // Validate required fields
    if (!categoryId || !walletId || !amount || !startDate || !endDate) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    // Create new budget
    const budget = await prisma.budget.create({
      data: {
        categoryId,
        walletId,
        amount: parseFloat(amount),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        userId: session.user.id
      },
      include: {
        category: true,
        wallet: true,
      },
    });

    // Calculate spending for the new budget
    const spending = await prisma.transaction.aggregate({
      where: {
        userId: session.user.id,
        categoryId: budget.categoryId,
        walletId: budget.walletId,
        type: 'EXPENSE',
        date: {
          gte: budget.startDate,
          lte: budget.endDate
        }
      },
      _sum: {
        amount: true
      }
    });

    const spent = spending._sum.amount || 0;
    const percentage = (spent / budget.amount) * 100;

    return NextResponse.json({
      ...budget,
      spent,
      percentage
    } as BudgetWithRelations);
  } catch (error) {
    console.error('Error creating budget:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// PUT /api/budgets - Update a budget
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const data = await request.json();
    const { id, categoryId, walletId, amount, startDate, endDate } = data;

    // Validate required fields
    if (!id || !categoryId || !walletId || !amount || !startDate || !endDate) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    // Verify budget ownership
    const existingBudget = await prisma.budget.findUnique({
      where: { id },
    });

    if (!existingBudget || existingBudget.userId !== session.user.id) {
      return new NextResponse('Budget not found', { status: 404 });
    }

    // Update budget
    const budget = await prisma.budget.update({
      where: { id },
      data: {
        categoryId,
        walletId,
        amount: parseFloat(amount),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
      include: {
        category: true,
        wallet: true,
      },
    });

    // Calculate spending for the updated budget
    const spending = await prisma.transaction.aggregate({
      where: {
        userId: session.user.id,
        categoryId: budget.categoryId,
        walletId: budget.walletId,
        type: 'EXPENSE',
        date: {
          gte: budget.startDate,
          lte: budget.endDate
        }
      },
      _sum: {
        amount: true
      }
    });

    const spent = spending._sum.amount || 0;
    const percentage = (spent / budget.amount) * 100;

    return NextResponse.json({
      ...budget,
      spent,
      percentage
    } as BudgetWithRelations);
  } catch (error) {
    console.error('Error updating budget:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 