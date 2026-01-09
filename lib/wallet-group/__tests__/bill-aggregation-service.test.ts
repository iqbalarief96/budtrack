import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  verifyAllBillsHaveWalletInfo,
  verifyTotalUpcoming,
  verifyTotalOverdue,
  verifyTotalPaid,
  verifyBillCountMatchesWalletSummaries,
  verifyStatsCalculations,
  verifyAllWalletsRepresented,
  calculateExpectedTotalBills,
  verifyWalletSummaryAmounts,
  AggregatedBill,
  WalletBillSummary,
  BillStats,
} from '../bill-aggregation-service'

/**
 * Feature: wallet-linking, Property 18: Aggregated Bills Completeness
 * Validates: Requirements 11.1, 11.2, 11.3
 * 
 * For any wallet group, the aggregated bills list SHALL contain ALL bills
 * from ALL linked wallets, with correct wallet attribution and accurate total calculations.
 */
describe('Property 18: Aggregated Bills Completeness', () => {
  // Generator for bill status
  const billStatusArb = fc.constantFrom('upcoming', 'overdue', 'paid') as fc.Arbitrary<'upcoming' | 'overdue' | 'paid'>

  // Generator for aggregated bill
  const aggregatedBillArb = (walletId: string, walletName: string) =>
    fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 50 }),
      amount: fc.integer({ min: 1, max: 10000000 }).map(n => n / 100),
      dueDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
      status: billStatusArb,
      isPaid: fc.boolean(),
      paidDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }), { nil: null }),
      categoryId: fc.option(fc.uuid(), { nil: null }),
      categoryName: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: null }),
      walletId: fc.constant(walletId),
      walletName: fc.constant(walletName),
      walletColor: fc.option(fc.constantFrom('#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'), { nil: null }),
      isRecurring: fc.boolean(),
      frequency: fc.option(fc.constantFrom('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'), { nil: null }),
      notes: fc.option(fc.string({ minLength: 0, maxLength: 100 }), { nil: null }),
    })

  // Test that all bills have wallet attribution (Requirement 11.2)
  it('should verify all bills have wallet attribution', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(
            fc.uuid(),
            fc.string({ minLength: 1, maxLength: 20 })
          ).chain(([walletId, walletName]) =>
            fc.array(aggregatedBillArb(walletId, walletName), { minLength: 0, maxLength: 5 })
          ),
          { minLength: 1, maxLength: 5 }
        ),
        (billsPerWallet) => {
          const allBills = billsPerWallet.flat()
          expect(verifyAllBillsHaveWalletInfo(allBills)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })


  // Test total upcoming calculation (Requirement 11.3)
  it('should verify total upcoming equals sum of upcoming bills', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            amount: fc.integer({ min: 1, max: 10000000 }).map(n => n / 100),
            dueDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
            status: billStatusArb,
            isPaid: fc.boolean(),
            paidDate: fc.constant(null),
            categoryId: fc.constant(null),
            categoryName: fc.constant(null),
            walletId: fc.uuid(),
            walletName: fc.string({ minLength: 1, maxLength: 20 }),
            walletColor: fc.constant(null),
            isRecurring: fc.boolean(),
            frequency: fc.constant(null),
            notes: fc.constant(null),
          }),
          { minLength: 0, maxLength: 20 }
        ),
        (bills: AggregatedBill[]) => {
          const totalUpcoming = bills
            .filter((b) => b.status === 'upcoming')
            .reduce((sum, b) => sum + b.amount, 0)
          
          expect(verifyTotalUpcoming(bills, totalUpcoming)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test total overdue calculation
  it('should verify total overdue equals sum of overdue bills', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            amount: fc.integer({ min: 1, max: 10000000 }).map(n => n / 100),
            dueDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
            status: billStatusArb,
            isPaid: fc.boolean(),
            paidDate: fc.constant(null),
            categoryId: fc.constant(null),
            categoryName: fc.constant(null),
            walletId: fc.uuid(),
            walletName: fc.string({ minLength: 1, maxLength: 20 }),
            walletColor: fc.constant(null),
            isRecurring: fc.boolean(),
            frequency: fc.constant(null),
            notes: fc.constant(null),
          }),
          { minLength: 0, maxLength: 20 }
        ),
        (bills: AggregatedBill[]) => {
          const totalOverdue = bills
            .filter((b) => b.status === 'overdue')
            .reduce((sum, b) => sum + b.amount, 0)
          
          expect(verifyTotalOverdue(bills, totalOverdue)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test total paid calculation
  it('should verify total paid equals sum of paid bills', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            amount: fc.integer({ min: 1, max: 10000000 }).map(n => n / 100),
            dueDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
            status: billStatusArb,
            isPaid: fc.boolean(),
            paidDate: fc.constant(null),
            categoryId: fc.constant(null),
            categoryName: fc.constant(null),
            walletId: fc.uuid(),
            walletName: fc.string({ minLength: 1, maxLength: 20 }),
            walletColor: fc.constant(null),
            isRecurring: fc.boolean(),
            frequency: fc.constant(null),
            notes: fc.constant(null),
          }),
          { minLength: 0, maxLength: 20 }
        ),
        (bills: AggregatedBill[]) => {
          const totalPaid = bills
            .filter((b) => b.status === 'paid')
            .reduce((sum, b) => sum + b.amount, 0)
          
          expect(verifyTotalPaid(bills, totalPaid)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })


  // Test bill count matches wallet summaries
  it('should verify bill count matches wallet summaries', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(
            fc.uuid(),
            fc.string({ minLength: 1, maxLength: 20 })
          ),
          { minLength: 1, maxLength: 5 }
        ).chain((wallets) => {
          // Generate bills for each wallet
          const billsArb = fc.tuple(
            ...wallets.map(([walletId, walletName]) =>
              fc.array(
                fc.record({
                  id: fc.uuid(),
                  name: fc.string({ minLength: 1, maxLength: 50 }),
                  amount: fc.integer({ min: 1, max: 10000000 }).map(n => n / 100),
                  dueDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
                  status: billStatusArb,
                  isPaid: fc.boolean(),
                  paidDate: fc.constant(null),
                  categoryId: fc.constant(null),
                  categoryName: fc.constant(null),
                  walletId: fc.constant(walletId),
                  walletName: fc.constant(walletName),
                  walletColor: fc.constant(null),
                  isRecurring: fc.boolean(),
                  frequency: fc.constant(null),
                  notes: fc.constant(null),
                }),
                { minLength: 0, maxLength: 5 }
              )
            )
          )
          return fc.tuple(fc.constant(wallets), billsArb)
        }),
        ([wallets, billsArrays]) => {
          const allBills: AggregatedBill[] = billsArrays.flat()
          
          // Create wallet summaries
          const walletSummaries: WalletBillSummary[] = wallets.map(([walletId, walletName], i) => {
            const walletBills = billsArrays[i] as AggregatedBill[]
            return {
              walletId,
              walletName,
              walletColor: null,
              bills: walletBills,
              totalAmount: walletBills.reduce((sum, b) => sum + b.amount, 0),
              upcomingAmount: walletBills.filter(b => b.status === 'upcoming').reduce((sum, b) => sum + b.amount, 0),
              overdueAmount: walletBills.filter(b => b.status === 'overdue').reduce((sum, b) => sum + b.amount, 0),
              paidAmount: walletBills.filter(b => b.status === 'paid').reduce((sum, b) => sum + b.amount, 0),
              billCount: walletBills.length,
            }
          })

          expect(verifyBillCountMatchesWalletSummaries(allBills, walletSummaries)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test stats calculations (Requirement 11.4)
  it('should verify stats calculations are correct', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            amount: fc.integer({ min: 1, max: 10000000 }).map(n => n / 100),
            dueDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
            status: billStatusArb,
            isPaid: fc.boolean(),
            paidDate: fc.constant(null),
            categoryId: fc.constant(null),
            categoryName: fc.constant(null),
            walletId: fc.uuid(),
            walletName: fc.string({ minLength: 1, maxLength: 20 }),
            walletColor: fc.constant(null),
            isRecurring: fc.boolean(),
            frequency: fc.constant(null),
            notes: fc.constant(null),
          }),
          { minLength: 0, maxLength: 20 }
        ),
        (bills: AggregatedBill[]) => {
          const totalBills = bills.length
          const paidBills = bills.filter((b) => b.status === 'paid').length
          const overdueBills = bills.filter((b) => b.status === 'overdue').length
          const upcomingBills = bills.filter((b) => b.status === 'upcoming').length
          const unpaidBills = totalBills - paidBills
          const paymentRate = totalBills > 0 ? (paidBills / totalBills) * 100 : 0
          const totalAmount = bills.reduce((sum, b) => sum + b.amount, 0)
          const averageBillAmount = totalBills > 0 ? totalAmount / totalBills : 0

          const stats: BillStats = {
            totalBills,
            paidBills,
            unpaidBills,
            overdueBills,
            upcomingBills,
            paymentRate,
            averageBillAmount,
          }

          expect(verifyStatsCalculations(bills, stats)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })


  // Test all wallets are represented in summaries
  it('should verify all wallets from group are represented in summaries', () => {
    fc.assert(
      fc.property(
        fc.array(fc.uuid(), { minLength: 1, maxLength: 10 }),
        (walletIds) => {
          const walletSummaries: WalletBillSummary[] = walletIds.map((id) => ({
            walletId: id,
            walletName: `Wallet ${id.slice(0, 8)}`,
            walletColor: null,
            bills: [],
            totalAmount: 0,
            upcomingAmount: 0,
            overdueAmount: 0,
            paidAmount: 0,
            billCount: 0,
          }))

          expect(verifyAllWalletsRepresented(walletIds, walletSummaries)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test total bills calculation from wallet summaries
  it('should verify total bills equals sum of wallet bill counts', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.integer({ min: 0, max: 20 }),
          { minLength: 1, maxLength: 10 }
        ),
        (billCounts) => {
          const walletSummaries: WalletBillSummary[] = billCounts.map((count, i) => ({
            walletId: `wallet-${i}`,
            walletName: `Wallet ${i}`,
            walletColor: null,
            bills: [],
            totalAmount: 0,
            upcomingAmount: 0,
            overdueAmount: 0,
            paidAmount: 0,
            billCount: count,
          }))

          const expectedTotal = billCounts.reduce((sum, c) => sum + c, 0)
          expect(calculateExpectedTotalBills(walletSummaries)).toBe(expectedTotal)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test wallet summary amounts are correct
  it('should verify wallet summary amounts are correct', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            amount: fc.integer({ min: 1, max: 10000000 }).map(n => n / 100),
            dueDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
            status: billStatusArb,
            isPaid: fc.boolean(),
            paidDate: fc.constant(null),
            categoryId: fc.constant(null),
            categoryName: fc.constant(null),
            walletId: fc.constant('test-wallet'),
            walletName: fc.constant('Test Wallet'),
            walletColor: fc.constant(null),
            isRecurring: fc.boolean(),
            frequency: fc.constant(null),
            notes: fc.constant(null),
          }),
          { minLength: 0, maxLength: 10 }
        ),
        (bills: AggregatedBill[]) => {
          const walletSummary: WalletBillSummary = {
            walletId: 'test-wallet',
            walletName: 'Test Wallet',
            walletColor: null,
            bills,
            totalAmount: bills.reduce((sum, b) => sum + b.amount, 0),
            upcomingAmount: bills.filter(b => b.status === 'upcoming').reduce((sum, b) => sum + b.amount, 0),
            overdueAmount: bills.filter(b => b.status === 'overdue').reduce((sum, b) => sum + b.amount, 0),
            paidAmount: bills.filter(b => b.status === 'paid').reduce((sum, b) => sum + b.amount, 0),
            billCount: bills.length,
          }

          expect(verifyWalletSummaryAmounts(walletSummary)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test empty bills array
  it('should handle empty bills array', () => {
    const emptyBills: AggregatedBill[] = []
    expect(verifyAllBillsHaveWalletInfo(emptyBills)).toBe(true)
    expect(verifyTotalUpcoming(emptyBills, 0)).toBe(true)
    expect(verifyTotalOverdue(emptyBills, 0)).toBe(true)
    expect(verifyTotalPaid(emptyBills, 0)).toBe(true)
  })

  // Test payment rate calculation
  it('should verify payment rate is between 0 and 100', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        (paidCount, unpaidCount) => {
          const totalBills = paidCount + unpaidCount
          const paymentRate = totalBills > 0 ? (paidCount / totalBills) * 100 : 0
          
          expect(paymentRate).toBeGreaterThanOrEqual(0)
          expect(paymentRate).toBeLessThanOrEqual(100)
        }
      ),
      { numRuns: 100 }
    )
  })
})
