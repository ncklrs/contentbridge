# @contentbridge/cli

CLI tool for ContentBridge - generate types, initialize projects, and manage CMS integrations.

## Installation

```bash
npm install -g @contentbridge/cli
# or
pnpm add -g @contentbridge/cli
```

For project-specific usage:

```bash
npm install -D @contentbridge/cli
# or
pnpm add -D @contentbridge/cli
```

## Quick Start

### 1. Initialize ContentBridge

```bash
contentbridge init --adapter sanity
```

This creates:
- `contentbridge.config.ts` - Configuration file
- `.env.example` - Environment variable template

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

### 3. Generate Types

```bash
contentbridge typegen --adapter sanity
```

This generates TypeScript types from your CMS schemas at `src/types/contentbridge.generated.ts`.

## Commands

### `init`

Initialize ContentBridge in your project.

```bash
contentbridge init --adapter <adapter>
```

**Options:**
- `-a, --adapter <adapter>` - CMS adapter (sanity, payload, contentful, strapi) [required]
- `-d, --dir <directory>` - Project directory (default: current directory)

**Examples:**
```bash
contentbridge init --adapter sanity
contentbridge init --adapter payload
contentbridge init --adapter contentful
```

### `typegen`

Generate TypeScript types from CMS schemas.

```bash
contentbridge typegen [options]
```

**Options:**
- `-a, --adapter <adapter>` - CMS adapter to use
- `-o, --output <path>` - Output file path (default: `src/types/contentbridge.generated.ts`)
- `-c, --config <path>` - Path to config file
- `-z, --zod` - Also generate Zod schemas
- `-w, --watch` - Watch for schema changes (not yet implemented)

**Examples:**
```bash
# Generate types using config file
contentbridge typegen

# Generate types with Zod schemas
contentbridge typegen --zod

# Custom output path
contentbridge typegen --output types/cms.ts

# Specify adapter explicitly
contentbridge typegen --adapter sanity --zod
```

## Configuration

Create a `contentbridge.config.ts` file in your project root:

### Sanity

```typescript
import { defineConfig } from '@contentbridge/core'
import { SanityAdapter } from '@contentbridge/sanity'

export default defineConfig({
  adapter: new SanityAdapter({
    projectId: process.env.SANITY_PROJECT_ID!,
    dataset: process.env.SANITY_DATASET || 'production',
    apiVersion: '2024-01-01',
    useCdn: false,
  }),
  outputPath: 'src/types/contentbridge.generated.ts',
})
```

### Payload

```typescript
import { defineConfig } from '@contentbridge/core'
import { PayloadAdapter } from '@contentbridge/payload'

export default defineConfig({
  adapter: new PayloadAdapter({
    serverURL: process.env.PAYLOAD_SERVER_URL || 'http://localhost:3000',
    apiKey: process.env.PAYLOAD_API_KEY,
  }),
  outputPath: 'src/types/contentbridge.generated.ts',
})
```

### Contentful

```typescript
import { defineConfig } from '@contentbridge/core'
import { ContentfulAdapter } from '@contentbridge/contentful'

export default defineConfig({
  adapter: new ContentfulAdapter({
    space: process.env.CONTENTFUL_SPACE_ID!,
    accessToken: process.env.CONTENTFUL_ACCESS_TOKEN!,
    environment: process.env.CONTENTFUL_ENVIRONMENT || 'master',
  }),
  outputPath: 'src/types/contentbridge.generated.ts',
})
```

### Strapi

```typescript
import { defineConfig } from '@contentbridge/core'
import { StrapiAdapter } from '@contentbridge/strapi'

export default defineConfig({
  adapter: new StrapiAdapter({
    apiURL: process.env.STRAPI_API_URL || 'http://localhost:1337',
    apiToken: process.env.STRAPI_API_TOKEN,
  }),
  outputPath: 'src/types/contentbridge.generated.ts',
})
```

## Using Generated Types

Once types are generated, import and use them in your code:

```typescript
import type { Post, Author } from './types/contentbridge.generated'

// Types are fully typed
const post: Post = {
  _id: 'post-1',
  _type: 'post',
  _createdAt: '2024-01-01T00:00:00Z',
  _updatedAt: '2024-01-01T00:00:00Z',
  title: 'Hello World',
  slug: { current: 'hello-world' },
  author: {
    _type: 'reference',
    _ref: 'author-1',
  },
}
```

If you generated Zod schemas (`--zod` flag):

```typescript
import { PostSchema } from './types/contentbridge.generated.zod'

// Runtime validation
const result = PostSchema.safeParse(data)
if (result.success) {
  console.log(result.data)
}
```

## Package Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "types:generate": "contentbridge typegen --zod",
    "types:watch": "contentbridge typegen --watch --zod"
  }
}
```

## Supported Adapters

| Adapter | Package | Status |
|---------|---------|--------|
| Sanity | `@contentbridge/sanity` | ✅ Supported |
| Payload | `@contentbridge/payload` | ✅ Supported |
| Contentful | `@contentbridge/contentful` | ✅ Supported |
| Strapi | `@contentbridge/strapi` | ✅ Supported |

## Development

```bash
# Install dependencies
pnpm install

# Build the CLI
pnpm build

# Run locally
node dist/index.js --help

# Test type generation
node dist/index.js typegen --adapter sanity
```

## Troubleshooting

### "No adapter specified"

Make sure you either:
1. Pass `--adapter` flag: `contentbridge typegen --adapter sanity`
2. Or have it in your config file

### "Adapter package not found"

Install the required adapter package:

```bash
npm install @contentbridge/sanity
# or
pnpm add @contentbridge/sanity
```

### TypeScript config errors

If using `.ts` config files, make sure you have `tsx` installed:

```bash
npm install -D tsx
```

## License

MIT
