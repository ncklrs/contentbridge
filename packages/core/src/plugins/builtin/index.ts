/**
 * Built-in plugins for ContentBridge
 *
 * These plugins provide common functionality out of the box.
 */

// Logging plugin
export {
  createLoggingPlugin,
  loggingPlugin,
  type LoggingPluginOptions,
} from './LoggingPlugin'

// Validation plugin
export {
  createValidationPlugin,
  validationPlugin,
  validationHelpers,
  type ValidationPluginOptions,
  type ValidationRule,
} from './ValidationPlugin'

// Cache plugin
export {
  createCachePlugin,
  createMemoryCachePlugin,
  type CachePluginOptions,
} from './CachePlugin'
