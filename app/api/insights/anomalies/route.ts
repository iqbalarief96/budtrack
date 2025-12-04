import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import {
  detectAnomalies,
  calculateBaseline,
} from '@/lib/spending-insights/anomaly-service'
import { AnomaliesResponse, DEFAULT_ANOMALY_CONFIG, Anomaly } from '@/app/types/spending-insights'

/**
 * GET /api/insights/anomalies - Get detected anomalies for the user
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const { searchParams } = new URL(request.url)
    
    // Query params
    const baselineMonths = parseInt(searchParams.get('baselineMonths') || '3', 10)
    const spikeThreshold = parseFloat(searchParams.get('spikeThreshold') || String(DEFAULT_ANOMALY_CONFIG.spikeThreshold))
    const largeTransactionMultiplier = parseFloat(searchParams.get('largeTransactionMultiplier') || String(DEFAULT_ANOMALY_CONFIG.largeTransactionMultiplier))
    const frequencyChangeThreshold = parseFloat(searchParams.get('frequencyChangeThreshold') || String(DEFAULT_ANOMALY_CONFIG.frequencyChangeThreshold))

    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const baselineStart = new Date(now.getFullYear(), now.getMonth() - baselineMonths, 1)

    // Get baseline transactions (historical data)
    const baselineTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        type: { in: ['expense', 'EXPENSE'] },
        date: {
          gte: baselineStart,
          lt: currentMonthStart,
        },
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
          },
        },
      },
    })

    // Get current month transactions
    const currentTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        type: { in: ['expense', 'EXPENSE'] },
        date: { gte: currentMonthStart },
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
          },
        },
      },
    })

    // Transform transactions for anomaly detection
    const baselineTxForAnalysis = baselineTransactions.map(tx => ({
      id: tx.id,
      amount: tx.amount,
      date: tx.date,
      categoryId: tx.categoryId,
      category: tx.category,
    }))

    const currentTxForAnalysis = currentTransactions.map(tx => ({
      id: tx.id,
      amount: tx.amount,
      date: tx.date,
      categoryId: tx.categoryId,
      category: tx.category,
    }))

    // Calculate baseline from historical data
    const baseline = calculateBaseline(baselineTxForAnalysis, baselineMonths)

    // Detect anomalies
    const config = {
      spikeThreshold,
      largeTransactionMultiplier,
      frequencyChangeThreshold,
    }
    
    const detectedAnomalies = detectAnomalies(currentTxForAnalysis, baseline, config)

    // Enrich anomalies with category information
    const categoryMap = new Map<string, { id: string; name: string; icon: string | null; color: string | null }>()
    for (const tx of [...baselineTransactions, ...currentTransactions]) {
      if (tx.category && tx.categoryId) {
        categoryMap.set(tx.categoryId, tx.category)
      }
    }

    const enrichedAnomalies: Anomaly[] = detectedAnomalies.map(anomaly => ({
      ...anomaly,
      category: anomaly.categoryId ? categoryMap.get(anomaly.categoryId) || null : null,
    }))

    // Sort by severity (high first) and then by detection time (newest first)
    const severityOrder = { high: 0, medium: 1, low: 2 }
    enrichedAnomalies.sort((a, b) => {
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity]
      if (severityDiff !== 0) return severityDiff
      return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()
    })

    const response: AnomaliesResponse = {
      anomalies: enrichedAnomalies,
      total: enrichedAnomalies.length,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error detecting anomalies:', error)
    return NextResponse.json(
      { error: 'Failed to detect anomalies' },
      { status: 500 }
    )
  }
}
