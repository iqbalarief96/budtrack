import prisma from '@/lib/prisma'

export async function findSavingsRuleDestination(userId: string, text: string) {
  const rules = await prisma.savingsRule.findMany({
    where: { userId, isActive: true },
    include: { destinationWallet: true },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
  })

  return rules.find((rule) => {
    if (rule.isRegex) {
      try {
        return new RegExp(rule.pattern, 'i').test(text)
      } catch {
        return false
      }
    }
    return text.toLowerCase().includes(rule.pattern.toLowerCase())
  }) ?? null
}
