/**
 * Migration Script: Convert Savings Transactions to Savings Wallets
 * 
 * This script migrates the old system where savings were tracked as EXPENSE transactions
 * with SAVINGS category to the new system where each savings type has its own wallet.
 * 
 * What it does:
 * 1. Find all EXPENSE transactions with SAVINGS category
 * 2. Group them by savings type (Crypto, Properti, etc)
 * 3. Create SAVINGS wallets for each type
 * 4. Calculate total balance for each savings type
 * 5. Mark old transactions as migrated (add note)
 */

import prisma from '@/lib/prisma'

const SAVINGS_KEYWORD_MAPPINGS = [
  { label: 'Tabungan Darurat', keywords: ['darurat', 'emergency'], icon: '🚨', color: '#ef4444' },
  { label: 'Tabungan Pendidikan', keywords: ['pendidikan', 'school', 'kuliah', 'education'], icon: '🎓', color: '#3b82f6' },
  { label: 'Tabungan Liburan', keywords: ['liburan', 'travel', 'traveling', 'vacation', 'holiday', 'umroh', 'haji'], icon: '✈️', color: '#10b981' },
  { label: 'Tabungan Pensiun', keywords: ['pensiun', 'retirement'], icon: '👴', color: '#8b5cf6' },
  { label: 'Tabungan Properti', keywords: ['rumah', 'properti', 'property', 'kpr', 'house', 'apartemen', 'apartment'], icon: '🏠', color: '#f59e0b' },
  { label: 'Tabungan Kendaraan', keywords: ['kendaraan', 'mobil', 'motor', 'car', 'bike'], icon: '🚗', color: '#06b6d4' },
  { label: 'Tabungan Bank', keywords: ['bank', 'rekening', 'account'], icon: '🏦', color: '#6366f1' },
  { label: 'Tabungan Emas', keywords: ['emas', 'gold', 'logam mulia'], icon: '🥇', color: '#eab308' },
  { label: 'Tabungan Crypto', keywords: ['crypto', 'kripto', 'btc', 'bitcoin', 'eth', 'ethereum'], icon: '₿', color: '#f97316' },
  { label: 'Tabungan Investasi', keywords: ['investasi', 'investment', 'reksa', 'reksadana', 'saham', 'stock', 'obligasi', 'bond'], icon: '📈', color: '#14b8a6' },
  { label: 'Tabungan Deposito', keywords: ['deposito', 'deposit', 'term deposit'], icon: '💰', color: '#84cc16' },
]

const DEFAULT_SAVINGS = { label: 'Tabungan Lainnya', icon: '💵', color: '#64748b' }

function determineSavingsType(description: string, categoryName: string): { label: string; icon: string; color: string } {
  const searchText = `${description} ${categoryName}`.toLowerCase()
  
  const mapping = SAVINGS_KEYWORD_MAPPINGS.find(m => 
    m.keywords.some(keyword => searchText.includes(keyword))
  )
  
  if (mapping) {
    return mapping
  }
  
  // Try to extract from "Tabungan XXX" pattern
  const match = searchText.match(/tabungan\s+([a-z0-9\s]+)/i)
  if (match && match[1]) {
    const extracted = match[1].trim()
    return {
      label: `Tabungan ${extracted.charAt(0).toUpperCase() + extracted.slice(1)}`,
      icon: '💵',
      color: '#64748b'
    }
  }
  
  return DEFAULT_SAVINGS
}

async function migrateSavingsToWallets(userId: string, dryRun: boolean = true) {
  const logs: string[] = []
  const log = (message: string) => {
    console.log(message)
    logs.push(message)
  }

  log(`\n${'='.repeat(60)}`)
  log(`Migration: Savings Transactions → Savings Wallets`)
  log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE (will make changes)'}`)
  log(`User ID: ${userId}`)
  log(`${'='.repeat(60)}\n`)

  // 1. Find all savings transactions
  // Note: We filter by category NAME containing "Savings" or "Tabungan"
  // because the category type is "EXPENSE", not "SAVINGS"
  const savingsTransactions = await prisma.transaction.findMany({
    where: {
      userId,
      type: 'EXPENSE',
      category: {
        OR: [
          { name: { contains: 'Savings' } },
          { name: { contains: 'savings' } },
          { name: { contains: 'Tabungan' } },
          { name: { contains: 'tabungan' } },
          { type: { in: ['SAVINGS', 'Savings', 'savings'] } } // Fallback for proper setup
        ]
      }
    },
    include: {
      category: true,
      wallet: true
    },
    orderBy: {
      date: 'asc'
    }
  })

  log(`Found ${savingsTransactions.length} savings transactions\n`)

  if (savingsTransactions.length === 0) {
    log('No savings transactions found. Nothing to migrate.')
    return { logs, summary: { total: 0, groups: 0 } }
  }

  // 2. Group by savings type
  const savingsByType = new Map<string, {
    label: string
    icon: string
    color: string
    transactions: typeof savingsTransactions
    totalAmount: number
  }>()

  for (const tx of savingsTransactions) {
    const savingsType = determineSavingsType(
      tx.description || '',
      tx.category?.name || ''
    )
    
    const key = savingsType.label
    
    if (!savingsByType.has(key)) {
      savingsByType.set(key, {
        label: savingsType.label,
        icon: savingsType.icon,
        color: savingsType.color,
        transactions: [],
        totalAmount: 0
      })
    }
    
    const group = savingsByType.get(key)!
    group.transactions.push(tx)
    group.totalAmount += tx.amount
  }

  log(`Grouped into ${savingsByType.size} savings types:\n`)
  
  // 3. Display summary
  const groupSummary = []
  for (const [label, data] of savingsByType) {
    log(`${data.icon} ${label}`)
    log(`   Transactions: ${data.transactions.length}`)
    log(`   Total Amount: Rp ${data.totalAmount.toLocaleString('id-ID')}`)
    log(`   Color: ${data.color}`)
    log('')
    
    groupSummary.push({
      label: data.label,
      icon: data.icon,
      transactionCount: data.transactions.length,
      totalAmount: data.totalAmount,
      color: data.color
    })
  }

  if (dryRun) {
    log('\n⚠️  DRY RUN MODE - No changes made')
    log('Run with dryRun=false to apply changes\n')
    return { 
      logs, 
      summary: {
        total: savingsTransactions.length,
        groups: savingsByType.size,
        groupDetails: groupSummary
      }
    }
  }

  // 4. Create wallets and migrate
  log('\n🚀 Starting migration...\n')
  
  const results = []
  
  for (const [label, data] of savingsByType) {
    try {
      // Check if wallet already exists
      const existingWallet = await prisma.wallet.findFirst({
        where: {
          userId,
          name: data.label,
          type: 'SAVINGS'
        }
      })

      let wallet
      
      if (existingWallet) {
        log(`✓ Wallet "${data.label}" already exists, updating balance...`)
        wallet = await prisma.wallet.update({
          where: { id: existingWallet.id },
          data: {
            balance: existingWallet.balance + data.totalAmount
          }
        })
      } else {
        log(`✓ Creating wallet "${data.label}"...`)
        wallet = await prisma.wallet.create({
          data: {
            userId,
            name: data.label,
            type: 'SAVINGS',
            balance: data.totalAmount,
            icon: data.icon,
            color: data.color,
            isDefault: false
          }
        })
      }

      // Create new INCOME transactions in savings wallet
      // Keep original EXPENSE transactions in main wallet (they represent money leaving main wallet)
      const newTransactions = []
      for (const tx of data.transactions) {
        const newTx = await prisma.transaction.create({
          data: {
            userId,
            walletId: wallet.id,
            categoryId: tx.categoryId,
            amount: tx.amount,
            type: 'INCOME', // Money coming INTO savings wallet
            description: tx.description + ' (migrated from main wallet)',
            date: tx.date
          }
        })
        newTransactions.push(newTx)
      }
      
      log(`  ✓ Created ${newTransactions.length} INCOME transactions in ${wallet.name}`)
      log(`  ✓ Original EXPENSE transactions kept in main wallet (represents transfer out)`)
      log(`  ⚠️  WARNING: Do NOT delete the savings wallets after migration!`)

      results.push({
        label: data.label,
        walletId: wallet.id,
        transactionCount: data.transactions.length,
        amount: data.totalAmount,
        status: 'success'
      })

      log(`  ✓ Wallet balance: Rp ${wallet.balance.toLocaleString('id-ID')}\n`)
      
    } catch (error) {
      console.error(`  ✗ Error migrating "${data.label}":`, error)
      results.push({
        label: data.label,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  // 5. Summary
  log(`\n${'='.repeat(60)}`)
  log('Migration Summary')
  log(`${'='.repeat(60)}\n`)
  
  const successful = results.filter(r => r.status === 'success')
  const failed = results.filter(r => r.status === 'error')
  
  log(`✓ Successful: ${successful.length}`)
  log(`✗ Failed: ${failed.length}`)
  log(`\nTotal transactions migrated: ${successful.reduce((sum, r) => sum + (r.transactionCount || 0), 0)}`)
  log(`Total amount: Rp ${successful.reduce((sum, r) => sum + (r.amount || 0), 0).toLocaleString('id-ID')}`)
  
  if (failed.length > 0) {
    log('\n❌ Failed migrations:')
    failed.forEach(f => {
      log(`  - ${f.label}: ${f.error}`)
    })
  }
  
  log('')
  
  return {
    logs,
    summary: {
      total: savingsTransactions.length,
      successful: successful.length,
      failed: failed.length,
      results
    }
  }
}

// CLI usage
async function main() {
  const args = process.argv.slice(2)
  const userId = args[0]
  const dryRun = !args.includes('--apply')

  if (!userId) {
    console.error('Usage: npx tsx scripts/migrate-savings-to-wallets.ts <userId> [--apply]')
    console.error('\nExample:')
    console.error('  npx tsx scripts/migrate-savings-to-wallets.ts clxxx123 --apply')
    console.error('\nWithout --apply flag, it will run in dry-run mode (no changes)')
    process.exit(1)
  }

  try {
    await migrateSavingsToWallets(userId, dryRun)
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

export { migrateSavingsToWallets }
