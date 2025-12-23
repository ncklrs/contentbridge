import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  shims: true,
  external: [
    'commander',
    'chalk',
    'ora',
    'zod',
    'cosmiconfig',
    'typescript',
    '@contentbridge/core',
  ],
  platform: 'node',
  target: 'node18',
  esbuildOptions(options) {
    options.banner = {
      js: '#!/usr/bin/env node',
    }
  },
})
