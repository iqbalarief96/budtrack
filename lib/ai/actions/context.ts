import prisma from '@/lib/prisma'
import type { AiActionValidationContext } from './types'

export async function getAiActionValidationContext(userId: string, defaultWalletId?: string): Promise<AiActionValidationContext> {
  const [wallets, categories] = await Promise.all([
    prisma.wallet.findMany({ where: { userId }, select: { id: true } }),
    prisma.category.findMany({ where: { userId }, select: { id: true, name: true } }),
  ])

  const categoriesByName = new Map<string, { id: string; name: string }[]>()
  for (const category of categories) {
    const key = category.name.toLowerCase()
    categoriesByName.set(key, [...(categoriesByName.get(key) ?? []), category])
  }

  return {
    userId,
    defaultWalletId: defaultWalletId && wallets.some((wallet) => wallet.id === defaultWalletId) ? defaultWalletId : undefined,
    walletIds: wallets.map((wallet) => wallet.id),
    categoryIds: categories.map((category) => category.id),
    wallets,
    categories,
    categoriesByName,
  }
}
