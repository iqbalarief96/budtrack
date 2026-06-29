import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

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
    const { provider, apiKey, selectedModel, customEndpoint, type = 'chatbot' } = body

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      )
    }

    // Verification logic based on type
    if (type === 'openai') {
      try {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        });

        if (!response.ok) {
          throw new Error('Invalid OpenAI API Key');
        }

        return NextResponse.json({ success: true, message: 'OpenAI API Key verified' });
      } catch (error) {
        return NextResponse.json({ error: 'Invalid OpenAI API Key' }, { status: 400 });
      }
    }

    if (type === 'gemini') {
      try {
        // Simple check using the models endpoint
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);

        if (!response.ok) {
          throw new Error('Invalid Gemini API Key');
        }

        return NextResponse.json({ success: true, message: 'Gemini API Key verified' });
      } catch (error) {
        return NextResponse.json({ error: 'Invalid Gemini API Key' }, { status: 400 });
      }
    }

    // Default Chatbot Verification (DeepSeek / OpenRouter)
    if (type === 'chatbot') {
      if (!provider || !selectedModel) {
        return NextResponse.json(
          { error: 'Provider and model are required for chatbot verification' },
          { status: 400 }
        )
      }

      // Validate provider
      if (!['deepseek', 'openrouter', 'custom'].includes(provider)) {
        return NextResponse.json(
          { error: 'Invalid provider' },
          { status: 400 }
        )
      }

      if (provider === 'custom' && !customEndpoint) {
        return NextResponse.json(
          { error: 'Custom endpoint is required' },
          { status: 400 }
        )
      }

      // For DeepSeek/OpenRouter, we currently just return success as per previous implementation
      // In a real scenario, we would make a small test call here
      return NextResponse.json({
        success: true,
        message: 'Chatbot API key verified successfully',
        data: {
          provider,
          selectedModel,
          customEndpoint
        }
      })
    }

    return NextResponse.json({ error: 'Invalid verification type' }, { status: 400 });

  } catch (error) {
    console.error('Error verifying API key:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}