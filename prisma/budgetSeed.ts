import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Get the first user
  const user = await prisma.user.findFirst()
  
  if (!user) {
    console.error('No user found. Please register a user first.')
    return
  }

  // Get wallets
  const wallets = await prisma.wallet.findMany({
    where: {
      userId: user.id
    }
  })

  if (wallets.length === 0) {
    console.error('No wallets found. Please create wallets first.')
    return
  }

  // Get expense categories
  const expenseCategories = await prisma.category.findMany({
    where: {
      userId: user.id,
      type: 'EXPENSE'
    }
  })

  if (expenseCategories.length === 0) {
    console.error('No expense categories found. Please create categories first.')
    return
  }

  // Start date (beginning of current month)
  const today = new Date()
  const startDate = new Date(today.getFullYear(), today.getMonth(), 1)
  
  // End date (end of next month)
  const endDate = new Date(today.getFullYear(), today.getMonth() + 2, 0)

  // Sample budgets config
  const budgetConfigs = [
    { categoryName: 'Makanan', amount: 2000000 },
    { categoryName: 'Transportasi', amount: 1000000 },
    { categoryName: 'Hiburan', amount: 500000 },
    { categoryName: 'Belanja', amount: 1500000 },
    { categoryName: 'Tagihan', amount: 1200000 },
    { categoryName: 'Kebutuhan', amount: 800000 },
    { categoryName: 'Kesehatan', amount: 500000 },
    { categoryName: 'Pendidikan', amount: 700000 },
    { categoryName: 'Langganan', amount: 300000 },
    { categoryName: 'Hobi', amount: 400000 }
  ]

  // Get default wallet
  const primaryWallet = wallets.find(w => w.isDefault) || wallets[0]

  // Create budgets
  const budgets = []

  for (const config of budgetConfigs) {
    // Find matching category
    const category = expenseCategories.find(c => c.name === config.categoryName)
    
    if (category) {
      budgets.push({
        amount: config.amount,
        spent: 0, // Will be calculated from transactions
        startDate: startDate,
        endDate: endDate,
        walletId: primaryWallet.id,
        categoryId: category.id,
        userId: user.id
      })
    }
  }

  // Create budgets in database
  let addedCount = 0
  for (const budget of budgets) {
    try {
      // Check if budget already exists for this category and date range
      const existingBudget = await prisma.budget.findFirst({
        where: {
          userId: user.id,
          categoryId: budget.categoryId,
          walletId: budget.walletId,
          startDate: budget.startDate,
          endDate: budget.endDate
        }
      })

      if (!existingBudget) {
        // Calculate spent amount from transactions
        const transactions = await prisma.transaction.findMany({
          where: {
            userId: user.id,
            categoryId: budget.categoryId,
            walletId: budget.walletId,
            date: {
              gte: budget.startDate,
              lte: new Date() // Only count transactions up to today
            },
            type: 'EXPENSE'
          }
        })

        // Sum up transaction amounts
        const spent = transactions.reduce((sum, tx) => sum + tx.amount, 0)

        // Create budget with spent amount
        await prisma.budget.create({
          data: {
            ...budget,
            spent
          }
        })
        addedCount++
      }
    } catch (error) {
      console.error('Error creating budget:', error)
    }
  }

  console.log(`Created ${addedCount} sample budgets for user ${user.name}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 