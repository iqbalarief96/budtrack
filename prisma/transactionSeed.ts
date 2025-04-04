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

  // Get categories
  const categories = await prisma.category.findMany({
    where: {
      userId: user.id
    }
  })

  if (categories.length === 0) {
    console.error('No categories found. Please create categories first.')
    return
  }

  // Group categories by type
  const expenseCategories = categories.filter(c => c.type === 'EXPENSE')
  const incomeCategories = categories.filter(c => c.type === 'INCOME')

  // Generate random transactions for last 3 months
  const transactions = []
  const today = new Date()
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(today.getMonth() - 3)

  // Config: transaction counts and amount ranges
  const config = {
    expense: {
      count: 50, // Number of expense transactions
      minAmount: 10000,
      maxAmount: 1000000
    },
    income: {
      count: 15, // Number of income transactions
      minAmount: 500000,
      maxAmount: 10000000
    }
  }

  // Helper function to get random date within range
  const randomDate = (start: Date, end: Date): Date => {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
  }

  // Helper function to get random element from array
  const randomElement = <T>(array: T[]): T => {
    return array[Math.floor(Math.random() * array.length)]
  }

  // Helper function to get random amount within range
  const randomAmount = (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  // Generate expense transactions
  for (let i = 0; i < config.expense.count; i++) {
    const date = randomDate(threeMonthsAgo, today)
    const wallet = randomElement(wallets)
    const category = randomElement(expenseCategories)
    const amount = randomAmount(config.expense.minAmount, config.expense.maxAmount)

    transactions.push({
      amount: amount,
      type: 'EXPENSE',
      description: `Pengeluaran untuk ${category.name}`,
      date: date,
      walletId: wallet.id,
      categoryId: category.id,
      userId: user.id
    })
  }

  // Generate income transactions
  for (let i = 0; i < config.income.count; i++) {
    const date = randomDate(threeMonthsAgo, today)
    const wallet = randomElement(wallets)
    const category = randomElement(incomeCategories)
    const amount = randomAmount(config.income.minAmount, config.income.maxAmount)

    transactions.push({
      amount: amount,
      type: 'INCOME',
      description: `Pendapatan dari ${category.name}`,
      date: date,
      walletId: wallet.id,
      categoryId: category.id,
      userId: user.id
    })
  }

  // Sort transactions by date
  transactions.sort((a, b) => a.date.getTime() - b.date.getTime())

  // Create transactions in database
  let addedCount = 0
  for (const transaction of transactions) {
    try {
      await prisma.transaction.create({
        data: transaction
      })
      addedCount++
    } catch (error) {
      console.error('Error creating transaction:', error)
    }
  }

  console.log(`Created ${addedCount} sample transactions for user ${user.name}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 