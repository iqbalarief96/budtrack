import { describe, expect, it } from 'vitest'
import { calculateGoalReserve, calculateMonthlySafeToSpend, calculateTransactionBalance } from '../safeToSpendSummary'

describe('calculateMonthlySafeToSpend', () => {
  it('does not treat wallet balance as safe to spend when current expenses already exceed balance', () => {
    expect(calculateMonthlySafeToSpend({
      balance: 12_414_037,
      monthlyExpense: 169_355_648,
      outstandingBills: 0,
      goalReserve: 0,
    })).toBe(0)
  })

  it('deducts monthly expenses, bills, and goal reserve from balance', () => {
    expect(calculateMonthlySafeToSpend({
      balance: 20_000_000,
      monthlyExpense: 5_000_000,
      outstandingBills: 2_000_000,
      goalReserve: 1_000_000,
    })).toBe(12_000_000)
  })

  it('clamps impossible negative inputs to zero before calculation', () => {
    expect(calculateMonthlySafeToSpend({
      balance: -100,
      monthlyExpense: -200,
      outstandingBills: -300,
      goalReserve: -400,
    })).toBe(0)
  })
})

describe('calculateGoalReserve', () => {
  it('reserves the lower of ten percent balance or one monthly slice of remaining goals', () => {
    expect(calculateGoalReserve({ balance: 20_000_000, remainingGoalAmount: 60_000_000 })).toBe(2_000_000)
    expect(calculateGoalReserve({ balance: 20_000_000, remainingGoalAmount: 12_000_000 })).toBe(1_000_000)
  })

  it('returns zero when there is no active remaining goal', () => {
    expect(calculateGoalReserve({ balance: 20_000_000, remainingGoalAmount: 0 })).toBe(0)
  })
})


describe('calculateTransactionBalance', () => {
  it('uses transaction totals instead of stale wallet row balance', () => {
    expect(calculateTransactionBalance({
      totalIncome: 172_118_823,
      totalExpense: 169_355_648,
    })).toBe(2_763_175)
  })
})
