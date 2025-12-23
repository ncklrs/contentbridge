# ContentBridge + Sanity Example

This example demonstrates using ContentBridge with **Sanity CMS** in a Next.js 14+ App Router application.

## Features Demonstrated

- **CMS-agnostic queries** using ContentBridge API
- **Type-safe data fetching** with TypeScript
- **QueryBuilder** for fluent, composable queries
- **Reference resolution** (author, categories)
- **Server Components** with automatic caching
- **Dynamic routes** with `generateStaticParams`
- **SEO** with `generateMetadata`
- **Webhook revalidation** for on-demand updates
- **Cache tagging** for granular invalidation

## Prerequisites

1. **Sanity Project**
   - Create a project at https://sanity.io
   - Set up a basic blog schema (post, author, category)
   - Add some content

2. **Node.js 18+**

3. **Package Manager** (pnpm recommended for workspaces)

## Setup

### 1. Install Dependencies

From the monorepo root:

```bash
pnpm install
```

### 2. Configure Environment Variables

Copy the example env file:

```bash
cd examples/nextjs-sanity
cp .env.local.example .env.local
```

Edit `.env.local` with your Sanity credentials:

```env
NEXT_PUBLIC_SANITY_PROJECT_ID=your_project_id
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_TOKEN=your_api_token
SANITY_REVALIDATE_SECRET=your_secret_here
```

**Getting Sanity credentials:**

1. Project ID & Dataset: https://sanity.io/manage
2. API Token: Create a token with "Read" permissions
   - Go to https://sanity.io/manage → Your Project → API → Tokens
   - Click "Add API token"
   - Name: "ContentBridge Example"
   - Permissions: "Read"

### 3. Set Up Sanity Schema

Create these document types in your Sanity Studio:

**Post Schema** (`schemas/post.ts`):

```typescript
import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'post',
  title: 'Blog Post',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'content',
      title: 'Content',
      type: 'array',
      of: [{ type: 'block' }],
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published At',
      type: 'datetime',
    }),
    defineField({
      name: 'featured',
      title: 'Featured',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'reference',
      to: [{ type: 'author' }],
    }),
    defineField({
      name: 'categories',
      title: 'Categories',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'category' }] }],
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{ type: 'string' }],
    }),
  ],
})
```

**Author Schema** (`schemas/author.ts`):

```typescript
import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'author',
  title: 'Author',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'name',
      },
    }),
    defineField({
      name: 'bio',
      title: 'Bio',
      type: 'text',
    }),
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
    }),
  ],
})
```

**Category Schema** (`schemas/category.ts`):

```typescript
import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'category',
  title: 'Category',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
      },
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
    }),
  ],
})
```

### 4. Run Development Server

```bash
pnpm dev
```

Open http://localhost:3000

## Project Structure

```
examples/nextjs-sanity/
├── app/
│   ├── api/
│   │   └── revalidate/
│   │       └── route.ts         # Webhook for cache invalidation
│   ├── posts/
│   │   └── [slug]/
│   │       └── page.tsx         # Dynamic post page
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Homepage (post list)
│   └── globals.css
├── lib/
│   └── content.ts               # ContentBridge setup
├── types/
│   └── content.ts               # Type definitions
├── .env.local.example
├── next.config.js
├── package.json
├── tsconfig.json
└── README.md
```

## Key Patterns

### 1. ContentBridge Setup

**File: `lib/content.ts`**

```typescript
import { createSanityAdapter } from '@contentbridge/sanity'
import { createClient } from '@sanity/client'

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: '2024-01-01',
  useCdn: process.env.NODE_ENV === 'production',
  token: process.env.SANITY_API_TOKEN,
})

export const content = createSanityAdapter({
  client: sanityClient,
})
```

### 2. Querying Content

**Simple query:**

```typescript
const posts = await content.query<Post>({
  type: 'post',
  filter: [{ field: 'featured', operator: '==', value: true }],
  sort: [{ field: 'publishedAt', direction: 'desc' }],
  limit: 5,
})
```

**Using QueryBuilder (recommended):**

```typescript
const posts = await content
  .query<Post>()
  .type('post')
  .filter('featured', '==', true)
  .orderBy('publishedAt', 'desc')
  .limit(5)
  .execute()
```

### 3. Getting Single Document

```typescript
const post = await content.getBySlug<Post>('hello-world', 'post', {
  resolveReferences: 1, // Resolve author, categories
  cache: {
    tags: ['post:hello-world'],
    ttl: 3600,
  },
})
```

### 4. Reference Resolution

```typescript
// Without resolution (default)
const post = await content.getBySlug<Post>('hello-world', 'post')
// post.author = { _type: 'reference', _ref: 'author-123' }

// With resolution
const post = await content.getBySlug<Post>('hello-world', 'post', {
  resolveReferences: 1,
})
// post.author = { _id: 'author-123', _type: 'author', name: 'John Doe', ... }
```

### 5. Cache Invalidation

**Webhook route** (`app/api/revalidate/route.ts`):

```typescript
import { revalidateTag } from 'next/cache'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { _type, slug } = body

  if (_type === 'post' && slug?.current) {
    revalidateTag(`post:${slug.current}`)
  }

  return NextResponse.json({ revalidated: true })
}
```

**Sanity Webhook Configuration:**

1. Go to https://sanity.io/manage → Your Project → API → Webhooks
2. Add new webhook:
   - URL: `https://your-site.com/api/revalidate?secret=YOUR_SECRET`
   - Dataset: `production`
   - Trigger on: `Create`, `Update`, `Delete`
   - Filter: `_type == "post"`

## CMS-Agnostic Benefits

The power of ContentBridge is that you can **swap CMSs without changing your application code**.

### Switching to Contentful

**Change one file** (`lib/content.ts`):

```typescript
// Before (Sanity)
import { createSanityAdapter } from '@contentbridge/sanity'
import { createClient } from '@sanity/client'

const sanityClient = createClient({ /* config */ })
export const content = createSanityAdapter({ client: sanityClient })

// After (Contentful)
import { createContentfulAdapter } from '@contentbridge/contentful'
import { createClient } from 'contentful'

const contentfulClient = createClient({ /* config */ })
export const content = createContentfulAdapter({ client: contentfulClient })
```

**All your app code stays the same!** The same `content.query()`, `content.getBySlug()`, etc. work identically.

## Type Generation

In production applications, generate types from your CMS schema:

### Sanity

Use `@sanity/codegen`:

```bash
npm install -D @sanity/codegen
npx @sanity/codegen --schema-path=./schemas --out-path=./types/sanity.ts
```

### TypeScript Benefits

```typescript
// Autocomplete and type checking
const post = await content.getBySlug<Post>('hello-world', 'post')

// TypeScript knows all fields
post.title // ✅ string
post.author // ✅ Reference<Author>
post.categories // ✅ Reference<Category>[]
post.invalidField // ❌ Type error
```

## Performance Optimization

### 1. Next.js Caching

```typescript
// Static generation with revalidation
export const revalidate = 3600 // 1 hour

export default async function Page() {
  const posts = await content.query<Post>().type('post').execute()
  // ...
}
```

### 2. Cache Tags

```typescript
const post = await content.getBySlug<Post>('hello-world', 'post', {
  cache: {
    tags: ['post:hello-world', 'posts'],
    ttl: 3600,
  },
})

// Invalidate specific post
revalidateTag('post:hello-world')

// Invalidate all posts
revalidateTag('posts')
```

### 3. Partial Queries

```typescript
// Only fetch needed fields (reduces payload)
const posts = await content
  .query<Post>()
  .type('post')
  .select(['_id', 'title', 'slug', 'excerpt'])
  .execute()
```

## Troubleshooting

### "Cannot connect to Sanity"

- Verify `.env.local` has correct `NEXT_PUBLIC_SANITY_PROJECT_ID` and `NEXT_PUBLIC_SANITY_DATASET`
- Check API token has read permissions
- Restart dev server after changing env vars

### "No posts found"

- Create posts in Sanity Studio
- Set `publishedAt` field (filter excludes posts without it)
- Check dataset name matches

### "Reference not resolved"

- Pass `resolveReferences: 1` (or higher) in `GetOptions`
- Ensure referenced documents exist in Sanity

### Build errors

- Run `pnpm typecheck` to find type errors
- Ensure all `NEXT_PUBLIC_*` env vars are set

## Next Steps

1. **Add more schemas** (products, pages, etc.)
2. **Implement search** using ContentBridge query filters
3. **Add pagination** with `limit` and `offset`
4. **Create admin pages** for content management
5. **Add image optimization** with Sanity CDN
6. **Implement draft mode** for previews

## Related Examples

- [`examples/nextjs-contentful`](../nextjs-contentful) - Same app with Contentful
- [`examples/with-caching`](../with-caching) - Advanced caching strategies
- [`examples/basic-node`](../basic-node) - Node.js without framework

## Resources

- [ContentBridge Documentation](../../README.md)
- [Sanity Documentation](https://www.sanity.io/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [GROQ Query Language](https://www.sanity.io/docs/groq)

## License

MIT
