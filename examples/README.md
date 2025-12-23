# ContentBridge Examples

Real-world examples demonstrating how to use ContentBridge in different environments and with different CMS platforms.

## Available Examples

### 🚀 [nextjs-sanity](./nextjs-sanity)

**Next.js 14+ App Router with Sanity CMS**

A complete blog application showing:
- Server Components with data fetching
- Dynamic routes with `generateStaticParams`
- Reference resolution (author, categories)
- Webhook-based revalidation
- SEO with `generateMetadata`
- ISR (Incremental Static Regeneration)

**Perfect for:** Learning ContentBridge with Next.js and Sanity

### 🔄 [nextjs-contentful](./nextjs-contentful)

**Next.js 14+ App Router with Contentful CMS**

The **same application** as `nextjs-sanity`, but using Contentful instead!

Demonstrates:
- CMS-agnostic benefits of ContentBridge
- Contentful-specific features (Rich Text, Preview API)
- How easy it is to swap CMSs (change one file!)
- Identical query patterns across different CMSs

**Perfect for:** Comparing Sanity vs Contentful, seeing CMS-agnostic benefits

### ⚡ [basic-node](./basic-node)

**Simple Node.js without frameworks**

Comprehensive guide to all ContentBridge operations:
- CREATE, READ, UPDATE, DELETE (CRUD)
- QueryBuilder for complex queries
- Transactions for atomic operations
- Validation, references, cache invalidation
- Adapter switching via environment variable

**Perfect for:** Learning ContentBridge basics, CLI tools, scripts

### 💾 [with-caching](./with-caching)

**Advanced caching strategies**

Production-ready caching implementations:
- **Memory Cache** - In-process, zero dependencies
- **Redis Cache** - Distributed, production-ready
- **Next.js Cache** - Framework-integrated
- Cache patterns: Cache-aside, SWR, warming
- Invalidation strategies: Tags, TTL, events

**Perfect for:** Performance optimization, production deployments

## Quick Start

### 1. Install Dependencies

From the monorepo root:

```bash
pnpm install
```

### 2. Choose an Example

Navigate to any example directory:

```bash
cd examples/nextjs-sanity
# or
cd examples/basic-node
```

### 3. Configure

Copy `.env.example` to `.env` and add your CMS credentials:

```bash
cp .env.example .env
# Edit .env with your credentials
```

### 4. Run

```bash
pnpm dev
# or
pnpm start
```

Each example has detailed setup instructions in its README.

## Comparison Matrix

| Feature | nextjs-sanity | nextjs-contentful | basic-node | with-caching |
|---------|---------------|-------------------|------------|--------------|
| **Framework** | Next.js 14+ | Next.js 14+ | Node.js | Node.js |
| **CMS** | Sanity | Contentful | Any | Any |
| **Complexity** | Medium | Medium | Simple | Advanced |
| **Best For** | Full apps | Full apps | Learning | Performance |
| **Server Components** | ✅ | ✅ | ❌ | ❌ |
| **QueryBuilder** | ✅ | ✅ | ✅ | ✅ |
| **Caching** | Basic | Basic | None | Advanced |
| **TypeScript** | ✅ | ✅ | ✅ | ✅ |

## Learning Path

### Beginner

1. Start with **[basic-node](./basic-node)**
   - Learn all CRUD operations
   - Understand QueryBuilder
   - See adapter switching

2. Try **[nextjs-sanity](./nextjs-sanity)**
   - See ContentBridge in a real app
   - Learn Next.js integration
   - Understand server-side patterns

### Intermediate

3. Compare **[nextjs-contentful](./nextjs-contentful)**
   - See CMS-agnostic benefits
   - Compare Sanity vs Contentful
   - Understand adapter differences

4. Explore **[with-caching](./with-caching)**
   - Optimize performance
   - Learn cache strategies
   - Implement production patterns

### Advanced

5. **Combine concepts**
   - Use caching in Next.js apps
   - Implement custom adapters
   - Build your own patterns

## Common Patterns

### Pattern 1: CMS-Agnostic Setup

**File: `lib/content.ts`**

```typescript
// Works with ANY CMS - just swap the adapter!
import { createSanityAdapter } from '@contentbridge/sanity'
// or: import { createContentfulAdapter } from '@contentbridge/contentful'

export const content = createSanityAdapter({ /* config */ })
```

**All your application code uses the same API:**

```typescript
// This code works identically with Sanity, Contentful, Strapi, etc.
const posts = await content
  .query()
  .type('post')
  .filter('status', '==', 'published')
  .orderBy('publishedAt', 'desc')
  .limit(10)
  .execute()
```

### Pattern 2: Type-Safe Queries

```typescript
interface Post {
  _id: string
  _type: 'post'
  title: string
  slug: { current: string }
}

// Type-safe queries with autocomplete
const posts = await content.query<Post>()
  .type('post')
  .filter('status', '==', 'published') // ✅ Autocomplete
  .execute()

// posts is Post[] - fully typed!
posts[0].title // ✅ Type-safe
posts[0].invalidField // ❌ Type error
```

### Pattern 3: Reference Resolution

```typescript
// Without resolution
const post = await content.getBySlug('hello-world', 'post')
// post.author = { _ref: 'author-123' }

// With resolution
const post = await content.getBySlug('hello-world', 'post', {
  resolveReferences: 1, // Resolve 1 level deep
})
// post.author = { _id: 'author-123', name: 'John Doe', ... }
```

### Pattern 4: Caching with Tags

```typescript
const post = await content.getBySlug('hello-world', 'post', {
  cache: {
    tags: ['post:hello-world', 'posts'],
    ttl: 3600,
  },
})

// Later, invalidate specific post
await content.invalidateCache(['post:hello-world'])

// Or all posts
await content.invalidateCache(['posts'])
```

## Integration Guides

### Next.js App Router

See: [nextjs-sanity](./nextjs-sanity) or [nextjs-contentful](./nextjs-contentful)

Key patterns:
- Server Components for data fetching
- `generateStaticParams` for static generation
- `generateMetadata` for SEO
- `revalidateTag` for cache invalidation

### Node.js Scripts

See: [basic-node](./basic-node)

Key patterns:
- Environment-based adapter switching
- CRUD operations
- Transactions for atomic updates
- CLI tools for content management

### Caching

See: [with-caching](./with-caching)

Key patterns:
- Memory cache for development
- Redis cache for production
- Cache-aside pattern
- Stale-while-revalidate

## Troubleshooting

### "Cannot find module @contentbridge/core"

Run `pnpm install` from the **monorepo root**, not the example directory:

```bash
cd /path/to/contentbridge
pnpm install
```

### "Environment variables not set"

Each example needs a `.env` file:

```bash
cd examples/nextjs-sanity
cp .env.example .env
# Edit .env with your credentials
```

### Type errors

Ensure TypeScript version is 5.3+:

```bash
pnpm typecheck
```

### Examples not in workspace

The examples are automatically included in the workspace. If you have issues:

```bash
# From monorepo root
pnpm install
```

## Contributing

Want to add an example? Great! Follow this structure:

```
examples/your-example/
├── README.md              # Detailed setup and explanation
├── package.json           # Dependencies with workspace:*
├── tsconfig.json          # TypeScript config
├── .env.example           # Example environment variables
└── src/                   # Source code
```

**Requirements:**
- Clear, production-quality code
- Comprehensive README with setup instructions
- Working example that can be run immediately
- Use `workspace:*` for local packages
- Follow existing examples' style

## Resources

- [ContentBridge Documentation](../README.md)
- [Core Package](../packages/core/README.md)
- [Sanity Adapter](../packages/sanity/README.md)
- [Contentful Adapter](../packages/contentful/README.md)

## Questions?

- Check individual example READMEs
- Read the [main documentation](../README.md)
- Open an issue on GitHub

## License

MIT
