import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import { playwright } from '@vitest/browser-playwright'
import path from 'node:path'
import { mergeConfig } from 'vite'
import { ConfigEnv, defineConfig, type ViteUserConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default defineConfig((args: ConfigEnv): ViteUserConfig => {
  return mergeConfig(viteConfig(args), {
    test: {
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
          },
        },
        {
          test: {
            name: 'unit',
            globals: true,
            environment: 'jsdom',
            setupFiles: './vitest.setup.ts',
            include: ['**/*.test.{ts,tsx}'],
            exclude: ['node_modules', '.storybook'],
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
