/**
 * @contentbridge/strapi
 *
 * Strapi CMS adapter for ContentBridge
 * Provides REST API query compilation, Blocks rich text conversion, and unified content operations
 */

// Main adapter
export {
  StrapiAdapter,
  createStrapiAdapter,
  type StrapiAdapterConfig,
} from './StrapiAdapter'

// Query utilities
export {
  QueryCompiler,
  createQueryCompiler,
  type QueryCompilerConfig,
  type CompiledStrapiQuery,
} from './query'

// Rich text utilities
export {
  BlocksConverter,
  createBlocksConverter,
  fromBlocks,
  toBlocks,
} from './richtext'
