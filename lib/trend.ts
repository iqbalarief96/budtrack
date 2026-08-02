export type TrendDirection = 'up' | 'down' | 'flat' | 'none'

export type TrendResult = {
  /** Percentage change rounded to 1 decimal (e.g. -43.9). Null when not computable. */
  pct: number | null
  direction: TrendDirection
}

/**
 * Calculate month-over-month trend between two values.
 * - previous <= 0 -> 'none' (no meaningful baseline)
 * - equal -> 'flat'
 * - otherwise 'up'/'down' with signed pct.
 */
export function calculateTrend(current: number, previous: number): TrendResult {
  if (previous <= 0) return { pct: null, direction: 'none' }
  if (current === previous) return { pct: 0, direction: 'flat' }
  const ratio = (current - previous) / previous
  const pct = Math.round(ratio * 1000) / 10
  return { pct, direction: current > previous ? 'up' : 'down' }
}
