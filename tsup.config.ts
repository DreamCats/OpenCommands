import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    cli: 'src/cli.ts'
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  minify: false,
  shims: true,
  banner({ options, format, fileName }) {
    // Only add shebang to CLI entry
    if (fileName === 'cli.js' || fileName === 'cli.mjs') {
      return { js: '#!/usr/bin/env node' }
    }
    return {}
  }
})