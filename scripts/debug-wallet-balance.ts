/**
 * Debug script to check wallet balances and transactions
 */

import prisma from '@/lib/prisma'

async function debugWalletBalance(userId: string) {
  console.log('\n=== WALLET BALANCE DEBUG ===\n')

  // Get all wallets
  const wallets = await prisma.wallet.findMany({
    where: { userId },
    orderBy: { name: 'asc' }
  })

  console.log(`Found ${wallets.length} wallets:\n`)

  for (const wallet of wallets) {
    console.log(`\n📁 ${wallet.name} (${wallet.type})`)
    console.log(`   ID: ${wallet.id}`)
    console.log(`   Balance (stored): Rp ${wallet.balance.toLocaleString('id-ID')}`)

    // Count transactions
    const incomeCount = await prisma.transaction.count({
      where: { walletId: wallet.id, type: 'INCOME' }
    })

    const expenseCount = await prisma.transaction.count({
      where: { walletId: wallet.id, type: 'EXPENSE' }
    })

    // Sum transactions
    const incomeSum = await prisma.transaction.aggregate({
      where: { walletId: wallet.id, type: 'INCOME' },
      _sum: { amount: true }
    })

    const expenseSum = await prisma.transaction.aggregate({
      where: { walletId: wallet.id, type: 'EXPENSE' },
      _sum: { amount: true }
    })

    const calculatedBalance = (incomeSum._sum.amount || 0) - (expenseSum._sum.amount || 0)

    console.log(`   Transactions:`)
    console.log(`     - INCOME: ${incomeCount} txs = Rp ${(incomeSum._sum.amount || 0).toLocaleString('id-ID')}`)
    console.log(`     - EXPENSE: ${expenseCount} txs = Rp ${(expenseSum._sum.amount || 0).toLocaleString('id-ID')}`)
    console.log(`   Calculated Balance: Rp ${calculatedBalance.toLocaleString('id-ID')}`)
    
    if (wallet.balance !== calculatedBalance) {
      console.log(`   ⚠️  MISMATCH! Stored: ${wallet.balance}, Calculated: ${calculatedBalance}`)
    } else {
      console.log(`   ✅ Balance matches!`)
    }

    // Show recent transactions
    const recentTxs = await prisma.transaction.findMany({
      where: { walletId: wallet.id },
      include: { category: true },
      orderBy: { date: 'desc' },
      take: 5
    })

    if (recentTxs.length > 0) {
      console.log(`\n   Recent transactions:`)
      recentTxs.forEach(tx => {
        const sign = tx.type === 'INCOME' ? '+' : '-'
        console.log(`     ${sign} Rp ${tx.amount.toLocaleString('id-ID')} - ${tx.description} (${tx.category?.name})`)
      })
    }
  }

  // Check for savings transactions in main wallet
  console.log('\n\n=== SAVINGS TRANSACTIONS IN MAIN WALLET ===\n')
  
  const savingsTxs = await prisma.transaction.findMany({
    where: {
      userId,
      type: 'EXPENSE',
      category: {
        OR: [
          { name: { contains: 'Savings' } },
          { name: { contains: 'savings' } },
          { name: { contains: 'Tabungan' } },
          { name: { contains: 'tabungan' } }
        ]
      }
    },
    include: {
      category: true,
      wallet: true
    },
    orderBy: { date: 'desc' }
  })

  console.log(`Found ${savingsTxs.length} savings EXPENSE transactions`)
  
  if (savingsTxs.length > 0) {
    const totalAmount = savingsTxs.reduce((sum, tx) => sum + tx.amount, 0)
    console.log(`Total amount: Rp ${totalAmount.toLocaleString('id-ID')}\n`)
    
    console.log('Sample transactions:')
    savingsTxs.slice(0, 10).forEach(tx => {
      console.log(`  - ${tx.wallet.name}: Rp ${tx.amount.toLocaleString('id-ID')} - ${tx.description}`)
    })
  }

  console.log('\n=== END DEBUG ===\n')
}

// CLI usage
async function main() {
  const userId = process.argv[2]

  if (!userId) {
    console.error('Usage: npx tsx scripts/debug-wallet-balance.ts <userId>')
    process.exit(1)
  }

  try {
    await debugWalletBalance(userId)
  } catch (error) {
    console.error('Debug failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main()
}

export { debugWalletBalance }
