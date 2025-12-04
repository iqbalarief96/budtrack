
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const wallets = await prisma.wallet.findMany({
        where: {
            name: {
                contains: 'Bibit'
            }
        },
        include: {
            _count: {
                select: { transactions: true }
            }
        }
    })

    console.log('Found wallets:', JSON.stringify(wallets, null, 2))
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
