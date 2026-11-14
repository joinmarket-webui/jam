import { describe, expect, it } from 'vitest'
import deTranslation from './locales/de/translation.json'
import enTranslation from './locales/en/translation.json'
import frTranslation from './locales/fr/translation.json'
import itTranslation from './locales/it/translation.json'
import ptBrTranslation from './locales/pt_BR/translation.json'
import ruTranslation from './locales/ru/translation.json'
import zhHansTranslation from './locales/zh_Hans/translation.json'
import zhHantTranslation from './locales/zh_Hant/translation.json'

function flattenKeys(object: Record<string, unknown>, prefix = ''): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(object)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenKeys(value as Record<string, unknown>, fullKey))
    } else {
      result[fullKey] = value
    }
  }
  return result
}

const PLURAL_SUFFIXES = ['_zero', '_one', '_two', '_few', '_many', '_other']

function getPluralBase(key: string): string | null {
  for (const suffix of PLURAL_SUFFIXES) {
    if (key.endsWith(suffix)) {
      return key.slice(0, -suffix.length)
    }
  }
  return null
}

describe('i18n locale keys parity', () => {
  const enKeys = new Set(Object.keys(flattenKeys(enTranslation)))

  const locales: Record<string, Record<string, unknown>> = {
    de: deTranslation,
    fr: frTranslation,
    it: itTranslation,
    pt_BR: ptBrTranslation,
    ru: ruTranslation,
    zh_Hans: zhHansTranslation,
    zh_Hant: zhHantTranslation,
  }

  it.each(Object.entries(locales))('locale %s contains no orphaned keys absent from en', (_locale, data) => {
    const localeKeys = Object.keys(flattenKeys(data))
    const orphaned = localeKeys.filter((key) => {
      if (enKeys.has(key)) return false
      const pluralBase = getPluralBase(key)
      if (pluralBase && (enKeys.has(`${pluralBase}_one`) || enKeys.has(`${pluralBase}_other`))) {
        return false
      }
      return true
    })

    expect(orphaned).toEqual([])
  })
})
