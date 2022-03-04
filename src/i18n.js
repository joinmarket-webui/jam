import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import en from './locales/en/translation.json'
// import de from './locales/de/translation.json'

const resources = {
  en: {
    translation: en,
  },
  // de: {
  //   translation: de,
  // },
}

i18n.use(LanguageDetector).use(initReactI18next).init({
  resources,
  fallbackLng: 'en',
})

export default i18n
