import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function retroactivelyTrackTransactions() {
    try {
        console.log('🔍 Finding untracked savings transactions...')

        // Find all savings transactions without goalId
        const transactions = await prisma.transaction.findMany({
            where: {
                type: 'EXPENSE',
                goalId: null,
                category: {
                    name: {
                        contains: 'Saving',
                    },
                },
            },
            include: {
                category: true,
                wallet: true,
            },
            orderBy: {
                date: 'desc',
            },
        })

        console.log(`📊 Found ${transactions.length} untracked savings transactions`)

        if (transactions.length === 0) {
            console.log('✅ No transactions to track!')
            return
        }

        // Find Education goal
        const educationGoal = await prisma.goal.findFirst({
            where: {
                category: 'EDUCATION',
                status: 'ONGOING',
                isArchived: false,
            },
        })

        if (!educationGoal) {
            console.log('⚠️  No EDUCATION goal found')
            return
        }

        console.log(`🎯 Found goal: ${educationGoal.name}`)

        let trackedCount = 0

        for (const transaction of transactions) {
            try {
                // Create goal activity
                await prisma.goalActivity.create({
                    data: {
                        goalId: educationGoal.id,
                        userId: transaction.userId,
                        amount: transaction.amount,
                        date: transaction.date,
                        description: transaction.description || 'Retroactive tracking',
                        transactionId: transaction.id,
                    },
                })

                // Update goal progress
                await prisma.goal.update({
                    where: { id: educationGoal.id },
                    data: {
                        current: {
                            increment: transaction.amount,
                        },
                    },
                })

                // Link transaction to goal
                await prisma.transaction.update({
                    where: { id: transaction.id },
                    data: { goalId: educationGoal.id },
                })

                console.log(`  ✨ Tracked: ${transaction.description} - Rp ${transaction.amount.toLocaleString()}`)
                trackedCount++
            } catch (error) {
                console.error(`  ❌ Error:`, error)
            }
        }

        console.log(`\n🎉 Done! Tracked ${trackedCount} transaction(s)`)

        // Show updated goal
        const updatedGoal = await prisma.goal.findUnique({
            where: { id: educationGoal.id },
        })

        if (updatedGoal) {
            const percentage = updatedGoal.target > 0 ? (updatedGoal.current / updatedGoal.target * 100).toFixed(1) : 0
            console.log(`\n📈 ${updatedGoal.name}: Rp ${updatedGoal.current.toLocaleString()} / Rp ${updatedGoal.target.toLocaleString()} (${percentage}%)`)
        }

    } catch (error) {
        console.error('❌ Error:', error)
    } finally {
        await prisma.$disconnect()
    }
}

retroactivelyTrackTransactions()
