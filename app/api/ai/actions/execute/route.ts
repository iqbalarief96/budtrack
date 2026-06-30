import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { executeAiAction } from '@/lib/ai/actions/executors'
import { getAiActionValidationContext } from '@/lib/ai/actions/context'
import { validateProposedActions } from '@/lib/ai/actions/validate'
import type { AiActionTool, AiProposedAction } from '@/lib/ai/actions/types'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const tool = body?.tool as AiActionTool
    const payload = body?.payload

    if (!tool || !payload) {
      return NextResponse.json({ error: 'tool and payload are required' }, { status: 400 })
    }

    const proposed: AiProposedAction = {
      id: typeof body?.actionId === 'string' ? body.actionId : `${tool}-manual`,
      tool,
      label: typeof body?.label === 'string' ? body.label : tool,
      confidence: 1,
      reason: typeof payload?.reason === 'string' ? payload.reason : 'User confirmed AI action',
      payload,
    }

    const ctx = await getAiActionValidationContext(session.user.id)
    const [validated] = validateProposedActions([proposed], ctx)
    if (!validated) {
      return NextResponse.json({ error: 'Unsupported or invalid action' }, { status: 400 })
    }
    if (validated.missingFields.length > 0 || validated.warnings.some((warning) => /not found/i.test(warning))) {
      return NextResponse.json({
        error: 'Action needs review',
        missingFields: validated.missingFields,
        warnings: validated.warnings,
      }, { status: 400 })
    }

    const result = await executeAiAction(session.user.id, validated.tool, validated.payload)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error executing AI action:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to execute action',
    }, { status: 500 })
  }
}
