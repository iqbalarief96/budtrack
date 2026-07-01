import type { AiProposedAction } from './types'

function parseMoney(text: string) {
  const match = text.match(/(?:rp\s*)?([0-9][0-9.,]*)\s*(juta|jt|ribu|rb|k)?/i)
  if (!match) return undefined
  const raw = Number(match[1].replace(/[.,]/g, ''))
  if (!Number.isFinite(raw) || raw <= 0) return undefined
  const unit = match[2]?.toLowerCase()
  if (unit === 'juta' || unit === 'jt') return raw * 1_000_000
  if (unit === 'ribu' || unit === 'rb' || unit === 'k') return raw * 1_000
  return raw
}

function categoryAfterKeyword(text: string) {
  const match = text.match(/(?:budget|kategori|untuk|buat)\s+([a-zA-Z\s]{3,40})(?:\s+(?:rp|sebesar|bulan|minggu|tahun|[0-9])|$)/i)
  return match?.[1]?.trim()
}

export function detectSuggestedActions(prompt: string): AiProposedAction[] {
  const text = prompt.toLowerCase()
  const actions: AiProposedAction[] = []

  if (/\b(buat|bikin|set|atur)\b.*\bbudget\b|\bbudget\b.*\b(buat|bikin|set|atur)\b/i.test(prompt)) {
    actions.push({
      id: 'detected-create-budget',
      tool: 'create_budget',
      label: 'Buat budget',
      confidence: 1,
      reason: 'User asked to create or set a budget',
      payload: {
        categoryName: categoryAfterKeyword(prompt),
        amount: parseMoney(prompt),
        periodType: text.includes('minggu') ? 'WEEKLY' : text.includes('tahun') ? 'YEARLY' : 'MONTHLY',
        reason: 'Detected from user request',
      },
    })
  }

  if (/\b(buat|bikin|set)\b.*\b(goal|target|nabung)\b|\b(goal|target|nabung)\b.*\b(buat|bikin|set)\b/i.test(prompt)) {
    actions.push({
      id: 'detected-create-goal',
      tool: 'create_goal',
      label: 'Buat goal',
      confidence: 1,
      reason: 'User asked to create a saving goal',
      payload: {
        name: prompt.replace(/^(buat|bikin|set)\s+/i, '').slice(0, 80),
        target: parseMoney(prompt),
        reason: 'Detected from user request',
      },
    })
  }

  if (/\b(buat|bikin|set)\b.*\b(alert|ingatkan|reminder)\b|\b(alert|ingatkan|reminder)\b.*\b(buat|bikin|set)\b/i.test(prompt)) {
    actions.push({
      id: 'detected-create-alert',
      tool: 'create_alert',
      label: 'Buat alert',
      confidence: 1,
      reason: 'User asked to create an alert',
      payload: {
        type: 'custom',
        title: 'Alert BudTrack',
        message: prompt,
        thresholdAmount: parseMoney(prompt),
        reason: 'Detected from user request',
      },
    })
  }

  return actions.slice(0, 3)
}
