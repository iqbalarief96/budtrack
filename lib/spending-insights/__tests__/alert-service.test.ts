import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  checkThreshold,
  calculateThresholdPercentage,
  createAlert,
  updateAlert,
  toggleAlertActive,
  checkAlert,
  checkAlerts,
  filterAlerts,
  serializeAlert,
  deserializeAlert,
  validateAlertInput,
  WARNING_THRESHOLD_PERCENT,
  EXCEEDED_THRESHOLD_PERCENT,
} from '../alert-service'
import { SpendingAlert, CreateAlertInput, AlertType } from '@/app/types/spending-insights'

/**
 * **Feature: spending-insights, Property 10: Alert Threshold Detection**
 * **Validates: Requirements 4.2, 4.3**
 *
 * For any spending amount and alert threshold, warning status SHALL be returned
 * at 80% and exceeded status at 100%.
 */
describe('Property 10: Alert Threshold Detection', () => {
  it('should return "normal" when spending is below 80% of threshold', () => {
    fc.assert(
      fc.property(
        // Threshold amount (positive)
        fc.integer({ min: 100, max: 1000000 }),
        // Percentage below 80% (0% to 79%)
        fc.integer({ min: 0, max: 79 }),
        (threshold, percent) => {
          const currentAmount = threshold * (percent / 100)
          
          const result = checkThreshold(currentAmount, threshold)
          
          expect(result).toBe('normal')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return "warning" when spending is between 80% and 99% of threshold', () => {
    fc.assert(
      fc.property(
        // Threshold amount (positive)
        fc.integer({ min: 100, max: 1000000 }),
        // Percentage between 80% and 99%
        fc.integer({ min: 80, max: 99 }),
        (threshold, percent) => {
          const currentAmount = threshold * (percent / 100)
          
          const result = checkThreshold(currentAmount, threshold)
          
          expect(result).toBe('warning')
        }
      ),
      { numRuns: 100 }
    )
  })


  it('should return "exceeded" when spending is at or above 100% of threshold', () => {
    fc.assert(
      fc.property(
        // Threshold amount (positive)
        fc.integer({ min: 100, max: 1000000 }),
        // Percentage at or above 100% (100% to 200%)
        fc.integer({ min: 100, max: 200 }),
        (threshold, percent) => {
          const currentAmount = threshold * (percent / 100)
          
          const result = checkThreshold(currentAmount, threshold)
          
          expect(result).toBe('exceeded')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return "warning" at exactly 80% boundary', () => {
    const threshold = 1000
    const currentAmount = threshold * 0.80 // Exactly 80%
    
    const result = checkThreshold(currentAmount, threshold)
    
    expect(result).toBe('warning')
  })

  it('should return "exceeded" at exactly 100% boundary', () => {
    const threshold = 1000
    const currentAmount = threshold * 1.00 // Exactly 100%
    
    const result = checkThreshold(currentAmount, threshold)
    
    expect(result).toBe('exceeded')
  })

  it('should return "exceeded" when threshold is 0 and spending is positive', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000000 }),
        (currentAmount) => {
          const result = checkThreshold(currentAmount, 0)
          expect(result).toBe('exceeded')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return "normal" when both threshold and spending are 0', () => {
    const result = checkThreshold(0, 0)
    expect(result).toBe('normal')
  })

  it('should calculate correct percentage', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 1000000 }),
        fc.integer({ min: 0, max: 200 }),
        (threshold, percent) => {
          const currentAmount = threshold * (percent / 100)
          
          const result = calculateThresholdPercentage(currentAmount, threshold)
          
          // Allow small floating point tolerance
          expect(Math.abs(result - percent)).toBeLessThan(0.01)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should be consistent: same inputs always produce same status', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000000 }),
        fc.integer({ min: 1, max: 1000000 }),
        (currentAmount, threshold) => {
          const result1 = checkThreshold(currentAmount, threshold)
          const result2 = checkThreshold(currentAmount, threshold)
          const result3 = checkThreshold(currentAmount, threshold)
          
          expect(result1).toBe(result2)
          expect(result2).toBe(result3)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should follow monotonic status progression with spending increase', () => {
    // Higher spending should never result in lower status
    const statusOrder = { normal: 0, warning: 1, exceeded: 2 }
    
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000000 }),
        fc.integer({ min: 0, max: 500000 }),
        fc.integer({ min: 1, max: 500000 }),
        (threshold, baseAmount, extra) => {
          const lowerAmount = baseAmount
          const higherAmount = baseAmount + extra
          
          const lowerStatus = checkThreshold(lowerAmount, threshold)
          const higherStatus = checkThreshold(higherAmount, threshold)
          
          expect(statusOrder[higherStatus]).toBeGreaterThanOrEqual(statusOrder[lowerStatus])
        }
      ),
      { numRuns: 100 }
    )
  })
})



/**
 * **Feature: spending-insights, Property 11: Alert Data Round-Trip**
 * **Validates: Requirements 4.1, 4.4, 4.5**
 *
 * For any valid alert data, creating an alert and then retrieving it
 * SHALL return equivalent values.
 */
describe('Property 11: Alert Data Round-Trip', () => {
  // Generator for valid alert types
  const alertTypeGen = fc.constantFrom<AlertType>('category_limit', 'daily_limit', 'anomaly')

  // Generator for valid CreateAlertInput
  const createAlertInputGen = fc.record({
    type: alertTypeGen,
    categoryId: fc.option(fc.uuid(), { nil: undefined }),
    threshold: fc.integer({ min: 0, max: 10000000 }),
    isActive: fc.option(fc.boolean(), { nil: undefined }),
  })

  it('should preserve all fields when creating an alert', () => {
    fc.assert(
      fc.property(
        fc.uuid(), // userId
        createAlertInputGen,
        (userId, input) => {
          const alert = createAlert(userId, input)
          
          // Verify all input fields are preserved
          expect(alert.userId).toBe(userId)
          expect(alert.type).toBe(input.type)
          expect(alert.threshold).toBe(input.threshold)
          
          // categoryId should be null if not provided
          if (input.categoryId !== undefined) {
            expect(alert.categoryId).toBe(input.categoryId)
          } else {
            expect(alert.categoryId).toBeNull()
          }
          
          // isActive should default to true if not provided
          if (input.isActive !== undefined) {
            expect(alert.isActive).toBe(input.isActive)
          } else {
            expect(alert.isActive).toBe(true)
          }
          
          // Should have valid id and timestamps
          expect(alert.id).toBeTruthy()
          expect(alert.createdAt).toBeInstanceOf(Date)
          expect(alert.updatedAt).toBeInstanceOf(Date)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should preserve fields through serialization/deserialization round-trip', () => {
    fc.assert(
      fc.property(
        fc.uuid(), // userId
        createAlertInputGen,
        (userId, input) => {
          const original = createAlert(userId, input)
          
          // Serialize and deserialize
          const serialized = serializeAlert(original)
          const deserialized = deserializeAlert(serialized)
          
          // Verify all fields are preserved
          expect(deserialized.id).toBe(original.id)
          expect(deserialized.userId).toBe(original.userId)
          expect(deserialized.type).toBe(original.type)
          expect(deserialized.categoryId).toBe(original.categoryId)
          expect(deserialized.threshold).toBe(original.threshold)
          expect(deserialized.isActive).toBe(original.isActive)
          
          // Dates should be equivalent (compare timestamps)
          const deserializedCreatedAt = new Date(deserialized.createdAt)
          const deserializedUpdatedAt = new Date(deserialized.updatedAt)
          const originalCreatedAt = new Date(original.createdAt)
          const originalUpdatedAt = new Date(original.updatedAt)
          expect(deserializedCreatedAt.getTime()).toBe(originalCreatedAt.getTime())
          expect(deserializedUpdatedAt.getTime()).toBe(originalUpdatedAt.getTime())
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should preserve fields through update operation', () => {
    fc.assert(
      fc.property(
        fc.uuid(), // userId
        createAlertInputGen,
        fc.record({
          type: fc.option(alertTypeGen, { nil: undefined }),
          categoryId: fc.option(fc.uuid(), { nil: undefined }),
          threshold: fc.option(fc.integer({ min: 0, max: 10000000 }), { nil: undefined }),
          isActive: fc.option(fc.boolean(), { nil: undefined }),
        }),
        (userId, createInput, updateInput) => {
          const original = createAlert(userId, createInput)
          const updated = updateAlert(original, updateInput)
          
          // Fields should be updated if provided, otherwise preserved
          expect(updated.id).toBe(original.id)
          expect(updated.userId).toBe(original.userId)
          
          if (updateInput.type !== undefined) {
            expect(updated.type).toBe(updateInput.type)
          } else {
            expect(updated.type).toBe(original.type)
          }
          
          if (updateInput.categoryId !== undefined) {
            expect(updated.categoryId).toBe(updateInput.categoryId)
          } else {
            expect(updated.categoryId).toBe(original.categoryId)
          }
          
          if (updateInput.threshold !== undefined) {
            expect(updated.threshold).toBe(updateInput.threshold)
          } else {
            expect(updated.threshold).toBe(original.threshold)
          }
          
          if (updateInput.isActive !== undefined) {
            expect(updated.isActive).toBe(updateInput.isActive)
          } else {
            expect(updated.isActive).toBe(original.isActive)
          }
          
          // updatedAt should be newer or equal
          const updatedAt = new Date(updated.updatedAt)
          const originalUpdatedAt = new Date(original.updatedAt)
          expect(updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime())
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should toggle isActive correctly', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        createAlertInputGen,
        (userId, input) => {
          const original = createAlert(userId, input)
          const toggled = toggleAlertActive(original)
          
          // isActive should be inverted
          expect(toggled.isActive).toBe(!original.isActive)
          
          // Other fields should be preserved
          expect(toggled.id).toBe(original.id)
          expect(toggled.userId).toBe(original.userId)
          expect(toggled.type).toBe(original.type)
          expect(toggled.categoryId).toBe(original.categoryId)
          expect(toggled.threshold).toBe(original.threshold)
          
          // Double toggle should return to original state
          const doubleToggled = toggleAlertActive(toggled)
          expect(doubleToggled.isActive).toBe(original.isActive)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should filter active alerts correctly', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            userId: fc.uuid(),
            input: createAlertInputGen,
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (alertInputs) => {
          const alerts = alertInputs.map(({ userId, input }) => createAlert(userId, input))
          
          const activeOnly = filterAlerts(alerts, true)
          const all = filterAlerts(alerts, false)
          
          // All filtered alerts should be active
          for (const alert of activeOnly) {
            expect(alert.isActive).toBe(true)
          }
          
          // All alerts should be returned when activeOnly is false
          expect(all.length).toBe(alerts.length)
          
          // Active count should match
          const expectedActiveCount = alerts.filter(a => a.isActive).length
          expect(activeOnly.length).toBe(expectedActiveCount)
        }
      ),
      { numRuns: 100 }
    )
  })
})
