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

// Keep the document's language declaration in sync with the UI language: screen readers
// pick their speech synthesizer from `lang`, and browsers need it to resolve the correct
// Han glyph variants for `zh-Hans` vs `zh-Hant`.
// Registered before `init` so the initially detected language is applied as well.
i18n.on('languageChanged', (lng) => (document.documentElement.lang = lng))

void i18n.use(LanguageDetector).use(initReactI18next).init({
  resources,
  fallbackLng: 'en',
})

// eslint-disable-next-line unicorn/prefer-export-from -- enables nicer syntax
export default i18n
