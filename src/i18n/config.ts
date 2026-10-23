import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import languages from './languages'

const resources = languages.reduce((acc, lng) => {
  return {
    ...acc,
    [lng['key']]: { translation: lng['translation'] },
  }
}, {})

// Keep the document's language declaration in sync for screen readers.
// Registered before `init` so the initially detected language is applied as well.
i18n.on('languageChanged', (lng) => (document.documentElement.lang = lng))

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      // React escapes rendered text already. Escaping here again would show
      // entities like `&#x2F;` or `&#39;` in place of interpolated values.
      escapeValue: false,
    },
  })

// eslint-disable-next-line unicorn/prefer-export-from -- enables nicer syntax
export default i18n
