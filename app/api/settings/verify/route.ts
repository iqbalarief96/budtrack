import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const BASE_URLS: Record<string, string> = {
  deepseek: 'https://api.deepseek.com/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  zai: 'https://api.z.ai/api/coding/paas/v4',
}

function baseUrlFor(provider: string, customEndpoint?: string) {
  const base = provider === 'custom' ? customEndpoint : BASE_URLS[provider]
  if (!base) throw new Error(provider === 'custom' ? 'Custom endpoint is required' : 'Invalid provider')
  return base.replace(/\/+$/, '')
}

function compactModel(provider: string, model: string) {
  if (provider === 'deepseek') return model.replace(/^deepseek\//, '')
  return model
}

function errorMessage(text: string) {
  try {
    const json = JSON.parse(text)
    return json?.error?.message || json?.message || text.slice(0, 300)
  } catch {
    return text.slice(0, 300)
  }
}

async function verifyChatbotKey(
  provider: string,
  apiKey: string,
  selectedModel: string,
  customEndpoint?: string
) {
  const baseUrl = baseUrlFor(provider, customEndpoint)

  // Try normal non-streaming first
  let response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      ...(provider === 'openrouter' ? { 'HTTP-Referer': 'https://budtrack.app', 'X-Title': 'BudTrack' } : {}),
    },
    body: JSON.stringify({
      model: compactModel(provider, selectedModel),
      messages: [{ role: 'user', content: 'Reply with OK.' }],
      max_tokens: 32,
      temperature: 0,
      stream: false,
    }),
  })

  // If failed with 502 (e.g. streaming translation issue in proxy gateway like 9router-go), retry with stream: true
  if (!response.ok && response.status === 502) {
    try {
      const streamResponse = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: compactModel(provider, selectedModel),
          messages: [{ role: 'user', content: 'Reply with OK.' }],
          max_tokens: 32,
          stream: true,
        }),
      })
      if (streamResponse.ok) {
        return // Stream works, verification pass!
      }
    } catch (_) {}
  }

  const text = await response.text()
  if (!response.ok) {
    throw new Error(`${baseUrl}/chat/completions -> ${response.status}: ${errorMessage(text)}`)
  }
}

// POST /api/settings/verify
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { provider, apiKey, selectedModel, customEndpoint, type = 'chatbot' } = body

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 })
    }

    if (type === 'openai') {
      try {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` },
        })
        if (!response.ok) throw new Error('Invalid OpenAI API Key')
        return NextResponse.json({ success: true, message: 'OpenAI API Key verified' })
      } catch {
        return NextResponse.json({ error: 'Invalid OpenAI API Key' }, { status: 400 })
      }
    }

    if (type === 'gemini') {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
        if (!response.ok) throw new Error('Invalid Gemini API Key')
        return NextResponse.json({ success: true, message: 'Gemini API Key verified' })
      } catch {
        return NextResponse.json({ error: 'Invalid Gemini API Key' }, { status: 400 })
      }
    }

    if (type === 'chatbot') {
      if (!provider || !selectedModel) {
        return NextResponse.json({ error: 'Provider and model are required for chatbot verification' }, { status: 400 })
      }

      if (!['deepseek', 'openrouter', 'zai', 'custom'].includes(provider)) {
        return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
      }

      try {
        await verifyChatbotKey(provider, apiKey, selectedModel, customEndpoint)
        return NextResponse.json({ success: true, message: 'Chatbot API key verified successfully' })
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : 'Chatbot API key verification failed' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json({ error: 'Invalid verification type' }, { status: 400 })
  } catch (error) {
    console.error('Error verifying API key:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
