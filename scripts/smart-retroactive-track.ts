import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Keyword mappings - SPECIFIC keywords only
const SAVINGS_KEYWORD_MAPPINGS = [
    { keywords: ['darurat', 'emergency'], goalTypes: ['EMERGENCY_FUND'] },
    { keywords: ['pendidikan', 'school', 'kuliah', 'education', 'sekolah', 'kampus'], goalTypes: ['EDUCATION'] },
    { keywords: ['liburan', 'travel', 'vacation', 'holiday', 'umroh', 'haji'], goalTypes: ['VACATION'] },
    { keywords: ['pensiun', 'retirement'], goalTypes: ['RETIREMENT'] },
    { keywords: ['rumah', 'properti', 'property', 'kpr', 'house', 'apartemen'], goalTypes: ['HOME_DOWN_PAYMENT', 'PROPERTY'] },
    { keywords: ['kendaraan', 'mobil', 'motor', 'car', 'bike'], goalTypes: ['CAR', 'VEHICLE'] },
]

function detectGoalTypes(description: string): string[] {
    const searchText = description.toLowerCase()
    const matched: string[] = []

    for (const mapping of SAVINGS_KEYWORD_MAPPINGS) {
        for (const keyword of mapping.keywords) {
            if (searchText.includes(keyword)) {
                matched.push(...mapping.goalTypes)
                break
            }
        }
    }

    return [...new Set(matched)]
}

async function smartRetroactiveTracking() {
    try {
        console.log('🔍 Finding savings transactions with SPECIFIC keywords...\n')

        // Get all savings transactions
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
                wallet: true,
            },
            orderBy: {
                date: 'desc',
            },
        })

        console.log(`📊 Found ${transactions.length} total savings transactions`)
        console.log('🎯 Checking for specific keywords...\n')

        const matchedTransactions = []

        for (const tx of transactions) {
            const goalTypes = detectGoalTypes(tx.description || '')

            if (goalTypes.length > 0) {
                matchedTransactions.push({
                    tx,
                    goalTypes,
                })
                console.log(`✅ "${tx.description}" → ${goalTypes.join(', ')}`)
            }
        }

        console.log(`\n📌 Found ${matchedTransactions.length} transactions with specific keywords`)

        if (matchedTransactions.length === 0) {
            console.log('\n⚠️  No transactions match specific goal keywords')
            return
        }

        console.log('\n🔗 Linking to goals...\n')

        let trackedCount = 0

        for (const { tx, goalTypes } of matchedTransactions) {
            // Find matching goal
            const goal = await prisma.goal.findFirst({
                where: {
                    userId: tx.userId,
                    status: 'ONGOING',
                    isArchived: false,
                    category: {
                        in: goalTypes,
                    },
                },
            })

            if (!goal) {
                console.log(`⚠️  No goal found for ${goalTypes.join(', ')}`)
                continue
            }

            try {
                // Create goal activity
                await prisma.goalActivity.create({
                    data: {
                        goalId: goal.id,
                        userId: tx.userId,
                        amount: tx.amount,
                        date: tx.date,
                        description: tx.description || 'Auto-tracked',
                        transactionId: tx.id,
                    },
                })

                // Update goal current
                await prisma.goal.update({
                    where: { id: goal.id },
                    data: {
                        current: {
                            increment: tx.amount,
                        },
                    },
                })

                // Link transaction
                await prisma.transaction.update({
                    where: { id: tx.id },
                    data: { goalId: goal.id },
                })

                console.log(`  ✨ ${tx.description} → ${goal.name} (+Rp ${tx.amount.toLocaleString()})`)
                trackedCount++
            } catch (error) {
                console.error(`  ❌ Error:`, error)
            }
        }

        console.log(`\n🎉 Tracked ${trackedCount} transaction(s)`)

        // Show updated goals
        const goals = await prisma.goal.findMany({
            where: {
                current: {
                    gt: 0,
                },
            },
        })

        if (goals.length > 0) {
            console.log('\n📈 Updated Goals:')
            for (const goal of goals) {
                const pct = ((goal.current / goal.target) * 100).toFixed(1)
                console.log(`  ${goal.name}: Rp ${goal.current.toLocaleString()} / Rp ${goal.target.toLocaleString()} (${pct}%)`)
            }
        }

    } catch (error) {
        console.error('❌ Error:', error)
    } finally {
        await prisma.$disconnect()
    }
}

smartRetroactiveTracking()
