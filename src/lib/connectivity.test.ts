import { afterEach, describe, expect, it } from 'vitest'
import { calculateOfflineRetryDelay, isConnectivityError } from './connectivity'

const setNavigatorOnline = (value: boolean) => {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value,
  })
}

afterEach(() => {
  setNavigatorOnline(true)
})

describe('isConnectivityError', () => {
  it('returns true when browser is offline', () => {
    setNavigatorOnline(false)
    expect(isConnectivityError(new Error('Any error message'))).toBe(true)
  })

  it('detects common network/unreachable error messages', () => {
    expect(isConnectivityError(new Error('Failed to fetch'))).toBe(true)
    expect(isConnectivityError({ message: 'Network request failed' })).toBe(true)
    expect(isConnectivityError({ message: 'ECONNREFUSED' })).toBe(true)
  })

  it('returns false for non-connectivity errors', () => {
    expect(isConnectivityError({ message: 'Request failed with status 400' })).toBe(false)
  })
})

describe('calculateOfflineRetryDelay', () => {
  it('uses exponential backoff with a max cap', () => {
    expect(calculateOfflineRetryDelay(1)).toBe(2_000)
    expect(calculateOfflineRetryDelay(2)).toBe(4_000)
    expect(calculateOfflineRetryDelay(3)).toBe(8_000)
    expect(calculateOfflineRetryDelay(10)).toBe(60_000)
  })
})
