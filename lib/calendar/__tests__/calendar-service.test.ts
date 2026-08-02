import { describe, expect, it } from 'vitest'
import {
  parseMonthParam,
  buildMonthDates,
  projectRecurringIntoRange,
  groupItemsByDate,
  isOverdue,
} from '../calendar-service'

describe('parseMonthParam', () => {
  it('defaults to the current month', () => {
    const now = new Date('2026-08-02T10:00:00Z')
    const { year, month, start, end, label } = parseMonthParam(null, now)
    expect(year).toBe(2026)
    expect(month).toBe(8)
    expect(label).toBe('2026-08')
    expect(start.toISOString().slice(0, 10)).toBe('2026-08-01')
    expect(end.getDate()).toBe(31)
  })

  it('parses an explicit YYYY-MM param', () => {
    const { year, month, label } = parseMonthParam('2026-02', new Date())
    expect(year).toBe(2026)
    expect(month).toBe(2)
    expect(label).toBe('2026-02')
  })
})

describe('buildMonthDates', () => {
  it('returns 28 days for February 2026', () => {
    const dates = buildMonthDates(2026, 2)
    expect(dates).toHaveLength(28)
    expect(dates[0]).toBe('2026-02-01')
    expect(dates[27]).toBe('2026-02-28')
  })

  it('returns 31 days for August 2026', () => {
    const dates = buildMonthDates(2026, 8)
    expect(dates).toHaveLength(31)
  })
})

describe('projectRecurringIntoRange', () => {
  it('projects a monthly occurrence inside the range', () => {
    const occurrences = projectRecurringIntoRange(
      new Date('2026-08-05T00:00:00Z'),
      'MONTHLY',
      new Date('2026-08-01T00:00:00Z'),
      new Date('2026-08-31T00:00:00Z')
    )
    expect(occurrences.map((d) => d.toISOString().slice(0, 10))).toEqual(['2026-08-05'])
  })

  it('projects multiple weekly occurrences inside the range', () => {
    const occurrences = projectRecurringIntoRange(
      new Date('2026-08-20T00:00:00Z'),
      'WEEKLY',
      new Date('2026-08-01T00:00:00Z'),
      new Date('2026-08-31T00:00:00Z')
    )
    expect(occurrences.map((d) => d.toISOString().slice(0, 10))).toEqual(['2026-08-20', '2026-08-27'])
  })

  it('returns empty when next date is after the range', () => {
    const occurrences = projectRecurringIntoRange(
      new Date('2026-09-05T00:00:00Z'),
      'MONTHLY',
      new Date('2026-08-01T00:00:00Z'),
      new Date('2026-08-31T00:00:00Z')
    )
    expect(occurrences).toHaveLength(0)
  })
})

describe('groupItemsByDate', () => {
  it('groups items by date string', () => {
    const items = [
      { date: '2026-08-05', title: 'a' },
      { date: '2026-08-05', title: 'b' },
      { date: '2026-08-20', title: 'c' },
    ]
    const grouped = groupItemsByDate(items)
    expect(Object.keys(grouped).sort()).toEqual(['2026-08-05', '2026-08-20'])
    expect(grouped['2026-08-05']).toHaveLength(2)
    expect(grouped['2026-08-20'][0].title).toBe('c')
  })
})

describe('isOverdue', () => {
  it('returns true for yesterday and false for tomorrow', () => {
    const today = new Date('2026-08-02T10:00:00Z')
    expect(isOverdue('2026-08-01', today)).toBe(true)
    expect(isOverdue('2026-08-03', today)).toBe(false)
  })
})
