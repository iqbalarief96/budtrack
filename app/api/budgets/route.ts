import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import type { Budget } from '@/app/types/budget';
import type { Category } from '@/app/types/category';
import type { Wallet } from '@/app/types/wallet';
import {
  calculateBudgetDetails,
  getBudgetPeriod,
  getNextPeriodDates,
  isActiveBudget,
} from '@/lib/budgetCalculations';
import { BudgetSchema } from '@/lib/validators';
import { z } from 'zod';
import { parsePaginationParams } from '@/lib/pagination';
import { paginatedResponse } from '@/lib/api-response';

type BudgetWithRelations = Budget & {
  category: Category;
  wallet: Wallet;
  spent: number;
  percentage: number;
  remaining: number;
  isActive: boolean;
}

// GET /api/budgets?page=1&limit=50&walletId=xxx - Get budgets with pagination
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const walletId = searchParams.get('walletId');
    const userId = searchParams.get('userId') || session.user.id;

    // Parse pagination parameters
    const { page, limit, offset } = parsePaginationParams(searchParams);

    const where: any = { userId };
    if (walletId) {
      where.walletId = walletId;
    }

    // Count total budgets
    const total = await prisma.budget.count({ where });

    // Fetch paginated budgets
    const budgets = await prisma.budget.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        category: true,
        wallet: true,
      },
    });

    // Use ACTUAL budget dates instead of current month
    const budgetsWithSpending: BudgetWithRelations[] = await Promise.all(
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

    return paginatedResponse(
      budgetsWithSpending,
      page,
      limit,
      total,
      'Budgets fetched successfully'
    );
  } catch (error) {
    console.error('Error fetching budgets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch budgets' },
      { status: 500 }
    );
  }
}

// POST /api/budgets - Create a new budget
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log("Budget submission data:", body);

    // Validate input with Zod
    const data = BudgetSchema.parse(body);
    
    // Check if categoryId is valid or use a default
    let categoryId = data.categoryId;
    
    // Jangan override categoryId yang sudah dipilih dari form
    if (categoryId) {
      console.log("Using provided categoryId from form:", categoryId);
      
      // Verifikasi category exists
      const selectedCategory = await prisma.category.findFirst({
        where: {
          id: categoryId,
          userId: session.user.id,
        },
      });
      
      if (!selectedCategory) {
        console.warn("Selected category not found, will use default instead");
        categoryId = null; // Reset to null so we'll use the default
      }
    }
    
    // Jika categoryId null atau uncategorized
    if (!categoryId || categoryId === 'uncategorized') {
      console.log("No categoryId provided or invalid, using default Uncategorized");
      // Find or create an 'Uncategorized' category
      const uncategorizedCategory = await prisma.category.findFirst({
        where: {
          name: 'Uncategorized',
          userId: session.user.id,
        },
      });
      
      if (uncategorizedCategory) {
        categoryId = uncategorizedCategory.id;
      } else {
        const newCategory = await prisma.category.create({
          data: {
            name: 'Uncategorized',
            type: 'EXPENSE',
            color: '#808080',
            icon: 'help-circle',
            userId: session.user.id,
          },
        });
        categoryId = newCategory.id;
      }
    }

    // Get default wallet if none provided
    let walletId = data.walletId;
    if (!walletId) {
      // Find the default wallet or any wallet if default not found
      const wallet = await prisma.wallet.findFirst({
        where: {
          userId: session.user.id,
          isDefault: true
        }
      });

      if (wallet) {
        walletId = wallet.id;
      } else {
        // If no default wallet, get any wallet
        const anyWallet = await prisma.wallet.findFirst({
          where: {
            userId: session.user.id
          }
        });
        
        if (anyWallet) {
          walletId = anyWallet.id;
        } else {
          // Create a new wallet if user has none
          const newWallet = await prisma.wallet.create({
            data: {
              name: 'Default Wallet',
              balance: 0,
              isDefault: true,
              userId: session.user.id,
            }
          });
          walletId = newWallet.id;
        }
      }
    }

    // Gunakan tanggal dari formData jika tersedia
    let startDate = data.startDate ? new Date(data.startDate) : new Date();
    let endDate = data.endDate ? new Date(data.endDate) : new Date();
    
    // Gunakan deadline sebagai endDate jika tersedia (dikonversi dari GoalForm)
    if (data.deadline && !data.endDate) {
      endDate = new Date(data.deadline);
      // Set startDate to current date if not provided
      if (!data.startDate) {
        startDate = new Date();
      }
    }
    
    // Hanya gunakan timeframe jika startDate dan endDate tidak ada
    if (!data.startDate && !data.endDate && !data.deadline) {
      // Calculate date ranges based on timeframe
      startDate = new Date();
      endDate = new Date();
      
      switch (data.timeframe) {
        case 'month':
          endDate.setMonth(endDate.getMonth() + 1);
          break;
        case 'quarter':
          endDate.setMonth(endDate.getMonth() + 3);
          break;
        case 'year':
          endDate.setFullYear(endDate.getFullYear() + 1);
          break;
        default:
          endDate.setMonth(endDate.getMonth() + 1); // Default to month
      }
    }

    // Determine period type from form data or timeframe
    let periodType = data.periodType || 'MONTHLY';
    if (!data.periodType && data.timeframe) {
      switch (data.timeframe) {
        case 'month':
          periodType = 'MONTHLY';
          break;
        case 'quarter':
          periodType = 'QUARTERLY';
          break;
        case 'year':
          periodType = 'YEARLY';
          break;
        default:
          periodType = 'MONTHLY';
      }
    }

    // Default notification thresholds
    const notificationThresholds = data.notificationThresholds || JSON.stringify({
      warning: 80,
      critical: 100,
    });

    const budgetData = {
      amount: parseFloat(data.amount?.toString() || data.target?.toString() || "0"),
      startDate,
      endDate,
      periodType,
      isRecurring: data.isRecurring || false,
      notificationThresholds,
      walletId,
      categoryId,
      userId: session.user.id,
      spent: 0,
    };

    console.log("Creating budget with data:", budgetData);

    // Check for duplicate budget (same category, wallet, and overlapping date range)
    const existingBudget = await prisma.budget.findFirst({
      where: {
        userId: session.user.id,
        categoryId: budgetData.categoryId,
        walletId: budgetData.walletId,
        OR: [
          {
            AND: [
              { startDate: { lte: budgetData.startDate } },
              { endDate: { gte: budgetData.startDate } }
            ]
          },
          {
            AND: [
              { startDate: { lte: budgetData.endDate } },
              { endDate: { gte: budgetData.endDate } }
            ]
          }
        ]
      }
    });

    if (existingBudget) {
      console.log('[DEBUG] Duplicate budget detected, returning existing budget:', existingBudget.id);
      return NextResponse.json(
        { error: 'Budget already exists for this category and wallet in this period' },
        { status: 409 }
      );
    }

    const budget = await prisma.budget.create({
      data: budgetData,
      include: {
        category: true,
        wallet: true,
      },
    });

    console.log('[DEBUG] Budget created successfully:', budget.id);
    return NextResponse.json(budget);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating budget:', error);
    return NextResponse.json(
      { error: 'Failed to create budget' },
      { status: 500 }
    );
  }
}

// PUT /api/budgets - Update a budget
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updateFields } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Budget ID is required' },
        { status: 400 }
      );
    }

    // Validate input with Zod (partial allows optional fields for updates)
    const updateData = BudgetSchema.partial().parse(updateFields);

    // Check if the budget exists and belongs to the user
    const existingBudget = await prisma.budget.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingBudget) {
      return NextResponse.json(
        { error: 'Budget not found or not authorized' },
        { status: 404 }
      );
    }

    // Gunakan tanggal dari formData jika tersedia
    let startDate = updateData.startDate ? new Date(updateData.startDate) : existingBudget.startDate;
    let endDate = updateData.endDate ? new Date(updateData.endDate) : existingBudget.endDate;
    
    // Hanya gunakan timeframe jika startDate dan endDate tidak ada di update data
    if (updateData.timeframe && (!updateData.startDate && !updateData.endDate)) {
      startDate = new Date();
      endDate = new Date();
      
      switch (updateData.timeframe) {
        case 'month':
          endDate.setMonth(endDate.getMonth() + 1);
          break;
        case 'quarter':
          endDate.setMonth(endDate.getMonth() + 3);
          break;
        case 'year':
          endDate.setFullYear(endDate.getFullYear() + 1);
          break;
      }
    }

    const targetWalletId = updateData.walletId || existingBudget.walletId;
    const targetCategoryId = updateData.categoryId || existingBudget.categoryId;

    const updatedBudget = await prisma.budget.update({
      where: { id },
      data: {
        amount: updateData.amount !== undefined ? parseFloat(updateData.amount.toString()) : existingBudget.amount,
        startDate,
        endDate,
        categoryId: targetCategoryId,
        walletId: targetWalletId,
        spent: 0,
      },
    });

    return NextResponse.json(updatedBudget);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error updating budget:', error);
    return NextResponse.json(
      { error: 'Failed to update budget' },
      { status: 500 }
    );
  }
} 
