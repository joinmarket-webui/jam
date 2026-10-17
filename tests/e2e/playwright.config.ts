import { defineConfig, devices } from '@playwright/test'
import path from 'node:path'

/**
 * Playwright configuration for isolated JoinMarket NG Regtest Smoke Tests.
 */
export default defineConfig({
  testDir: '.',
  testMatch: /.*\.spec\.ts/,
  timeout: 180_000,
  expect: {
    timeout: 30_000,
  },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: path.resolve(import.meta.dirname, '../../playwright-report'), open: 'never' }],
  ],
  outputDir: path.resolve(import.meta.dirname, '../../test-results'),
  use: {
    baseURL: process.env.JAM_BASE_URL || 'http://localhost:3000',
    locale: 'en-US',
    timezoneId: 'UTC',
    screenshot: 'off',
    // The journey includes passwords and a recovery seed; do not archive those in a trace.
    trace: 'off',
    video: 'off',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
  webServer: process.env.JAM_NO_WEBSERVER
    ? undefined
    : {
        command: 'npm run dev:ng:native -- --port 3000',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          ...process.env,
          JAM_BACKEND: 'joinmarket-ng',
          JMWALLETD_API_PORT: process.env.JMWALLETD_API_PORT || '28183',
          JMOBWATCH_PORT: process.env.JMOBWATCH_PORT || '31800',
        },
      },
})
