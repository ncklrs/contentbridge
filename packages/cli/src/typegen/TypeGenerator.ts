/**
 * Type Generator
 *
 * Abstract base class for generating TypeScript types and Zod schemas
 * from CMS schemas
 */

import type {
  DocumentSchema,
  FieldSchema,
  BaseAdapter,
  GeneratedTypes,
  TypeGenerationOptions
} from '@contentbridge/core'
import type { ContentBridgeConfig } from '../config/loader.js'

/**
 * Type Generator class
 *
 * Handles type generation from CMS schemas for different adapters
 */
export class TypeGenerator {
  private adapter: BaseAdapter

  private constructor(adapter: BaseAdapter) {
    this.adapter = adapter
  }

  /**
   * Create a TypeGenerator instance for a specific adapter
   *
   * @param adapterName - Name of the adapter (sanity, payload, contentful, strapi)
   * @param config - ContentBridge configuration
   * @returns TypeGenerator instance
   */
  static async create(
    adapterName: string,
    config: ContentBridgeConfig
  ): Promise<TypeGenerator> {
    let adapter: BaseAdapter

    // If adapter instance is provided in config, use it
    if (config.adapter && typeof config.adapter === 'object') {
      adapter = config.adapter
    } else {
      // Otherwise, dynamically import the adapter
      adapter = await this.loadAdapter(adapterName, config)
    }

    await adapter.initialize()

    return new TypeGenerator(adapter)
  }

  /**
   * Dynamically load an adapter by name
   */
  private static async loadAdapter(
    adapterName: string,
    config: ContentBridgeConfig
  ): Promise<BaseAdapter> {
    const adapterMap: Record<string, string> = {
      sanity: '@contentbridge/sanity',
      payload: '@contentbridge/payload',
      contentful: '@contentbridge/contentful',
      strapi: '@contentbridge/strapi',
    }

    const packageName = adapterMap[adapterName]
    if (!packageName) {
      throw new Error(
        `Unknown adapter: ${adapterName}\n` +
        `Supported adapters: ${Object.keys(adapterMap).join(', ')}`
      )
    }

    try {
      const adapterModule = await import(packageName)
      const AdapterClass = adapterModule.default || adapterModule[`${capitalize(adapterName)}Adapter`]

      if (!AdapterClass) {
        throw new Error(`Could not find adapter class in ${packageName}`)
      }

      // Create adapter instance with config
      // This assumes adapters accept configuration in their constructor
      return new AdapterClass(config)
    } catch (error) {
      if (error instanceof Error && error.message.includes('Cannot find module')) {
        throw new Error(
          `Adapter package not found: ${packageName}\n` +
          `Install it with: npm install ${packageName}`
        )
      }
      throw error
    }
  }

  /**
   * Get schemas from the CMS
   *
   * @returns Array of document schemas
   */
  async getSchemas(): Promise<DocumentSchema[]> {
    // This would typically call adapter-specific methods to fetch schemas
    // For now, we'll throw an error indicating this needs adapter support

    // Check if adapter has a getSchemas method
    if ('getSchemas' in this.adapter && typeof this.adapter.getSchemas === 'function') {
      return (this.adapter as any).getSchemas()
    }

    throw new Error(
      `Schema fetching not yet implemented for ${this.adapter.name} adapter.\n` +
      'Please ensure your adapter implements the getSchemas() method.'
    )
  }

  /**
   * Generate TypeScript types from schemas
   *
   * @param schemas - Document schemas to generate types for
   * @param options - Type generation options
   * @returns Generated TypeScript code
   */
  async generateTypes(
    schemas: DocumentSchema[],
    options: TypeGenerationOptions = {}
  ): Promise<GeneratedTypes> {
    return this.adapter.generateTypes(schemas, options)
  }

  /**
   * Generate Zod schemas from CMS schemas
   *
   * @param schemas - Document schemas to generate Zod schemas for
   * @param options - Generation options
   * @returns Generated Zod schema code
   */
  async generateZodSchemas(
    schemas: DocumentSchema[],
    options: TypeGenerationOptions = {}
  ): Promise<string> {
    return this.adapter.generateZodSchemas(schemas, options)
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.adapter.cleanup()
  }
}

/**
 * Capitalize first letter of a string
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Base type generator utilities
 *
 * Helper functions for converting CMS field types to TypeScript types
 */
export class TypeGeneratorUtils {
  /**
   * Convert a field schema to a TypeScript type string
   */
  static fieldToTypeString(field: FieldSchema): string {
    const baseType = this.getBaseType(field)
    return field.required ? baseType : `${baseType} | undefined`
  }

  /**
   * Get base TypeScript type for a field
   */
  private static getBaseType(field: FieldSchema): string {
    switch (field.type) {
      case 'string':
      case 'text':
      case 'url':
      case 'email':
      case 'markdown':
        return 'string'
      case 'number':
        return 'number'
      case 'boolean':
        return 'boolean'
      case 'date':
      case 'datetime':
        return 'string' // ISO date string
      case 'array':
        if (field.of && Array.isArray(field.of)) {
          const itemType = field.of.length > 0 ? this.getBaseType(field.of[0]) : 'unknown'
          return `${itemType}[]`
        }
        return 'unknown[]'
      case 'object':
        return field.name ? field.name : 'Record<string, unknown>'
      case 'reference':
        return field.to ? `{ _type: 'reference'; _ref: string }` : 'unknown'
      case 'image':
      case 'file':
        return 'MediaAsset'
      case 'block':
        return 'RichTextContent'
      default:
        return 'unknown'
    }
  }

  /**
   * Convert a field schema to a Zod schema string
   */
  static fieldToZodString(field: FieldSchema): string {
    const baseSchema = this.getBaseZodSchema(field)
    return field.required ? baseSchema : `${baseSchema}.optional()`
  }

  /**
   * Get base Zod schema for a field
   */
  private static getBaseZodSchema(field: FieldSchema): string {
    switch (field.type) {
      case 'string':
      case 'text':
      case 'url':
      case 'email':
      case 'markdown':
        return 'z.string()'
      case 'number':
        return 'z.number()'
      case 'boolean':
        return 'z.boolean()'
      case 'date':
      case 'datetime':
        return 'z.string().datetime()'
      case 'array':
        if (field.of && Array.isArray(field.of)) {
          const itemSchema = field.of.length > 0 ? this.getBaseZodSchema(field.of[0]) : 'z.unknown()'
          return `z.array(${itemSchema})`
        }
        return 'z.array(z.unknown())'
      case 'object':
        return 'z.record(z.unknown())'
      case 'reference':
        return 'z.object({ _type: z.literal("reference"), _ref: z.string() })'
      case 'image':
      case 'file':
        return 'z.custom<MediaAsset>()'
      case 'block':
        return 'z.custom<RichTextContent>()'
      default:
        return 'z.unknown()'
    }
  }

  /**
   * Generate a TypeScript interface from a document schema
   */
  static generateInterface(schema: DocumentSchema): string {
    const fields = schema.fields
      .map((field: FieldSchema) => {
        const typeStr = this.fieldToTypeString(field)
        const optional = field.required ? '' : '?'
        const description = field.description ? `  /** ${field.description} */\n` : ''
        return `${description}  ${field.name}${optional}: ${typeStr}`
      })
      .join('\n')

    const description = schema.description
      ? `/**\n * ${schema.description}\n */\n`
      : ''

    return `${description}export interface ${schema.name} extends BaseDocument {\n  _type: '${schema.type}'\n${fields}\n}`
  }

  /**
   * Generate a Zod schema from a document schema
   */
  static generateZodSchema(schema: DocumentSchema): string {
    const fields = schema.fields
      .map((field: FieldSchema) => {
        const schemaStr = this.fieldToZodString(field)
        return `  ${field.name}: ${schemaStr}`
      })
      .join(',\n')

    return `export const ${schema.name}Schema = z.object({\n  _type: z.literal('${schema.type}'),\n${fields}\n})`
  }
}
