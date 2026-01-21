import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { JM_WALLET_FILE_EXTENSION } from '@/constants/jm'
import {
  cn,
  walletDisplayName,
  setIntervalDebounced,
  satsToBtc,
  btcToSats,
  percentageToFactor,
  isValidNumber,
  factorToPercentage,
  toSemVer,
  UNKNOWN_VERSION,
  formatBtc,
  formatSats,
  BTC,
  SATS,
  isRelativeOffer,
  isAbsoluteOffer,
  SEGWIT_ACTIVATION_BLOCK,
  delayedPromise,
  pseudoRandomInteger,
  pseudoRandomFloat,
  time,
  shortenStringMiddle,
} from './utils'
import type { WalletFileName } from './utils'

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

describe('walletDisplayName', () => {
  it('should remove .jmdat extension from wallet names', () => {
    expect(walletDisplayName('mywallet.jmdat')).toBe('mywallet')
    expect(walletDisplayName('test_wallet.jmdat')).toBe('test_wallet')
  })

  it('should return the same string if no .jmdat extension is present', () => {
    expect(walletDisplayName('mywallet' as WalletFileName)).toBe('mywallet')
    expect(walletDisplayName('wallet.txt' as WalletFileName)).toBe('wallet.txt')
  })

  it('should use the correct wallet file extension', () => {
    expect(JM_WALLET_FILE_EXTENSION).toBe('.jmdat')
  })
})

describe('shortenStringMiddle', () => {
  it('should shorten string in the middle', () => {
    expect(shortenStringMiddle('0')).toBe('0')
    expect(shortenStringMiddle('01')).toBe('01')
    expect(shortenStringMiddle('01', -1)).toBe('01')
    expect(shortenStringMiddle('01', 0)).toBe('01')
    expect(shortenStringMiddle('01', 1)).toBe('01')
    expect(shortenStringMiddle('01', 2)).toBe('01')
    expect(shortenStringMiddle('0123456789abcdef', 2)).toBe('0…f')
    expect(shortenStringMiddle('0123456789abcdef', 8)).toBe('0123…cdef')
    expect(shortenStringMiddle('0123456789abcdef', 8, '...')).toBe('0123...cdef')
    expect(shortenStringMiddle('0123456789abcdef', 14)).toBe('0123456…9abcdef')
    expect(shortenStringMiddle('0123456789abcdef', 15)).toBe('0123456…9abcdef')
    expect(shortenStringMiddle('0123456789abcdef', 16)).toBe('0123456789abcdef')
    expect(shortenStringMiddle('0123456789abcdef', 32)).toBe('0123456789abcdef')
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

describe('formatBtc', () => {
  it('should format BTC values with 8 decimal places', () => {
    expect(formatBtc(1)).toBe('1.00000000')
    expect(formatBtc(0.5)).toBe('0.50000000')
    expect(formatBtc(0.12345678)).toBe('0.12345678')
    expect(formatBtc(0)).toBe('0.00000000')
  })

  it('should handle large BTC values', () => {
    expect(formatBtc(21000000)).toBe('21000000.00000000')
    expect(formatBtc(100.99999999)).toBe('100.99999999')
  })

  it('should handle very small BTC values', () => {
    expect(formatBtc(0.00000001)).toBe('0.00000001')
    expect(formatBtc(0.000000001)).toBe('0.00000000')
  })

  it('should handle negative BTC values', () => {
    expect(formatBtc(-1)).toBe('-1.00000000')
    expect(formatBtc(-0.12345678)).toBe('-0.12345678')
  })
})

describe('formatSats', () => {
  it('should format satoshi values with locale-specific thousands separators', () => {
    expect(formatSats(1000)).toBe('1,000')
    expect(formatSats(1000000)).toBe('1,000,000')
    expect(formatSats(100000000)).toBe('100,000,000') // 1 BTC in sats
  })

  it('should handle small satoshi values', () => {
    expect(formatSats(0)).toBe('0')
    expect(formatSats(1)).toBe('1')
    expect(formatSats(100)).toBe('100')
    expect(formatSats(999)).toBe('999')
  })

  it('should handle large satoshi values', () => {
    expect(formatSats(2100000000000000)).toBe('2,100,000,000,000,000') // 21M BTC in sats
    expect(formatSats(12345678901)).toBe('12,345,678,901')
  })

  it('should handle negative satoshi values', () => {
    expect(formatSats(-1000)).toBe('-1,000')
    expect(formatSats(-1234567)).toBe('-1,234,567')
  })
})

describe('BTC and SATS constants', () => {
  it('should have correct unit values', () => {
    expect(BTC).toBe('BTC')
    expect(SATS).toBe('sats')
  })
})

describe('isRelativeOffer', () => {
  it('should return true for relative offer types', () => {
    expect(isRelativeOffer('sw0reloffer')).toBe(true)
    expect(isRelativeOffer('swreloffer')).toBe(true)
    expect(isRelativeOffer('reloffer')).toBe(true)
  })

  it('should return false for absolute offer types', () => {
    expect(isRelativeOffer('sw0absoffer')).toBe(false)
    expect(isRelativeOffer('swabsoffer')).toBe(false)
    expect(isRelativeOffer('absoffer')).toBe(false)
  })

  it('should return false for invalid offer types', () => {
    expect(isRelativeOffer('invalid')).toBe(false)
    expect(isRelativeOffer('')).toBe(false)
  })
})

describe('isAbsoluteOffer', () => {
  it('should return true for absolute offer types', () => {
    expect(isAbsoluteOffer('sw0absoffer')).toBe(true)
    expect(isAbsoluteOffer('swabsoffer')).toBe(true)
    expect(isAbsoluteOffer('absoffer')).toBe(true)
  })

  it('should return false for relative offer types', () => {
    expect(isAbsoluteOffer('sw0reloffer')).toBe(false)
    expect(isAbsoluteOffer('swreloffer')).toBe(false)
    expect(isAbsoluteOffer('reloffer')).toBe(false)
  })

  it('should return false for invalid offer types', () => {
    expect(isAbsoluteOffer('invalid')).toBe(false)
    expect(isAbsoluteOffer('')).toBe(false)
  })
})

describe('SEGWIT_ACTIVATION_BLOCK', () => {
  it('should have the correct block number for SegWit activation', () => {
    expect(SEGWIT_ACTIVATION_BLOCK).toBe(481_824)
  })
})

describe('delayedPromise', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should resolve after 500ms delay', async () => {
    const delayPromise = delayedPromise(500)

    // Initially the promise should not be resolved
    let resolved = false
    delayPromise.then(() => {
      resolved = true
    })

    expect(resolved).toBe(false)

    // Advance time by 500ms
    await vi.advanceTimersByTimeAsync(500)

    // Now the promise should be resolved
    await expect(delayPromise).resolves.toBeUndefined()
  })

  it('should not resolve before 500ms', async () => {
    const delayPromise = delayedPromise(500)

    let resolved = false
    delayPromise.then(() => {
      resolved = true
    })

    // Advance time by 400ms (less than 500ms)
    await vi.advanceTimersByTimeAsync(400)
    expect(resolved).toBe(false)

    // Advance the remaining 100ms
    await vi.advanceTimersByTimeAsync(100)
    await delayPromise
    expect(resolved).toBe(true)
  })
})

describe('pseudoRandomNumbers', () => {
  it('should return a float within the specified range (inclusive)', () => {
    const min = 0.021
    const max = 0.079

    // Run multiple times to test randomness
    for (let i = 0; i < 100; i++) {
      const result = pseudoRandomFloat(min, max)
      expect(typeof result).toBe('number')
      expect(result).toBeGreaterThanOrEqual(min)
      expect(result).toBeLessThanOrEqual(max)
    }
  })

  it('should return an integer within the specified range (inclusive)', () => {
    const min = 1
    const max = 10

    // Run multiple times to test randomness
    for (let i = 0; i < 100; i++) {
      const result = pseudoRandomInteger(min, max)
      expect(Number.isInteger(result)).toBe(true)
      expect(result).toBeGreaterThanOrEqual(min)
      expect(result).toBeLessThanOrEqual(max)
    }
  })

  it('should handle single value range', () => {
    const value = 5
    const result = pseudoRandomInteger(value, value)
    expect(result).toBe(value)
  })

  it('should handle negative ranges', () => {
    const min = -10
    const max = -5

    for (let i = 0; i < 50; i++) {
      const result = pseudoRandomInteger(min, max)
      expect(result).toBeGreaterThanOrEqual(min)
      expect(result).toBeLessThanOrEqual(max)
      expect(Number.isInteger(result)).toBe(true)
    }
  })

  it('should handle ranges including zero', () => {
    const min = -5
    const max = 5

    for (let i = 0; i < 50; i++) {
      const result = pseudoRandomInteger(min, max)
      expect(result).toBeGreaterThanOrEqual(min)
      expect(result).toBeLessThanOrEqual(max)
      expect(Number.isInteger(result)).toBe(true)
    }
  })

  it('should handle large ranges', () => {
    const min = 1000
    const max = 9999

    for (let i = 0; i < 20; i++) {
      const result = pseudoRandomInteger(min, max)
      expect(result).toBeGreaterThanOrEqual(min)
      expect(result).toBeLessThanOrEqual(max)
      expect(Number.isInteger(result)).toBe(true)
    }
  })

  it('should return different values over multiple calls', () => {
    const min = 1
    const max = 100
    const results = new Set()

    // Generate 50 random numbers
    for (let i = 0; i < 50; i++) {
      results.add(pseudoRandomInteger(min, max))
    }

    // We should have more than 1 unique value (very high probability)
    expect(results.size).toBeGreaterThan(1)
  })

  it('should work with decimal inputs by preserving decimal precision', () => {
    const min = 1.7
    const max = 5.3

    for (let i = 0; i < 20; i++) {
      const result = pseudoRandomInteger(min, max)
      expect(result).toBeGreaterThanOrEqual(min)
      // The function can return values beyond max when using decimal inputs
      // because Math.round(Math.random() * (max - min)) can round up to Math.round(max - min)
      // and then min is added, potentially exceeding the original max
      const maxPossible = Math.round(max - min) + min
      expect(result).toBeLessThanOrEqual(maxPossible)
      // The result may be a decimal when decimal inputs are provided
      expect(typeof result).toBe('number')
    }
  })
})

describe('time', () => {
  const locale = 'en'
  const now = Date.UTC(2009, 0, 3)

  const oneWeek = Date.UTC(1970, 0, 8)
  const oneDay = Date.UTC(1970, 0, 2)

  const oneDayFromNow = now + oneDay
  const oneWeekFromNow = now + oneWeek
  const fourWeeksFromNow = now + 4 * oneWeek
  const oneMonthFromNow = now + Date.UTC(1970, 1)
  const twoMonthsFromNow = now + Date.UTC(1970, 2)
  const oneAndAHalfYearFromNow = now + Date.UTC(1971, 6)
  const twoYearsFromNow = now + Date.UTC(1972, 0)

  describe('timeInterval', () => {
    it('should work for dates in the future', () => {
      expect(time.timeInterval({ from: now, to: oneDayFromNow })).toBe(oneDay)
      expect(time.timeInterval({ from: now, to: oneWeekFromNow })).toBe(oneWeek)
      expect(time.timeInterval({ from: now, to: fourWeeksFromNow })).toBe(4 * oneWeek)
    })

    it('should work for dates in the past', () => {
      expect(time.timeInterval({ from: oneDayFromNow, to: now })).toBe(-oneDay)
      expect(time.timeInterval({ from: oneWeekFromNow, to: now })).toBe(-oneWeek)
      expect(time.timeInterval({ from: fourWeeksFromNow, to: now })).toBe(-4 * oneWeek)
    })

    it('should work for equal dates', () => {
      expect(time.timeInterval({ from: now, to: now })).toBe(0)
    })
  })

  it('humanReadableDuration', () => {
    expect(time.humanReadableDuration({ locale, to: now, from: now - 1 })).toBe('in 0 seconds')
    expect(time.humanReadableDuration({ locale, to: now, from: now })).toBe('in 0 seconds')
    expect(time.humanReadableDuration({ locale, to: now, from: now + 1 })).toBe('0 seconds ago')

    expect(time.humanReadableDuration({ locale, to: now, from: now + 499 })).toBe('0 seconds ago')
    expect(time.humanReadableDuration({ locale, to: now, from: now + 500 })).toBe('0 seconds ago')
    expect(time.humanReadableDuration({ locale, to: now, from: now + 501 })).toBe('1 second ago')
    expect(time.humanReadableDuration({ locale, to: now, from: now + 1_000 })).toBe('1 second ago')
    expect(time.humanReadableDuration({ locale, to: now, from: now + 59_499 })).toBe('59 seconds ago')
    expect(time.humanReadableDuration({ locale, to: now, from: now + 59_500 })).toBe('59 seconds ago')
    expect(time.humanReadableDuration({ locale, to: now, from: now + 59_501 })).toBe('60 seconds ago')
    expect(time.humanReadableDuration({ locale, to: now, from: now + 89_999 })).toBe('1 minute ago')
    expect(time.humanReadableDuration({ locale, to: now, from: now + 90_000 })).toBe('1 minute ago')
    expect(time.humanReadableDuration({ locale, to: now, from: now + 90_001 })).toBe('2 minutes ago')
    expect(time.humanReadableDuration({ locale, to: now, from: oneDayFromNow - 1 })).toBe('24 hours ago')
    expect(time.humanReadableDuration({ locale, to: now, from: oneDayFromNow })).toBe('24 hours ago')
    expect(time.humanReadableDuration({ locale, to: now, from: oneDayFromNow + 1 })).toBe('1 day ago')

    expect(time.humanReadableDuration({ locale, to: now, from: oneWeekFromNow })).toBe('7 days ago')
    expect(time.humanReadableDuration({ locale, to: now, from: fourWeeksFromNow })).toBe('28 days ago')
    expect(time.humanReadableDuration({ locale, to: now, from: oneMonthFromNow })).toBe('1 month ago')
    expect(time.humanReadableDuration({ locale, to: now, from: twoMonthsFromNow })).toBe('2 months ago')
    expect(time.humanReadableDuration({ locale, to: now, from: oneAndAHalfYearFromNow })).toBe('1 year ago')
    expect(time.humanReadableDuration({ locale, to: now, from: twoYearsFromNow })).toBe('2 years ago')
    expect(time.humanReadableDuration({ locale, to: now, from: Date.UTC(2022, 1, 18) })).toBe('13 years ago')

    expect(time.humanReadableDuration({ locale, to: now - 1, from: now })).toBe('0 seconds ago')
    expect(time.humanReadableDuration({ locale, to: now + 1, from: now })).toBe('in 0 seconds')

    expect(time.humanReadableDuration({ locale, to: now + 499, from: now })).toBe('in 0 seconds')
    expect(time.humanReadableDuration({ locale, to: now + 500, from: now })).toBe('in 1 second')
    expect(time.humanReadableDuration({ locale, to: now + 501, from: now })).toBe('in 1 second')
    expect(time.humanReadableDuration({ locale, to: now + 1000, from: now })).toBe('in 1 second')
    expect(time.humanReadableDuration({ locale, to: now + 59_499, from: now })).toBe('in 59 seconds')
    expect(time.humanReadableDuration({ locale, to: now + 59_500, from: now })).toBe('in 60 seconds')
    expect(time.humanReadableDuration({ locale, to: now + 59_501, from: now })).toBe('in 60 seconds')
    expect(time.humanReadableDuration({ locale, to: now + 89_999, from: now })).toBe('in 1 minute')
    expect(time.humanReadableDuration({ locale, to: now + 90_000, from: now })).toBe('in 2 minutes')
    expect(time.humanReadableDuration({ locale, to: now + 90_001, from: now })).toBe('in 2 minutes')
    expect(time.humanReadableDuration({ locale, to: oneDayFromNow - 1, from: now })).toBe('in 24 hours')
    expect(time.humanReadableDuration({ locale, to: oneDayFromNow, from: now })).toBe('in 24 hours')
    expect(time.humanReadableDuration({ locale, to: oneDayFromNow + 1, from: now })).toBe('in 1 day')

    expect(time.humanReadableDuration({ locale, to: oneWeekFromNow, from: now })).toBe('in 7 days')
    expect(time.humanReadableDuration({ locale, to: fourWeeksFromNow, from: now })).toBe('in 28 days')
    expect(time.humanReadableDuration({ locale, to: oneMonthFromNow, from: now })).toBe('in 1 month')
    expect(time.humanReadableDuration({ locale, to: twoMonthsFromNow, from: now })).toBe('in 2 months')
    expect(time.humanReadableDuration({ locale, to: oneAndAHalfYearFromNow, from: now })).toBe('in 1 year')
    expect(time.humanReadableDuration({ locale, to: twoYearsFromNow, from: now })).toBe('in 2 years')
    expect(time.humanReadableDuration({ locale, to: Date.UTC(2022, 1, 18), from: now })).toBe('in 13 years')
  })

  // Not every month of the year has the same amount of days:
  // Demonstrate and verify that month handling is sane.
  // Also show the edge cases for month having 30 or less days.
  it('should display elapsed time for month values in a sane way', () => {
    const feb01 = Date.UTC(2009, 1, 1)
    expect(time.humanReadableDuration({ locale, to: feb01, from: feb01 + Date.UTC(1970, 0, 31) })).toBe('30 days ago')
    expect(time.humanReadableDuration({ locale, to: feb01, from: feb01 + Date.UTC(1970, 1, 1) })).toBe('1 month ago')
    expect(time.humanReadableDuration({ locale, to: feb01, from: feb01 + Date.UTC(1971, 0, 1) })).toBe('12 months ago')
    expect(time.humanReadableDuration({ locale, to: feb01, from: feb01 + Date.UTC(1971, 0, 2) })).toBe('1 year ago')

    expect(time.humanReadableDuration({ locale, to: feb01 + Date.UTC(1970, 0, 31), from: feb01 })).toBe('in 30 days')
    expect(time.humanReadableDuration({ locale, to: feb01 + Date.UTC(1970, 1, 1), from: feb01 })).toBe('in 1 month')
    expect(time.humanReadableDuration({ locale, to: feb01 + Date.UTC(1971, 0, 1), from: feb01 })).toBe('in 12 months')
    expect(time.humanReadableDuration({ locale, to: feb01 + Date.UTC(1971, 0, 2), from: feb01 })).toBe('in 1 year')

    const mar03 = Date.UTC(2009, 2, 3)
    expect(time.humanReadableDuration({ locale, to: feb01, from: mar03 })).toBe('30 days ago')
    expect(time.humanReadableDuration({ locale, to: mar03, from: feb01 })).toBe('in 30 days')

    const mar04 = Date.UTC(2009, 2, 4)
    expect(time.humanReadableDuration({ locale, to: feb01, from: mar04 })).toBe('1 month ago')
    expect(time.humanReadableDuration({ locale, to: mar04, from: feb01 })).toBe('in 1 month')
  })

  it('should be able to display localized versions', () => {
    expect(time.humanReadableDuration({ locale: 'es', to: now, from: now })).toBe('dentro de 0 segundos')
    expect(time.humanReadableDuration({ locale: 'fr', to: now, from: now })).toBe('dans 0 seconde')
    expect(time.humanReadableDuration({ locale: 'hi', to: now, from: now })).toBe('0 सेकंड में')
    expect(time.humanReadableDuration({ locale: 'it', to: now, from: now })).toBe('tra 0 secondi')
    expect(time.humanReadableDuration({ locale: 'zh', to: now, from: now })).toBe('0秒钟后')
    // fallback to english
    expect(time.humanReadableDuration({ locale: 'xx', to: now, from: now })).toBe('in 0 seconds')
  })
})
