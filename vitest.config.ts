import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  // tsconfig has jsx:"preserve" (Next compiles JSX); vitest must transform it itself
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/lib/**', 'src/app/api/**'],
      exclude: ['src/lib/prisma.ts', 'src/lib/auth.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
