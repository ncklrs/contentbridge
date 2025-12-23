/**
 * @contentbridge/payload
 *
 * Payload CMS adapter for ContentBridge
 * Provides REST/Local API integration, query compilation, and Slate rich text conversion
 */

// Main adapter
export {
  PayloadAdapter,
  createPayloadAdapter,
  type PayloadAdapterConfig,
  type PayloadAPIMode,
} from './PayloadAdapter'

// Query utilities
export {
  QueryCompiler,
  createQueryCompiler,
  type PayloadQueryConfig,
  type CompiledPayloadQuery,
} from './query'

// Rich text utilities
export {
  SlateConverter,
  createSlateConverter,
  fromSlate,
  toSlate,
} from './richtext'
