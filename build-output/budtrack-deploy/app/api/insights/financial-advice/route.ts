import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generatePersonalizedAdvice } from '@/lib/financial-advice'

export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get wallet ID from query params if available
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
    
    // Generate advice
    try {
      const advice = await generatePersonalizedAdvice(
        session.user.id,
        walletId || undefined,
        timeframe
      )
      
      return NextResponse.json({
        success: true,
        advice,
        timeframe
      })
    } catch (error) {
      // Special handling for timeouts in the 'all' timeframe
      if (timeframe === 'all' && error instanceof Error && error.message.includes('timed out')) {
        return NextResponse.json(
          { 
            error: "Request timed out when analyzing all historical data. Try using a smaller timeframe (month, quarter, or year) for better performance.",
            code: 'TIMEOUT',
            suggestedTimeframe: 'year'
          },
          { status: 408 } // Request Timeout status
        )
      }
      
      // Re-throw for general error handling
      throw error
    }
    
  } catch (error) {
    console.error('Error generating financial advice:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    // Check if it's an AI configuration error
    if (errorMessage.includes('AI settings not configured')) {
      return NextResponse.json(
        { 
          error: errorMessage,
          code: 'AI_NOT_CONFIGURED'
        }, 
        { status: 400 }
      )
    }
    
    // Check if it's a timeout error
    if (errorMessage.includes('timed out')) {
      return NextResponse.json(
        { 
          error: "Analysis took too long to complete. Try using a smaller time period or try again later.",
          code: 'TIMEOUT'
        }, 
        { status: 408 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to generate financial advice', details: errorMessage },
      { status: 500 }
    )
  }
} 