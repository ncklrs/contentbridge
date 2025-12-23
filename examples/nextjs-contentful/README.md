# ContentBridge + Contentful Example

This example demonstrates using ContentBridge with **Contentful CMS** in a Next.js 14+ App Router application.

## Why This Example Matters

This example proves ContentBridge's **CMS-agnostic promise**: Notice how the code is nearly identical to the Sanity example, but works with Contentful instead. **Change one file, swap CMSs.**

## Features Demonstrated

- **CMS-agnostic queries** using ContentBridge API
- **Contentful-specific** features (Rich Text, Assets, Preview API)
- **Type-safe data fetching** with TypeScript
- **QueryBuilder** for fluent queries (same API as Sanity!)
- **Reference resolution** (author, categories)
- **Server Components** with automatic caching
- **Preview mode** for draft content
- **Webhook revalidation** for on-demand updates

## Prerequisites

1. **Contentful Account**
   - Create a space at https://app.contentful.com
   - Set up content models (see below)
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
cd examples/nextjs-contentful
cp .env.local.example .env.local
```

Edit `.env.local` with your Contentful credentials:

```env
NEXT_PUBLIC_CONTENTFUL_SPACE_ID=your_space_id
NEXT_PUBLIC_CONTENTFUL_ENVIRONMENT=master
CONTENTFUL_ACCESS_TOKEN=your_delivery_token
CONTENTFUL_PREVIEW_ACCESS_TOKEN=your_preview_token
```

**Getting Contentful credentials:**

1. Go to https://app.contentful.com → Your Space → Settings → API keys
2. Click "Add API key"
3. Name: "ContentBridge Example"
4. Copy:
   - Space ID
   - Content Delivery API - access token (for production)
   - Content Preview API - access token (for drafts)

### 3. Set Up Contentful Content Models

Create these content types in Contentful:

**Blog Post** (`blogPost`):

```json
{
  "name": "Blog Post",
  "displayField": "title",
  "fields": [
    {
      "id": "title",
      "name": "Title",
      "type": "Symbol",
      "required": true
    },
    {
      "id": "slug",
      "name": "Slug",
      "type": "Symbol",
      "required": true,
      "unique": true
    },
    {
      "id": "excerpt",
      "name": "Excerpt",
      "type": "Text"
    },
    {
      "id": "content",
      "name": "Content",
      "type": "RichText"
    },
    {
      "id": "publishDate",
      "name": "Publish Date",
      "type": "Date"
    },
    {
      "id": "featured",
      "name": "Featured",
      "type": "Boolean"
    },
    {
      "id": "heroImage",
      "name": "Hero Image",
      "type": "Link",
      "linkType": "Asset"
    },
    {
      "id": "author",
      "name": "Author",
      "type": "Link",
      "linkType": "Entry",
      "validations": [
        {
          "linkContentType": ["blogAuthor"]
        }
      ]
    },
    {
      "id": "categories",
      "name": "Categories",
      "type": "Array",
      "items": {
        "type": "Link",
        "linkType": "Entry",
        "validations": [
          {
            "linkContentType": ["blogCategory"]
          }
        ]
      }
    },
    {
      "id": "tags",
      "name": "Tags",
      "type": "Array",
      "items": {
        "type": "Symbol"
      }
    }
  ]
}
```

**Blog Author** (`blogAuthor`):

```json
{
  "name": "Blog Author",
  "displayField": "name",
  "fields": [
    {
      "id": "name",
      "name": "Name",
      "type": "Symbol",
      "required": true
    },
    {
      "id": "slug",
      "name": "Slug",
      "type": "Symbol",
      "required": true
    },
    {
      "id": "bio",
      "name": "Bio",
      "type": "Text"
    },
    {
      "id": "avatar",
      "name": "Avatar",
      "type": "Link",
      "linkType": "Asset"
    },
    {
      "id": "email",
      "name": "Email",
      "type": "Symbol"
    }
  ]
}
```

**Blog Category** (`blogCategory`):

```json
{
  "name": "Blog Category",
  "displayField": "title",
  "fields": [
    {
      "id": "title",
      "name": "Title",
      "type": "Symbol",
      "required": true
    },
    {
      "id": "slug",
      "name": "Slug",
      "type": "Symbol",
      "required": true
    },
    {
      "id": "description",
      "name": "Description",
      "type": "Text"
    }
  ]
}
```

### 4. Run Development Server

```bash
pnpm dev
```

Open http://localhost:3000

## Project Structure

```
examples/nextjs-contentful/
├── app/
│   ├── api/
│   │   ├── revalidate/
│   │   │   └── route.ts         # Webhook for cache invalidation
│   │   └── preview/
│   │       └── route.ts         # Preview mode endpoint
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

### 1. ContentBridge Setup (CMS-Agnostic!)

**File: `lib/content.ts`**

```typescript
import { createContentfulAdapter } from '@contentbridge/contentful'
import { createClient } from 'contentful'

const contentfulClient = createClient({
  space: process.env.NEXT_PUBLIC_CONTENTFUL_SPACE_ID!,
  environment: process.env.NEXT_PUBLIC_CONTENTFUL_ENVIRONMENT!,
  accessToken: process.env.CONTENTFUL_ACCESS_TOKEN!,
})

export const content = createContentfulAdapter({
  client: contentfulClient,
})
```

**Compare to Sanity** (from `examples/nextjs-sanity/lib/content.ts`):

```typescript
import { createSanityAdapter } from '@contentbridge/sanity'
import { createClient } from '@sanity/client'

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: '2024-01-01',
})

export const content = createSanityAdapter({
  client: sanityClient,
})
```

**Notice:** Different client setup, **same ContentBridge API!**

### 2. Querying Content (Identical to Sanity)

```typescript
// This works with both Sanity AND Contentful!
const posts = await content
  .query<BlogPost>()
  .type('blogPost') // Sanity: 'post', Contentful: 'blogPost'
  .filter('fields.publishDate', '!=', null)
  .orderBy('fields.publishDate', 'desc')
  .limit(10)
  .execute()
```

### 3. Contentful-Specific: Preview Mode

**Enable preview API** (`lib/content.ts`):

```typescript
const isPreview = process.env.CONTENTFUL_PREVIEW_MODE === 'true'

const contentfulClient = createClient({
  space: process.env.NEXT_PUBLIC_CONTENTFUL_SPACE_ID!,
  accessToken: isPreview
    ? process.env.CONTENTFUL_PREVIEW_ACCESS_TOKEN!
    : process.env.CONTENTFUL_ACCESS_TOKEN!,
  host: isPreview ? 'preview.contentful.com' : 'cdn.contentful.com',
})
```

**Preview API route** (`app/api/preview/route.ts`):

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret')
  const id = request.nextUrl.searchParams.get('id')

  // Verify secret
  if (secret !== process.env.CONTENTFUL_PREVIEW_SECRET) {
    return new NextResponse('Invalid token', { status: 401 })
  }

  // Enable preview mode
  cookies().set('previewMode', 'true', {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
  })

  // Redirect to entry
  return NextResponse.redirect(new URL(`/posts/${id}`, request.url))
}
```

### 4. Rich Text Rendering

Contentful uses Rich Text (not Portable Text like Sanity):

```typescript
import { documentToReactComponents } from '@contentful/rich-text-react-renderer'
import { BLOCKS } from '@contentful/rich-text-types'

const options = {
  renderNode: {
    [BLOCKS.HEADING_2]: (node, children) => (
      <h2 className="text-2xl font-bold mt-8 mb-4">{children}</h2>
    ),
    [BLOCKS.PARAGRAPH]: (node, children) => (
      <p className="mb-4">{children}</p>
    ),
  },
}

export function RichTextContent({ content }: { content: Document }) {
  return <>{documentToReactComponents(content, options)}</>
}
```

### 5. Asset Handling

Contentful assets have a different structure:

```typescript
// Contentful Asset
interface ContentfulAsset {
  sys: { id: string }
  fields: {
    title: string
    file: {
      url: string
      details: {
        image: { width: number; height: number }
      }
    }
  }
}

// Usage
<Image
  src={`https:${asset.fields.file.url}`}
  alt={asset.fields.title}
  width={asset.fields.file.details.image.width}
  height={asset.fields.file.details.image.height}
/>
```

## CMS Comparison

| Feature | Sanity | Contentful | ContentBridge |
|---------|--------|------------|---------------|
| Query Language | GROQ | GraphQL/REST | Unified API |
| Rich Content | Portable Text | Rich Text | Adapters convert |
| References | `_ref` | `sys.id` links | Normalized |
| Images | Sanity CDN | Contentful CDN | Unified interface |
| Drafts | Built-in | Preview API | Supported both |

**With ContentBridge:** You write code once, works with all CMSs!

## Type Generation

Generate types from Contentful:

```bash
npm install -D contentful-typescript-codegen

# Generate types
npx cf-content-types-generator \
  --spaceId YOUR_SPACE_ID \
  --token YOUR_TOKEN \
  --out types/contentful.d.ts
```

## Switching Between CMSs

To switch from Contentful to Sanity (or vice versa):

**1. Change one file** (`lib/content.ts`):

```diff
- import { createContentfulAdapter } from '@contentbridge/contentful'
- import { createClient } from 'contentful'
+ import { createSanityAdapter } from '@contentbridge/sanity'
+ import { createClient } from '@sanity/client'

- const client = createClient({ /* contentful config */ })
- export const content = createContentfulAdapter({ client })
+ const client = createClient({ /* sanity config */ })
+ export const content = createSanityAdapter({ client })
```

**2. Update content type names** (if different):

```diff
- .type('blogPost')
+ .type('post')
```

**That's it!** All your query logic, filters, sorts remain identical.

## Troubleshooting

### "Cannot connect to Contentful"

- Verify `.env.local` has correct Space ID and Access Token
- Check API key permissions (should have "Read" access)
- Restart dev server after changing env vars

### "No posts found"

- Create and publish blog posts in Contentful
- Set `publishDate` field (filter excludes posts without it)
- Check environment name matches (usually "master")

### "Asset URL returns 404"

- Prepend `https:` to asset URLs: `https:${asset.fields.file.url}`
- Ensure asset is published in Contentful

### Build errors

- Run `pnpm typecheck` to find type errors
- Ensure all `NEXT_PUBLIC_*` env vars are set
- Check content type IDs match your Contentful setup

## Next Steps

1. **Implement preview mode** with the Preview API
2. **Add rich text rendering** with custom components
3. **Create localized content** using Contentful's localization
4. **Add full-text search** using Contentful's search API
5. **Implement pagination** with limit/skip
6. **Try switching to Sanity** to see CMS-agnostic benefits!

## Related Examples

- [`examples/nextjs-sanity`](../nextjs-sanity) - Same app with Sanity (compare!)
- [`examples/with-caching`](../with-caching) - Advanced caching strategies
- [`examples/basic-node`](../basic-node) - Node.js without framework

## Resources

- [ContentBridge Documentation](../../README.md)
- [Contentful Documentation](https://www.contentful.com/developers/docs/)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Contentful Rich Text](https://www.contentful.com/developers/docs/concepts/rich-text/)

## License

MIT
