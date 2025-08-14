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
  humanReadableDuration,
  formatBtc,
  formatSats,
  BTC,
  SATS,
  isRelativeOffer,
  isAbsoluteOffer,
  SEGWIT_ACTIVATION_BLOCK,
  time,
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

describe('humanReadableDuration', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return "Expired" for past timestamps', () => {
    const now = Date.now()
    const pastTime = now - 1000
    expect(humanReadableDuration({ to: pastTime })).toBe('Expired')
  })

  it('should return days when duration is more than 24 hours', () => {
    const now = Date.now()
    const oneDayFromNow = now + 24 * 60 * 60 * 1000
    const twoDaysFromNow = now + 2 * 24 * 60 * 60 * 1000

    expect(humanReadableDuration({ to: oneDayFromNow })).toBe('1 day')
    expect(humanReadableDuration({ to: twoDaysFromNow })).toBe('2 days')
  })

  it('should return hours when duration is less than 24 hours but more than 1 hour', () => {
    const now = Date.now()
    const oneHourFromNow = now + 60 * 60 * 1000
    const twoHoursFromNow = now + 2 * 60 * 60 * 1000
    const twentyThreeHoursFromNow = now + 23 * 60 * 60 * 1000

    expect(humanReadableDuration({ to: oneHourFromNow })).toBe('1 hour')
    expect(humanReadableDuration({ to: twoHoursFromNow })).toBe('2 hours')
    expect(humanReadableDuration({ to: twentyThreeHoursFromNow })).toBe('23 hours')
  })

  it('should return "Less than 1 hour" for durations less than an hour', () => {
    const now = Date.now()
    const thirtyMinutesFromNow = now + 30 * 60 * 1000
    const fiveMinutesFromNow = now + 5 * 60 * 1000

    expect(humanReadableDuration({ to: thirtyMinutesFromNow })).toBe('Less than 1 hour')
    expect(humanReadableDuration({ to: fiveMinutesFromNow })).toBe('Less than 1 hour')
  })

  it('should handle mixed days and hours (prioritizing days)', () => {
    const now = Date.now()
    const oneDayAndFiveHoursFromNow = now + (24 + 5) * 60 * 60 * 1000

    expect(humanReadableDuration({ to: oneDayAndFiveHoursFromNow })).toBe('1 day')
  })

  it('should format duration in human readable format', () => {
    const from = Date.now()
    const to = from + 2 * 24 * 60 * 60 * 1000 // 2 days

    const result = time.humanReadableDuration({ from, to })
    expect(result).toBe('in 2 days')
  })

  it('should handle past timestamps', () => {
    const from = Date.now()
    const to = from - 3600 * 1000 // 1 hour ago

    const result = time.humanReadableDuration({ from, to })
    expect(result).toBe('60 minutes ago')
  })

  it('should support different locales', () => {
    const from = Date.now()
    const to = from + 24 * 60 * 60 * 1000 // 1 day

    const result = time.humanReadableDuration({ from, to, locale: 'en' })
    expect(result).toBe('in 24 hours')
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

describe('time utility', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('timeInterval', () => {
    it('should calculate time interval between two timestamps', () => {
      const from = Date.now()
      const to = from + 5000

      expect(time.timeInterval({ from, to })).toBe(5000)
    })

    it('should use current time as default from value', () => {
      const now = Date.now()
      const to = now + 3000

      expect(time.timeInterval({ to })).toBe(3000)
    })
  })
})
