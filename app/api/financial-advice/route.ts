import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const url = new URL(request.url)
    const walletId = url.searchParams.get('walletId') || undefined
    const timeframe = (url.searchParams.get('timeframe') as 'month' | 'quarter' | 'year' | 'all' | null) || 'month'
    
    if (!['month', 'quarter', 'year', 'all'].includes(timeframe)) {
      return NextResponse.json(
        { error: 'Invalid timeframe parameter. Must be one of: month, quarter, year, all' },
        { status: 400 }
      )
    }
    
    const whereClause: Record<string, unknown> = {
      userId: session.user.id,
      timeframe
    }

    if (walletId) {
      whereClause.walletId = walletId
    } else {
      whereClause.walletId = null
    }

    const savedAdvice = await prisma.financialAdvice.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    })
    
    const normalized = savedAdvice.map(advice => ({
      ...advice,
      createdAt: advice.createdAt.toISOString()
    }))
    
    return NextResponse.json(normalized)
    
  } catch (error) {
    console.error('Error fetching financial advice:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json(
      { error: 'Failed to fetch financial advice', details: errorMessage },
      { status: 500 }
    )
  }
} 
