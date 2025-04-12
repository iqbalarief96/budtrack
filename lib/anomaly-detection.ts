'use server'

import prisma from '@/lib/prisma'

// Interface for transaction data
interface Transaction {
  id: string
  amount: number
  date: Date
  description: string | null
  type: string
  categoryId: string | null
  category?: {
    id: string
    name: string
  }
}

// Interface for anomaly detection results
export interface SpendingAnomaly {
  id: string
  amount: number
  date: Date | string
  description: string | null
  type: string
  category: {
    id: string
    name: string
  }
  average: number
  percentAboveAverage: number
  severity: 'low' | 'medium' | 'high'
}

/**
 * Detects anomalies in spending patterns based on category averages
 * 
 * @param userId - The user ID to analyze transactions for
 * @param walletId - Optional wallet ID to filter transactions
 * @param lookbackDays - Days to look back for analysis (default: 90)
 * @param thresholdPercent - Percentage above average to consider an anomaly (default: 50%)
 * @returns Array of spending anomalies
 */
export async function detectSpendingAnomalies(
  userId: string,
  walletId?: string,
  lookbackDays: number = 90,
  thresholdPercent: number = 50
): Promise<SpendingAnomaly[]> {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - lookbackDays)
  
  // Build the filter based on inputs
  const filter: any = {
    userId,
    date: {
      gte: startDate,
      lte: endDate
    },
    type: 'EXPENSE' // Only analyze expenses
  }
  
  if (walletId) {
    filter.walletId = walletId
  }
  
  // Fetch all transactions in the time period
  const transactions = await prisma.transaction.findMany({
    where: filter,
    include: {
      category: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: {
      date: 'desc'
    }
  })
  
  // Group transactions by category
  const categorizedTransactions: Record<string, Transaction[]> = {}
  
  transactions.forEach((transaction: any) => {
    if (!transaction.categoryId) return // Skip uncategorized transactions
    
    const categoryId = transaction.categoryId
    
    if (!categorizedTransactions[categoryId]) {
      categorizedTransactions[categoryId] = []
    }
    
    categorizedTransactions[categoryId].push(transaction)
  })
  
  // Calculate category averages and identify anomalies
  const anomalies: SpendingAnomaly[] = []
  
  Object.entries(categorizedTransactions).forEach(([categoryId, transactions]) => {
    // Need at least 3 transactions in a category to establish a baseline
    if (transactions.length < 3) return
    
    // Calculate average spending in this category
    const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0)
    const averageSpent = totalSpent / transactions.length
    
    // Find anomalies - transactions that are significantly above average
    transactions.forEach(transaction => {
      if (!transaction.category) return
      
      const percentAboveAverage = ((transaction.amount - averageSpent) / averageSpent) * 100
      
      if (percentAboveAverage >= thresholdPercent) {
        // Determine severity based on percentage
        let severity: 'low' | 'medium' | 'high' = 'low'
        if (percentAboveAverage >= 200) {
          severity = 'high'
        } else if (percentAboveAverage >= 100) {
          severity = 'medium'
        }
        
        anomalies.push({
          id: transaction.id,
          amount: transaction.amount,
          date: transaction.date,
          description: transaction.description,
          type: transaction.type,
          category: {
            id: transaction.category.id,
            name: transaction.category.name
          },
          average: averageSpent,
          percentAboveAverage,
          severity
        })
      }
    })
  })
  
  // Sort anomalies by severity and then by percentage difference
  return anomalies.sort((a, b) => {
    const severityOrder = { high: 3, medium: 2, low: 1 }
    
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[b.severity] - severityOrder[a.severity]
    }
    
    return b.percentAboveAverage - a.percentAboveAverage
  })
}

/**
 * Analyzes merchant spending patterns to find unusual transactions
 * 
 * @param userId - The user ID to analyze transactions for
 * @param walletId - Optional wallet ID to filter transactions
 * @returns Array of merchant-based anomalies
 */
export async function detectMerchantAnomalies(
  userId: string,
  walletId?: string
): Promise<SpendingAnomaly[]> {
  // Implementation for merchant-based anomaly detection
  // This would identify unusually large transactions at specific merchants
  
  // Placeholder for future implementation
  return []
}

/**
 * Gets time-based spending anomalies (unusual spending times)
 * 
 * @param userId - The user ID to analyze transactions for
 * @param walletId - Optional wallet ID to filter transactions
 * @returns Array of time-pattern anomalies
 */
export async function detectTimePatternAnomalies(
  userId: string,
  walletId?: string
): Promise<SpendingAnomaly[]> {
  // Implementation for time-pattern anomaly detection
  // This would identify unusual spending times (e.g., late night purchases)
  
  // Placeholder for future implementation
  return []
} 