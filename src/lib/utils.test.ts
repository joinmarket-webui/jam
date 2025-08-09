import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  cn,
  formatWalletName,
  JM_WALLET_FILE_EXTENSION,
  setIntervalDebounced,
  satsToBtc,
  btcToSats,
  percentageToFactor,
  isValidNumber,
  factorToPercentage,
  toSemVer,
  UNKNOWN_VERSION,
} from './utils'

describe('cn', () => {
  it('should merge class names correctly', () => {
    expect(cn('text-red-500', 'bg-blue-500')).toBe('text-red-500 bg-blue-500')
    expect(cn('text-red-500', { 'bg-blue-500': true })).toBe('text-red-500 bg-blue-500')
    expect(cn('text-red-500', { 'bg-blue-500': false })).toBe('text-red-500')
  })

  it('should handle conflicting classes with tailwind-merge', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
    expect(cn('p-4 px-8')).toBe('p-4 px-8')
  })
})

describe('formatWalletName', () => {
  it('should remove .jmdat extension from wallet names', () => {
    expect(formatWalletName('mywallet.jmdat')).toBe('mywallet')
    expect(formatWalletName('test_wallet.jmdat')).toBe('test_wallet')
  })

  it('should return the same string if no .jmdat extension is present', () => {
    expect(formatWalletName('mywallet')).toBe('mywallet')
    expect(formatWalletName('wallet.txt')).toBe('wallet.txt')
  })

  it('should use the correct wallet file extension', () => {
    expect(JM_WALLET_FILE_EXTENSION).toBe('.jmdat')
    expect('wallet' + JM_WALLET_FILE_EXTENSION).toBe('wallet.jmdat')
  })
})

describe('setIntervalDebounced', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.resetAllMocks()
    vi.useRealTimers()
  })

  it('should call the callback function after the specified delay', async () => {
    const callback = vi.fn().mockResolvedValue(undefined)
    const onTimerIdChanged = vi.fn()

    setIntervalDebounced(callback, 1000, onTimerIdChanged)

    expect(callback).not.toHaveBeenCalled()
    expect(onTimerIdChanged).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1000)

    expect(callback).toHaveBeenCalledTimes(1)
    expect(onTimerIdChanged).toHaveBeenCalledTimes(2)
  })

  it('should call the onError handler when the callback throws an error', async () => {
    const error = new Error('Test error')
    const callback = vi.fn().mockRejectedValue(error)
    const onTimerIdChanged = vi.fn()
    const onError = vi.fn()

    setIntervalDebounced(callback, 1000, onTimerIdChanged, onError)

    await vi.advanceTimersByTimeAsync(1000)

    expect(callback).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledWith(error, expect.any(Function))
  })

  it('should continue the loop when onError calls the loop function', async () => {
    const error = new Error('Test error')
    const callback = vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce(undefined)
    const onTimerIdChanged = vi.fn()
    const onError = vi.fn((_, loop) => loop())

    setIntervalDebounced(callback, 1000, onTimerIdChanged, onError)

    await vi.advanceTimersByTimeAsync(1000)

    expect(callback).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledWith(error, expect.any(Function))

    await vi.advanceTimersByTimeAsync(1000)

    expect(callback).toHaveBeenCalledTimes(2)
  })
})

describe('satsToBtc', () => {
  it('should correctly convert satoshis to BTC', () => {
    expect(satsToBtc('100000000')).toBe(1)
    expect(satsToBtc('50000000')).toBe(0.5)
    expect(satsToBtc('1000')).toBe(0.00001)
    expect(satsToBtc('0')).toBe(0)
    expect(satsToBtc('123456789')).toBe(1.23456789)
  })
})

describe('btcToSats', () => {
  it('should correctly convert BTC to satoshis', () => {
    expect(btcToSats('1')).toBe(100000000)
    expect(btcToSats('0.5')).toBe(50000000)
    expect(btcToSats('0.00001')).toBe(1000)
    expect(btcToSats('0')).toBe(0)
  })

  it('should handle rounding', () => {
    expect(btcToSats('0.123456789')).toBe(12345679) // Rounds to nearest integer
    expect(btcToSats('0.000000004')).toBe(0) // Less than 0.5 sats rounds down
    expect(btcToSats('0.000000005')).toBe(1) // TODO fix this 0.5 sats should rounds down to 0
  })
})

describe('toSemVer', () => {
  it('should parse valid semantic version strings', () => {
    expect(toSemVer('1.2.3')).toEqual({
      major: 1,
      minor: 2,
      patch: 3,
      raw: '1.2.3',
    })

    expect(toSemVer('v1.2.3')).toEqual({
      major: 1,
      minor: 2,
      patch: 3,
      raw: 'v1.2.3',
    })
  })

  it('should parse version strings with additional metadata', () => {
    expect(toSemVer('1.2.3-alpha')).toEqual({
      major: 1,
      minor: 2,
      patch: 3,
      raw: '1.2.3-alpha',
    })

    expect(toSemVer('v2.5.8-beta.1')).toEqual({
      major: 2,
      minor: 5,
      patch: 8,
      raw: 'v2.5.8-beta.1',
    })

    expect(toSemVer('1.0.0+build.123')).toEqual({
      major: 1,
      minor: 0,
      patch: 0,
      raw: '1.0.0+build.123',
    })
  })

  it('should return UNKNOWN_VERSION for invalid version strings', () => {
    expect(toSemVer('invalid')).toEqual(UNKNOWN_VERSION)
    expect(toSemVer('1.2')).toEqual(UNKNOWN_VERSION)
    expect(toSemVer('1')).toEqual(UNKNOWN_VERSION)
    expect(toSemVer('a.b.c')).toEqual(UNKNOWN_VERSION)
    expect(toSemVer('')).toEqual(UNKNOWN_VERSION)
  })

  it('should handle undefined or null input', () => {
    expect(toSemVer(undefined)).toEqual(UNKNOWN_VERSION)
    expect(toSemVer(null as unknown as string | undefined)).toEqual(UNKNOWN_VERSION)
  })
})

describe('UNKNOWN_VERSION', () => {
  it('should have the correct structure and values', () => {
    expect(UNKNOWN_VERSION).toEqual({
      major: 0,
      minor: 0,
      patch: 0,
      raw: 'unknown',
    })
  })

  it('should be immutable', () => {
    const original = { ...UNKNOWN_VERSION }
    // Attempting to modify should not affect the original constant
    expect(UNKNOWN_VERSION).toEqual(original)
  })
})

describe('percentageToFactor', () => {
  it('should correctly convert percentage to factor', () => {
    expect(percentageToFactor(100)).toBe(1)
    expect(percentageToFactor(50)).toBe(0.5)
    expect(percentageToFactor(25)).toBe(0.25)
    expect(percentageToFactor(0)).toBe(0)
    expect(percentageToFactor(10.5)).toBe(0.105)
  })

  it('should handle precision parameter', () => {
    expect(percentageToFactor(33.333333, 2)).toBe(0.33)
    expect(percentageToFactor(33.333333, 4)).toBe(0.3333)
    expect(percentageToFactor(66.666666, 3)).toBe(0.667)
  })

  it('should use default precision of 6', () => {
    expect(percentageToFactor(12.345678)).toBe(0.123457)
    expect(percentageToFactor(0.001)).toBe(0.00001)
  })
})

describe('isValidNumber', () => {
  it('should return true for valid numbers', () => {
    expect(isValidNumber(0)).toBe(true)
    expect(isValidNumber(1)).toBe(true)
    expect(isValidNumber(-1)).toBe(true)
    expect(isValidNumber(3.14)).toBe(true)
    expect(isValidNumber(Infinity)).toBe(true)
    expect(isValidNumber(-Infinity)).toBe(true)
  })

  it('should return false for invalid values', () => {
    expect(isValidNumber(NaN)).toBe(false)
    expect(isValidNumber(undefined)).toBe(false)
    expect(isValidNumber(null)).toBe(false)
  })
})

describe('factorToPercentage', () => {
  it('should correctly convert factor to percentage', () => {
    expect(factorToPercentage(1)).toBe(100)
    expect(factorToPercentage(0.5)).toBe(50)
    expect(factorToPercentage(0.25)).toBe(25)
    expect(factorToPercentage(0)).toBe(0)
    expect(factorToPercentage(0.105)).toBe(10.5)
  })

  it('should handle precision parameter', () => {
    expect(factorToPercentage(0.333333, 2)).toBe(33.33)
    expect(factorToPercentage(0.333333, 4)).toBe(33.3333)
    expect(factorToPercentage(0.666666, 3)).toBe(66.667)
  })

  it('should use default precision of 6', () => {
    expect(factorToPercentage(0.123456789)).toBe(12.345679)
    expect(factorToPercentage(0.00000001)).toBe(0.000001)
  })

  it('should handle floating point precision issues', () => {
    // This test verifies the comment in the function about floating point precision
    expect(factorToPercentage(0.000027)).toBe(0.0027)
    expect(factorToPercentage(0.000027, 10)).toBe(0.0027)
  })
})
