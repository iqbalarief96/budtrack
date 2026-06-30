import { describe, expect, it } from 'vitest'
import { validateProposedActions } from '../validate'
import type { AiActionValidationContext } from '../types'

const ctx: AiActionValidationContext = {
  userId: 'u1',
  walletIds: ['w1'],
  categoryIds: ['c1'],
  categoriesByName: new Map([['makan', [{ id: 'c1', name: 'Makan' }]]]),
}

describe('validateProposedActions', () => {
  it('accepts valid create_budget and resolves category name', () => {
    const [action] = validateProposedActions([{
      id: 'a1', tool: 'create_budget', label: 'Budget Makan', confidence: 0.9, reason: 'Top spend',
      payload: { walletId: 'w1', categoryName: 'Makan', amount: 750000, periodType: 'MONTHLY', reason: 'Top spend' },
    }], ctx)

    expect(action.status).toBe('ready')
    expect((action.payload as any).categoryId).toBe('c1')
  })

  it('marks foreign wallet as needs_review', () => {
    const [action] = validateProposedActions([{
      id: 'a1', tool: 'create_budget', label: 'Budget', confidence: 0.9, reason: 'x',
      payload: { walletId: 'foreign', amount: 1, periodType: 'MONTHLY', reason: 'x' },
    }], ctx)
    expect(action.status).toBe('needs_review')
    expect(action.warnings[0]).toContain('Wallet')
  })

  it('drops unsupported or low confidence actions', () => {
    const actions = validateProposedActions([
      { id: 'bad', tool: 'delete_budget' as any, label: 'Bad', confidence: 1, reason: 'x', payload: {} },
      { id: 'low', tool: 'create_goal', label: 'Low', confidence: 0.2, reason: 'x', payload: {} },
    ], ctx)
    expect(actions).toEqual([])
  })
})
