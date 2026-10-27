import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { generateAIResponse } from '@/lib/ai'
import { resolveAIConfig } from '@/lib/ai-settings'
import { describeAIError } from '@/lib/ai-errors'
import { parseSmartAnalysis } from '@/lib/smart-analysis'

const MAX_PROMPT_CHARS = 24000
const MAX_CATEGORY_NAMES = 200

const isPrompt = (v: unknown): v is string =>
  typeof v === 'string' && v.trim().length > 0 && v.length <= MAX_PROMPT_CHARS

// POST /api/insights/generate
// Body: { structuredPrompt, deepAnalysisPrompt, categoryNames } from /analyze.
// Both AI calls run in parallel. Browser only gets short error categories.
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const settings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
    })
    const aiConfig = resolveAIConfig(settings)
    if (!aiConfig) {
      return NextResponse.json(
        { error: 'AI settings not configured. Please configure your AI settings first.' },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const structuredPrompt = isPrompt(body?.structuredPrompt) ? body.structuredPrompt : null
    // `analysisPrompt` = legacy key from an old cached client bundle.
    const deepRaw = body?.deepAnalysisPrompt ?? body?.analysisPrompt
    const deepAnalysisPrompt = isPrompt(deepRaw) ? deepRaw : null
    const categoryNames: string[] = Array.isArray(body?.categoryNames)
      ? body.categoryNames
          .filter((n: unknown): n is string => typeof n === 'string' && n.length <= 120)
          .slice(0, MAX_CATEGORY_NAMES)
      : []

    if (!structuredPrompt && !deepAnalysisPrompt) {
      return NextResponse.json(
        { error: 'Data analisis belum siap. Muat ulang halaman lalu coba lagi.' },
        { status: 400 }
      )
    }

    const ai = {
      provider: aiConfig.provider,
      apiKey: aiConfig.apiKey,
      model: aiConfig.model,
      customEndpoint: aiConfig.customEndpoint,
    }

    const [structuredRes, deepRes] = await Promise.allSettled([
      structuredPrompt
        ? generateAIResponse({ ...ai, prompt: structuredPrompt, temperature: 0.4, maxTokens: 1500, timeoutMs: 60000 })
        : Promise.resolve(null),
      deepAnalysisPrompt
        ? generateAIResponse({ ...ai, prompt: deepAnalysisPrompt, maxTokens: 2500, timeoutMs: 90000 })
        : Promise.resolve(null),
    ])

    const warnings: { structured?: string; analysis?: string } = {}

    let structured = null
    if (structuredRes.status === 'fulfilled' && structuredRes.value) {
      structured = parseSmartAnalysis(structuredRes.value, categoryNames)
      if (!structured) warnings.structured = 'Format respons AI gak valid.'
    } else if (structuredRes.status === 'rejected') {
      console.error('Smart analysis (cards) failed:', structuredRes.reason)
      warnings.structured = describeAIError(structuredRes.reason)
    }

    let analysis: string | null = null
    if (deepRes.status === 'fulfilled' && deepRes.value) {
      analysis = deepRes.value.trim() || null
    } else if (deepRes.status === 'rejected') {
      console.error('Smart analysis (deep) failed:', deepRes.reason)
      warnings.analysis = describeAIError(deepRes.reason)
    }

    if (!structured && !analysis) {
      return NextResponse.json(
        { error: warnings.structured || warnings.analysis || 'AI gak ngasih respons.' },
        { status: 502 }
      )
    }

    return NextResponse.json({ structured, analysis, warnings })
  } catch (error) {
    console.error('Error generating analysis:', error)
    return NextResponse.json(
      { error: 'Failed to generate analysis' },
      { status: 500 }
    )
  }
}
