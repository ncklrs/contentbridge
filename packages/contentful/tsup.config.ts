import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'query/index': 'src/query/index.ts',
    'richtext/index': 'src/richtext/index.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  external: ['contentful', 'contentful-management', '@contentful/rich-text-types'],
})
