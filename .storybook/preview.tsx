/// <reference types="vite/types/importMeta.d.ts" />
import { Suspense, useEffect } from 'react'
import type { Preview } from '@storybook/react-vite'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { initialize, mswLoader } from 'msw-storybook-addon'
import { ThemeProvider } from 'next-themes'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import type { CoreTypes, GlobalTypes } from 'storybook/internal/csf'
import { DEFAULT_VIEWPORT, MINIMAL_VIEWPORTS, INITIAL_VIEWPORTS } from 'storybook/viewport'
import { JamDisplayContextProvider } from '../src/context/JamDisplayContextProvider'
import { JamWalletInfoContextProvider } from '../src/context/JamWalletInfoContextProvider'
import i18n from '../src/i18n/config'
import '../src/index.css'
import mswHandlers from './msw-handlers'

// needed if you want to use msw on a subpath (e.g. github pages /<repo>)
const mswServiceWorkerUrl = import.meta.env.STORYBOOK_MSW_SERVICE_WORKER_URL ?? '/mockServiceWorker.js'

// Initialize MSW (https://github.com/mswjs/msw-storybook-addon)
initialize({
  onUnhandledRequest: 'bypass',
  serviceWorker: {
    url: mswServiceWorkerUrl,
  },
  quiet: true,
})

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
export const globalTypes: GlobalTypes = {
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
    msw: {
      handlers: mswHandlers,
    },
  },
  // Provide the MSW addon loader globally
  loaders: [mswLoader],
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

export const withJamWalletInfoContext = (Story: React.ComponentType) => {
  return (
    <JamWalletInfoContextProvider walletFileName={'Satoshi.jmdat'}>
      <Story />
    </JamWalletInfoContextProvider>
  )
}

// export decorators for storybook to wrap your stories in
export const decorators = [
  withTheme,
  withMemoryRouter,
  withI18next,
  withJamWalletInfoContext,
  withQueryClient,
  withJamDisplayContext,
]

export default preview
