/**
 * @contentbridge/sanity
 *
 * Sanity CMS adapter for ContentBridge
 * Provides GROQ query compilation, Portable Text conversion, and unified content operations
 */

// Main adapter
export {
  SanityAdapter,
  createSanityAdapter,
  type SanityAdapterConfig,
} from './SanityAdapter'

// GROQ utilities
export {
  QueryCompiler,
  createGROQCompiler,
  type GROQCompilerConfig,
  type CompiledGROQQuery,
} from './groq'

// Rich text utilities
export {
  PortableTextConverter,
  createPortableTextConverter,
  fromPortableText,
  toPortableText,
} from './richtext'
