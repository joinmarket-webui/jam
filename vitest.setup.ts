import * as matchers from '@testing-library/jest-dom/matchers'
import { cleanup } from '@testing-library/react'
import { expect, afterEach } from 'vitest'

const TEST_DEFAULT_NUMBER_LOCALE = 'en-US'
const originalNumberToLocaleString = Number.prototype.toLocaleString

Number.prototype.toLocaleString = function (...args: Parameters<typeof Number.prototype.toLocaleString>) {
  const [locales, options] = args
  return originalNumberToLocaleString.call(this, locales ?? TEST_DEFAULT_NUMBER_LOCALE, options)
}

expect.extend(matchers)

afterEach(() => {
  cleanup()
})
