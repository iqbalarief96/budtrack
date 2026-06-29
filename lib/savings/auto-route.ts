import crypto from 'crypto'
import prisma from '@/lib/prisma'
import { detectSavingsBucket } from './savings-detection'
import { findSavingsRuleDestination } from './savings-rules'

export async function resolveAutoSavingsWallet(userId: string, description: string, categoryName?: string | null) {
  const text = `${description} ${categoryName || ''}`
  const isSavings = /saving|savings|tabungan|menabung/i.test(text)
  if (!isSavings) return null

  const rule = await findSavingsRuleDestination(userId, text)
  if (rule) return rule.destinationWallet

  const detected = detectSavingsBucket(description, categoryName || '')
  const existing = await prisma.wallet.findFirst({ where: { userId, name: detected.label, type: 'SAVINGS' } })
  if (existing) return existing

  return prisma.wallet.create({
    data: {
      userId,
      name: detected.label,
      type: 'SAVINGS',
      balance: 0,
      icon: detected.icon,
      color: detected.color,
      isDefault: false,
    },
  })
}

export async function createAutoSavingsTransfer(input: {
  userId: string
  sourceTransactionId: string
  sourceWalletId: string
  categoryId?: string | null
  amount: number
  date: Date
  description?: string | null
  categoryName?: string | null
}) {
  const destinationWallet = await resolveAutoSavingsWallet(input.userId, input.description || '', input.categoryName)
  if (!destinationWallet) return null

  const existing = await prisma.transaction.findFirst({
    where: {
      userId: input.userId,
      walletId: destinationWallet.id,
      migrationSourceTransactionId: input.sourceTransactionId,
    },
    select: { id: true, transferPairId: true },
  })
  if (existing) return { wallet: destinationWallet, transactionId: existing.id, created: false, transferPairId: existing.transferPairId }

  const transferPairId = crypto.randomUUID()
  await prisma.transaction.update({ where: { id: input.sourceTransactionId }, data: { transferPairId } })

  const savingsTransaction = await prisma.transaction.create({
    data: {
      amount: input.amount,
      type: 'INCOME',
      date: input.date,
      description: `${input.description || ''} (auto-saved)`,
      userId: input.userId,
      walletId: destinationWallet.id,
      categoryId: input.categoryId || undefined,
      migrationSourceTransactionId: input.sourceTransactionId,
      transferPairId,
    },
  })

  await prisma.wallet.update({ where: { id: destinationWallet.id }, data: { balance: { increment: input.amount } } })

  return { wallet: destinationWallet, transactionId: savingsTransaction.id, created: true, transferPairId }
}
