import crypto from 'crypto'
import prisma from '@/lib/prisma'
import { detectSavingsBucket } from '@/lib/savings/savings-detection'
import { findSavingsRuleDestination } from '@/lib/savings/savings-rules'

type MigrationMapping = {
  sourceTransactionId: string
  destinationWalletId?: string
  createWalletName?: string
  icon?: string
  color?: string
}

type SavingsTx = Awaited<ReturnType<typeof getSavingsTransactions>>[number]

function migratedDescription(tx: { description: string | null }) {
  return `${tx.description || ''} (migrated from main wallet)`
}

async function getSavingsTransactions(userId: string, ids?: string[]) {
  return prisma.transaction.findMany({
    where: {
      userId,
      ...(ids?.length ? { id: { in: ids } } : {}),
      type: 'EXPENSE',
      category: {
        OR: [
          { name: { contains: 'Savings' } },
          { name: { contains: 'savings' } },
          { name: { contains: 'Tabungan' } },
          { name: { contains: 'tabungan' } },
          { type: { in: ['SAVINGS', 'Savings', 'savings'] } },
        ],
      },
    },
    include: { category: true, wallet: true },
    orderBy: { date: 'asc' },
  })
}

async function findExistingMigrated(userId: string, tx: SavingsTx, walletId: string) {
  const linked = await prisma.transaction.findFirst({
    where: { userId, walletId, type: 'INCOME', migrationSourceTransactionId: tx.id },
    select: { id: true, amount: true },
  })
  if (linked) return linked

  const legacy = await prisma.transaction.findFirst({
    where: {
      userId,
      walletId,
      type: 'INCOME',
      amount: tx.amount,
      date: tx.date,
      description: migratedDescription(tx),
    },
    select: { id: true, amount: true },
  })

  if (legacy) {
    await prisma.transaction.update({
      where: { id: legacy.id },
      data: { migrationSourceTransactionId: tx.id, transferPairId: tx.transferPairId || crypto.randomUUID() },
    })
  }

  return legacy
}

async function resolveDetection(userId: string, tx: SavingsTx) {
  const text = `${tx.description || ''} ${tx.category?.name || ''}`
  const rule = await findSavingsRuleDestination(userId, text)
  if (rule) {
    return {
      label: rule.destinationWallet.name,
      icon: rule.destinationWallet.icon || '💵',
      color: rule.destinationWallet.color || '#64748b',
      confidence: 'high' as const,
      routingSource: 'rule' as const,
      matchedRuleId: rule.id,
      matchedRuleName: rule.name,
      suggestedWalletId: rule.destinationWalletId,
      suggestedWalletName: rule.destinationWallet.name,
    }
  }

  const detected = detectSavingsBucket(tx.description || '', tx.category?.name || '')
  const existingWallet = await prisma.wallet.findFirst({
    where: { userId, name: detected.label, type: 'SAVINGS' },
    select: { id: true, name: true },
  })

  return {
    ...detected,
    routingSource: detected.confidence === 'low' ? 'fallback' as const : 'heuristic' as const,
    matchedRuleId: undefined,
    matchedRuleName: undefined,
    suggestedWalletId: existingWallet?.id ?? null,
    suggestedWalletName: existingWallet?.name ?? detected.label,
  }
}

async function buildPreviewRows(userId: string, transactions: SavingsTx[]) {
  const rows = []
  for (const tx of transactions) {
    const detection = await resolveDetection(userId, tx)
    const walletId = detection.suggestedWalletId
    const alreadyMigrated = walletId ? Boolean(await findExistingMigrated(userId, tx, walletId)) : false

    rows.push({
      sourceTransactionId: tx.id,
      date: tx.date.toISOString(),
      description: tx.description || '',
      amount: tx.amount,
      sourceWalletId: tx.walletId,
      sourceWalletName: tx.wallet?.name || '',
      categoryId: tx.categoryId,
      categoryName: tx.category?.name || null,
      detectedLabel: detection.label,
      detectedIcon: detection.icon,
      detectedColor: detection.color,
      confidence: detection.confidence,
      routingSource: detection.routingSource,
      matchedRuleId: detection.matchedRuleId,
      matchedRuleName: detection.matchedRuleName,
      suggestedWalletId: detection.suggestedWalletId,
      suggestedWalletName: detection.suggestedWalletName,
      alreadyMigrated,
    })
  }
  return rows
}

function summarizeRows(rows: Awaited<ReturnType<typeof buildPreviewRows>>) {
  const byLabel = new Map<string, any>()
  for (const row of rows) {
    const group = byLabel.get(row.detectedLabel) ?? {
      label: row.detectedLabel,
      icon: row.detectedIcon,
      color: row.detectedColor,
      transactionCount: 0,
      alreadyMigrated: 0,
      pendingCount: 0,
      totalAmount: 0,
      pendingAmount: 0,
    }
    group.transactionCount += 1
    group.totalAmount += row.amount
    if (row.alreadyMigrated) group.alreadyMigrated += 1
    else {
      group.pendingCount += 1
      group.pendingAmount += row.amount
    }
    byLabel.set(row.detectedLabel, group)
  }
  return [...byLabel.values()]
}

async function getOrCreateDestinationWallet(userId: string, tx: SavingsTx, mapping?: MigrationMapping) {
  if (mapping?.destinationWalletId) {
    const wallet = await prisma.wallet.findFirst({
      where: { id: mapping.destinationWalletId, userId, type: 'SAVINGS' },
    })
    if (!wallet) throw new Error(`Invalid destination wallet for ${tx.id}`)
    return wallet
  }

  const detection = await resolveDetection(userId, tx)
  const walletName = mapping?.createWalletName?.trim() || detection.suggestedWalletName || detection.label
  const existing = await prisma.wallet.findFirst({ where: { userId, name: walletName, type: 'SAVINGS' } })
  if (existing) return existing

  return prisma.wallet.create({
    data: {
      userId,
      name: walletName,
      type: 'SAVINGS',
      balance: 0,
      icon: mapping?.icon || detection.icon,
      color: mapping?.color || detection.color,
      isDefault: false,
    },
  })
}

async function migrateOne(userId: string, tx: SavingsTx, mapping?: MigrationMapping, migrationBatchId = crypto.randomUUID()) {
  const wallet = await getOrCreateDestinationWallet(userId, tx, mapping)
  const existing = await findExistingMigrated(userId, tx, wallet.id)
  if (existing) return { created: 0, skippedExisting: 1, amount: 0, wallet }

  const transferPairId = tx.transferPairId || crypto.randomUUID()
  if (!tx.transferPairId) {
    await prisma.transaction.update({ where: { id: tx.id }, data: { transferPairId } })
  }

  await prisma.transaction.create({
    data: {
      userId,
      walletId: wallet.id,
      categoryId: tx.categoryId,
      amount: tx.amount,
      type: 'INCOME',
      description: migratedDescription(tx),
      date: tx.date,
      migrationSourceTransactionId: tx.id,
      migrationBatchId,
      transferPairId,
    },
  })

  const updatedWallet = await prisma.wallet.update({
    where: { id: wallet.id },
    data: { balance: wallet.balance + tx.amount },
  })

  return { created: 1, skippedExisting: 0, amount: tx.amount, wallet: updatedWallet }
}

export async function migrateSavingsToWallets(userId: string, dryRun = true, mappings: MigrationMapping[] = []) {
  const logs: string[] = []
  const log = (message: string) => {
    console.log(message)
    logs.push(message)
  }

  const mappedIds = mappings.map((m) => m.sourceTransactionId)
  const savingsTransactions = await getSavingsTransactions(userId, mappedIds.length ? mappedIds : undefined)
  const rows = await buildPreviewRows(userId, savingsTransactions)
  const groupDetails = summarizeRows(rows)
  const savingsWallets = await prisma.wallet.findMany({
    where: { userId, type: 'SAVINGS' },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, icon: true, color: true, balance: true },
  })

  log(`Found ${savingsTransactions.length} savings transactions`)

  if (dryRun) {
    return {
      logs,
      summary: {
        total: savingsTransactions.length,
        groups: groupDetails.length,
        groupDetails,
        rows,
        savingsWallets,
      },
    }
  }

  const mappingById = new Map(mappings.map((mapping) => [mapping.sourceTransactionId, mapping]))
  const migrationBatchId = crypto.randomUUID()
  const results = []

  for (const tx of savingsTransactions) {
    const mapping = mappingById.get(tx.id)
    if (mappings.length && !mapping) continue
    const result = await migrateOne(userId, tx, mapping, migrationBatchId)
    results.push({
      sourceTransactionId: tx.id,
      walletId: result.wallet.id,
      walletName: result.wallet.name,
      created: result.created,
      skippedExisting: result.skippedExisting,
      amount: result.amount,
      status: 'success',
    })
  }

  return {
    logs,
    summary: {
      total: savingsTransactions.length,
      successful: results.length,
      failed: 0,
      created: results.reduce((sum, r) => sum + r.created, 0),
      skippedExisting: results.reduce((sum, r) => sum + r.skippedExisting, 0),
      amount: results.reduce((sum, r) => sum + r.amount, 0),
      migrationBatchId,
      results,
    },
  }
}

async function main() {
  const args = process.argv.slice(2)
  const userId = args[0]
  const dryRun = !args.includes('--apply')
  if (!userId) {
    console.error('Usage: npx tsx scripts/migrate-savings-to-wallets.ts <userId> [--apply]')
    process.exit(1)
  }
  try {
    await migrateSavingsToWallets(userId, dryRun)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) main()
