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

    return NextResponse.json(settings || {})
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
    const { currency, language, theme, colorTheme, provider, apiKey, openaiApiKey, geminiApiKey, googleVisionCredentials, selectedModel } = body

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
        provider,
        apiKey,
        openaiApiKey,
        geminiApiKey,
        googleVisionCredentials,
        selectedModel
      },
      create: {
        userId: session.user.id,
        currency,
        language,
        theme,
        colorTheme,
        provider,
        apiKey,
        openaiApiKey,
        geminiApiKey,
        googleVisionCredentials,
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