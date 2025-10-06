import { NextRequest, NextResponse } from 'next/server';
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
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const walletId = searchParams.get('walletId');
    const userId = searchParams.get('userId') || session.user.id;

    const where: any = { userId };
    if (walletId) {
      where.walletId = walletId;
    }

    const budgets = await prisma.budget.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json(budgets);
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

    const data = await request.json();
    console.log("Budget submission data:", data);
    
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

    const budgetData = {
      amount: parseFloat(data.amount?.toString() || data.target?.toString() || "0"),
      startDate,
      endDate,
      walletId,
      categoryId,
      userId: session.user.id,
      spent: 0,
    };
    
    console.log("Creating budget with data:", budgetData);

    const budget = await prisma.budget.create({
      data: budgetData,
    });

    return NextResponse.json(budget);
  } catch (error) {
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

    const data = await request.json();
    const { id, ...updateData } = data;

    if (!id) {
      return NextResponse.json(
        { error: 'Budget ID is required' },
        { status: 400 }
      );
    }

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

    console.log('Updating budget with dates:', {
      startDate,
      endDate,
      providedStartDate: updateData.startDate,
      providedEndDate: updateData.endDate,
      existingStartDate: existingBudget.startDate,
      existingEndDate: existingBudget.endDate
    });

    const updatedBudget = await prisma.budget.update({
      where: { id },
      data: {
        amount: updateData.amount !== undefined ? parseFloat(updateData.amount.toString()) : existingBudget.amount,
        startDate,
        endDate,
        categoryId: updateData.categoryId || existingBudget.categoryId,
        walletId: updateData.walletId || existingBudget.walletId,
      },
    });

    return NextResponse.json(updatedBudget);
  } catch (error) {
    console.error('Error updating budget:', error);
    return NextResponse.json(
      { error: 'Failed to update budget' },
      { status: 500 }
    );
  }
} 