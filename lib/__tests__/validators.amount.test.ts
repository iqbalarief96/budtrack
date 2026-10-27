import { describe, expect, it } from 'vitest'
import { TransactionSchema, BudgetSchema, MAX_MONEY_AMOUNT } from '../validators'

const base = { type: 'EXPENSE', walletId: 'w', date: '2026-10-27' }
const ok = (amount: unknown) => TransactionSchema.safeParse({ ...base, amount }).success

describe('money amount validation', () => {
  it('accepts positive numbers and numeric strings', () => {
    expect(ok(75_000)).toBe(true)
    expect(ok('75000')).toBe(true)
    expect(ok(' 12.5 ')).toBe(true)
    expect(ok(MAX_MONEY_AMOUNT)).toBe(true)
  })

  it('rejects non-numeric, non-positive, and absurd values', () => {
    for (const bad of ['abc', '', '   ', '-50000', -1, 0, 1e18, Infinity, NaN]) {
      expect(ok(bad), String(bad)).toBe(false)
    }
  })

  it('rejects wrong JSON types instead of coercing them', () => {
    for (const bad of [true, false, null, [], [5], {}]) {
      expect(ok(bad), JSON.stringify(bad)).toBe(false)
    }
  })

  it('coerces numeric strings to numbers', () => {
    const r = TransactionSchema.parse({ ...base, amount: '1500' })
    expect(r.amount).toBe(1500)
  })

  it('applies the same rules to budgets and keeps partial updates working', () => {
    expect(BudgetSchema.safeParse({ amount: true }).success).toBe(false)
    expect(BudgetSchema.safeParse({ amount: '2000000' }).success).toBe(true)
    expect(TransactionSchema.partial().safeParse({ description: 'x' }).success).toBe(true)
  })
})
