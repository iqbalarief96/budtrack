/**
 * Pagination Utilities
 * Helper functions for consistent pagination across API routes
 */

import { PAGINATION } from './constants'

export type PaginationParams = {
  page: number
  limit: number
  offset: number
}

export type PaginationMeta = {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

/**
 * Parse pagination parameters from URL search params
 */
export function parsePaginationParams(searchParams: URLSearchParams): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))

  let limit = parseInt(searchParams.get('limit') || String(PAGINATION.DEFAULT_LIMIT), 10)

  // Handle "all" (-1) case
  if (limit === -1) {
    return { page: 1, limit: -1, offset: 0 }
  }

  // Apply limits for normal pagination
  limit = Math.min(
    PAGINATION.MAX_LIMIT,
    Math.max(1, limit)
  )

  const offset = (page - 1) * limit

  return { page, limit, offset }
}

/**
 * Create pagination metadata
 */
export function createPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit)
  const hasNext = page < totalPages
  const hasPrev = page > 1

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext,
    hasPrev,
  }
}

/**
 * Get Prisma skip and take values from pagination params
 */
export function getPrismaSkipTake(params: PaginationParams) {
  return {
    skip: params.offset,
    take: params.limit,
  }
}

/**
 * Validate pagination parameters
 */
export function validatePaginationParams(
  page?: number,
  limit?: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (page !== undefined) {
    if (page < 1) {
      errors.push('Page must be greater than 0')
    }
    if (!Number.isInteger(page)) {
      errors.push('Page must be an integer')
    }
  }

  if (limit !== undefined) {
    if (limit < 1) {
      errors.push('Limit must be greater than 0')
    }
    if (limit > PAGINATION.MAX_LIMIT) {
      errors.push(`Limit must not exceed ${PAGINATION.MAX_LIMIT}`)
    }
    if (!Number.isInteger(limit)) {
      errors.push('Limit must be an integer')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Calculate pagination range for UI display
 * Example: [1, 2, 3, '...', 10] for page 2 of 10
 */
export function getPaginationRange(
  currentPage: number,
  totalPages: number,
  delta: number = 2
): (number | string)[] {
  const range: number[] = []
  const rangeWithDots: (number | string)[] = []
  let l: number | undefined

  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - delta && i <= currentPage + delta)
    ) {
      range.push(i)
    }
  }

  for (const i of range) {
    if (l) {
      if (i - l === 2) {
        rangeWithDots.push(l + 1)
      } else if (i - l !== 1) {
        rangeWithDots.push('...')
      }
    }
    rangeWithDots.push(i)
    l = i as number
  }

  return rangeWithDots
}
