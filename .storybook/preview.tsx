import { Suspense } from 'react'
import type { Preview } from '@storybook/react-vite'
import { I18nextProvider } from 'react-i18next'
import i18n from '../src/i18n/config'
import '../src/index.css'

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

// Wrap your stories in the I18nextProvider component
const withI18next = (Story) => {
  return (
    <Suspense fallback={<div>loading translations...</div>}>
      <I18nextProvider i18n={i18n}>
        <Story />
      </I18nextProvider>
    </Suspense>
  )
}

// export decorators for storybook to wrap your stories in
export const decorators = [withI18next]

export default preview
