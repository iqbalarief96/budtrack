import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { generateEmergencyFundRecommendation } from '@/lib/ai/deepseek'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/wallets/[walletId]/emergency-fund/ai-recommend
 * Generate AI-powered emergency fund target recommendation
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { walletId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Verify wallet belongs to user
    const wallet = await prisma.wallet.findFirst({
      where: {
        id: params.walletId,
        userId,
      },
    })

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      )
    }

    // Get user's AI settings
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId },
      select: {
        provider: true,
        apiKey: true,
        selectedModel: true,
      },
    })

    // Default to DeepSeek if no settings or use user's preference
    const aiSettings = {
      provider: userSettings?.provider || 'deepseek',
      apiKey: userSettings?.apiKey || '',
      model: userSettings?.selectedModel || 'deepseek-chat',
    }

    // Check if AI is configured
    if (!aiSettings.apiKey) {
      return NextResponse.json(
        {
          error: 'AI settings not configured',
          message: 'Please configure your AI settings in user settings to use AI recommendations',
        },
        { status: 400 }
      )
    }

    // Generate recommendation
    const recommendation = await generateEmergencyFundRecommendation(
      userId,
      params.walletId,
      aiSettings
    )

    return NextResponse.json(recommendation)
  } catch (error: any) {
    console.error('Error generating AI recommendation:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate AI recommendation' },
      { status: 500 }
    )
  }
}
