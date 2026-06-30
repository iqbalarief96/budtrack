import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const DEFAULT_BASE_URLS: Record<string, string> = {
  deepseek: 'https://api.deepseek.com/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  zai: 'https://api.z.ai/api/coding/paas/v4',
}

function normalizeBaseUrl(provider: string, customEndpoint?: string) {
  const base = provider === 'custom' ? customEndpoint : DEFAULT_BASE_URLS[provider]
  if (!base) throw new Error('Custom endpoint is required')
  return base.replace(/\/+$/, '')
}

function modelIds(payload: unknown) {
  const data = (payload as { data?: unknown }).data
  if (!Array.isArray(data)) return []
  return data
    .map((item) => typeof item === 'string' ? item : (item as { id?: unknown }).id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0)
    .sort((a, b) => a.localeCompare(b))
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { provider, apiKey, customEndpoint } = await request.json()
    if (!provider || !apiKey) return NextResponse.json({ error: 'Provider and API key are required' }, { status: 400 })

    const baseUrl = normalizeBaseUrl(provider, customEndpoint)
    const headers = {
      Authorization: `Bearer ${apiKey}`,
      ...(provider === 'openrouter' ? { 'HTTP-Referer': 'https://budtrack.app', 'X-Title': 'BudTrack' } : {}),
    }
    const urls = [
      `${baseUrl}/models`,
      ...(baseUrl.endsWith('/v1') ? [] : [`${baseUrl}/v1/models`]),
    ]

    const failures: string[] = []
    for (const url of urls) {
      const response = await fetch(url, { headers })
      if (!response.ok) {
        const text = await response.text().catch(() => '')
        failures.push(`${url} -> ${response.status}: ${text.slice(0, 160)}`)
        continue
      }

      const payload = await response.json()
      return NextResponse.json({ models: modelIds(payload), baseUrl, sourceUrl: url })
    }

    return NextResponse.json({ error: 'Failed to fetch models', details: failures.join('\n') }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to fetch models' }, { status: 400 })
  }
}
