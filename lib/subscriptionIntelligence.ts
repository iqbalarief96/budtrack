import prisma from '@/lib/prisma'

export type SubscriptionCategory =
  | 'streaming'
  | 'software'
  | 'utilities'
  | 'fitness'
  | 'cloud-storage'
  | 'news-media'
  | 'gaming'
  | 'music'
  | 'education'
  | 'other'

export interface DetectedSubscription {
  id: string
  name: string
  amount: number
  frequency: string
  nextPaymentDate: Date
  category: SubscriptionCategory
  confidence: number // 0-1, how confident we are this is a subscription
  walletId: string
  walletName: string
  isActive: boolean
  startDate: Date
  totalPaidLastYear: number
  totalPaymentsLastYear: number
  averageMonthlyAmount: number
}

export interface DuplicateSubscription {
  category: SubscriptionCategory
  subscriptions: DetectedSubscription[]
  potentialSavings: number
  recommendation: string
}

export interface PriceChange {
  subscriptionId: string
  subscriptionName: string
  oldAmount: number
  newAmount: number
  changeAmount: number
  changePercentage: number
  detectedDate: Date
}

export interface SubscriptionInsight {
  type: 'duplicate' | 'price-increase' | 'unused' | 'expensive' | 'info'
  severity: 'high' | 'medium' | 'low'
  title: string
  description: string
  affectedSubscriptions: string[]
  potentialSavings?: number
  actionable: boolean
}

export interface SubscriptionAnalysis {
  totalSubscriptions: number
  totalMonthlySpend: number
  totalYearlySpend: number
  subscriptions: DetectedSubscription[]
  byCategory: Record<
    SubscriptionCategory,
    {
      count: number
      totalMonthly: number
      subscriptions: DetectedSubscription[]
    }
  >
  duplicates: DuplicateSubscription[]
  priceChanges: PriceChange[]
  insights: SubscriptionInsight[]
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low'
    title: string
    description: string
    potentialSavings: number
  }>
}

// Known subscription patterns
const SUBSCRIPTION_PATTERNS: Record<
  string,
  { category: SubscriptionCategory; keywords: string[] }
> = {
  streaming: {
    category: 'streaming',
    keywords: [
      'netflix',
      'disney',
      'hbo',
      'prime video',
      'spotify',
      'youtube premium',
      'apple tv',
      'vidio',
      'viu',
      'iqiyi',
      'amazon prime',
    ],
  },
  software: {
    category: 'software',
    keywords: [
      'adobe',
      'microsoft 365',
      'office 365',
      'github',
      'notion',
      'figma',
      'canva',
      'zoom',
      'slack',
      'grammarly',
    ],
  },
  utilities: {
    category: 'utilities',
    keywords: ['pln', 'pdam', 'internet', 'telkom', 'indihome', 'wifi', 'electricity', 'water'],
  },
  fitness: {
    category: 'fitness',
    keywords: ['gym', 'fitness', 'fitnes', 'strava', 'peloton', 'fitness first'],
  },
  'cloud-storage': {
    category: 'cloud-storage',
    keywords: [
      'google drive',
      'google one',
      'dropbox',
      'icloud',
      'onedrive',
      'cloud storage',
    ],
  },
  'news-media': {
    category: 'news-media',
    keywords: ['medium', 'substack', 'nytimes', 'kompas', 'tempo', 'newspaper'],
  },
  gaming: {
    category: 'gaming',
    keywords: [
      'playstation',
      'xbox',
      'nintendo',
      'steam',
      'epic games',
      'game pass',
      'ps plus',
    ],
  },
  music: {
    category: 'music',
    keywords: ['spotify', 'apple music', 'youtube music', 'tidal', 'joox'],
  },
  education: {
    category: 'education',
    keywords: [
      'coursera',
      'udemy',
      'skillshare',
      'linkedin learning',
      'duolingo',
      'ruangguru',
    ],
  },
}

/**
 * Detect and categorize subscriptions from recurring transactions
 */
export async function detectSubscriptions(
  userId: string
): Promise<DetectedSubscription[]> {
  const recurringTransactions = await prisma.recurringTransaction.findMany({
    where: {
      userId,
      type: { in: ['expense', 'EXPENSE'] },
    },
    include: {
      wallet: true,
      history: {
        where: {
          createdAt: {
            gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  })

  const subscriptions: DetectedSubscription[] = []

  for (const recurring of recurringTransactions) {
    const { category, confidence } = categorizeSubscription(recurring.name)

    // Calculate stats from history
    const history = recurring.history || []
    const totalPaidLastYear = history.reduce((sum, h) => sum + h.amount, 0)
    const totalPayments = history.length

    // Calculate average monthly amount
    const monthlyMultiplier = getMonthlyMultiplier(recurring.frequency)
    const averageMonthlyAmount = recurring.amount * monthlyMultiplier

    subscriptions.push({
      id: recurring.id,
      name: recurring.name,
      amount: recurring.amount,
      frequency: recurring.frequency,
      nextPaymentDate: recurring.nextPaymentDate,
      category,
      confidence,
      walletId: recurring.walletId,
      walletName: recurring.wallet.name,
      isActive: recurring.isActive,
      startDate: recurring.startDate,
      totalPaidLastYear,
      totalPaymentsLastYear: totalPayments,
      averageMonthlyAmount,
    })
  }

  return subscriptions.sort((a, b) => b.averageMonthlyAmount - a.averageMonthlyAmount)
}

/**
 * Categorize a subscription based on its name
 */
function categorizeSubscription(name: string): {
  category: SubscriptionCategory
  confidence: number
} {
  const lowerName = name.toLowerCase()

  for (const [_, pattern] of Object.entries(SUBSCRIPTION_PATTERNS)) {
    for (const keyword of pattern.keywords) {
      if (lowerName.includes(keyword.toLowerCase())) {
        return {
          category: pattern.category,
          confidence: 0.9, // High confidence for keyword match
        }
      }
    }
  }

  // Default to 'other' with medium confidence
  return {
    category: 'other',
    confidence: 0.6,
  }
}

/**
 * Convert frequency to monthly multiplier
 */
function getMonthlyMultiplier(frequency: string): number {
  switch (frequency.toLowerCase()) {
    case 'daily':
      return 30
    case 'weekly':
      return 4
    case 'biweekly':
      return 2
    case 'monthly':
      return 1
    case 'quarterly':
      return 1 / 3
    case 'yearly':
      return 1 / 12
    default:
      return 1
  }
}

/**
 * Find duplicate subscriptions in same category
 */
export function findDuplicateSubscriptions(
  subscriptions: DetectedSubscription[]
): DuplicateSubscription[] {
  const duplicates: DuplicateSubscription[] = []

  // Group by category
  const byCategory: Record<SubscriptionCategory, DetectedSubscription[]> = {} as any

  subscriptions.forEach((sub) => {
    if (!byCategory[sub.category]) {
      byCategory[sub.category] = []
    }
    byCategory[sub.category].push(sub)
  })

  // Find categories with multiple subscriptions
  Object.entries(byCategory).forEach(([category, subs]) => {
    if (subs.length > 1 && category !== 'other' && category !== 'utilities') {
      const totalMonthly = subs.reduce((sum, s) => sum + s.averageMonthlyAmount, 0)
      const cheapest = Math.min(...subs.map((s) => s.averageMonthlyAmount))
      const potentialSavings = totalMonthly - cheapest

      duplicates.push({
        category: category as SubscriptionCategory,
        subscriptions: subs,
        potentialSavings,
        recommendation: generateDuplicateRecommendation(category as SubscriptionCategory, subs),
      })
    }
  })

  return duplicates.sort((a, b) => b.potentialSavings - a.potentialSavings)
}

/**
 * Generate recommendation for duplicate subscriptions
 */
function generateDuplicateRecommendation(
  category: SubscriptionCategory,
  subs: DetectedSubscription[]
): string {
  const names = subs.map((s) => s.name).join(', ')

  switch (category) {
    case 'streaming':
      return `Kamu punya ${subs.length} streaming services (${names}). Consider keeping yang paling sering dipakai.`
    case 'cloud-storage':
      return `Multiple cloud storage: ${names}. Consolidate ke satu service untuk hemat biaya.`
    case 'music':
      return `Langganan ${subs.length} music services: ${names}. Pilih satu yang paling cocok.`
    case 'fitness':
      return `${subs.length} gym memberships: ${names}. Keep yang paling sering dipakai.`
    default:
      return `Multiple ${category} subscriptions: ${names}. Review dan cancel yang tidak terpakai.`
  }
}

/**
 * Detect price changes in subscriptions
 */
export async function detectPriceChanges(
  subscriptions: DetectedSubscription[]
): Promise<PriceChange[]> {
  const priceChanges: PriceChange[] = []

  for (const sub of subscriptions) {
    // Get historical payments
    const history = await prisma.recurringTransactionHistory.findMany({
      where: {
        recurringTransactionId: sub.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    })

    if (history.length >= 2) {
      // Check if latest amount differs from previous
      const latest = history[0]
      const previous = history[1]

      if (latest.amount !== previous.amount) {
        const changeAmount = latest.amount - previous.amount
        const changePercentage = (changeAmount / previous.amount) * 100

        priceChanges.push({
          subscriptionId: sub.id,
          subscriptionName: sub.name,
          oldAmount: previous.amount,
          newAmount: latest.amount,
          changeAmount,
          changePercentage,
          detectedDate: latest.createdAt,
        })
      }
    }
  }

  return priceChanges.sort((a, b) => Math.abs(b.changePercentage) - Math.abs(a.changePercentage))
}

/**
 * Generate insights from subscription analysis
 */
export function generateSubscriptionInsights(
  subscriptions: DetectedSubscription[],
  duplicates: DuplicateSubscription[],
  priceChanges: PriceChange[]
): SubscriptionInsight[] {
  const insights: SubscriptionInsight[] = []

  // Duplicate insights
  if (duplicates.length > 0) {
    duplicates.forEach((dup) => {
      insights.push({
        type: 'duplicate',
        severity: dup.potentialSavings > 100000 ? 'high' : 'medium',
        title: `Duplicate ${dup.category} subscriptions detected`,
        description: dup.recommendation,
        affectedSubscriptions: dup.subscriptions.map((s) => s.id),
        potentialSavings: dup.potentialSavings,
        actionable: true,
      })
    })
  }

  // Price increase insights
  priceChanges.forEach((change) => {
    if (change.changePercentage > 10) {
      insights.push({
        type: 'price-increase',
        severity: change.changePercentage > 25 ? 'high' : 'medium',
        title: `${change.subscriptionName} price increased`,
        description: `Harga naik ${change.changePercentage.toFixed(0)}% dari ${change.oldAmount.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })} ke ${change.newAmount.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}`,
        affectedSubscriptions: [change.subscriptionId],
        potentialSavings: Math.abs(change.changeAmount) * 12, // Yearly impact
        actionable: true,
      })
    }
  })

  // Expensive subscriptions
  const totalMonthly = subscriptions.reduce((sum, s) => sum + s.averageMonthlyAmount, 0)
  subscriptions.forEach((sub) => {
    const percentOfTotal = (sub.averageMonthlyAmount / totalMonthly) * 100
    if (percentOfTotal > 30) {
      insights.push({
        type: 'expensive',
        severity: 'medium',
        title: `${sub.name} is your most expensive subscription`,
        description: `Menghabiskan ${percentOfTotal.toFixed(0)}% dari total subscription budget (${sub.averageMonthlyAmount.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}/bulan)`,
        affectedSubscriptions: [sub.id],
        actionable: true,
      })
    }
  })

  // Inactive subscriptions (no payments in 3 months)
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

  subscriptions.forEach((sub) => {
    if (sub.isActive && sub.totalPaymentsLastYear === 0) {
      insights.push({
        type: 'unused',
        severity: 'high',
        title: `${sub.name} might be unused`,
        description: 'Tidak ada payment history dalam setahun terakhir. Consider canceling.',
        affectedSubscriptions: [sub.id],
        potentialSavings: sub.averageMonthlyAmount * 12,
        actionable: true,
      })
    }
  })

  return insights.sort((a, b) => {
    const severityOrder = { high: 3, medium: 2, low: 1 }
    return severityOrder[b.severity] - severityOrder[a.severity]
  })
}

/**
 * Complete subscription analysis
 */
export async function analyzeSubscriptions(userId: string): Promise<SubscriptionAnalysis> {
  const subscriptions = await detectSubscriptions(userId)
  const duplicates = findDuplicateSubscriptions(subscriptions)
  const priceChanges = await detectPriceChanges(subscriptions)
  const insights = generateSubscriptionInsights(subscriptions, duplicates, priceChanges)

  // Calculate totals
  const totalMonthlySpend = subscriptions.reduce(
    (sum, s) => sum + s.averageMonthlyAmount,
    0
  )
  const totalYearlySpend = totalMonthlySpend * 12

  // Group by category
  const byCategory: Record<SubscriptionCategory, any> = {} as any
  subscriptions.forEach((sub) => {
    if (!byCategory[sub.category]) {
      byCategory[sub.category] = {
        count: 0,
        totalMonthly: 0,
        subscriptions: [],
      }
    }
    byCategory[sub.category].count++
    byCategory[sub.category].totalMonthly += sub.averageMonthlyAmount
    byCategory[sub.category].subscriptions.push(sub)
  })

  // Generate recommendations
  const recommendations = [
    ...duplicates.map((dup) => ({
      priority: (dup.potentialSavings > 100000 ? 'high' : 'medium') as 'high' | 'medium' | 'low',
      title: `Review ${dup.category} subscriptions`,
      description: dup.recommendation,
      potentialSavings: dup.potentialSavings * 12, // Yearly
    })),
    ...priceChanges
      .filter((pc) => pc.changePercentage > 15)
      .map((pc) => ({
        priority: 'medium' as 'high' | 'medium' | 'low',
        title: `Consider alternatives to ${pc.subscriptionName}`,
        description: `Price increased ${pc.changePercentage.toFixed(0)}%. Look for cheaper alternatives.`,
        potentialSavings: Math.abs(pc.changeAmount) * 12,
      })),
  ]

  // Add general recommendation if spending is high
  if (totalMonthlySpend > 500000) {
    recommendations.push({
      priority: 'medium',
      title: 'Audit all subscriptions',
      description: `Total subscription spend: ${totalMonthlySpend.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}/bulan. Review dan cancel yang jarang dipakai.`,
      potentialSavings: totalMonthlySpend * 0.2 * 12, // Assume 20% can be saved
    })
  }

  return {
    totalSubscriptions: subscriptions.length,
    totalMonthlySpend,
    totalYearlySpend,
    subscriptions,
    byCategory,
    duplicates,
    priceChanges,
    insights,
    recommendations: recommendations.sort((a, b) => b.potentialSavings - a.potentialSavings),
  }
}
