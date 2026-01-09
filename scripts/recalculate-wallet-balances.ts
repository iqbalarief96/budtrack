/**
 * Script to recalculate all wallet balances from transactions
 * Run with: npx ts-node scripts/recalculate-wallet-balances.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function recalculateWalletBalances() {
  console.log('=== Recalculating Wallet Balances ===\n')

  try {
    // Get all wallets
    const wallets = await prisma.wallet.findMany({
      select: {
        id: true,
        name: true,
        balance: true,
        userId: true,
      },
    })

    console.log(`Found ${wallets.length} wallets to process\n`)

    let updated = 0
    let unchanged = 0

    for (const wallet of wallets) {
      // Calculate balance from transactions
      const [incomeResult, expenseResult, transferInResult, transferOutResult] = await Promise.all([
        // Income
        prisma.transaction.aggregate({
          where: {
            walletId: wallet.id,
            type: { in: ['income', 'INCOME'] },
          },
          _sum: { amount: true },
        }),
        // Expense
        prisma.transaction.aggregate({
          where: {
            walletId: wallet.id,
            type: { in: ['expense', 'EXPENSE'] },
          },
          _sum: { amount: true },
        }),
        // Transfer In (positive)
        prisma.transaction.aggregate({
          where: {
            walletId: wallet.id,
            type: { in: ['transfer', 'TRANSFER'] },
            amount: { gt: 0 },
          },
          _sum: { amount: true },
        }),
        // Transfer Out (negative)
        prisma.transaction.aggregate({
          where: {
            walletId: wallet.id,
            type: { in: ['transfer', 'TRANSFER'] },
            amount: { lt: 0 },
          },
          _sum: { amount: true },
        }),
      ])

      const income = incomeResult._sum.amount || 0
      const expense = expenseResult._sum.amount || 0
      const transferIn = transferInResult._sum.amount || 0
      const transferOut = Math.abs(transferOutResult._sum.amount || 0)

      // Calculate new balance: income - expense + transferIn - transferOut
      const calculatedBalance = income - expense + transferIn - transferOut

      if (Math.abs(wallet.balance - calculatedBalance) > 0.01) {
        console.log(`Wallet: ${wallet.name} (${wallet.id})`)
        console.log(`  Old balance: ${wallet.balance}`)
        console.log(`  Calculated:  ${calculatedBalance}`)
        console.log(`  Income: ${income}, Expense: ${expense}, TransferIn: ${transferIn}, TransferOut: ${transferOut}`)

        // Update wallet balance
        await prisma.wallet.update({
          where: { id: wallet.id },
          data: { balance: calculatedBalance },
        })

        console.log(`  ✓ Updated!\n`)
        updated++
      } else {
        unchanged++
      }
    }

    console.log('\n=== Summary ===')
    console.log(`Total wallets: ${wallets.length}`)
    console.log(`Updated: ${updated}`)
    console.log(`Unchanged: ${unchanged}`)

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

recalculateWalletBalances()
