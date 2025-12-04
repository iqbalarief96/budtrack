/**
 * Fix Script: Create INCOME transactions for savings wallets that have balance but no transactions
 * 
 * This fixes the issue where wallets have stored balance but no actual transactions
 */

import prisma from '@/lib/prisma'

async function fixSavingsTransactions(userId: string, dryRun: boolean = true) {
  const logs: string[] = []
  const log = (message: string) => {
    console.log(message)
    logs.push(message)
  }

  log(`\n${'='.repeat(60)}`)
  log(`Fix: Create INCOME transactions for savings wallets`)
  log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE (will make changes)'}`)
  log(`User ID: ${userId}`)
  log(`${'='.repeat(60)}\n`)

  // Get all savings wallets
  const savingsWallets = await prisma.wallet.findMany({
    where: {
      userId,
      type: 'SAVINGS'
    }
  })

  log(`Found ${savingsWallets.length} savings wallets\n`)

  const results = []

  for (const wallet of savingsWallets) {
    log(`\n📁 ${wallet.name}`)
    log(`   Balance: Rp ${wallet.balance.toLocaleString('id-ID')}`)

    // Check existing transactions
    const txCount = await prisma.transaction.count({
      where: { walletId: wallet.id }
    })

    log(`   Existing transactions: ${txCount}`)

    if (txCount > 0) {
      log(`   ✓ Wallet already has transactions, skipping`)
      results.push({
        wallet: wallet.name,
        status: 'skipped',
        reason: 'Already has transactions'
      })
      continue
    }

    if (wallet.balance === 0) {
      log(`   ✓ Wallet has zero balance, skipping`)
      results.push({
        wallet: wallet.name,
        status: 'skipped',
        reason: 'Zero balance'
      })
      continue
    }

    // Find matching savings transactions in main wallet
    const mainWallet = await prisma.wallet.findFirst({
      where: {
        userId,
        type: 'MAIN'
      }
    })

    if (!mainWallet) {
      log(`   ✗ No main wallet found`)
      results.push({
        wallet: wallet.name,
        status: 'error',
        reason: 'No main wallet'
      })
      continue
    }

    // Find savings category
    const savingsCategory = await prisma.category.findFirst({
      where: {
        userId,
        OR: [
          { name: { contains: 'Savings' } },
          { name: { contains: 'savings' } },
          { name: { contains: 'Tabungan' } },
          { name: { contains: 'tabungan' } }
        ]
      }
    })

    if (!savingsCategory) {
      log(`   ✗ No savings category found`)
      results.push({
        wallet: wallet.name,
        status: 'error',
        reason: 'No savings category'
      })
      continue
    }

    // Find EXPENSE transactions in main wallet that match this savings type
    const expenseTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        walletId: mainWallet.id,
        type: 'EXPENSE',
        categoryId: savingsCategory.id,
        OR: [
          { description: { contains: wallet.name.replace('Tabungan ', '') } },
          { description: { contains: wallet.name } }
        ]
      },
      orderBy: { date: 'asc' }
    })

    log(`   Found ${expenseTransactions.length} matching EXPENSE transactions`)

    if (expenseTransactions.length === 0) {
      // No matching transactions, create a single INCOME transaction with the balance
      log(`   Creating single INCOME transaction for balance...`)
      
      if (!dryRun) {
        await prisma.transaction.create({
          data: {
            userId,
            walletId: wallet.id,
            categoryId: savingsCategory.id,
            amount: wallet.balance,
            type: 'INCOME',
            description: `${wallet.name} (initial balance)`,
            date: new Date()
          }
        })
      }

      results.push({
        wallet: wallet.name,
        status: 'created',
        transactions: 1,
        amount: wallet.balance
      })

      log(`   ✓ Created 1 INCOME transaction: Rp ${wallet.balance.toLocaleString('id-ID')}`)
    } else {
      // Create INCOME transactions matching the EXPENSE transactions
      log(`   Creating ${expenseTransactions.length} INCOME transactions...`)
      
      if (!dryRun) {
        for (const expenseTx of expenseTransactions) {
          await prisma.transaction.create({
            data: {
              userId,
              walletId: wallet.id,
              categoryId: expenseTx.categoryId,
              amount: expenseTx.amount,
              type: 'INCOME',
              description: expenseTx.description + ' (migrated)',
              date: expenseTx.date
            }
          })
        }
      }

      const totalAmount = expenseTransactions.reduce((sum, tx) => sum + tx.amount, 0)

      results.push({
        wallet: wallet.name,
        status: 'created',
        transactions: expenseTransactions.length,
        amount: totalAmount
      })

      log(`   ✓ Created ${expenseTransactions.length} INCOME transactions: Rp ${totalAmount.toLocaleString('id-ID')}`)
    }
  }

  // Summary
  log(`\n${'='.repeat(60)}`)
  log('Summary')
  log(`${'='.repeat(60)}\n`)

  const created = results.filter(r => r.status === 'created')
  const skipped = results.filter(r => r.status === 'skipped')
  const errors = results.filter(r => r.status === 'error')

  log(`✓ Created: ${created.length}`)
  log(`- Skipped: ${skipped.length}`)
  log(`✗ Errors: ${errors.length}`)

  if (created.length > 0) {
    const totalTxs = created.reduce((sum, r) => sum + (r.transactions || 0), 0)
    const totalAmount = created.reduce((sum, r) => sum + (r.amount || 0), 0)
    log(`\nTotal transactions created: ${totalTxs}`)
    log(`Total amount: Rp ${totalAmount.toLocaleString('id-ID')}`)
  }

  if (dryRun) {
    log('\n⚠️  DRY RUN MODE - No changes made')
    log('Run with --apply to make changes\n')
  } else {
    log('\n✅ Changes applied successfully!\n')
  }

  return { logs, results }
}

// CLI usage
async function main() {
  const args = process.argv.slice(2)
  const userId = args[0]
  const dryRun = !args.includes('--apply')

  if (!userId) {
    console.error('Usage: npx tsx scripts/fix-savings-transactions.ts <userId> [--apply]')
    console.error('\nExample:')
    console.error('  npx tsx scripts/fix-savings-transactions.ts clxxx123 --apply')
    console.error('\nWithout --apply flag, it will run in dry-run mode (no changes)')
    process.exit(1)
  }

  try {
    await fixSavingsTransactions(userId, dryRun)
  } catch (error) {
    console.error('Fix failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main()
}

export { fixSavingsTransactions }
