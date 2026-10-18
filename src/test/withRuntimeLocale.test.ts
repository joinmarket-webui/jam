import { describe, expect, it } from 'vitest'
import { withRuntimeLocale } from './withRuntimeLocale'

const DATE = new Date(Date.UTC(2025, 0, 15, 13, 5))
const UTC: Intl.DateTimeFormatOptions = { timeZone: 'UTC' }

// Taken before any test runs, so a leak from one test cannot hide in the next.
const ORIGINAL_DEFAULT_LOCALE = new Intl.NumberFormat().resolvedOptions().locale

describe('withRuntimeLocale', () => {
  it('uses the given locale for numbers formatted without an explicit locale', () => {
    withRuntimeLocale('de-DE', () => {
      expect((1234567.5).toLocaleString()).toBe('1.234.567,5')
      expect(new Intl.NumberFormat().format(1234567.5)).toBe('1.234.567,5')
      expect(new Intl.NumberFormat(undefined, { minimumFractionDigits: 2 }).format(1)).toBe('1,00')
      expect(new Intl.NumberFormat().formatToParts(0.5).find((part) => part.type === 'decimal')?.value).toBe(',')
    })
  })

  it('uses the given locale for dates formatted without an explicit locale', () => {
    withRuntimeLocale('de-DE', () => {
      expect(DATE.toLocaleDateString(undefined, { ...UTC, month: 'long', day: 'numeric', year: 'numeric' })).toBe(
        '15. Januar 2025',
      )
      expect(DATE.toLocaleTimeString(undefined, UTC)).toBe('13:05:00')
      expect(DATE.toLocaleString(undefined, UTC)).toBe('15.1.2025, 13:05:00')
      expect(new Intl.DateTimeFormat(undefined, { ...UTC, month: 'long' }).format(DATE)).toBe('Januar')
    })
  })

  it('uses the given locale for relative times formatted without an explicit locale', () => {
    withRuntimeLocale('de-DE', () => {
      expect(new Intl.RelativeTimeFormat().format(1, 'day')).toBe('in 1 Tag')
    })
  })

  it('leaves explicitly requested supported locales untouched', () => {
    withRuntimeLocale('de-DE', () => {
      expect((1234567.5).toLocaleString('en-US')).toBe('1,234,567.5')
      expect(new Intl.NumberFormat('en-IN').format(1234567.5)).toBe('12,34,567.5')
      expect(DATE.toLocaleDateString('en-US', { ...UTC, month: 'long' })).toBe('January')
      expect(new Intl.RelativeTimeFormat('fr').format(1, 'day')).toBe('dans 1 jour')
    })
  })

  it('falls back to the given locale if no requested locale is supported', () => {
    withRuntimeLocale('de-DE', () => {
      expect(new Intl.RelativeTimeFormat('xx').format(1, 'day')).toBe('in 1 Tag')
      expect(new Intl.NumberFormat('xx').format(1.5)).toBe('1,5')
      expect(DATE.toLocaleDateString('xx', { ...UTC, month: 'long' })).toBe('Januar')
    })
    withRuntimeLocale('en-US', () => {
      expect(new Intl.RelativeTimeFormat('xx').format(1, 'day')).toBe('in 1 day')
    })
  })

  it('restores the original default locale afterwards', () => {
    withRuntimeLocale('ar-EG', () => {
      expect(new Intl.NumberFormat().resolvedOptions().locale).toBe('ar-EG')
    })

    expect(new Intl.NumberFormat().resolvedOptions().locale).toBe(ORIGINAL_DEFAULT_LOCALE)
  })

  it('restores the original default locale when the callback throws', () => {
    expect(() =>
      withRuntimeLocale('ar-EG', () => {
        throw new Error('boom')
      }),
    ).toThrow('boom')

    expect(new Intl.NumberFormat().resolvedOptions().locale).toBe(ORIGINAL_DEFAULT_LOCALE)
  })

  it('restores the original default locale after an async callback', async () => {
    await withRuntimeLocale('ar-EG', async () => {
      await Promise.resolve()
      expect(new Intl.DateTimeFormat().resolvedOptions().locale).toBe('ar-EG')
    })

    expect(new Intl.DateTimeFormat().resolvedOptions().locale).toBe(ORIGINAL_DEFAULT_LOCALE)
  })
})
