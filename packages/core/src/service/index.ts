/**
 * Service layer exports
 *
 * Core service interfaces and builders for content operations
 */

// Main service interface
export type {
  ContentService,
  GetOptions,
  MutationOptions,
  PatchOperation,
  SetOperation,
  UnsetOperation,
  IncrementOperation,
  DecrementOperation,
  SetIfMissingOperation,
  InsertOperation,
  TransactionOperation,
  CreateOperation,
  UpdateOperation,
  PatchOperationBatch,
  DeleteOperation,
  TransactionResult,
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from './ContentService'

// Query builder
export { QueryBuilder } from './QueryBuilder'
export type { QueryExecutor } from './QueryBuilder'

// Mutation builder
export { MutationBuilder } from './MutationBuilder'
export type { MutationExecutor } from './MutationBuilder'
