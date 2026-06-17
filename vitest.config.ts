import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import { playwright } from '@vitest/browser-playwright'
import path from 'node:path'
import { mergeConfig } from 'vite'
import { ConfigEnv, defineConfig, type ViteUserConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default defineConfig((args: ConfigEnv): ViteUserConfig => {
  return mergeConfig(viteConfig(args), {
    test: {
      env: {
        LC_ALL: 'en_US.UTF-8',
      },
      coverage: {
        // 'json-summary' is required for ci coverage report
        reporter: ['text', 'json', 'json-summary'],
        // enable coverage reports even if tests are failing
        reportOnFailure: true,
        include: ['src/**/*.{ts,tsx}'],
        thresholds: {
          lines: 80,
          functions: 80,
          branches: 80,
          statements: 80,
        },
      },
      projects: [
        {
          extends: true,
          plugins: [
            // The plugin will run tests for the stories defined in your Storybook config
            // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
            storybookTest({ configDir: path.resolve(__dirname, './.storybook') }),
          ],
          test: {
            name: 'storybook',
            browser: {
              enabled: true,
              headless: true,
              provider: playwright({}),
              instances: [{ browser: 'chromium' }],
            },
            setupFiles: ['.storybook/vitest.setup.ts'],
            // Set `isolate` to `false` to prevent frequent storybook errors.
            // ("Failed to fetch dynamically imported module" and "Cannot connect to the iframe")
            // See: https://storybook.js.org/docs/writing-tests/integrations/vitest-addon/index#why-do-my-tests-fail-in-ci-with-failed-to-fetch-dynamically-imported-module-or-cannot-connect-to-the-iframe
            isolate: false,
          },
        },
        {
          test: {
            name: 'unit',
            globals: true,
            environment: 'jsdom',
            setupFiles: './vitest.setup.ts',
            include: ['**/*.test.{ts,tsx}'],
            exclude: ['src/lib/hash.slow.test.ts', 'node_modules', '.storybook'],
          },
          resolve: {
            alias: {
              '@': path.resolve(__dirname, './src'),
            },
          },
        },
      ],
    },
  })
})
