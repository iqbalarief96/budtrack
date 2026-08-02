import { describe, expect, it } from 'vitest'
import { calculateTrend } from '../trend'

describe('calculateTrend', () => {
  it('returns down percentage when current < previous', () => {
    const t = calculateTrend(5_026_555, 12_856_768)
    expect(t.direction).toBe('down')
    expect(t.pct).not.toBeNull()
    expect(t.pct).toBeCloseTo(-60.9, 1)
  })

  it('returns up percentage when current > previous', () => {
    const t = calculateTrend(110, 100)
    expect(t.direction).toBe('up')
    expect(t.pct).toBe(10)
  })

  it('treats income fall as direction down', () => {
    const t = calculateTrend(6_657_900, 11_875_270)
    expect(t.direction).toBe('down')
    expect(t.pct).toBeCloseTo(-43.9, 1)
  })

  it('returns flat when equal', () => {
    const t = calculateTrend(1000, 1000)
    expect(t.direction).toBe('flat')
    expect(t.pct).toBe(0)
  })

  it('returns none when previous is 0', () => {
    const t = calculateTrend(5000, 0)
    expect(t.direction).toBe('none')
    expect(t.pct).toBeNull()
  })

  it('returns none when both are 0', () => {
    const t = calculateTrend(0, 0)
    expect(t.direction).toBe('none')
  })

  it('rounds percentage to one decimal', () => {
    const t = calculateTrend(110, 100)
    expect(t.pct).toBe(10)
    const t2 = calculateTrend(105, 100)
    expect(t2.pct).toBe(5)
  })

  it('handles negative previous as none', () => {
    const t = calculateTrend(1000, -100)
    expect(t.direction).toBe('none')
  })
})
