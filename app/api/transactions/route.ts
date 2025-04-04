import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import type { Budget } from '@/app/types/budget'
import type { Category } from '@/app/types/category'
import type { Wallet } from '@/app/types/wallet'

type BudgetWithRelations = Budget & {
  category: Category
  wallet: Wallet
  spent: number
  percentage: number
}

type TransactionWithRelations = {
  id: string
  date: string
  description: string | null
  amount: number
  type: 'INCOME' | 'EXPENSE'
  category: {
    id: string
    name: string
    type: string
  } | null
  wallet: {
    id: string
    name: string
  }
  categoryId: string | null
  walletId: string
}

export const dynamic = 'force-dynamic'

// POST /api/transactions
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const data = await request.json()
    const { categoryId, walletId, amount, type, date, description } = data

    console.log('Creating transaction:', {
      categoryId,
      walletId,
      amount,
      type,
      date,
      description
    });

    // Validate required fields
    if (!walletId || !amount || !type || !date) {
      return new NextResponse('Missing required fields', { status: 400 })
    }

    // Handle transaction with or without category
    let category = null;
    if (categoryId) {
      // Get category type if categoryId is provided
      category = await prisma.category.findUnique({
        where: { id: categoryId }
      })

      if (!category) {
        return new NextResponse('Category not found', { status: 404 })
      }

      console.log('Category found:', category);
    }

    // Create new transaction
    const transaction = await prisma.transaction.create({
      data: {
        categoryId: categoryId || null, // Allow null categoryId
        walletId,
        amount: parseFloat(amount),
        type,
        date: new Date(date),
        description: description || undefined,
        userId: session.user.id,
      },
      include: {
        category: true,
        wallet: true,
      },
    })

    console.log('Transaction created:', transaction);

    // Update wallet balance
    // For regular transactions (including those without category):
    // - If type is INCOME, add to balance
    // - If type is EXPENSE, subtract from balance
    const isRegularTransaction = !category || category.type !== 'SAVINGS';
    const shouldIncrement = isRegularTransaction ? type === 'INCOME' : type === 'EXPENSE';

    console.log('Updating wallet balance:', {
      isRegularTransaction,
      shouldIncrement,
      categoryType: category?.type,
      transactionType: type
    });

    await prisma.wallet.update({
      where: { id: walletId },
      data: {
        balance: {
          [shouldIncrement ? 'increment' : 'decrement']: parseFloat(amount),
        },
      },
    })

    // If the transaction is an expense and not a savings transaction, update the budget
    if (type === 'EXPENSE' && category?.type !== 'SAVINGS') {
      const budget = await prisma.budget.findFirst({
        where: {
          userId: session.user.id,
          categoryId: category?.id, // Use optional chaining
          walletId,
          startDate: {
            lte: new Date(date),
          },
          endDate: {
            gte: new Date(date),
          },
        },
        include: {
          category: true,
          wallet: true,
        },
      })

      if (budget) {
        // Calculate spending for the budget
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
        })

        const spent = spending._sum.amount || 0
        const percentage = (spent / budget.amount) * 100

        return NextResponse.json({
          transaction,
          budget: {
            ...budget,
            spent,
            percentage
          } as BudgetWithRelations
        })
      }
    }

    return NextResponse.json({ transaction })
  } catch (error) {
    console.error('Error creating transaction:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

// GET /api/transactions
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const walletId = searchParams.get('walletId')

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        ...(walletId ? { walletId } : {}),
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            type: true,
          }
        },
        wallet: {
          select: {
            id: true,
            name: true,
          }
        },
      },
      orderBy: {
        date: 'desc',
      },
    })

    // Transform the data to include properly formatted dates and nested objects
    const formattedTransactions = transactions.map(tx => ({
      id: tx.id,
      date: tx.date.toISOString(),
      description: tx.description,
      amount: tx.amount,
      type: tx.type,
      category: tx.category ? {
        id: tx.category.id,
        name: tx.category.name,
        type: tx.category.type,
      } : null,
      wallet: {
        id: tx.wallet.id,
        name: tx.wallet.name,
      },
      categoryId: tx.categoryId,
      walletId: tx.walletId,
    }))

    return NextResponse.json(formattedTransactions)
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

// PUT /api/transactions/:id
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const data = await request.json()
    const { id, categoryId, walletId, amount, type, date, description } = data

    // Validate required fields
    if (!id || !walletId || !amount || !type || !date) {
      return new NextResponse('Missing required fields', { status: 400 })
    }

    // Get the old transaction
    const oldTransaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        category: true,
        wallet: true,
      },
    })

    if (!oldTransaction || oldTransaction.userId !== session.user.id) {
      return new NextResponse('Transaction not found', { status: 404 })
    }

    // Revert the old wallet balance
    await prisma.wallet.update({
      where: { id: oldTransaction.walletId },
      data: {
        balance: {
          [oldTransaction.type === 'INCOME' ? 'decrement' : 'increment']: oldTransaction.amount,
        },
      },
    })

    // If the transaction was an expense, update the old budget
    if (oldTransaction.type === 'EXPENSE') {
      const oldBudget = await prisma.budget.findFirst({
        where: {
          userId: session.user.id,
          categoryId: oldTransaction.categoryId,
          walletId: oldTransaction.walletId,
          startDate: {
            lte: oldTransaction.date,
          },
          endDate: {
            gte: oldTransaction.date,
          },
        },
        include: {
          category: true,
          wallet: true,
        },
      })

      if (oldBudget) {
        // Calculate spending for the old budget
        const oldSpending = await prisma.transaction.aggregate({
          where: {
            userId: session.user.id,
            categoryId: oldBudget.categoryId,
            walletId: oldBudget.walletId,
            type: 'EXPENSE',
            date: {
              gte: oldBudget.startDate,
              lte: oldBudget.endDate
            }
          },
          _sum: {
            amount: true
          }
        })

        const oldSpent = oldSpending._sum.amount || 0
        const oldPercentage = (oldSpent / oldBudget.amount) * 100

        await prisma.budget.update({
          where: { id: oldBudget.id },
          data: {
            spent: oldSpent,
          },
        })
      }
    }

    // Update transaction
    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        categoryId,
        walletId,
        amount: parseFloat(amount),
        type,
        date: new Date(date),
        description,
      },
      include: {
        category: true,
        wallet: true,
      },
    })

    // Update the new wallet balance
    await prisma.wallet.update({
      where: { id: walletId },
      data: {
        balance: {
          [type === 'INCOME' ? 'increment' : 'decrement']: parseFloat(amount),
        },
      },
    })

    // If the new transaction is an expense, update the new budget
    if (type === 'EXPENSE') {
      const newBudget = await prisma.budget.findFirst({
        where: {
          userId: session.user.id,
          categoryId,
          walletId,
          startDate: {
            lte: new Date(date),
          },
          endDate: {
            gte: new Date(date),
          },
        },
        include: {
          category: true,
          wallet: true,
        },
      })

      if (newBudget) {
        // Calculate spending for the new budget
        const newSpending = await prisma.transaction.aggregate({
          where: {
            userId: session.user.id,
            categoryId: newBudget.categoryId,
            walletId: newBudget.walletId,
            type: 'EXPENSE',
            date: {
              gte: newBudget.startDate,
              lte: newBudget.endDate
            }
          },
          _sum: {
            amount: true
          }
        })

        const newSpent = newSpending._sum.amount || 0
        const newPercentage = (newSpent / newBudget.amount) * 100

        await prisma.budget.update({
          where: { id: newBudget.id },
          data: {
            spent: newSpent,
          },
        })

        return NextResponse.json({
          transaction,
          budget: {
            ...newBudget,
            spent: newSpent,
            percentage: newPercentage
          } as BudgetWithRelations
        })
      }
    }

    return NextResponse.json({ transaction })
  } catch (error) {
    console.error('Error updating transaction:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

// DELETE /api/transactions/:id
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get ID from search params instead of request body
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 })
    }

    // Get the transaction
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        category: true,
        wallet: true,
      },
    })

    if (!transaction || transaction.userId !== session.user.id) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    // Update wallet balance
    await prisma.wallet.update({
      where: { id: transaction.walletId },
      data: {
        balance: {
          [transaction.type === 'INCOME' ? 'decrement' : 'increment']: transaction.amount,
        },
      },
    })

    // If the transaction was an expense, update the budget
    if (transaction.type === 'EXPENSE' && transaction.categoryId !== null) {
      const budget = await prisma.budget.findFirst({
        where: {
          userId: session.user.id,
          categoryId: transaction.categoryId,
          walletId: transaction.walletId,
          startDate: {
            lte: transaction.date,
          },
          endDate: {
            gte: transaction.date,
          },
        },
        include: {
          category: true,
          wallet: true,
        },
      })

      if (budget) {
        // Calculate spending for the budget
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
        })

        const spent = spending._sum.amount || 0
        const percentage = (spent / budget.amount) * 100

        await prisma.budget.update({
          where: { id: budget.id },
          data: {
            spent: spent,
          },
        })

        // Delete transaction
        await prisma.transaction.delete({
          where: { id },
        })

        return NextResponse.json({
          success: true,
          message: 'Transaction deleted successfully',
          transaction,
          budget: {
            ...budget,
            spent,
            percentage
          } as BudgetWithRelations
        })
      }
    }

    // Delete transaction
    await prisma.transaction.delete({
      where: { id },
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Transaction deleted successfully',
      transaction 
    })
  } catch (error) {
    console.error('Error deleting transaction:', error)
    return NextResponse.json(
      { error: 'Failed to delete transaction' }, 
      { status: 500 }
    )
  }
} 