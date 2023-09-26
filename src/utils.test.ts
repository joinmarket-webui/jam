import { shortenStringMiddle, percentageToFactor, factorToPercentage, toSemVer, UNKNOWN_VERSION } from './utils'

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

describe('factorToPercentage/percentageToFactor', () => {
  describe('factorToPercentage', () => {
    it('should turn factor to percentage', () => {
      expect(factorToPercentage(NaN)).toBe(NaN)
      expect(factorToPercentage(-1)).toBe(-100)
      expect(factorToPercentage(0)).toBe(0)
      expect(factorToPercentage(0.0027)).toBe(0.27)
      expect(factorToPercentage(0.0027, 1)).toBe(0.3)
      expect(factorToPercentage(0.0027, 0)).toBe(0)
      expect(factorToPercentage(1 / 3, 3)).toBe(33.333)
      expect(factorToPercentage(1 / 3, 8)).toBe(33.33333333)
      expect(factorToPercentage(2 / 3, 10)).toBe(66.6666666667)
      expect(factorToPercentage(0.7)).toBe(70)
      expect(factorToPercentage(1)).toBe(100)
    })
  })

  describe('percentageToFactor', () => {
    it('should turn percentage to factor', () => {
      expect(percentageToFactor(NaN)).toBe(NaN)
      expect(percentageToFactor(-1)).toBe(-0.01)
      expect(percentageToFactor(0)).toBe(0)
      expect(percentageToFactor(0.0027)).toBe(0.000027)
      expect(percentageToFactor(0.0027, 5)).toBe(0.00003)
      expect(percentageToFactor(0.0027, 4)).toBe(0)
      expect(percentageToFactor(1 / 3, 3)).toBe(0.003)
      expect(percentageToFactor(1 / 3, 8)).toBe(0.00333333)
      expect(percentageToFactor(2 / 3, 10)).toBe(0.0066666667)
      expect(percentageToFactor(0.7)).toBe(0.007)
      expect(percentageToFactor(1)).toBe(0.01)
      expect(percentageToFactor(33)).toBe(0.33)
      expect(percentageToFactor(100)).toBe(1)
      expect(percentageToFactor(233.7)).toBe(2.337)
    })
  })

  it('functions are inverse', () => {
    const testInverse = (val: number) => percentageToFactor(factorToPercentage(val))

    expect(testInverse(NaN)).toBe(NaN)
    expect(testInverse(0)).toBe(0)
    expect(testInverse(0.0027)).toBe(0.0027)
    expect(testInverse(0.7)).toBe(0.7)
    expect(testInverse(1)).toBe(1)
    expect(testInverse(1 / 3)).toBe(0.333333)
    expect(testInverse(2 / 3)).toBe(0.666667)
    expect(testInverse(33)).toBe(33)
    expect(testInverse(100)).toBe(100)
    expect(testInverse(233.7)).toBe(233.7)
  })
})

describe('toSemVer', () => {
  it('should parse version correctly', () => {
    expect(toSemVer('0.0.1')).toEqual({
      major: 0,
      minor: 0,
      patch: 1,
      raw: '0.0.1',
    })
    expect(toSemVer('0.9.11dev')).toEqual({
      major: 0,
      minor: 9,
      patch: 11,
      raw: '0.9.11dev',
    })
    expect(toSemVer('1.0.0-beta.2')).toEqual({
      major: 1,
      minor: 0,
      patch: 0,
      raw: '1.0.0-beta.2',
    })
    expect(toSemVer('21.42.1337-dev.2+devel.99ff4cd')).toEqual({
      major: 21,
      minor: 42,
      patch: 1337,
      raw: '21.42.1337-dev.2+devel.99ff4cd',
    })
  })
  it('should parse invalid version as UNKNOWN', () => {
    expect(toSemVer(undefined)).toBe(UNKNOWN_VERSION)
    expect(toSemVer('')).toBe(UNKNOWN_VERSION)
    expect(toSemVer(' ')).toBe(UNKNOWN_VERSION)
    expect(toSemVer('🧡')).toBe(UNKNOWN_VERSION)
    expect(toSemVer('21')).toBe(UNKNOWN_VERSION)
    expect(toSemVer('21.42')).toBe(UNKNOWN_VERSION)
    expect(toSemVer('21.42.')).toBe(UNKNOWN_VERSION)
    expect(toSemVer('21.42.💯')).toBe(UNKNOWN_VERSION)
    expect(toSemVer('21.42.-1')).toBe(UNKNOWN_VERSION)
    expect(toSemVer('21.42.-1')).toBe(UNKNOWN_VERSION)
    expect(toSemVer('21.-1.42')).toBe(UNKNOWN_VERSION)
    expect(toSemVer('-1.21.42')).toBe(UNKNOWN_VERSION)
    expect(toSemVer('21million')).toBe(UNKNOWN_VERSION)
  })
})
