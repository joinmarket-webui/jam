import { vi } from 'vitest'

const OriginalIntlNumberFormat = Intl.NumberFormat
const OriginalIntlDateTimeFormat = Intl.DateTimeFormat
const OriginalIntlRelativeTimeFormat = Intl.RelativeTimeFormat
/* eslint-disable @typescript-eslint/unbound-method -- originals are only ever invoked via `.call(this, ...)` */
const originalDateToLocaleString = Date.prototype.toLocaleString
const originalDateToLocaleDateString = Date.prototype.toLocaleDateString
const originalDateToLocaleTimeString = Date.prototype.toLocaleTimeString
/* eslint-enable @typescript-eslint/unbound-method */

/**
 * Emulates `locale` being the runtime default locale: the runtime falls back to
 * its default locale if none of the requested locales are supported, so
 * `locale` is appended as the last candidate instead of only replacing
 * `undefined`. This keeps e.g. `new Intl.RelativeTimeFormat('xx')` resolving to
 * `locale` and not to the host machine's default locale.
 */
const withDefaultLocale = (locales: Intl.LocalesArgument, locale: string): (string | Intl.Locale)[] => {
  if (locales === undefined) return [locale]
  if (typeof locales === 'string' || locales instanceof Intl.Locale) return [locales, locale]
  return [...locales, locale]
}

/**
 * Runs `callback` with `locale` acting as the runtime default locale, i.e.
 * locale-sensitive APIs called without an explicit locale (or with only
 * unsupported locales) format using `locale` instead of the host machine's
 * default locale. Covered are `Number.prototype.toLocaleString`,
 * `Date.prototype.toLocale{,Date,Time}String`, `Intl.NumberFormat`,
 * `Intl.DateTimeFormat` and `Intl.RelativeTimeFormat`.
 *
 * This keeps locale-dependent assertions deterministic across contributors'
 * machines and CI without pinning a locale in app code. Note that the default
 * locale cannot be pinned via environment variables on all platforms (e.g.
 * Node.js on Windows ignores `LC_ALL`), hence the mocks.
 */
export function withRuntimeLocale(locale: string, callback: () => Promise<void>): Promise<void>
export function withRuntimeLocale(locale: string, callback: () => void): void
export function withRuntimeLocale(locale: string, callback: () => void | Promise<void>): void | Promise<void> {
  /* eslint-disable unicorn/no-this-outside-of-class -- mocking prototype methods requires `this` */
  const mocks = [
    vi.spyOn(Number.prototype, 'toLocaleString').mockImplementation(function (this: number, locales, options) {
      return new OriginalIntlNumberFormat(withDefaultLocale(locales, locale), options).format(this)
    }),
    vi.spyOn(Date.prototype, 'toLocaleString').mockImplementation(function (this: Date, locales, options) {
      return originalDateToLocaleString.call(this, withDefaultLocale(locales, locale), options)
    }),
    vi.spyOn(Date.prototype, 'toLocaleDateString').mockImplementation(function (this: Date, locales, options) {
      return originalDateToLocaleDateString.call(this, withDefaultLocale(locales, locale), options)
    }),
    vi.spyOn(Date.prototype, 'toLocaleTimeString').mockImplementation(function (this: Date, locales, options) {
      return originalDateToLocaleTimeString.call(this, withDefaultLocale(locales, locale), options)
    }),
    vi.spyOn(Intl, 'NumberFormat').mockImplementation(function (
      locales?: Intl.LocalesArgument,
      options?: Intl.NumberFormatOptions,
    ) {
      return new OriginalIntlNumberFormat(withDefaultLocale(locales, locale), options)
    }),
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(function (
      locales?: Intl.LocalesArgument,
      options?: Intl.DateTimeFormatOptions,
    ) {
      return new OriginalIntlDateTimeFormat(withDefaultLocale(locales, locale), options)
    }),
    vi.spyOn(Intl, 'RelativeTimeFormat').mockImplementation(function (
      locales?: Intl.LocalesArgument,
      options?: Intl.RelativeTimeFormatOptions,
    ) {
      return new OriginalIntlRelativeTimeFormat(withDefaultLocale(locales, locale), options)
    }),
  ]
  /* eslint-enable unicorn/no-this-outside-of-class */

  const restore = () => {
    mocks.forEach((mock) => mock.mockRestore())
  }

  let result: void | Promise<void>
  try {
    result = callback()
  } catch (error) {
    restore()
    throw error
  }

  if (result instanceof Promise) {
    return result.finally(restore)
  }

  restore()
  return undefined
}
