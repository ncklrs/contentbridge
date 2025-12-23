/**
 * Core document types - CMS-agnostic interfaces
 *
 * These types represent the "contract" that any CMS adapter must map to.
 * They're designed to accommodate common patterns across Sanity, Contentful,
 * Payload, Strapi, and other headless CMSs.
 */

// ============================================================================
// Base Types
// ============================================================================

/**
 * Base document interface - all CMS documents extend this
 */
export interface BaseDocument {
  /** Unique identifier */
  _id: string
  /** Document type/content type */
  _type: string
  /** Creation timestamp (ISO 8601) */
  _createdAt?: string
  /** Last update timestamp (ISO 8601) */
  _updatedAt?: string
  /** Revision identifier for optimistic locking */
  _rev?: string
}

/**
 * Localized field wrapper for i18n support
 *
 * @example
 * ```typescript
 * interface Post extends BaseDocument {
 *   title: LocalizedField<string>
 * }
 * // { title: { en: 'Hello', es: 'Hola' } }
 * ```
 */
export interface LocalizedField<T> {
  [locale: string]: T
}

/**
 * Reference to another document (unresolved)
 *
 * @example
 * ```typescript
 * { _ref: 'author-123', _type: 'reference' }
 * ```
 */
export interface DocumentReference<TTargetType extends string = string> {
  _ref: string
  _type: 'reference'
  /** Weak references don't prevent deletion */
  _weak?: boolean
  /** Type hint for the referenced document */
  _targetType?: TTargetType
}

/**
 * Resolved reference with actual document data
 */
export interface ResolvedReference<T extends BaseDocument = BaseDocument> {
  _ref: string
  _resolved: T
}

/**
 * Check if a value is a document reference
 */
export function isDocumentReference(value: unknown): value is DocumentReference {
  return (
    typeof value === 'object' &&
    value !== null &&
    '_ref' in value &&
    '_type' in value &&
    (value as DocumentReference)._type === 'reference'
  )
}

/**
 * Check if a reference is resolved
 */
export function isResolvedReference<T extends BaseDocument>(
  value: unknown
): value is ResolvedReference<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    '_ref' in value &&
    '_resolved' in value
  )
}

// ============================================================================
// Common Field Types
// ============================================================================

/**
 * Slug field type - URL-safe identifier
 */
export interface Slug {
  _type: 'slug'
  current: string
}

/**
 * Geopoint for location data
 */
export interface Geopoint {
  _type: 'geopoint'
  lat: number
  lng: number
  alt?: number
}

/**
 * Date range for events, availability, etc.
 */
export interface DateRange {
  start: string  // ISO 8601
  end?: string   // ISO 8601
}

/**
 * Generic key-value metadata
 */
export type Metadata = Record<string, unknown>

// ============================================================================
// Schema Definition Types (for type generation)
// ============================================================================

/**
 * Document schema definition
 * Used to generate TypeScript types from CMS schemas
 */
export interface DocumentSchema {
  name: string
  type: 'document' | 'object'
  title?: string
  description?: string
  fields: FieldDefinition[]
  preview?: PreviewConfig
  orderings?: OrderingConfig[]
  /** Custom fieldsets for Studio organization */
  fieldsets?: Fieldset[]
  /** Initial value template */
  initialValue?: Record<string, unknown> | (() => Record<string, unknown>)
}

export interface FieldDefinition {
  name: string
  type: FieldType
  title?: string
  description?: string
  /** Whether field is hidden in Studio */
  hidden?: boolean | ((context: unknown) => boolean)
  /** Whether field is read-only */
  readOnly?: boolean | ((context: unknown) => boolean)
  /** Validation rules */
  validation?: ValidationRule[]
  /** Field-specific options */
  options?: FieldOptions
  /** For array fields: what types can be in the array */
  of?: FieldDefinition[]
  /** For reference fields: what types can be referenced */
  to?: Array<{ type: string }>
  /** For object fields: nested field definitions */
  fields?: FieldDefinition[]
  /** Fieldset grouping */
  fieldset?: string
  /** Whether field is required */
  required?: boolean
}

/**
 * Alias for FieldDefinition - used by type generators
 */
export type FieldSchema = FieldDefinition

export type FieldType =
  | 'string'
  | 'text'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'url'
  | 'email'
  | 'slug'
  | 'image'
  | 'file'
  | 'geopoint'
  | 'reference'
  | 'array'
  | 'object'
  | 'block'      // Rich text
  | 'markdown'   // Markdown text
  | 'json'       // Raw JSON
  | 'color'      // Color picker
  | 'code'       // Code block

export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'length' | 'regex' | 'unique' | 'custom'
  value?: unknown
  message?: string
}

export interface FieldOptions {
  /** For string: predefined list of values */
  list?: Array<string | { title: string; value: string }>
  /** For string: layout as radio or dropdown */
  layout?: 'radio' | 'dropdown'
  /** For slug: source field for auto-generation */
  source?: string
  /** For slug: max length */
  maxLength?: number
  /** For image: accepted file types */
  accept?: string
  /** For image: hotspot and crop enabled */
  hotspot?: boolean
  /** For reference: filter to specific documents */
  filter?: string
  /** For array: sortable */
  sortable?: boolean
  /** For array: collapsible items */
  collapsible?: boolean
  /** Custom options */
  [key: string]: unknown
}

export interface PreviewConfig {
  select: Record<string, string>
  prepare?: (selection: Record<string, unknown>) => {
    title?: string
    subtitle?: string
    media?: unknown
  }
}

export interface OrderingConfig {
  title: string
  name: string
  by: Array<{ field: string; direction: 'asc' | 'desc' }>
}

export interface Fieldset {
  name: string
  title: string
  options?: {
    collapsible?: boolean
    collapsed?: boolean
    columns?: number
  }
}

// ============================================================================
// Type Inference Utilities
// ============================================================================

/**
 * Extract document type from schema
 * This is used by type generators to create TypeScript types
 */
export type SchemaToType<TSchema extends DocumentSchema> = BaseDocument & {
  _type: TSchema['name']
} & FieldsToType<TSchema['fields']>

/**
 * Convert field definitions to TypeScript types
 */
export type FieldsToType<TFields extends FieldDefinition[]> = {
  [K in TFields[number] as K['name']]: FieldToType<K>
}

/**
 * Convert a single field definition to its TypeScript type
 */
export type FieldToType<TField extends FieldDefinition> =
  TField['type'] extends 'string' | 'text' | 'url' | 'email' | 'markdown' ? string :
  TField['type'] extends 'number' ? number :
  TField['type'] extends 'boolean' ? boolean :
  TField['type'] extends 'date' | 'datetime' ? string :
  TField['type'] extends 'slug' ? Slug :
  TField['type'] extends 'geopoint' ? Geopoint :
  TField['type'] extends 'reference' ? DocumentReference :
  TField['type'] extends 'image' | 'file' ? unknown :  // Handled by media types
  TField['type'] extends 'array' ? unknown[] :
  TField['type'] extends 'object' ? Record<string, unknown> :
  TField['type'] extends 'block' ? unknown[] :  // Handled by richtext types
  TField['type'] extends 'json' ? unknown :
  unknown
