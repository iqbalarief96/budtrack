/**
 * Standardized API Response Helpers
 * Ensures consistent response format across all API routes
 */

import { NextResponse } from 'next/server'
import { HTTP_STATUS, MESSAGES } from './constants'

// Generic API Response Type
export type ApiResponse<T = any> = {
  success: boolean
  data?: T
  error?: string
  message?: string
  meta?: {
    page?: number
    limit?: number
    total?: number
    [key: string]: any
  }
}

/**
 * Success Response
 */
export function successResponse<T>(
  data: T,
  message?: string,
  meta?: ApiResponse['meta'],
  status: number = HTTP_STATUS.OK
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message: message || MESSAGES.SUCCESS,
      ...(meta && { meta }),
    },
    { status }
  )
}

/**
 * Error Response
 */
export function errorResponse(
  error: string,
  status: number = HTTP_STATUS.INTERNAL_ERROR,
  details?: any
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error,
      ...(details && { details }),
    },
    { status }
  )
}

/**
 * Created Response (201)
 */
export function createdResponse<T>(
  data: T,
  message: string = 'Resource created successfully'
): NextResponse<ApiResponse<T>> {
  return successResponse(data, message, undefined, HTTP_STATUS.CREATED)
}

/**
 * Not Found Response (404)
 */
export function notFoundResponse(
  resource: string = 'Resource'
): NextResponse<ApiResponse> {
  return errorResponse(`${resource} not found`, HTTP_STATUS.NOT_FOUND)
}

/**
 * Unauthorized Response (401)
 */
export function unauthorizedResponse(
  message: string = MESSAGES.UNAUTHORIZED
): NextResponse<ApiResponse> {
  return errorResponse(message, HTTP_STATUS.UNAUTHORIZED)
}

/**
 * Bad Request Response (400)
 */
export function badRequestResponse(
  message: string = MESSAGES.BAD_REQUEST,
  details?: any
): NextResponse<ApiResponse> {
  return errorResponse(message, HTTP_STATUS.BAD_REQUEST, details)
}

/**
 * Conflict Response (409)
 */
export function conflictResponse(
  message: string = 'Resource already exists'
): NextResponse<ApiResponse> {
  return errorResponse(message, HTTP_STATUS.CONFLICT)
}

/**
 * Paginated Response
 */
export function paginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  message?: string
): NextResponse<ApiResponse<T[]>> {
  return successResponse(
    data,
    message,
    {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    }
  )
}

/**
 * Validation Error Response
 */
export function validationErrorResponse(
  errors: any[]
): NextResponse<ApiResponse> {
  return errorResponse(
    'Validation failed',
    HTTP_STATUS.BAD_REQUEST,
    { validationErrors: errors }
  )
}

/**
 * Internal Server Error Response
 */
export function internalErrorResponse(
  message: string = MESSAGES.INTERNAL_ERROR,
  error?: any
): NextResponse<ApiResponse> {
  // Log error for debugging (don't send stack trace to client in production)
  if (process.env.NODE_ENV === 'development' && error) {
    console.error('Internal Error:', error)
  }

  return errorResponse(
    message,
    HTTP_STATUS.INTERNAL_ERROR,
    process.env.NODE_ENV === 'development' ? error : undefined
  )
}

/**
 * Handle Zod Validation Errors
 */
export function handleZodError(error: any): NextResponse<ApiResponse> {
  if (error.name === 'ZodError') {
    return validationErrorResponse(error.errors)
  }
  return internalErrorResponse()
}
