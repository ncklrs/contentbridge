import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'types/index': 'src/types/index.ts',
    'service/index': 'src/service/index.ts',
    'adapters/index': 'src/adapters/index.ts',
    'cache/index': 'src/cache/index.ts',
    'richtext/index': 'src/richtext/index.ts',
    'media/index': 'src/media/index.ts',
    'utils/index': 'src/utils/index.ts',
    'plugins/index': 'src/plugins/index.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
})
