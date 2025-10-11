import { Suspense, useEffect } from 'react'
import type { Preview } from '@storybook/react-vite'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { I18nextProvider } from 'react-i18next'
import i18n from '../src/i18n/config'
import '../src/index.css'

// Create a global variable called locale in storybook
// and add a menu in the toolbar to change your locale
export const globalTypes = {
  locale: {
    name: 'Locale',
    description: 'Internationalization locale',
    toolbar: {
      icon: 'globe',
      items: [
        { value: 'en', title: 'en' },
        { value: 'fr', title: 'fr' },
        { value: 'it', title: 'it' },
        { value: 'de', title: 'de' },
        { value: 'pt-BR', title: 'pt-BR' },
        { value: 'ru', title: 'ru' },
        { value: 'zh-Hans', title: 'zh-Hans' },
        { value: 'zh-Hant', title: 'zh-Hant' },
      ],
      showName: true,
    },
  },
}

const preview: Preview = {
  parameters: {
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

const withI18next = (Story, context) => {
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

const withQueryClient = (Story) => {
  const queryClient = new QueryClient()
  return (
    <QueryClientProvider client={queryClient}>
      <Story />
    </QueryClientProvider>
  )
}

// export decorators for storybook to wrap your stories in
export const decorators = [withI18next, withQueryClient]

export default preview
