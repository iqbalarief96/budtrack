import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get parameters from query
    const url = new URL(request.url)
    const walletId = url.searchParams.get('walletId')
    const timeframe = url.searchParams.get('timeframe') as 'month' | 'quarter' | 'year' | 'all' || 'month'
    
    // Validate timeframe
    if (timeframe && !['month', 'quarter', 'year', 'all'].includes(timeframe)) {
      return NextResponse.json(
        { error: 'Invalid timeframe parameter. Must be one of: month, quarter, year, all' },
        { status: 400 }
      )
    }
    
    // Get saved advice from database
    const savedAdvice = await prisma.financialAdvice.findMany({
      where: {
        userId: session.user.id,
        walletId: walletId || null,
        timeframe
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    return NextResponse.json(savedAdvice)
    
  } catch (error) {
    console.error('Error fetching financial advice:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json(
      { error: 'Failed to fetch financial advice', details: errorMessage },
      { status: 500 }
    )
  }
} 