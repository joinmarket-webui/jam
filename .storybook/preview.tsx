import { Suspense, useEffect } from 'react'
import type { Preview } from '@storybook/react-vite'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import { CoreTypes, GlobalTypes } from 'storybook/internal/csf'
import { JamDisplayContextProvider } from '../src/context/JamDisplayContextProvider'
import i18n from '../src/i18n/config'
import '../src/index.css'

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
    backgrounds: { value: 'dark' },
  },
  parameters: {
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
    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo',
    },
  },
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

export const withQueryClient = (Story: React.ComponentType) => {
  const queryClient = new QueryClient()
  return (
    <QueryClientProvider client={queryClient}>
      <Story />
    </QueryClientProvider>
  )
}

export const withJamDisplayContent = (Story: React.ComponentType) => {
  const queryClient = new QueryClient()
  return (
    <JamDisplayContextProvider>
      <Story />
    </JamDisplayContextProvider>
  )
}

// export decorators for storybook to wrap your stories in
export const decorators = [withTheme, withMemoryRouter, withI18next, withQueryClient, withJamDisplayContent]

export default preview
