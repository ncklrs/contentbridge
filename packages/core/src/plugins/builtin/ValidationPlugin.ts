/**
 * ValidationPlugin - Built-in plugin for document validation
 *
 * Validates documents before mutations using configurable rules.
 * Prevents invalid data from being saved to the CMS.
 */

import { createPlugin } from '../utils'
import type { BaseDocument } from '../../types/document'
import type { ValidationError } from '../../service/ContentService'

/**
 * Validation rule function
 */
export type ValidationRule<T extends BaseDocument = BaseDocument> = (
  document: Partial<T>,
  context: { type: string }
) => ValidationError[] | Promise<ValidationError[]>

/**
 * Validation plugin configuration
 */
export interface ValidationPluginOptions {
  /**
   * Validation rules by document type
   * @example
   * ```typescript
   * {
   *   post: [
   *     async (doc) => {
   *       const errors = []
   *       if (!doc.title) {
   *         errors.push({
   *           path: 'title',
   *           message: 'Title is required',
   *           rule: 'required'
   *         })
   *       }
   *       return errors
   *     }
   *   ]
   * }
   * ```
   */
  rules?: Record<string, ValidationRule[]>

  /**
   * Prevent mutations if validation fails
   * @default true
   */
  strict?: boolean

  /**
   * Global rules applied to all document types
   */
  globalRules?: ValidationRule[]
}

/**
 * Common validation helpers
 */
export const validationHelpers = {
  /**
   * Validate required field
   */
  required<T extends BaseDocument>(field: keyof T, message?: string): ValidationRule<T> {
    return (doc) => {
      const value = doc[field]
      if (value === undefined || value === null || value === '') {
        return [
          {
            path: String(field),
            message: message ?? `${String(field)} is required`,
            rule: 'required',
            expected: 'non-empty value',
            actual: value,
          },
        ]
      }
      return []
    }
  },

  /**
   * Validate minimum length
   */
  minLength<T extends BaseDocument>(
    field: keyof T,
    min: number,
    message?: string
  ): ValidationRule<T> {
    return (doc) => {
      const value = doc[field]
      if (typeof value === 'string' && value.length < min) {
        return [
          {
            path: String(field),
            message: message ?? `${String(field)} must be at least ${min} characters`,
            rule: 'minLength',
            expected: `length >= ${min}`,
            actual: value.length,
          },
        ]
      }
      return []
    }
  },

  /**
   * Validate maximum length
   */
  maxLength<T extends BaseDocument>(
    field: keyof T,
    max: number,
    message?: string
  ): ValidationRule<T> {
    return (doc) => {
      const value = doc[field]
      if (typeof value === 'string' && value.length > max) {
        return [
          {
            path: String(field),
            message: message ?? `${String(field)} must be at most ${max} characters`,
            rule: 'maxLength',
            expected: `length <= ${max}`,
            actual: value.length,
          },
        ]
      }
      return []
    }
  },

  /**
   * Validate pattern (regex)
   */
  pattern<T extends BaseDocument>(
    field: keyof T,
    pattern: RegExp,
    message?: string
  ): ValidationRule<T> {
    return (doc) => {
      const value = doc[field]
      if (typeof value === 'string' && !pattern.test(value)) {
        return [
          {
            path: String(field),
            message: message ?? `${String(field)} does not match required pattern`,
            rule: 'pattern',
            expected: pattern.toString(),
            actual: value,
          },
        ]
      }
      return []
    }
  },

  /**
   * Validate email format
   */
  email<T extends BaseDocument>(field: keyof T, message?: string): ValidationRule<T> {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return validationHelpers.pattern(
      field,
      emailPattern,
      message ?? `${String(field)} must be a valid email`
    )
  },

  /**
   * Validate URL format
   */
  url<T extends BaseDocument>(field: keyof T, message?: string): ValidationRule<T> {
    return (doc) => {
      const value = doc[field]
      if (typeof value === 'string') {
        try {
          new URL(value)
          return []
        } catch {
          return [
            {
              path: String(field),
              message: message ?? `${String(field)} must be a valid URL`,
              rule: 'url',
              expected: 'valid URL',
              actual: value,
            },
          ]
        }
      }
      return []
    }
  },

  /**
   * Validate custom rule
   */
  custom<T extends BaseDocument>(
    field: keyof T,
    validate: (value: unknown) => boolean,
    message: string
  ): ValidationRule<T> {
    return (doc) => {
      const value = doc[field]
      if (!validate(value)) {
        return [
          {
            path: String(field),
            message,
            rule: 'custom',
            actual: value,
          },
        ]
      }
      return []
    }
  },
}

/**
 * Create a validation plugin
 *
 * @param options - Validation configuration
 * @returns Validation plugin
 *
 * @example
 * ```typescript
 * import { createValidationPlugin, validationHelpers } from '@contentbridge/core/plugins'
 *
 * const validationPlugin = createValidationPlugin({
 *   strict: true,
 *   rules: {
 *     post: [
 *       validationHelpers.required('title'),
 *       validationHelpers.minLength('title', 5),
 *       validationHelpers.maxLength('title', 100),
 *       async (doc) => {
 *         // Custom async validation
 *         const exists = await checkSlugExists(doc.slug)
 *         if (exists) {
 *           return [{
 *             path: 'slug',
 *             message: 'Slug already exists',
 *             rule: 'unique'
 *           }]
 *         }
 *         return []
 *       }
 *     ]
 *   }
 * })
 *
 * await registry.register(validationPlugin)
 * ```
 */
export function createValidationPlugin(options: ValidationPluginOptions = {}) {
  const { rules = {}, strict = true, globalRules = [] } = options

  return createPlugin({
    name: 'validation',
    version: '1.0.0',
    description: 'Validates documents before mutations',
    author: 'ContentBridge',
    priority: 100, // Run early to catch errors

    onInit(context) {
      const typeCount = Object.keys(rules).length
      const globalCount = globalRules.length
      context.logger.info('Validation plugin initialized', {
        documentTypes: typeCount,
        globalRules: globalCount,
        strict,
      })
    },

    async onBeforeMutation(operation, context) {
      // Only validate create and update operations
      if (operation.type !== 'create' && operation.type !== 'update') {
        return {}
      }

      const document = 'document' in operation ? operation.document : undefined
      if (!document) {
        return {}
      }

      const docType = (document as BaseDocument)._type
      if (!docType) {
        context.logger.warn('Cannot validate document without _type')
        return {}
      }

      // Collect all rules for this document type
      const typeRules = rules[docType] ?? []
      const allRules = [...globalRules, ...typeRules]

      if (allRules.length === 0) {
        return {}
      }

      // Execute all validation rules
      const errors: ValidationError[] = []
      for (const rule of allRules) {
        try {
          const ruleErrors = await rule(document as any, { type: docType })
          errors.push(...ruleErrors)
        } catch (error) {
          context.logger.error(`Validation rule failed for ${docType}`, error as Error)
          if (strict) {
            errors.push({
              path: '_validation',
              message: 'Internal validation error',
              rule: 'internal',
            })
          }
        }
      }

      // If strict mode and errors exist, skip mutation
      if (strict && errors.length > 0) {
        context.logger.warn('Validation failed, skipping mutation', {
          type: docType,
          errors: errors.map(e => ({ path: e.path, message: e.message })),
        })
        return { skip: true }
      }

      // Log warnings for non-strict mode
      if (!strict && errors.length > 0) {
        context.logger.warn('Validation warnings (non-strict mode)', {
          type: docType,
          errors: errors.map(e => ({ path: e.path, message: e.message })),
        })
      }

      return {}
    },

    async onValidate(document, context) {
      const docType = document._type
      if (!docType) {
        return {
          valid: false,
          errors: [
            {
              path: '_type',
              message: 'Document type is required',
              rule: 'required',
            },
          ],
        }
      }

      // Collect all rules
      const typeRules = rules[docType] ?? []
      const allRules = [...globalRules, ...typeRules]

      if (allRules.length === 0) {
        return { valid: true }
      }

      // Execute all validation rules
      const errors: ValidationError[] = []
      for (const rule of allRules) {
        try {
          const ruleErrors = await rule(document as any, { type: docType })
          errors.push(...ruleErrors)
        } catch (error) {
          context.logger.error(`Validation rule failed for ${docType}`, error as Error)
          errors.push({
            path: '_validation',
            message: 'Internal validation error',
            rule: 'internal',
          })
        }
      }

      return {
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
      }
    },
  })
}

/**
 * Default validation plugin instance (no rules)
 */
export const validationPlugin = createValidationPlugin()
