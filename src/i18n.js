import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import en from './locales/en/translation.json'
// import de from './locales/de/translation.json'

export const supportedLanguages = [
  {
    key: 'en',
    description: 'English',
    translation: en,
  },
  // {
  //   key: 'de',
  //   description: 'Deutsch',
  //   translation: de,
  // },
]

const resources = supportedLanguages.reduce((acc, lng) => {
  return {
    ...acc,
    [lng['key']]: { translation: lng['translation'] },
  }
}, {})

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: [
      'en',
      // 'de'
    ],
  })

export default i18n
