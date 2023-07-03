import en from './locales/en/translation.json'
import fr from './locales/fr/translation.json'
import pt_BR from './locales/pt_BR/translation.json'
import zh_Hans from './locales/zh_Hans/translation.json'
import zh_Hant from './locales/zh_Hant/translation.json'
import de from './locales/de/translation.json'

const languages = [
  {
    key: 'en',
    description: 'English',
    translation: en,
  },
  {
    key: 'fr',
    description: 'Français',
    translation: fr,
  },
  {
    key: 'pt-BR',
    description: 'Português (Brasil)',
    translation: pt_BR,
  },
  {
    key: 'zh-Hans',
    description: '中国语文科 (简化字)',
    translation: zh_Hans,
  },
  {
    key: 'zh-Hant',
    description: '繁中国语文科 (繁体字)',
    translation: zh_Hant,
  },
  {
    key: 'de',
    description: 'Deutsch',
    translation: de,
  },
]

export default languages
