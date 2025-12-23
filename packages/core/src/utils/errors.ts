/**
 * Custom error classes for ContentBridge
 *
 * Provides a hierarchy of error types for better error handling
 * and debugging across different CMS adapters and operations.
 */

/**
 * Base error class for all ContentBridge errors
 * Extends native Error with additional context
 */
export class ContentBridgeError extends Error {
  /**
   * Error code for programmatic error handling
   * @example 'QUERY_FAILED', 'MUTATION_TIMEOUT', 'CACHE_MISS'
   */
  public readonly code?: string

  /**
   * Additional context about the error
   * @example { documentId: '123', operation: 'update' }
   */
  public readonly context?: Record<string, unknown>

  /**
   * Original error that caused this error (if any)
   */
  public readonly cause?: Error

  constructor(
    message: string,
    options?: {
      code?: string
      context?: Record<string, unknown>
      cause?: Error
    }
  ) {
    super(message)
    this.name = 'ContentBridgeError'
    this.code = options?.code
    this.context = options?.context
    this.cause = options?.cause

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if ('captureStackTrace' in Error && typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  /**
   * Convert error to JSON for logging/serialization
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      stack: this.stack,
      cause: this.cause
        ? this.cause instanceof ContentBridgeError
          ? this.cause.toJSON()
          : {
              name: this.cause.name,
              message: this.cause.message,
              stack: this.cause.stack,
            }
        : undefined,
    }
  }
}

/**
 * Error thrown during query compilation or execution
 *
 * @example
 * ```typescript
 * throw new QueryError('Invalid filter operator', {
 *   code: 'INVALID_OPERATOR',
 *   context: { operator: 'unknown', field: 'status' }
 * })
 * ```
 */
export class QueryError extends ContentBridgeError {
  constructor(
    message: string,
    options?: {
      code?: string
      context?: Record<string, unknown>
      cause?: Error
    }
  ) {
    super(message, options)
    this.name = 'QueryError'
  }
}

/**
 * Error thrown during mutation operations (create, update, delete)
 *
 * @example
 * ```typescript
 * throw new MutationError('Failed to create document', {
 *   code: 'CREATE_FAILED',
 *   context: { type: 'post', data: {...} },
 *   cause: originalError
 * })
 * ```
 */
export class MutationError extends ContentBridgeError {
  constructor(
    message: string,
    options?: {
      code?: string
      context?: Record<string, unknown>
      cause?: Error
    }
  ) {
    super(message, options)
    this.name = 'MutationError'
  }
}

/**
 * Error thrown during data validation (schema, data, configuration)
 *
 * Note: This is different from the ValidationError interface in the service layer,
 * which is a data structure for validation results. This class is for throwing errors.
 *
 * @example
 * ```typescript
 * throw new DataValidationError('Invalid document structure', {
 *   code: 'SCHEMA_MISMATCH',
 *   context: { expected: 'string', received: 'number', field: 'title' }
 * })
 * ```
 */
export class DataValidationError extends ContentBridgeError {
  /**
   * Array of validation errors for detailed feedback
   */
  public readonly errors?: Array<{
    field: string
    message: string
    code?: string
  }>

  constructor(
    message: string,
    options?: {
      code?: string
      context?: Record<string, unknown>
      cause?: Error
      errors?: Array<{
        field: string
        message: string
        code?: string
      }>
    }
  ) {
    super(message, options)
    this.name = 'DataValidationError'
    this.errors = options?.errors
  }

  /**
   * Convert to JSON with validation errors
   */
  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      errors: this.errors,
    }
  }
}

/**
 * Error thrown by adapter implementations
 *
 * @example
 * ```typescript
 * throw new AdapterError('Sanity API connection failed', {
 *   code: 'CONNECTION_FAILED',
 *   context: { endpoint: 'api.sanity.io', status: 503 }
 * })
 * ```
 */
export class AdapterError extends ContentBridgeError {
  /**
   * Name of the adapter that threw the error
   */
  public readonly adapter?: string

  constructor(
    message: string,
    options?: {
      code?: string
      context?: Record<string, unknown>
      cause?: Error
      adapter?: string
    }
  ) {
    super(message, options)
    this.name = 'AdapterError'
    this.adapter = options?.adapter
  }

  /**
   * Convert to JSON with adapter name
   */
  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      adapter: this.adapter,
    }
  }
}

/**
 * Error thrown during cache operations
 *
 * @example
 * ```typescript
 * throw new CacheError('Cache invalidation failed', {
 *   code: 'INVALIDATION_FAILED',
 *   context: { tags: ['post', 'author-123'] }
 * })
 * ```
 */
export class CacheError extends ContentBridgeError {
  /**
   * Cache operation that failed
   */
  public readonly operation?: 'get' | 'set' | 'delete' | 'invalidate' | 'clear'

  constructor(
    message: string,
    options?: {
      code?: string
      context?: Record<string, unknown>
      cause?: Error
      operation?: 'get' | 'set' | 'delete' | 'invalidate' | 'clear'
    }
  ) {
    super(message, options)
    this.name = 'CacheError'
    this.operation = options?.operation
  }

  /**
   * Convert to JSON with operation
   */
  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      operation: this.operation,
    }
  }
}

/**
 * Type guard to check if an error is a ContentBridge error
 */
export function isContentBridgeError(error: unknown): error is ContentBridgeError {
  return error instanceof ContentBridgeError
}

/**
 * Type guard to check if an error is a specific ContentBridge error type
 */
export function isErrorType<T extends ContentBridgeError>(
  error: unknown,
  ErrorClass: new (...args: unknown[]) => T
): error is T {
  return error instanceof ErrorClass
}

/**
 * Wrap a native error in a ContentBridge error
 * Useful for preserving context when re-throwing errors
 */
export function wrapError(
  error: unknown,
  message?: string,
  options?: {
    code?: string
    context?: Record<string, unknown>
  }
): ContentBridgeError {
  if (error instanceof ContentBridgeError) {
    return error
  }

  const errorMessage =
    message || (error instanceof Error ? error.message : 'Unknown error occurred')

  return new ContentBridgeError(errorMessage, {
    ...options,
    cause: error instanceof Error ? error : undefined,
  })
}
