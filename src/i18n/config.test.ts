import { describe, expect, it } from 'vitest'
import i18n from './config'

describe('i18n config', () => {
  it('declares the initially detected language on the document', () => {
    expect(document.documentElement.lang).toBe(i18n.language)
  })

  it('keeps <html lang> in sync when the language changes', async () => {
    await i18n.changeLanguage('de')
    expect(document.documentElement.lang).toBe('de')

    await i18n.changeLanguage('ru')
    expect(document.documentElement.lang).toBe('ru')

    await i18n.changeLanguage('en')
    expect(document.documentElement.lang).toBe('en')
  })

  it('preserves the script subtag so Han glyph variants resolve correctly', async () => {
    await i18n.changeLanguage('zh-Hant')
    expect(document.documentElement.lang).toBe('zh-Hant')

    await i18n.changeLanguage('zh-Hans')
    expect(document.documentElement.lang).toBe('zh-Hans')
  })

  it('keeps regional variants of a shipped language', async () => {
    await i18n.changeLanguage('de-AT')
    expect(i18n.t('global.cancel')).toBe('Abbrechen')
    expect(document.documentElement.lang).toBe('de-AT')
  })
})
