/**
 * Test helper functions for ContentBridge tests
 *
 * Provides utility functions for common testing scenarios,
 * assertions, and test setup/teardown operations.
 */

import { expect } from 'vitest'
import type { BaseDocument } from '../types/document'
import type { QueryConfig, FilterCondition } from '../types/query'
import type { PatchOperation } from '../service/ContentService'

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Assert that a value is a valid BaseDocument
 */
export function assertIsDocument(value: unknown): asserts value is BaseDocument {
  expect(value).toBeDefined()
  expect(value).toHaveProperty('_id')
  expect(value).toHaveProperty('_type')
  expect(typeof (value as BaseDocument)._id).toBe('string')
  expect(typeof (value as BaseDocument)._type).toBe('string')
}

/**
 * Assert that a query config has specific properties
 */
export function assertQueryConfig<T = unknown>(
  config: QueryConfig<T>,
  expectations: {
    type?: string
    filterCount?: number
    hasLimit?: boolean
    hasOffset?: boolean
    hasOrderBy?: boolean
    hasProjection?: boolean
  }
): void {
  if (expectations.type) {
    expect(config.type).toBe(expectations.type)
  }

  if (expectations.filterCount !== undefined) {
    expect(config.filter).toHaveLength(expectations.filterCount)
  }

  if (expectations.hasLimit !== undefined) {
    if (expectations.hasLimit) {
      expect(config.limit).toBeDefined()
    } else {
      expect(config.limit).toBeUndefined()
    }
  }

  if (expectations.hasOffset !== undefined) {
    if (expectations.hasOffset) {
      expect(config.offset).toBeDefined()
    } else {
      expect(config.offset).toBeUndefined()
    }
  }

  if (expectations.hasOrderBy !== undefined) {
    if (expectations.hasOrderBy) {
      expect(config.orderBy).toBeDefined()
      expect(config.orderBy!.length).toBeGreaterThan(0)
    } else {
      expect(config.orderBy).toBeUndefined()
    }
  }

  if (expectations.hasProjection !== undefined) {
    if (expectations.hasProjection) {
      expect(config.projection).toBeDefined()
    } else {
      expect(config.projection).toBeUndefined()
    }
  }
}

/**
 * Assert that a filter condition matches expected values
 */
export function assertFilterCondition(
  condition: FilterCondition,
  expected: Partial<FilterCondition>
): void {
  if (expected.field !== undefined) {
    expect(condition.field).toBe(expected.field)
  }
  if (expected.operator !== undefined) {
    expect(condition.operator).toBe(expected.operator)
  }
  if (expected.value !== undefined) {
    expect(condition.value).toEqual(expected.value)
  }
}

/**
 * Assert that a patch operation matches expected values
 */
export function assertPatchOperation(
  operation: PatchOperation,
  expected: Partial<PatchOperation>
): void {
  expect(operation.op).toBe(expected.op)
  if ('path' in expected) {
    expect(operation.path).toBe(expected.path)
  }
  if ('value' in expected) {
    expect(operation).toHaveProperty('value')
    expect((operation as { value?: unknown }).value).toEqual(expected.value)
  }
}

// ============================================================================
// Date/Time Helpers
// ============================================================================

/**
 * Create an ISO date string for testing
 */
export function createISODate(daysOffset = 0): string {
  const date = new Date()
  date.setDate(date.getDate() + daysOffset)
  return date.toISOString()
}

/**
 * Check if a date string is valid and recent (within last hour)
 */
export function isRecentDate(dateString: string): boolean {
  const date = new Date(dateString)
  const now = new Date()
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  return date >= hourAgo && date <= now
}

/**
 * Assert that a date string is valid ISO format
 */
export function assertValidISODate(dateString: string): void {
  expect(dateString).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
  expect(new Date(dateString).toISOString()).toBe(dateString)
}

// ============================================================================
// Array Helpers
// ============================================================================

/**
 * Check if an array contains an item matching a predicate
 */
export function arrayContains<T>(
  array: T[],
  predicate: (item: T) => boolean
): boolean {
  return array.some(predicate)
}

/**
 * Assert that an array contains an item matching a predicate
 */
export function assertArrayContains<T>(
  array: T[],
  predicate: (item: T) => boolean,
  message = 'Array does not contain matching item'
): void {
  expect(arrayContains(array, predicate), message).toBe(true)
}

/**
 * Assert that an array has unique values
 */
export function assertArrayUnique<T>(
  array: T[],
  key?: keyof T
): void {
  const values = key ? array.map((item) => item[key]) : array
  const uniqueValues = new Set(values)
  expect(uniqueValues.size).toBe(array.length)
}

// ============================================================================
// Object Helpers
// ============================================================================

/**
 * Deep clone an object for testing
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * Check if two objects are deeply equal
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

/**
 * Assert that an object has all required keys
 */
export function assertHasKeys<T extends object>(
  obj: T,
  keys: (keyof T)[]
): void {
  keys.forEach((key) => {
    expect(obj).toHaveProperty(key as string)
  })
}

/**
 * Assert that an object does not have any of the specified keys
 */
export function assertMissingKeys<T extends object>(
  obj: T,
  keys: (keyof T)[]
): void {
  keys.forEach((key) => {
    expect(obj).not.toHaveProperty(key as string)
  })
}

// ============================================================================
// Async Helpers
// ============================================================================

/**
 * Wait for a specified number of milliseconds
 */
export async function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Retry an async function until it succeeds or max attempts reached
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delayMs = 100
): Promise<T> {
  let lastError: Error | undefined
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      if (i < maxAttempts - 1) {
        await wait(delayMs)
      }
    }
  }
  throw lastError
}

/**
 * Assert that an async function throws an error
 */
export async function assertThrowsAsync(
  fn: () => Promise<unknown>,
  errorMessage?: string | RegExp
): Promise<void> {
  let error: Error | undefined
  try {
    await fn()
  } catch (e) {
    error = e as Error
  }

  expect(error).toBeDefined()

  if (errorMessage) {
    if (typeof errorMessage === 'string') {
      expect(error!.message).toContain(errorMessage)
    } else {
      expect(error!.message).toMatch(errorMessage)
    }
  }
}

// ============================================================================
// Mock Helpers
// ============================================================================

/**
 * Create a spy function that tracks calls
 */
export function createSpy<TArgs extends unknown[], TReturn>(
  implementation?: (...args: TArgs) => TReturn
): {
  fn: (...args: TArgs) => TReturn
  calls: TArgs[]
  callCount: number
  reset: () => void
} {
  const calls: TArgs[] = []

  const fn = (...args: TArgs): TReturn => {
    calls.push(args)
    if (implementation) {
      return implementation(...args)
    }
    return undefined as TReturn
  }

  return {
    fn,
    calls,
    get callCount() {
      return calls.length
    },
    reset() {
      calls.length = 0
    },
  }
}

/**
 * Create a mock logger that captures log messages
 */
export function createMockLogger(): {
  debug: (message: string, ...args: unknown[]) => void
  info: (message: string, ...args: unknown[]) => void
  warn: (message: string, ...args: unknown[]) => void
  error: (message: string, ...args: unknown[]) => void
  messages: { level: string; message: string; args: unknown[] }[]
  reset: () => void
} {
  const messages: { level: string; message: string; args: unknown[] }[] = []

  const createLogFn = (level: string) => (message: string, ...args: unknown[]) => {
    messages.push({ level, message, args })
  }

  return {
    debug: createLogFn('debug'),
    info: createLogFn('info'),
    warn: createLogFn('warn'),
    error: createLogFn('error'),
    messages,
    reset() {
      messages.length = 0
    },
  }
}

// ============================================================================
// ID Generation Helpers
// ============================================================================

/**
 * Generate a random test ID
 */
export function generateTestId(prefix = 'test'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Generate multiple test IDs
 */
export function generateTestIds(count: number, prefix = 'test'): string[] {
  return Array.from({ length: count }, () => generateTestId(prefix))
}
