import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function updateGoalCategory() {
    try {
        // Update goal "Tabungan Pendidikan" to have EDUCATION category
        const result = await prisma.goal.updateMany({
            where: {
                name: 'Tabungan Pendidikan',
                category: null,
            },
            data: {
                category: 'EDUCATION',
            },
        })

        console.log(`✅ Updated ${result.count} goal(s) with EDUCATION category`)
    } catch (error) {
        console.error('❌ Error:', error)
    } finally {
        await prisma.$disconnect()
    }
}

updateGoalCategory()
