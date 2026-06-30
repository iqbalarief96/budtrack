import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET /api/settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const settings = await prisma.userSettings.findUnique({
      where: {
        userId: session.user.id
      }
    })

    return NextResponse.json({
      ...(settings || {}),
      customEndpoint: settings?.provider === 'custom' ? settings.customEndpoint : null
    })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/settings
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { currency, language, theme, colorTheme, provider, apiKey, deepseekApiKey, openrouterApiKey, customApiKey, openaiApiKey, geminiApiKey, googleVisionCredentials, customEndpoint, selectedModel } = body
    const normalizedCustomEndpoint = typeof customEndpoint === 'string' ? customEndpoint.trim() : ''
    const effectiveProvider = normalizedCustomEndpoint ? 'custom' : provider
    const effectiveCustomApiKey = effectiveProvider === 'custom' ? (customApiKey || apiKey) : customApiKey
    const savedCustomEndpoint = effectiveProvider === 'custom' ? normalizedCustomEndpoint : null

    // First check if user exists
    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Then try to update or create settings
    const settings = await prisma.userSettings.upsert({
      where: {
        userId: session.user.id
      },
      update: {
        currency,
        language,
        theme,
        colorTheme,
        provider: effectiveProvider,
        apiKey,
        deepseekApiKey,
        openrouterApiKey,
        customApiKey: effectiveCustomApiKey,
        openaiApiKey,
        geminiApiKey,
        googleVisionCredentials,
        customEndpoint: savedCustomEndpoint,
        selectedModel
      },
      create: {
        userId: session.user.id,
        currency,
        language,
        theme,
        colorTheme,
        provider: effectiveProvider,
        apiKey,
        deepseekApiKey,
        openrouterApiKey,
        customApiKey: effectiveCustomApiKey,
        openaiApiKey,
        geminiApiKey,
        googleVisionCredentials,
        customEndpoint: savedCustomEndpoint,
        selectedModel
      }
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}