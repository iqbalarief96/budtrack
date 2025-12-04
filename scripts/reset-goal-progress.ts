import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function resetGoalProgress() {
    try {
        console.log('🔄 Resetting goal progress...')

        // Delete all goal activities
        const deletedActivities = await prisma.goalActivity.deleteMany({})
        console.log(`✅ Deleted ${deletedActivities.count} goal activities`)

        // Reset all goals current to 0
        const updatedGoals = await prisma.goal.updateMany({
            data: {
                current: 0,
                status: 'ONGOING',
            },
        })
        console.log(`✅ Reset ${updatedGoals.count} goals to 0`)

        // Remove goalId from all transactions
        const updatedTransactions = await prisma.transaction.updateMany({
            where: {
                goalId: {
                    not: null,
                },
            },
            data: {
                goalId: null,
            },
        })
        console.log(`✅ Unlinked ${updatedTransactions.count} transactions`)

        console.log('\n🎉 Reset complete!')
    } catch (error) {
        console.error('❌ Error:', error)
    } finally {
        await prisma.$disconnect()
    }
}

resetGoalProgress()
