import { describe, expect, it } from 'vitest'
import { resolveCategoryId } from '../resolve'
import type { AiActionValidationContext } from '../types'

const ctx: AiActionValidationContext = {
  userId: 'u1',
  defaultWalletId: 'w1',
  walletIds: ['w1'],
  categoryIds: ['c1', 'c2', 'c3'],
  wallets: [{ id: 'w1', name: 'Main' }],
  categories: [
    { id: 'c1', name: 'Makan' },
    { id: 'c2', name: 'Transportasi' },
    { id: 'c3', name: 'Belanja Online' },
  ],
  categoriesByName: new Map([
    ['makan', [{ id: 'c1', name: 'Makan' }]],
    ['transportasi', [{ id: 'c2', name: 'Transportasi' }]],
    ['belanja online', [{ id: 'c3', name: 'Belanja Online' }]],
  ]),
}

describe('resolveCategoryId', () => {
  it('resolves exact/case-insensitive category name', () => {
    expect(resolveCategoryId('Makan', ctx).id).toBe('c1')
    expect(resolveCategoryId('makan', ctx).id).toBe('c1')
  })

  it('resolves aliases', () => {
    expect(resolveCategoryId('food', ctx).id).toBe('c1')
    expect(resolveCategoryId('transport', ctx).id).toBe('c2')
  })

  it('resolves fuzzy contained name', () => {
    expect(resolveCategoryId('belanja', ctx).id).toBe('c3')
  })

  it('returns no id for unknown category', () => {
    expect(resolveCategoryId('asuransi', ctx).id).toBeUndefined()
  })
})
