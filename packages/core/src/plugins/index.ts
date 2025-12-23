/**
 * Plugin system for ContentBridge
 *
 * Allows extending ContentBridge functionality with custom hooks,
 * operators, and blocks.
 *
 * @example
 * ```typescript
 * import { PluginRegistry, createPlugin } from '@contentbridge/core/plugins'
 * import { loggingPlugin, validationPlugin } from '@contentbridge/core/plugins/builtin'
 *
 * // Create registry
 * const registry = new PluginRegistry({
 *   adapter: sanityAdapter,
 *   config: { projectId: 'abc123' }
 * })
 *
 * // Register built-in plugins
 * await registry.register(loggingPlugin)
 * await registry.register(validationPlugin)
 *
 * // Create custom plugin
 * const myPlugin = createPlugin({
 *   name: 'my-plugin',
 *   version: '1.0.0',
 *   async onBeforeQuery(query) {
 *     console.log('Query:', query)
 *     return {}
 *   }
 * })
 *
 * await registry.register(myPlugin)
 * ```
 */

// Core plugin types and interfaces
export type {
  ContentBridgePlugin,
  PluginContext,
  QueryHookResult,
  MutationHookResult,
  CustomBlockDefinition,
  CustomOperator,
  PluginConfig,
  PluginNames,
} from './Plugin'

export { isContentBridgePlugin } from './Plugin'

// Plugin registry
export {
  PluginRegistry,
  type PluginRegistryConfig,
} from './PluginRegistry'

// Plugin utilities
export {
  createPlugin,
  composePlugins,
  createConditionalPlugin,
  createEnvironmentPlugin,
  type CreatePluginOptions,
  type TypedPluginConfig,
  type ExtractPlugin,
  type PluginNamesFromArray,
} from './utils'

// Built-in plugins
export * from './builtin'
