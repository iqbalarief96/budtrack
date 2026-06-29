import { describe, expect, it } from 'vitest'
import { getHouseholdStockStatus } from '../status'

describe('getHouseholdStockStatus', () => {
  const now = new Date('2026-06-30T12:00:00.000Z')

  it('marks expired before stock level', () => {
    expect(getHouseholdStockStatus({ quantity: 10, minimumQuantity: 1, expiredAt: '2026-06-29', now })).toBe('EXPIRED')
  })

  it('marks zero quantity as habis', () => {
    expect(getHouseholdStockStatus({ quantity: 0, minimumQuantity: 1, now })).toBe('HABIS')
  })

  it('marks quantity at minimum as menipis', () => {
    expect(getHouseholdStockStatus({ quantity: 5, minimumQuantity: 5, now })).toBe('MENIPIS')
  })

  it('marks expiry within seven days as mau expired', () => {
    expect(getHouseholdStockStatus({ quantity: 10, minimumQuantity: 1, expiredAt: '2026-07-05', now })).toBe('MAU_EXPIRED')
  })

  it('marks healthy stock as aman', () => {
    expect(getHouseholdStockStatus({ quantity: 10, minimumQuantity: 1, now })).toBe('AMAN')
  })
})
