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

/**
 * Keeps the document's language declaration in sync with the active UI language.
 *
 * Without this, `<html lang>` keeps the value `index.html` ships (`en`) no matter
 * which language is selected. Screen readers pick their speech synthesizer from
 * `lang`, so translated content would be announced with an English voice (a
 * WCAG 2.2 SC 3.1.1 failure), and browsers would have no signal to pick the
 * correct Han glyph variants for `zh-Hans` vs `zh-Hant`.
 */
const syncDocumentLanguage = () => {
  if (typeof document === 'undefined') return

  const language = i18n.resolvedLanguage || i18n.language
  if (language) {
    document.documentElement.setAttribute('lang', language)
  }
}

// registered before `init` so the initially detected language is applied as well
i18n.on('languageChanged', syncDocumentLanguage)
i18n.on('initialized', syncDocumentLanguage)

void i18n.use(LanguageDetector).use(initReactI18next).init({
  resources,
  fallbackLng: 'en',
})

// eslint-disable-next-line unicorn/prefer-export-from -- enables nicer syntax
export default i18n
