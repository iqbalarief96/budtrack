import prisma from '@/lib/prisma'

// Savings types enum
export enum SavingsType {
  EMERGENCY = 'EMERGENCY',
  EDUCATION = 'EDUCATION',
  VACATION = 'VACATION',
  RETIREMENT = 'RETIREMENT',
  PROPERTY = 'PROPERTY',
  VEHICLE = 'VEHICLE',
  BANK = 'BANK',
  GOLD = 'GOLD',
  CRYPTO = 'CRYPTO',
  INVESTMENT = 'INVESTMENT',
  DEPOSIT = 'DEPOSIT',
  OTHER = 'OTHER',
}

// Keyword mappings for auto-detection
const SAVINGS_KEYWORDS: Record<SavingsType, string[]> = {
  [SavingsType.EMERGENCY]: ['darurat', 'emergency'],
  [SavingsType.EDUCATION]: ['pendidikan', 'school', 'kuliah', 'education', 'sekolah', 'campus'],
  [SavingsType.VACATION]: ['liburan', 'travel', 'vacation', 'holiday', 'trip', 'umroh', 'haji'],
  [SavingsType.RETIREMENT]: ['pensiun', 'retirement'],
  [SavingsType.PROPERTY]: ['rumah', 'properti', 'property', 'kpr', 'house', 'apartemen', 'apartment', 'dp'],
  [SavingsType.VEHICLE]: ['kendaraan', 'mobil', 'motor', 'car', 'bike', 'motorcycle'],
  [SavingsType.BANK]: ['bank', 'rekening', 'account', 'tabungan bank'],
  [SavingsType.GOLD]: ['emas', 'gold', 'logam mulia'],
  [SavingsType.CRYPTO]: ['crypto', 'kripto', 'btc', 'bitcoin', 'eth', 'ethereum'],
  [SavingsType.INVESTMENT]: ['investasi', 'investment', 'reksa', 'reksadana', 'saham', 'stock', 'obligasi', 'bond'],
  [SavingsType.DEPOSIT]: ['deposito', 'deposit', 'time deposit'],
  [SavingsType.OTHER]: ['tabungan', 'saving', 'menabung', 'nabung'],
}

// Savings type labels in Indonesian
export const SAVINGS_TYPE_LABELS: Record<SavingsType, string> = {
  [SavingsType.EMERGENCY]: 'Dana Darurat',
  [SavingsType.EDUCATION]: 'Pendidikan',
  [SavingsType.VACATION]: 'Liburan',
  [SavingsType.RETIREMENT]: 'Pensiun',
  [SavingsType.PROPERTY]: 'Properti',
  [SavingsType.VEHICLE]: 'Kendaraan',
  [SavingsType.BANK]: 'Tabungan Bank',
  [SavingsType.GOLD]: 'Emas',
  [SavingsType.CRYPTO]: 'Cryptocurrency',
  [SavingsType.INVESTMENT]: 'Investasi',
  [SavingsType.DEPOSIT]: 'Deposito',
  [SavingsType.OTHER]: 'Lainnya',
}

// Icons for each savings type
export const SAVINGS_TYPE_ICONS: Record<SavingsType, string> = {
  [SavingsType.EMERGENCY]: '🚨',
  [SavingsType.EDUCATION]: '📚',
  [SavingsType.VACATION]: '🌴',
  [SavingsType.RETIREMENT]: '👴',
  [SavingsType.PROPERTY]: '🏠',
  [SavingsType.VEHICLE]: '🚗',
  [SavingsType.BANK]: '🏦',
  [SavingsType.GOLD]: '🥇',
  [SavingsType.CRYPTO]: '₿',
  [SavingsType.INVESTMENT]: '📈',
  [SavingsType.DEPOSIT]: '💰',
  [SavingsType.OTHER]: '💼',
}

/**
 * Detect savings type from transaction description, category name, and wallet name
 */
export function detectSavingsType(
  description?: string | null,
  categoryName?: string | null,
  walletName?: string | null
): SavingsType | null {
  const searchText = [
    description?.toLowerCase() || '',
    categoryName?.toLowerCase() || '',
    walletName?.toLowerCase() || '',
  ].join(' ')

  // Check if it's a savings transaction
  const hasSavingsKeyword = searchText.includes('tabungan') ||
                            searchText.includes('saving') ||
                            searchText.includes('nabung')

  if (!hasSavingsKeyword && !categoryName?.toLowerCase().includes('saving')) {
    return null // Not a savings transaction
  }

  // Check each savings type in priority order (most specific first)
  for (const [type, keywords] of Object.entries(SAVINGS_KEYWORDS)) {
    if (type === SavingsType.OTHER) continue // Check OTHER last

    for (const keyword of keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        return type as SavingsType
      }
    }
  }

  // If has savings keyword but no specific type, return OTHER
  return hasSavingsKeyword ? SavingsType.OTHER : null
}

/**
 * Calculate savings summary for a user
 */
export async function calculateSavingsSummary(
  userId: string,
  options: {
    walletId?: string
    timeRange?: 'this_month' | 'last_3_months' | 'all_time'
  } = {}
) {
  try {
    const { walletId, timeRange = 'all_time' } = options

    // Build date filter
    let dateFilter: any = {}
    if (timeRange === 'this_month') {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      dateFilter = { gte: startOfMonth }
    } else if (timeRange === 'last_3_months') {
      const threeMonthsAgo = new Date()
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
      dateFilter = { gte: threeMonthsAgo }
    }

    // Query transactions
    const whereClause: any = {
      userId,
      type: { in: ['expense', 'EXPENSE'] },
      category: {
        OR: [
          { name: { contains: 'Saving' } },
          { name: { contains: 'saving' } },
          { name: { contains: 'SAVING' } },
          { name: { contains: 'Tabungan' } },
          { name: { contains: 'tabungan' } },
          { name: { contains: 'TABUNGAN' } },
        ],
      },
    }

    if (walletId) {
      whereClause.walletId = walletId
    }

    if (Object.keys(dateFilter).length > 0) {
      whereClause.date = dateFilter
    }

    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      include: {
        category: true,
        wallet: true,
      },
      orderBy: { date: 'desc' },
    })

    // Classify transactions by savings type
    const savingsByType: Record<SavingsType, {
      total: number
      transactions: any[]
    }> = {
      [SavingsType.EMERGENCY]: { total: 0, transactions: [] },
      [SavingsType.EDUCATION]: { total: 0, transactions: [] },
      [SavingsType.VACATION]: { total: 0, transactions: [] },
      [SavingsType.RETIREMENT]: { total: 0, transactions: [] },
      [SavingsType.PROPERTY]: { total: 0, transactions: [] },
      [SavingsType.VEHICLE]: { total: 0, transactions: [] },
      [SavingsType.BANK]: { total: 0, transactions: [] },
      [SavingsType.GOLD]: { total: 0, transactions: [] },
      [SavingsType.CRYPTO]: { total: 0, transactions: [] },
      [SavingsType.INVESTMENT]: { total: 0, transactions: [] },
      [SavingsType.DEPOSIT]: { total: 0, transactions: [] },
      [SavingsType.OTHER]: { total: 0, transactions: [] },
    }

    let totalSavings = 0

    for (const transaction of transactions) {
      const savingsType = detectSavingsType(
        transaction.description,
        transaction.category?.name,
        transaction.wallet?.name
      )

      if (savingsType) {
        savingsByType[savingsType].total += transaction.amount
        savingsByType[savingsType].transactions.push({
          id: transaction.id,
          amount: transaction.amount,
          description: transaction.description,
          date: transaction.date,
          categoryName: transaction.category?.name,
          categoryColor: transaction.category?.color,
          walletName: transaction.wallet?.name,
        })
        totalSavings += transaction.amount
      }
    }

    // Convert to array and filter out empty categories
    const breakdown = Object.entries(savingsByType)
      .map(([type, data]) => {
        const savingsType = type as SavingsType
        return {
          type: savingsType,
          label: SAVINGS_TYPE_LABELS[savingsType] || 'Unknown',
          icon: SAVINGS_TYPE_ICONS[savingsType] || '💼',
          total: data?.total || 0,
          transactions: data?.transactions || [],
          percentage: totalSavings > 0 ? Math.round(((data?.total || 0) / totalSavings) * 100) : 0,
        }
      })
      .filter((item) => item.total > 0)
      .sort((a, b) => b.total - a.total) // Sort by total descending

    return {
      totalSavings,
      transactionCount: transactions.length,
      breakdown,
    }
  } catch (error) {
    console.error('Error calculating savings summary:', error)
    throw error
  }
}

/**
 * Get savings details for a specific type
 */
export async function getSavingsByType(
  userId: string,
  savingsType: SavingsType,
  options: {
    walletId?: string
    timeRange?: 'this_month' | 'last_3_months' | 'all_time'
  } = {}
) {
  try {
    const summary = await calculateSavingsSummary(userId, options)
    const typeData = summary.breakdown.find((item) => item.type === savingsType)

    if (!typeData) {
      return {
        type: savingsType,
        label: SAVINGS_TYPE_LABELS[savingsType],
        icon: SAVINGS_TYPE_ICONS[savingsType],
        total: 0,
        transactions: [],
        percentage: 0,
      }
    }

    return typeData
  } catch (error) {
    console.error('Error getting savings by type:', error)
    throw error
  }
}

/**
 * Get top savings categories (for dashboard widget)
 */
export async function getTopSavingsCategories(userId: string, limit: number = 3) {
  try {
    const summary = await calculateSavingsSummary(userId)
    return {
      total: summary.totalSavings,
      topCategories: summary.breakdown.slice(0, limit),
    }
  } catch (error) {
    console.error('Error getting top savings categories:', error)
    throw error
  }
}
