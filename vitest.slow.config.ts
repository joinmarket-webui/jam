import path from 'node:path'
import { defineConfig } from 'vitest/config'

// Long running/blocking tests, e.g. hashing with production-strength parameters.
// Kept out of `npm test` as generating code coverage via v8 slows them down considerably.
export default defineConfig({
  test: {
    name: 'slow',
    environment: 'node',
    include: ['src/**/*.slow.test.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
