import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const updatedCategory = await prisma.category.update({
    where: {
      id: 'cm91lavyw001gtum5so7a3v89'
    },
    data: {
      type: 'SAVINGS'
    }
  })
  
  console.log('Updated category:', updatedCategory)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 