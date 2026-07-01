import { describe, expect, it } from 'vitest'
import { detectSuggestedActions } from '../detect'

describe('detectSuggestedActions', () => {
  it('detects create budget intent', () => {
    const [action] = detectSuggestedActions('buat budget makan 750 ribu bulan ini')
    expect(action.tool).toBe('create_budget')
    expect((action.payload as any).amount).toBe(750000)
    expect((action.payload as any).periodType).toBe('MONTHLY')
  })

  it('detects create goal intent', () => {
    const [action] = detectSuggestedActions('bikin goal nabung 5 juta')
    expect(action.tool).toBe('create_goal')
    expect((action.payload as any).target).toBe(5000000)
  })

  it('does not force action for normal finance question', () => {
    expect(detectSuggestedActions('analisa pengeluaran bulan ini')).toEqual([])
  })
})
