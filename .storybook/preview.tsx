/// <reference types="vite/types/importMeta.d.ts" />
import { Suspense, useEffect } from 'react'
import type { Preview } from '@storybook/react-vite'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { mswLoader } from 'msw-storybook-addon/csf3'
import { setupWorker } from 'msw/browser'
import { ThemeProvider } from 'next-themes'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import type { CoreTypes, GlobalTypes } from 'storybook/internal/csf'
import { DEFAULT_VIEWPORT, MINIMAL_VIEWPORTS, INITIAL_VIEWPORTS } from 'storybook/viewport'
import { JamDisplayContextProvider } from '../src/context/JamDisplayContextProvider'
import { JamSessionInfoContextProvider } from '../src/context/JamSessionInfoContextProvider'
import { JamWalletInfoContextProvider } from '../src/context/JamWalletInfoContextProvider'
import i18n from '../src/i18n/config'
import '../src/index.css'
import mswHandlers from './msw-handlers'

// needed if you want to use msw on a subpath (e.g. github pages /<repo>)
const mswServiceWorkerUrl = import.meta.env.STORYBOOK_MSW_SERVICE_WORKER_URL ?? '/mockServiceWorker.js'

const locales = [
  { value: 'en', title: 'en' },
  { value: 'fr', title: 'fr' },
  { value: 'it', title: 'it' },
  { value: 'de', title: 'de' },
  { value: 'pt-BR', title: 'pt-BR' },
  { value: 'ru', title: 'ru' },
  { value: 'zh-Hans', title: 'zh-Hans' },
  { value: 'zh-Hant', title: 'zh-Hant' },
]

// Create a global variable called locale in storybook
// and add a menu in the toolbar to change your locale
const globalTypes: GlobalTypes = {
  locale: {
    name: 'Locale',
    description: 'Internationalization locale',
    defaultValue: 'en',
    toolbar: {
      icon: 'globe',
      items: locales,
    },
  },
}

type GlobalContext = {
  globals: {
    locale: (typeof locales)[number]['value']
    backgrounds: NonNullable<NonNullable<CoreTypes['parameters']['backgrounds']>['options']>[string]
  }
}

const preview: Preview = {
  initialGlobals: {
    viewport: { value: DEFAULT_VIEWPORT, isRotated: false },
    backgrounds: { value: 'dark' },
  },
  parameters: {
    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo',
    },
    backgrounds: {
      options: {
        dark: { name: 'Dark', value: '#181b20' },
        light: { name: 'Light', value: '#ffffff' },
      },
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    viewport: {
      options: { ...MINIMAL_VIEWPORTS, ...INITIAL_VIEWPORTS },
    },
    // this approach is deprecated as of v3.0.0
    // but it seems the new approach does not work as expected (404 response for our handlers)
    // revisit after next update (last checked 2026-07-30)
    // see: https://github.com/mswjs/msw-storybook-addon/blob/v3.0.0/MIGRATION.md#parametersmsw-is-deprecated-in-favor-of-beforeeach
    msw: {
      handlers: mswHandlers,
    },
  },
  // Provide the MSW addon loader globally
  loaders: [
    mswLoader(async () => {
      const worker = setupWorker()
      await worker.start({
        onUnhandledRequest: 'bypass',
        serviceWorker: {
          url: mswServiceWorkerUrl,
        },
        quiet: true,
      })
      return worker
    }),
  ],
  globalTypes,
}

const withTheme = (Story: React.ComponentType, context: GlobalContext) => {
  const { backgrounds } = context.globals
  return (
    <ThemeProvider forcedTheme={backgrounds.value}>
      <Story />
    </ThemeProvider>
  )
}

const withMemoryRouter = (Story: React.ComponentType, context: GlobalContext) => {
  return (
    <MemoryRouter>
      <Story />
    </MemoryRouter>
  )
}

const withI18next = (Story: React.ComponentType, context: GlobalContext) => {
  const { locale } = context.globals

  useEffect(() => {
    i18n.changeLanguage(locale)
  }, [locale])

  return (
    <Suspense fallback={<div>loading translations...</div>}>
      <I18nextProvider i18n={i18n}>
        <Story />
      </I18nextProvider>
    </Suspense>
  )
}

const queryClient = new QueryClient()
export const withQueryClient = (Story: React.ComponentType) => {
  return (
    <QueryClientProvider client={queryClient}>
      <Story />
    </QueryClientProvider>
  )
}

export const withJamDisplayContext = (Story: React.ComponentType) => {
  return (
    <JamDisplayContextProvider>
      <Story />
    </JamDisplayContextProvider>
  )
}

export const withJamSessionInfoContext = (Story: React.ComponentType) => {
  return (
    <JamSessionInfoContextProvider>
      <Story />
    </JamSessionInfoContextProvider>
  )
}

export const withJamWalletInfoContext = (Story: React.ComponentType) => {
  return (
    <JamWalletInfoContextProvider walletFileName={'Satoshi.jmdat'}>
      <Story />
    </JamWalletInfoContextProvider>
  )
}



export const decorators = [
  withTheme,
  withMemoryRouter,
  withI18next,
  withJamWalletInfoContext,
  withJamSessionInfoContext,
  withQueryClient,
  withJamDisplayContext,
]

preview.decorators = decorators

export default preview
