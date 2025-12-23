import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'groq/index': 'src/groq/index.ts',
    'richtext/index': 'src/richtext/index.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  external: ['@sanity/client', '@sanity/image-url', '@contentbridge/core'],
})
