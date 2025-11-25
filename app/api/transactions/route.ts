import { NextResponse, NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import type { Budget } from '@/app/types/budget'
import type { Category } from '@/app/types/category'
import type { Wallet } from '@/app/types/wallet'
import { autoTrackTransactionToGoals } from './auto-track-goals'
import { Prisma } from '@prisma/client'
import { checkBudgetAlerts } from '@/lib/budgetAlerts'
import { detectSavingsType } from '@/lib/savingsTracker'
import { autoLinkSavingsToGoal } from '@/lib/savingsGoalAutoLink'
import { TransactionSchema } from '@/lib/validators'
import { z } from 'zod'

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
  goal?: {
    id: string
    name: string
    target: number
    current: number
  } | null
  categoryId: string | null
  walletId: string
  goalId?: string | null
}

export const dynamic = 'force-dynamic'

// POST /api/transactions
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const body = await request.json()

    // Validate input with Zod
    const validated = TransactionSchema.parse(body)
    const {
      categoryId,
      walletId,
      amount,
      type,
      date,
      description,
      goalId
    } = validated

    console.log('Creating transaction:', {
      categoryId,
      walletId,
      amount,
      type,
      date,
      description,
      goalId
    });

    // Find the wallet to make sure it belongs to this user
    const wallet = await prisma.wallet.findFirst({
      where: {
        id: walletId,
        userId: session.user.id,
      },
    })

    if (!wallet) {
      return new NextResponse('Wallet not found', { status: 404 })
    }

    console.log('Current wallet balance before transaction:', wallet.balance)

    // Find the category if provided
    let category = null
    if (categoryId) {
      category = await prisma.category.findFirst({
        where: {
          id: categoryId,
          userId: session.user.id,
        },
      })
    }

    console.log('Found category:', category)

    // Auto-route savings transactions to appropriate SAVINGS wallet
    let finalWalletId = walletId
    if (type === 'EXPENSE' && category && description) {
      const { findOrCreateSavingsWallet } = await import('@/lib/savings-wallet-router')
      const savingsWalletId = await findOrCreateSavingsWallet(
        session.user.id,
        description,
        category.name
      )
      if (savingsWalletId) {
        console.log(`[Auto-Route] Routing to savings wallet: ${savingsWalletId}`)
        finalWalletId = savingsWalletId
      }
    }

    // Prepare transaction data
    const transactionData: any = {
      amount: parseFloat(amount),
      type,
      date: new Date(date),
      description,
      userId: session.user.id,
      walletId: finalWalletId,
    };
    
    // Only add categoryId if it exists
    if (categoryId) {
      transactionData.categoryId = categoryId;
    }
    
    // Only add goalId if it exists
    if (goalId) {
      transactionData.goalId = goalId;
    }

    // Create the transaction
    const transaction = await prisma.transaction.create({
      data: transactionData,
      include: {
        category: true,
        wallet: true,
      },
    })

    // Determine if we should increase or decrease the wallet balance
    const shouldIncrement = type === 'INCOME';
    
    console.log('Transaction details:', {
      transactionType: type,
      categoryType: category?.type,
      shouldIncrement
    });

    console.log('Updating wallet balance:', {
      shouldIncrement,
      oldBalance: wallet.balance,
      change: parseFloat(amount),
      newBalance: shouldIncrement ? wallet.balance + parseFloat(amount) : wallet.balance - parseFloat(amount)
    });

    // Update wallet balance - semua transaksi EXPENSE (termasuk savings) mengurangi saldo
    await prisma.wallet.update({
      where: { id: walletId },
      data: {
        balance: {
          [shouldIncrement ? 'increment' : 'decrement']: parseFloat(amount),
        },
      },
    })
    
    // Get updated wallet to verify balance change
    const updatedWallet = await prisma.wallet.findUnique({
      where: { id: walletId }
    });
    
    console.log('Wallet balance after transaction:', {
      oldBalance: wallet.balance,
      newBalance: updatedWallet?.balance,
      difference: (updatedWallet?.balance || 0) - wallet.balance
    });

    // Auto-track transaction to relevant goals based on category
    if (categoryId) {
      await autoTrackTransactionToGoals(
        transaction.id,
        categoryId,
        session.user.id,
        parseFloat(amount),
        type,
        description,
        new Date(date)
      );
    }

    // Auto-link savings transactions to matching goals
    if (type === 'EXPENSE' && category) {
      const savingsType = detectSavingsType(
        description,
        category.name,
        wallet.name
      );

      if (savingsType) {
        try {
          const linkResult = await autoLinkSavingsToGoal(
            transaction.id,
            session.user.id,
            savingsType
          );

          if (linkResult.linked) {
            console.log(`Auto-linked savings transaction to goal: ${linkResult.goalName}`);
          }
        } catch (linkError) {
          console.error('Failed to auto-link savings to goal:', linkError);
          // Don't interrupt transaction flow
        }
      }
    }

    // DEPRECATED: Old paired transaction logic
    // Now using auto-routing above which directly routes to correct wallet
    // Keeping this commented for reference
    /*
    if (type === 'EXPENSE' && category?.name.toLowerCase().includes('saving') && description?.toLowerCase().startsWith('tabungan')) {
      try {
        // Extract wallet name from description (e.g., "Tabungan Bank A" -> "Bank A")
        const targetWalletName = description.substring('tabungan'.length).trim();
        
        if (targetWalletName) {
          // Find or create target wallet
          let targetWallet = await prisma.wallet.findFirst({
            where: {
              userId: session.user.id,
              name: {
                equals: targetWalletName,
              },
            },
          });

          // If wallet doesn't exist, create it
          if (!targetWallet) {
            targetWallet = await prisma.wallet.create({
              data: {
                name: targetWalletName,
                balance: 0,
                userId: session.user.id,
                currencyCode: wallet.currencyCode,
                isDefault: false,
                type: 'SAVINGS', // Auto-created savings wallets
              },
            });
            console.log(`Auto-created SAVINGS wallet: ${targetWalletName}`);
          }

          // Create paired INCOME transaction in target wallet
          const pairedTransaction = await prisma.transaction.create({
            data: {
              amount: parseFloat(amount),
              type: 'INCOME',
              date: new Date(date),
              description: `Transfer dari ${wallet.name}`,
              userId: session.user.id,
              walletId: targetWallet.id,
              categoryId: categoryId, // Same category
            },
          });

          // Update target wallet balance
          await prisma.wallet.update({
            where: { id: targetWallet.id },
            data: {
              balance: {
                increment: parseFloat(amount),
              },
            },
          });

          console.log(`Auto-created paired transaction: ${transaction.id} -> ${pairedTransaction.id}`);
          console.log(`Transfer: ${wallet.name} (${walletId}) -> ${targetWallet.name} (${targetWallet.id})`);
        }
      } catch (pairError) {
        console.error('Failed to create paired transaction:', pairError);
        // Don't interrupt main transaction flow
      }
    }
    */

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

        // Check for budget alerts after transaction
        try {
          await checkBudgetAlerts(budget.id)
        } catch (alertError) {
          console.error('Failed to check budget alerts:', alertError)
          // Don't interrupt transaction flow
        }

        return NextResponse.json({
          transaction,
          budget: {
            ...budget,
            spent,
            percentage
          } as BudgetWithRelations,
          triggerRefresh: true
        })
      }
    }

    // Check if this is a large transaction (EXPENSE higher than 1,000,000)
    if (type === 'EXPENSE' && parseFloat(amount) >= 1000000) {
      try {
        // Format the amount with commas
        const formattedAmount = parseFloat(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        
        // Create an alert for this large transaction using raw SQL
        const alertId = crypto.randomUUID();
        const alertDate = new Date().toISOString();
        
        await prisma.$executeRaw`
          INSERT INTO Alert (id, userId, type, title, message, additionalData, isRead, createdAt)
          VALUES (
            ${alertId},
            ${session.user.id},
            'TRANSACTION_LARGE',
            'Transaksi besar terdeteksi',
            ${'Transaksi besar Rp ' + formattedAmount + ' telah dicatat.'},
            '{"recommendation":"Pastikan transaksi ini benar dan sesuai dengan budget Anda."}',
            0,
            ${alertDate}
          )
        `;
      } catch (alertError) {
        // Log but don't interrupt transaction creation
        console.error('Failed to create alert for large transaction:', alertError);
      }
    }

    return NextResponse.json({ transaction, triggerRefresh: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating transaction:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

// GET /api/transactions
export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const walletId = searchParams.get('walletId');
    const period = searchParams.get('period') || 'all';
    
    // Get user ID from the session
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Calculate date filter based on period
    const now = new Date();
    let dateFilter = {};
    
    if (period !== 'all') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      switch (period) {
        case 'daily':
          // Transactions for today only
          dateFilter = {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) // Next day
          };
          break;
        
        case 'weekly':
          // Transactions for the last 7 days
          const weekAgo = new Date(today);
          weekAgo.setDate(today.getDate() - 7);
          dateFilter = {
            gte: weekAgo,
          };
          break;
        
        case 'monthly':
          // Transactions for the current month
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          dateFilter = {
            gte: startOfMonth,
          };
          break;
        
        case 'quarterly':
          // Transactions for the last 3 months
          const threeMonthsAgo = new Date(today);
          threeMonthsAgo.setMonth(today.getMonth() - 3);
          dateFilter = {
            gte: threeMonthsAgo,
          };
          break;
        
        case 'yearly':
          // Transactions for the current year
          const startOfYear = new Date(today.getFullYear(), 0, 1);
          dateFilter = {
            gte: startOfYear,
          };
          break;
      }
    }
    
    // Build wallet filter
    const walletFilter = walletId ? { id: walletId } : {};
    
    // Query transactions
    const transactions = await prisma.transaction.findMany({
      where: {
        wallet: {
          ...walletFilter,
          userId: user.id
        },
        ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
      },
      orderBy: {
        date: 'desc',
      },
      include: {
        category: true,
        wallet: true,
      },
    });
    
    return NextResponse.json(transactions);
    
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

// PUT /api/transactions/:id
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return new NextResponse('Transaction ID is required', { status: 400 })
    }

    // Validate input with Zod (partial allows optional fields for updates)
    const validated = TransactionSchema.partial().parse(updateData)
    const {
      categoryId,
      walletId,
      amount,
      type,
      date,
      description,
      goalId
    } = validated

    // Get the old transaction
    const existingTransaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        category: true,
        wallet: true,
      },
    })

    if (!existingTransaction || existingTransaction.userId !== session.user.id) {
      return new NextResponse('Transaction not found', { status: 404 })
    }

    // Revert the old wallet balance
    await prisma.wallet.update({
      where: { id: existingTransaction.walletId },
      data: {
        balance: {
          [existingTransaction.type === 'INCOME' ? 'decrement' : 'increment']: existingTransaction.amount,
        },
      },
    })

    // If the transaction was an expense and has a category, update the old budget
    if (existingTransaction.type === 'EXPENSE' && existingTransaction.categoryId) {
      const oldBudget = await prisma.budget.findFirst({
        where: {
          userId: session.user.id,
          categoryId: existingTransaction.categoryId,
          walletId: existingTransaction.walletId,
          startDate: {
            lte: existingTransaction.date,
          },
          endDate: {
            gte: existingTransaction.date,
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

    // Prepare transaction update data
    const transactionData: any = {
      amount: parseFloat(amount),
      type,
      date: new Date(date),
      description,
      walletId,
    };
    
    // Handle categoryId properly for Prisma
    if (categoryId) {
      transactionData.categoryId = categoryId;
    } else {
      // Use Prisma's disconnect syntax for setting to null
      transactionData.category = { disconnect: true };
    }
    
    // Only add goalId if it exists
    if (goalId) {
      transactionData.goalId = goalId;
    }

    console.log('Updating transaction with data:', JSON.stringify(transactionData, null, 2));

    // Update transaction
    const updatedTransaction = await prisma.transaction.update({
      where: { id },
      data: transactionData,
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

    // Auto-track transaction to relevant goals based on category if categoryId changed
    if (categoryId && categoryId !== existingTransaction.categoryId && !goalId && !existingTransaction.goalId) {
      await autoTrackTransactionToGoals(
        updatedTransaction.id,
        categoryId,
        session.user.id,
        parseFloat(amount),
        type,
        description,
        new Date(date)
      );
    }

    // If the new transaction is an expense and has a category, update the new budget
    if (type === 'EXPENSE' && categoryId) {
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

        // Check for budget alerts after transaction update
        try {
          await checkBudgetAlerts(newBudget.id)
        } catch (alertError) {
          console.error('Failed to check budget alerts:', alertError)
          // Don't interrupt transaction flow
        }

        return NextResponse.json({
          transaction: updatedTransaction,
          budget: {
            ...newBudget,
            spent: newSpent,
            percentage: newPercentage
          } as BudgetWithRelations,
          triggerRefresh: true
        })
      }
    }

    return NextResponse.json({ transaction: updatedTransaction, triggerRefresh: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
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
    const idsParam = searchParams.get('ids')

    // Handle bulk delete with comma-separated ids
    if (!id && idsParam) {
      const ids = idsParam
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)

      if (ids.length === 0) {
        return NextResponse.json({ error: 'No transaction IDs provided' }, { status: 400 })
      }

      // Fetch all transactions to be deleted and validate ownership
      const transactions = await prisma.transaction.findMany({
        where: {
          id: { in: ids },
          userId: session.user.id,
        },
        include: {
          wallet: true,
        },
      })

      if (transactions.length === 0) {
        return NextResponse.json({ error: 'Transactions not found' }, { status: 404 })
      }

      // Process deletions in a single DB transaction
      await prisma.$transaction(async (tx) => {
        for (const t of transactions) {
          // Adjust wallet balance reversal
          await tx.wallet.update({
            where: { id: t.walletId },
            data: {
              balance: {
                [t.type === 'INCOME' ? 'decrement' : 'increment']: t.amount,
              },
            },
          })

          // If this was an expense tied to a budget window, recompute spent for accuracy
          if (t.type === 'EXPENSE' && t.categoryId) {
            const budget = await tx.budget.findFirst({
              where: {
                userId: session.user.id,
                categoryId: t.categoryId,
                walletId: t.walletId,
                startDate: { lte: t.date },
                endDate: { gte: t.date },
              },
            })

            if (budget) {
              const spending = await tx.transaction.aggregate({
                where: {
                  userId: session.user.id,
                  categoryId: budget.categoryId,
                  walletId: budget.walletId,
                  type: 'EXPENSE',
                  date: { gte: budget.startDate, lte: budget.endDate },
                },
                _sum: { amount: true },
              })

              await tx.budget.update({
                where: { id: budget.id },
                data: { spent: spending._sum.amount || 0 },
              })

              // Check for budget alerts after bulk transaction deletion
              try {
                await checkBudgetAlerts(budget.id)
              } catch (alertError) {
                console.error('Failed to check budget alerts:', alertError)
                // Don't interrupt transaction flow
              }
            }
          }

          // Finally delete the transaction
          await tx.transaction.delete({ where: { id: t.id } })
        }
      })

      return NextResponse.json({ success: true, deleted: transactions.length })
    }

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

    console.log('Deleting transaction:', {
      id: transaction.id,
      type: transaction.type,
      amount: transaction.amount,
      walletId: transaction.walletId,
      goalId: transaction.goalId,
      currentWalletBalance: transaction.wallet.balance
    });

    // If the transaction is linked to a goal, handle goal activity cleanup
    if (transaction.goalId) {
      try {
        // Since transactionId might not be properly linked in goalActivity
        // We'll find activities matching both the goalId and a description that includes the transaction info
        const goalActivities = await prisma.goalActivity.findMany({
          where: {
            goalId: transaction.goalId,
            OR: [
              {
                description: {
                  contains: `Auto-tracked transaction:`
                }
              },
              {
                // Also look for any activity created around the same time as the transaction
                date: {
                  gte: new Date(transaction.date.getTime() - 24 * 60 * 60 * 1000), // 1 day before
                  lte: new Date(transaction.date.getTime() + 24 * 60 * 60 * 1000)  // 1 day after
                }
              }
            ]
          }
        });

        console.log('Found goal activities to delete:', goalActivities.length);

        // Delete found activities
        if (goalActivities.length > 0) {
          for (const activity of goalActivities) {
            await prisma.goalActivity.delete({
              where: {
                id: activity.id
              }
            });
            console.log(`Deleted goal activity: ${activity.id}`);
          }
        }

        // Update goal current amount
        const goal = await prisma.goal.findUnique({
          where: { id: transaction.goalId }
        });

        if (goal) {
          // Fetch the deleted goal activity to get its exact amount
          // This is more accurate than trying to recalculate
          if (goalActivities.length > 0) {
            // Use the sum of deleted activities to properly adjust goal amount
            const totalActivityAmount = goalActivities.reduce((sum, activity) => sum + activity.amount, 0);
            
            console.log('Adjusting goal amount based on activities:', {
              goalId: goal.id,
              goalCurrent: goal.current,
              totalActivityAmount,
              newAmount: goal.current - totalActivityAmount
            });

            await prisma.goal.update({
              where: { id: transaction.goalId },
              data: {
                current: goal.current - totalActivityAmount
              }
            });
          } else {
            // Fallback to transaction-based logic if no activities found
            const amountAdjustment = transaction.type === 'EXPENSE' 
              ? transaction.amount
              : -transaction.amount;
            
            console.log('Fallback: Adjusting goal amount based on transaction:', {
              goalId: goal.id, 
              goalCurrent: goal.current,
              adjustment: amountAdjustment,
              newAmount: goal.current + amountAdjustment
            });

            await prisma.goal.update({
              where: { id: transaction.goalId },
              data: {
                current: goal.current + amountAdjustment
              }
            });
          }
        }
      } catch (error) {
        console.error("Error handling goal activity:", error);
      }
    }

    // Update wallet balance
    // For INCOME: when deleted, we DECREASE wallet balance
    // For EXPENSE: when deleted, we INCREASE wallet balance
    await prisma.wallet.update({
      where: { id: transaction.walletId },
      data: {
        balance: {
          [transaction.type === 'INCOME' ? 'decrement' : 'increment']: transaction.amount,
        },
      },
    });
    
    // Verify wallet balance was updated correctly
    const updatedWallet = await prisma.wallet.findUnique({
      where: { id: transaction.walletId },
    });
    
    console.log('Updated wallet balance:', {
      oldBalance: transaction.wallet.balance,
      newBalance: updatedWallet?.balance,
      transaction: transaction.type,
      amount: transaction.amount
    });

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

        // Check for budget alerts after transaction deletion
        try {
          await checkBudgetAlerts(budget.id)
        } catch (alertError) {
          console.error('Failed to check budget alerts:', alertError)
          // Don't interrupt transaction flow
        }

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