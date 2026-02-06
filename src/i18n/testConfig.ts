import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

void i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  resources: { en: { translations: {} } },
})

// eslint-disable-next-line unicorn/prefer-export-from -- enables nicer syntax
export default i18n
