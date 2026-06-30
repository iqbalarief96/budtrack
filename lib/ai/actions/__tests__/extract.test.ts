import { describe, expect, it } from 'vitest'
import { extractToolCalls, stripToolCalls } from '../extract'

describe('action tool extraction', () => {
  it('extracts tool calls and strips marker from markdown', () => {
    const text = `Halo\n<BUDTRACK_TOOL_CALLS>{"actions":[{"id":"a1","tool":"create_goal","label":"Create goal","confidence":0.9,"reason":"Need saving","payload":{"name":"Dana Darurat","target":1000000,"reason":"Need saving"}}]}</BUDTRACK_TOOL_CALLS>`

    expect(stripToolCalls(text)).toBe('Halo')
    expect(extractToolCalls(text)).toHaveLength(1)
    expect(extractToolCalls(text)[0].tool).toBe('create_goal')
  })

  it('returns empty actions on malformed JSON', () => {
    expect(extractToolCalls('<BUDTRACK_TOOL_CALLS>{bad}</BUDTRACK_TOOL_CALLS>')).toEqual([])
  })

  it('caps actions to 3', () => {
    const action = (id: string) => ({ id, tool: 'ask_followup', label: id, confidence: 1, reason: 'x', payload: { prompt: 'x', reason: 'x' } })
    const text = `<BUDTRACK_TOOL_CALLS>${JSON.stringify({ actions: [action('1'), action('2'), action('3'), action('4')] })}</BUDTRACK_TOOL_CALLS>`
    expect(extractToolCalls(text)).toHaveLength(3)
  })
})
