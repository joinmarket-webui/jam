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

i18n.use(LanguageDetector).use(initReactI18next).init({
  resources,
  fallbackLng: 'en',
})

export default i18n
