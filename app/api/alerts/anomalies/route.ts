import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { detectSpendingAnomalies } from '@/lib/anomaly-detection'

/**
 * GET endpoint to retrieve spending anomalies
 */
export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get query parameters
    const url = new URL(request.url)
    const walletId = url.searchParams.get('walletId')
    const lookbackDays = url.searchParams.get('lookbackDays') 
      ? parseInt(url.searchParams.get('lookbackDays') as string, 10) 
      : 90
    const threshold = url.searchParams.get('threshold') 
      ? parseInt(url.searchParams.get('threshold') as string, 10) 
      : 50
    
    // Detect anomalies
    const anomalies = await detectSpendingAnomalies(
      session.user.id, 
      walletId || undefined,
      lookbackDays,
      threshold
    )
    
    // Return results
    return NextResponse.json({
      success: true,
      count: anomalies.length,
      anomalies
    })
  } catch (error) {
    console.error('Error detecting spending anomalies:', error)
    return NextResponse.json(
      { error: 'Failed to detect anomalies' },
      { status: 500 }
    )
  }
} 