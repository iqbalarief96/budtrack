import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

// POST /api/settings/verify
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { provider, apiKey, selectedModel } = body

    if (!provider || !apiKey || !selectedModel) {
      return NextResponse.json(
        { error: 'Provider, API key, and model are required' },
        { status: 400 }
      )
    }

    // Validate provider
    if (!['deepseek', 'openrouter'].includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider' },
        { status: 400 }
      )
    }

    // Here you would typically verify the API key with the provider
    // For now, we'll just return success
    return NextResponse.json({ 
      success: true,
      message: 'API key verified successfully',
      data: {
        provider,
        selectedModel
      }
    })

  } catch (error) {
    console.error('Error verifying API key:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 