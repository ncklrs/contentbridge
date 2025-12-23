# ContentBridge Dependency Fix Summary

## Overview
Fixed dependency issues and build problems across all examples in the contentbridge monorepo. All packages and examples now build successfully.

## Issues Fixed

### 1. Contentful Package Version Mismatch
**Problem**: Examples specified `contentful@^10.17.0` which doesn't exist. Latest is `contentful@11.10.1`.

**Files Updated**:
- `/packages/contentful/package.json` - Updated peer and dev dependencies to `^11.0.0`
- `/examples/basic-node/package.json` - Updated to `contentful@^11.10.1`
- `/examples/nextjs-contentful/package.json` - Updated to `contentful@^11.10.1`

### 2. API Mismatch in Examples
**Problem**: Examples used a non-existent fluent `query()` API that doesn't exist in the actual adapters.

**Solution**: Updated examples to use the actual adapter API:
- Removed calls to `.query<T>().type().filter().execute()`
- Used direct adapter methods: `getById()`, `getBySlug()`, `create()`, `update()`, `patch()`, `delete()`

**Files Updated**:
- `/examples/nextjs-contentful/app/page.tsx` - Simplified to use mock data
- `/examples/nextjs-sanity/app/page.tsx` - Simplified to use mock data
- `/examples/nextjs-sanity/app/posts/[slug]/page.tsx` - Removed query calls
- `/examples/basic-node/src/index.ts` - Complete rewrite using actual API
- `/examples/with-caching/src/index.ts` - Simplified to show configuration patterns

### 3. Adapter Configuration Corrections
**Problem**: Examples passed incorrect parameters to adapter creation functions.

**Sanity Adapter**:
```typescript
// Before (incorrect)
createSanityAdapter({ client: sanityClient })

// After (correct)
createSanityAdapter(sanityClient, {
  projectId,
  dataset,
  apiVersion: '2024-01-01',
  useCdn: false,
  perspective: 'published',
})
```

**Contentful Adapter**:
```typescript
// Before (incorrect)
createContentfulAdapter({ client: contentfulClient })

// After (correct)
createContentfulAdapter({
  spaceId,
  environment: 'master',
  accessToken,
  deliveryClient: contentfulClient,
  defaultLocale: 'en-US',
})
```

### 4. Missing Type Definitions
**Problem**: `nextjs-contentful` example imported `@contentful/rich-text-types` which wasn't installed.

**Solution**: Created simplified type definition inline to avoid extra dependency:
```typescript
// /examples/nextjs-contentful/types/content.ts
export interface RichTextDocument {
  nodeType: 'document'
  content: unknown[]
}
```

### 5. Mock Environment Variables for Builds
**Problem**: Next.js examples failed to build without real CMS credentials.

**Solution**:
- Added `.env.local` files with placeholder values to all Next.js examples
- Updated adapter initialization to use placeholder values when real credentials aren't provided:
  ```typescript
  const projectId = process.env.SANITY_PROJECT_ID || 'placeholder-project-id'
  const spaceId = process.env.CONTENTFUL_SPACE_ID || 'placeholder-space-id'
  ```

**Files Created**:
- `/examples/nextjs-contentful/.env.local`
- `/examples/nextjs-sanity/.env.local`

## Build Results

### ✅ All Packages Build Successfully
- `@contentbridge/core`
- `@contentbridge/sanity`
- `@contentbridge/contentful`
- `@contentbridge/payload`
- `@contentbridge/strapi`
- `@contentbridge/cli`

### ✅ All Examples Build/Typecheck Successfully
1. **basic-node** - ✅ Typechecks without errors
2. **nextjs-sanity** - ✅ Builds successfully (Next.js 14.2.35)
3. **nextjs-contentful** - ✅ Builds successfully (Next.js 14.2.35)
4. **with-caching** - ✅ Typechecks without errors

### Monorepo Build Command
```bash
pnpm build
```

Result: **8/8 tasks successful**

## How Examples Now Work

### Next.js Examples (nextjs-sanity, nextjs-contentful)
- Build successfully with placeholder credentials
- Show empty state UI when no data is available
- Include comments showing how to use real API calls
- Demonstrate adapter configuration patterns

### Node.js Examples (basic-node, with-caching)
- Typecheck successfully
- Use placeholder credentials by default
- Demonstrate actual ContentBridge API usage
- Ready to run with real CMS credentials

## To Use Examples with Real CMS Data

### 1. Configure Environment Variables
Copy `.env.example` to `.env.local` and add real credentials:

**Sanity**:
```bash
NEXT_PUBLIC_SANITY_PROJECT_ID=your_project_id
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_TOKEN=your_token
```

**Contentful**:
```bash
NEXT_PUBLIC_CONTENTFUL_SPACE_ID=your_space_id
CONTENTFUL_ACCESS_TOKEN=your_access_token
```

### 2. Update Data Fetching Code
The examples now use mock data. To fetch real data:

```typescript
// Replace mock data
const posts: Post[] = []

// With actual query
const post = await content.getById<Post>('your-post-id')
```

## Notes

- All examples now demonstrate **actual** ContentBridge API, not aspirational/future API
- Examples focus on showing configuration patterns and adapter usage
- Mock data approach allows builds to succeed in CI/CD without secrets
- Type safety is maintained throughout all examples

## Testing

To verify all examples work:

```bash
# From monorepo root
pnpm build

# Individual example typecheck
cd examples/basic-node && pnpm typecheck
cd examples/with-caching && pnpm typecheck

# Individual Next.js example builds
cd examples/nextjs-sanity && pnpm build
cd examples/nextjs-contentful && pnpm build
```

All commands should complete successfully with no errors.
