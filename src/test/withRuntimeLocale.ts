import { vi } from 'vitest'

const OriginalIntlNumberFormat = Intl.NumberFormat

/**
 * Runs `callback` with `Number.prototype.toLocaleString` and `Intl.NumberFormat`
 * mocked so that calls without an explicit locale argument format using
 * `locale` instead of the host machine's default locale. Calls that already
 * pass an explicit locale are left untouched. This keeps locale-dependent
 * assertions deterministic across contributors' machines and CI without
 * pinning a locale in app code.
 */
export function withRuntimeLocale(locale: string, callback: () => Promise<void>): Promise<void>
export function withRuntimeLocale(locale: string, callback: () => void): void
export function withRuntimeLocale(locale: string, callback: () => void | Promise<void>): void | Promise<void> {
  /* eslint-disable unicorn/no-this-outside-of-class -- mocking Number.prototype.toLocaleString requires `this` */
  const numberToLocaleStringMock = vi.spyOn(Number.prototype, 'toLocaleString').mockImplementation(function (
    this: number,
    locales,
    options,
  ) {
    return Intl.NumberFormat(locales ?? locale, options).format(this)
  })
  /* eslint-enable unicorn/no-this-outside-of-class */

  const intlNumberFormatMock = vi.spyOn(Intl, 'NumberFormat').mockImplementation(function (
    locales?: string | string[],
    options?: Intl.NumberFormatOptions,
  ) {
    return new OriginalIntlNumberFormat(locales ?? locale, options)
  } as unknown as typeof Intl.NumberFormat)

  const restore = () => {
    numberToLocaleStringMock.mockRestore()
    intlNumberFormatMock.mockRestore()
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
