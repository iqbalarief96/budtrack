import prisma from '@/lib/prisma'

// ✅ EXACT SAME mappings as savings-wallet-router.ts for 100% consistency
const SAVINGS_KEYWORD_MAPPINGS = [
    { label: 'Tabungan Darurat', keywords: ['darurat', 'emergency'], goalTypes: ['EMERGENCY_FUND'] },
    { label: 'Tabungan Pendidikan', keywords: ['pendidikan', 'school', 'kuliah', 'education'], goalTypes: ['EDUCATION'] },
    { label: 'Tabungan Liburan', keywords: ['liburan', 'travel', 'traveling', 'vacation', 'holiday', 'umroh', 'haji'], goalTypes: ['VACATION'] },
    { label: 'Tabungan Pensiun', keywords: ['pensiun', 'retirement'], goalTypes: ['RETIREMENT'] },
    { label: 'Tabungan Properti', keywords: ['rumah', 'properti', 'property', 'kpr', 'house', 'apartemen', 'apartment'], goalTypes: ['HOME_DOWN_PAYMENT', 'PROPERTY'] },
    { label: 'Tabungan Kendaraan', keywords: ['kendaraan', 'mobil', 'motor', 'car', 'bike'], goalTypes: ['CAR', 'VEHICLE'] },
    { label: 'Tabungan Bank', keywords: ['bank', 'rekening', 'account'], goalTypes: ['OTHER'] },
    { label: 'Tabungan Emas', keywords: ['emas', 'gold', 'logam mulia'], goalTypes: ['OTHER'] },
    { label: 'Tabungan Crypto', keywords: ['crypto', 'kripto', 'btc', 'bitcoin', 'eth', 'ethereum'], goalTypes: ['OTHER'] },
    { label: 'Tabungan Investasi', keywords: ['investasi', 'investment', 'reksa', 'reksadana', 'saham', 'stock', 'obligasi', 'bond', 'bibit'], goalTypes: ['OTHER'] },
    { label: 'Tabungan Deposito', keywords: ['deposito', 'deposit', 'term deposit'], goalTypes: ['OTHER'] },
]

/**
 * Detect matching goal types from description/category/wallet
 */
function detectGoalTypesFromDescription(
    description?: string | null,
    categoryName?: string | null,
    walletName?: string | null
): string[] {
    const searchText = [
        description?.toLowerCase() || '',
        categoryName?.toLowerCase() || '',
        walletName?.toLowerCase() || '',
    ].join(' ')

    // Check if it's a savings transaction
    const hasSavingsKeyword = searchText.includes('tabungan') ||
        searchText.includes('saving') ||
        searchText.includes('nabung')

    if (!hasSavingsKeyword && !categoryName?.toLowerCase().includes('saving')) {
        return [] // Not a savings transaction
    }

    // Find all matching mappings
    const matchedGoalTypes: string[] = []

    for (const mapping of SAVINGS_KEYWORD_MAPPINGS) {
        for (const keyword of mapping.keywords) {
            if (searchText.includes(keyword.toLowerCase())) {
                matchedGoalTypes.push(...mapping.goalTypes)
                break
            }
        }
    }

    // Also try to match wallet name directly
    if (walletName) {
        const walletMapping = SAVINGS_KEYWORD_MAPPINGS.find(m =>
            walletName.toLowerCase().includes(m.label.toLowerCase())
        )
        if (walletMapping) {
            matchedGoalTypes.push(...walletMapping.goalTypes)
        }
    }

    return [...new Set(matchedGoalTypes)]
}

/**
 * Auto-track transactions to goals based on:
 * 1. Tracked categories (via GoalCategory table)
 * 2. Description/wallet detection (using savings wallet keywords)
 */
export async function autoTrackTransactionToGoals(
    transactionId: string,
    userId: string,
    categoryId: string
): Promise<{ tracked: boolean; goalIds: string[] }> {
    try {
        const goalIds: string[] = []

        // Get transaction details first
        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: {
                category: true,
                wallet: true,
            },
        })

        if (!transaction) {
            return { tracked: false, goalIds: [] }
        }

        // Method 1: Find goals tracking this specific category
        const trackedGoals = await prisma.goalCategory.findMany({
            where: {
                categoryId,
                goal: {
                    userId,
                    status: 'ONGOING',
                    isArchived: false,
                },
            },
            include: {
                goal: true,
            },
        })

        // Method 2: Detect goal types from description/wallet
        const matchedGoalTypes = detectGoalTypesFromDescription(
            transaction.description,
            transaction.category?.name,
            transaction.wallet?.name
        )

        let descriptionMatchedGoals: any[] = []
        if (matchedGoalTypes.length > 0) {
            descriptionMatchedGoals = await prisma.goal.findMany({
                where: {
                    userId,
                    status: 'ONGOING',
                    isArchived: false,
                    category: {
                        in: matchedGoalTypes,
                    },
                },
            })
        }

        // Combine both methods and remove duplicates
        const allMatchedGoals = new Map()

        for (const trackedGoal of trackedGoals) {
            allMatchedGoals.set(trackedGoal.goal.id, trackedGoal.goal)
        }

        for (const descGoal of descriptionMatchedGoals) {
            allMatchedGoals.set(descGoal.id, descGoal)
        }

        if (allMatchedGoals.size === 0) {
            return { tracked: false, goalIds: [] }
        }

        // Link transaction to all matching goals
        for (const [goalId, goal] of allMatchedGoals.entries()) {
            try {
                // Create goal activity
                await prisma.goalActivity.create({
                    data: {
                        goalId: goalId,
                        userId,
                        amount: transaction.amount,
                        date: transaction.date,
                        description: transaction.description || `Auto-tracked`,
                        transactionId,
                    },
                })

                // Update goal current amount
                await prisma.goal.update({
                    where: { id: goalId },
                    data: {
                        current: {
                            increment: transaction.amount,
                        },
                        status: (goal as any).current + transaction.amount >= (goal as any).target ? 'COMPLETED' : 'ONGOING',
                        updatedAt: new Date(),
                    },
                })

                goalIds.push(goalId)

                console.log(`[Auto-Track] Transaction ${transactionId} tracked to goal: ${(goal as any).name}`)
            } catch (error) {
                console.error(`[Auto-Track] Failed to track to goal ${goalId}:`, error)
            }
        }

        // Update transaction with first goalId (for backward compatibility)
        if (goalIds.length > 0) {
            await prisma.transaction.update({
                where: { id: transactionId },
                data: { goalId: goalIds[0] },
            })
        }

        return {
            tracked: goalIds.length > 0,
            goalIds,
        }
    } catch (error) {
        console.error('[Auto-Track] Error auto-tracking transaction to goals:', error)
        return { tracked: false, goalIds: [] }
    }
}

/**
 * Remove auto-tracking when transaction is deleted
 */
export async function removeAutoTrackFromGoals(transactionId: string, userId: string): Promise<void> {
    try {
        const goalActivities = await prisma.goalActivity.findMany({
            where: {
                transactionId,
                userId,
            },
            include: {
                goal: true,
            },
        })

        for (const activity of goalActivities) {
            await prisma.goal.update({
                where: { id: activity.goalId },
                data: {
                    current: {
                        decrement: activity.amount,
                    },
                    status: activity.goal.current - activity.amount < activity.goal.target ? 'ONGOING' : activity.goal.status,
                    updatedAt: new Date(),
                },
            })

            await prisma.goalActivity.delete({
                where: { id: activity.id },
            })

            console.log(`[Auto-Track] Removed tracking from goal: ${activity.goal.name}`)
        }
    } catch (error) {
        console.error('[Auto-Track] Error removing auto-track:', error)
    }
}

/**
 * Update auto-tracking when transaction amount changes
 */
export async function updateAutoTrackAmount(
    transactionId: string,
    userId: string,
    oldAmount: number,
    newAmount: number
): Promise<void> {
    try {
        const goalActivities = await prisma.goalActivity.findMany({
            where: {
                transactionId,
                userId,
            },
        })

        const amountDiff = newAmount - oldAmount

        for (const activity of goalActivities) {
            await prisma.goalActivity.update({
                where: { id: activity.id },
                data: {
                    amount: newAmount,
                },
            })

            const goal = await prisma.goal.findUnique({
                where: { id: activity.goalId },
            })

            if (goal) {
                await prisma.goal.update({
                    where: { id: activity.goalId },
                    data: {
                        current: {
                            increment: amountDiff,
                        },
                        status: goal.current + amountDiff >= goal.target ? 'COMPLETED' : 'ONGOING',
                        updatedAt: new Date(),
                    },
                })
            }
        }
    } catch (error) {
        console.error('[Auto-Track] Error updating auto-track amount:', error)
    }
}
