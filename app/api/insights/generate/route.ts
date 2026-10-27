import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { generateAIResponse } from '@/lib/ai'
import { resolveAIConfig } from '@/lib/ai-settings'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's AI settings
    const settings = await prisma.userSettings.findUnique({
      where: {
        userId: session.user.id
      }
    })

    const aiConfig = resolveAIConfig(settings)
    if (!aiConfig) {
      return NextResponse.json(
        { error: 'AI settings not configured. Please configure your AI settings first.' },
        { status: 400 }
      )
    }

    const { summaryPrompt, analysisPrompt } = await request.json()

    // Generate summary using AI
    const summary = await generateAIResponse({
      prompt: summaryPrompt,
      provider: aiConfig.provider,
      apiKey: aiConfig.apiKey,
      model: aiConfig.model,
      customEndpoint: aiConfig.customEndpoint
    })

    // Generate detailed analysis using AI
    const analysis = await generateAIResponse({
      prompt: analysisPrompt,
      provider: aiConfig.provider,
      apiKey: aiConfig.apiKey,
      model: aiConfig.model,
      customEndpoint: aiConfig.customEndpoint
    })

    return NextResponse.json({
      summary,
      analysis
    })

  } catch (error) {
    console.error('Error generating analysis:', error)
    return NextResponse.json(
      { error: 'Failed to generate analysis' },
      { status: 500 }
    )
  }
} 