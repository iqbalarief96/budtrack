import { describe, expect, it } from 'vitest'
import { calculateGoalReserve, calculateMonthlySafeToSpend, calculateRemainingBudget, calculateTransactionBalance } from '../safeToSpendSummary'

describe('calculateMonthlySafeToSpend', () => {
  it('does not double-count expenses that are already out of the balance', () => {
    // Regression: Rp 5.000.000 income, Rp 75.000 spent -> balance Rp 4.925.000.
    // Safe to spend used to subtract the 75k again and show Rp 4.850.000.
    expect(calculateMonthlySafeToSpend({ balance: 4_925_000 })).toBe(4_925_000)
  })

  it('deducts remaining (unspent) budget, bills, and goal reserve from balance', () => {
    expect(calculateMonthlySafeToSpend({
      balance: 20_000_000,
      remainingBudget: 5_000_000,
      outstandingBills: 2_000_000,
      goalReserve: 1_000_000,
    })).toBe(12_000_000)
  })

  it('never goes below zero when commitments exceed balance', () => {
    expect(calculateMonthlySafeToSpend({
      balance: 1_000_000,
      remainingBudget: 3_000_000,
    })).toBe(0)
  })

  it('clamps impossible negative inputs to zero before calculation', () => {
    expect(calculateMonthlySafeToSpend({
      balance: -100,
      remainingBudget: -200,
      outstandingBills: -300,
      goalReserve: -400,
    })).toBe(0)
  })
})

describe('calculateRemainingBudget', () => {
  it('sums unspent budget and treats overspent budgets as zero', () => {
    expect(calculateRemainingBudget([
      { amount: 2_000_000, spent: 500_000 },
      { amount: 1_000_000, spent: 1_500_000 },
      { amount: 300_000, spent: null },
    ])).toBe(1_800_000)
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
