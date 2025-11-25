import prisma from '@/lib/prisma'

async function debugSavingsCategories() {
  console.log('Checking Category table for Savings type...\n')
  
  // Get all categories
  const allCategories = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
      type: true,
      userId: true
    }
  })
  
  console.log(`Total categories: ${allCategories.length}\n`)
  
  // Filter savings-related
  const savingsCategories = allCategories.filter(c => 
    c.name.toLowerCase().includes('saving') || 
    c.name.toLowerCase().includes('tabungan') ||
    c.type.toLowerCase().includes('saving')
  )
  
  console.log('Savings-related categories:')
  savingsCategories.forEach(c => {
    console.log(`  - Name: "${c.name}", Type: "${c.type}", ID: ${c.id}`)
  })
  
  console.log('\n' + '='.repeat(60))
  console.log('Checking transactions with savings categories...\n')
  
  if (savingsCategories.length > 0) {
    const categoryIds = savingsCategories.map(c => c.id)
    
    const transactions = await prisma.transaction.findMany({
      where: {
        categoryId: { in: categoryIds },
        type: 'EXPENSE'
      },
      include: {
        category: true
      },
      take: 10
    })
    
    console.log(`Found ${transactions.length} transactions (showing first 10):`)
    transactions.forEach(tx => {
      console.log(`  - ${tx.description} | Category: ${tx.category?.name} (${tx.category?.type}) | Amount: ${tx.amount}`)
    })
  }
  
  await prisma.$disconnect()
}

debugSavingsCategories().catch(console.error)
