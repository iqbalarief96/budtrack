import { describe, expect, it } from 'vitest'
import { validateProposedActions } from '../validate'
import type { AiActionValidationContext } from '../types'

const ctx: AiActionValidationContext = {
  userId: 'u1',
  defaultWalletId: 'w1',
  walletIds: ['w1'],
  categoryIds: ['c1'],
  wallets: [{ id: 'w1', name: 'Main' }],
  categories: [{ id: 'c1', name: 'Makan' }],
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

  it('marks foreign wallet as needs_input', () => {
    const [action] = validateProposedActions([{
      id: 'a1', tool: 'create_budget', label: 'Budget', confidence: 0.9, reason: 'x',
      payload: { walletId: 'foreign', amount: 1, periodType: 'MONTHLY', reason: 'x' },
    }], ctx)
    expect(action.status).toBe('needs_input')
    expect(action.warnings[0]).toContain('Wallet')
  })

  it('uses selected wallet when create_budget omits walletId', () => {
    const [action] = validateProposedActions([{
      id: 'a1', tool: 'create_budget', label: 'Budget Makan', confidence: 0.9, reason: 'Top spend',
      payload: { categoryName: 'Makan', amount: 750000, periodType: 'MONTHLY', reason: 'Top spend' },
    }], ctx)

    expect(action.status).toBe('ready')
    expect((action.payload as any).walletId).toBe('w1')
    expect((action.payload as any).categoryId).toBe('c1')
  })

  it('uses friendly input issue for missing category', () => {
    const [action] = validateProposedActions([{
      id: 'a1', tool: 'create_budget', label: 'Budget', confidence: 0.9, reason: 'x',
      payload: { walletId: 'w1', amount: 1, periodType: 'MONTHLY', reason: 'x' },
    }], ctx)

    expect(action.status).toBe('needs_input')
    expect(action.inputIssues?.[0]).toMatchObject({ field: 'categoryId', label: 'Pilih kategori dulu' })
  })

  it('drops unsupported or low confidence actions', () => {
    const actions = validateProposedActions([
      { id: 'bad', tool: 'delete_budget' as any, label: 'Bad', confidence: 1, reason: 'x', payload: {} },
      { id: 'low', tool: 'create_goal', label: 'Low', confidence: 0.2, reason: 'x', payload: {} },
    ], ctx)
    expect(actions).toEqual([])
  })
})
