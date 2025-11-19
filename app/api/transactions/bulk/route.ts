import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { autoTrackTransactionToGoals } from '../auto-track-goals'
import { checkBudgetAlerts } from '@/lib/budgetAlerts'

export async function POST(request: Request) {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    try {
        const body = await request.json()
        const { transactions } = body

        if (!Array.isArray(transactions) || transactions.length === 0) {
            return new NextResponse('Invalid transactions data', { status: 400 })
        }

        const createdTransactions = []

        // Process transactions sequentially to ensure wallet balance consistency
        // In a real production app, this should be a Prisma transaction
        for (const tx of transactions) {
            const {
                amount,
                type,
                date,
                description,
                walletId,
                categoryName // We receive category name from receipt scanner
            } = tx

            if (!walletId || !amount || !type || !date) {
                continue // Skip invalid transactions
            }

            // 1. Find or create category
            let categoryId = null
            if (categoryName) {
                // Try to find existing category by name
                const existingCategory = await prisma.category.findFirst({
                    where: {
                        userId: session.user.id,
                        name: categoryName,
                        type: type // Ensure type matches (EXPENSE/INCOME)
                    }
                })

                if (existingCategory) {
                    categoryId = existingCategory.id
                } else {
                    // Create new category if not found
                    const newCategory = await prisma.category.create({
                        data: {
                            name: categoryName,
                            type: type,
                            userId: session.user.id,
                            icon: 'FiShoppingBag', // Default icon
                            color: '#3b82f6' // Default color (blue)
                        }
                    })
                    categoryId = newCategory.id
                }
            }

            // 2. Create Transaction
            const transaction = await prisma.transaction.create({
                data: {
                    amount: parseFloat(amount),
                    type,
                    date: new Date(date),
                    description,
                    userId: session.user.id,
                    walletId,
                    categoryId
                },
                include: {
                    category: true,
                    wallet: true
                }
            })

            createdTransactions.push(transaction)

            // 3. Update Wallet Balance
            const shouldIncrement = type === 'INCOME'
            await prisma.wallet.update({
                where: { id: walletId },
                data: {
                    balance: {
                        [shouldIncrement ? 'increment' : 'decrement']: parseFloat(amount)
                    }
                }
            })

            // 4. Auto-track Goals
            if (categoryId) {
                await autoTrackTransactionToGoals(
                    transaction.id,
                    categoryId,
                    session.user.id,
                    parseFloat(amount),
                    type,
                    description,
                    new Date(date)
                )
            }

            // 5. Check Budget Alerts
            if (type === 'EXPENSE' && categoryId) {
                const budget = await prisma.budget.findFirst({
                    where: {
                        userId: session.user.id,
                        categoryId: categoryId,
                        walletId,
                        startDate: { lte: new Date(date) },
                        endDate: { gte: new Date(date) }
                    }
                })

                if (budget) {
                    // Recalculate spent
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
                        _sum: { amount: true }
                    })

                    const spent = spending._sum.amount || 0

                    await prisma.budget.update({
                        where: { id: budget.id },
                        data: { spent }
                    })

                    await checkBudgetAlerts(budget.id)
                }
            }
        }

        return NextResponse.json({
            success: true,
            count: createdTransactions.length,
            transactions: createdTransactions
        })

    } catch (error) {
        console.error('Error creating bulk transactions:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
