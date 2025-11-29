/**
 * Sync Wallet Balances Script
 * 
 * Syncs stored wallet.balance with calculated balance from transactions
 * Run this once to fix any balance mismatches
 */

import prisma from '../lib/prisma'

async function syncWalletBalances(userId?: string) {
  console.log('\n=== SYNC WALLET BALANCES ===\n')
  
  if (userId) {
    console.log(`User ID: ${userId}`)
  } else {
    console.log('Syncing ALL users')
  }
  
  console.log('='.repeat(60) + '\n')

  // Get all wallets (optionally filtered by user)
  const wallets = await prisma.wallet.findMany({
    where: userId ? { userId } : {},
    orderBy: { name: 'asc' }
  })

  console.log(`Found ${wallets.length} wallets to sync\n`)

  let synced = 0
  let skipped = 0
  let errors = 0

  for (const wallet of wallets) {
    try {
      // Calculate balance from transactions
      const incomeSum = await prisma.transaction.aggregate({
        where: {
          walletId: wallet.id,
          type: 'INCOME'
        },
        _sum: {
          amount: true
        }
      })

      const expenseSum = await prisma.transaction.aggregate({
        where: {
          walletId: wallet.id,
          type: 'EXPENSE'
        },
        _sum: {
          amount: true
        }
      })

      const calculatedBalance = (incomeSum._sum.amount || 0) - (expenseSum._sum.amount || 0)
      const storedBalance = wallet.balance

      // Check if sync needed
      if (storedBalance === calculatedBalance) {
        console.log(`✓ ${wallet.name}: Already synced (Rp ${calculatedBalance.toLocaleString('id-ID')})`)
        skipped++
        continue
      }

      // Update stored balance
      await prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: calculatedBalance }
      })

      console.log(`✓ ${wallet.name}:`)
      console.log(`  Old: Rp ${storedBalance.toLocaleString('id-ID')}`)
      console.log(`  New: Rp ${calculatedBalance.toLocaleString('id-ID')}`)
      console.log(`  Diff: Rp ${(calculatedBalance - storedBalance).toLocaleString('id-ID')}`)
      console.log()

      synced++
    } catch (error) {
      console.error(`✗ ${wallet.name}: Error syncing`)
      console.error(error)
      errors++
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('SUMMARY')
  console.log('='.repeat(60))
  console.log(`✓ Synced: ${synced}`)
  console.log(`- Skipped: ${skipped} (already correct)`)
  console.log(`✗ Errors: ${errors}`)
  console.log()

  if (synced > 0) {
    console.log('✅ Balance sync completed successfully!')
  } else if (errors === 0) {
    console.log('✅ All balances already correct!')
  }
  
  console.log()
}

// CLI usage
async function main() {
  const userId = process.argv[2]

  try {
    await syncWalletBalances(userId)
  } catch (error) {
    console.error('Sync failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main()
}

export { syncWalletBalances }
