import type { AiProposedAction } from './types'

const TOOL_CALLS_RE = /<BUDTRACK_TOOL_CALLS>\s*([\s\S]*?)\s*<\/BUDTRACK_TOOL_CALLS>/i

function safeJson(text: string): unknown | null {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export function stripToolCalls(text: string): string {
  return text.replace(TOOL_CALLS_RE, '').trim()
}

export function extractToolCalls(text: string): AiProposedAction[] {
  const match = text.match(TOOL_CALLS_RE)
  if (!match) return []

  const parsed = safeJson(match[1])
  if (!parsed || typeof parsed !== 'object') return []

  const actions = (parsed as { actions?: unknown }).actions
  if (!Array.isArray(actions)) return []

  return actions
    .filter((item): item is AiProposedAction => {
      if (!item || typeof item !== 'object') return false
      const action = item as Partial<AiProposedAction>
      return typeof action.tool === 'string'
        && typeof action.label === 'string'
        && typeof action.reason === 'string'
        && typeof action.confidence === 'number'
        && action.payload !== undefined
    })
    .slice(0, 3)
}

export const __actionExtractTest = {
  TOOL_CALLS_RE,
}
