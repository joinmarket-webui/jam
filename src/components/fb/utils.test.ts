import * as fb from './utils'

import { Lockdate } from '../../libs/JmWalletApi'
import { Utxo } from '../../context/WalletContext'

const makeUtxo = (id: string, address = '', frozen = false) =>
  ({
    address: address,
    path: '',
    label: '',
    value: 0,
    tries: 0,
    tries_remaining: 0,
    external: false,
    mixdepth: 0,
    confirmations: 0,
    frozen: frozen,
    utxo: id,
  } as Utxo)

describe('utils', () => {
  describe('lockdate', () => {
    it('should convert timestamp to lockdate', () => {
      expect(fb.lockdate.fromTimestamp(-1)).toBe('1969-12')
      expect(fb.lockdate.fromTimestamp(0)).toBe('1970-01')
      expect(fb.lockdate.fromTimestamp(Date.UTC(2008, 9, 31))).toBe('2008-10')
      expect(fb.lockdate.fromTimestamp(Date.UTC(2009, 0, 3, 1, 42, 13, 37))).toBe('2009-01')
      expect(fb.lockdate.fromTimestamp(Date.UTC(2022, 1, 18))).toBe('2022-02')
      expect(fb.lockdate.fromTimestamp(Date.UTC(2999, 11))).toBe('2999-12')
      expect(fb.lockdate.fromTimestamp(Date.UTC(10_000, 10))).toBe('10000-11')

      expect(() => fb.lockdate.fromTimestamp(NaN)).toThrowError('Unsupported input: NaN')
    })

    it('should convert lockdate to timestamp', () => {
      expect(fb.lockdate.toTimestamp('2008-10')).toBe(Date.UTC(2008, 9, 1))
      expect(fb.lockdate.toTimestamp('2009-01')).toBe(Date.UTC(2009, 0, 1))
      expect(fb.lockdate.toTimestamp('2999-12')).toBe(Date.UTC(2999, 11))

      expect(() => fb.lockdate.toTimestamp('-1' as Lockdate)).toThrowError('Unsupported format')
      expect(() => fb.lockdate.toTimestamp('2008-1' as Lockdate)).toThrowError('Unsupported format')
      expect(() => fb.lockdate.toTimestamp('10000-01' as Lockdate)).toThrowError('Unsupported format')
      expect(() => fb.lockdate.toTimestamp('' as Lockdate)).toThrowError('Unsupported format')
      expect(() => fb.lockdate.toTimestamp('any' as Lockdate)).toThrowError('Unsupported format')
    })

    it('should create an initial lockdate', () => {
      const rangeZero = fb.toYearsRange(0, 10)
      const rangeMinusOneYear = fb.toYearsRange(-1, 10)
      const rangePlusOneYear = fb.toYearsRange(1, 10)

      // verify the default "months ahead" for the initial lockdate to prevent unintentional changes
      expect(fb.__INITIAL_LOCKDATE_MONTH_AHEAD).toBe(3)

      expect(fb.lockdate.initial(new Date(Date.UTC(2009, 0, 3)), rangeZero)).toBe('2009-05')
      expect(fb.lockdate.initial(new Date(Date.UTC(2009, 0, 3)), rangeMinusOneYear)).toBe('2009-05')
      expect(fb.lockdate.initial(new Date(Date.UTC(2009, 0, 3)), rangePlusOneYear)).toBe('2010-01')

      expect(fb.lockdate.initial(new Date(Date.UTC(2008, 9, 31)), rangeZero)).toBe('2009-02')
      expect(fb.lockdate.initial(new Date(Date.UTC(2008, 9, 31)), rangeMinusOneYear)).toBe('2009-02')
      expect(fb.lockdate.initial(new Date(Date.UTC(2008, 9, 31)), rangePlusOneYear)).toBe('2009-10')

      expect(fb.lockdate.initial(new Date(Date.UTC(2009, 11, 3)), rangeZero)).toBe('2010-04')
      expect(fb.lockdate.initial(new Date(Date.UTC(2009, 11, 3)), rangeMinusOneYear)).toBe('2010-04')
      expect(fb.lockdate.initial(new Date(Date.UTC(2009, 11, 3)), rangePlusOneYear)).toBe('2010-12')
    })
  })
  describe('utxo', () => {
    it('should use utxo ids for equality checks', () => {
      expect(fb.utxo.isEqual(makeUtxo('foo:0'), makeUtxo('foo:0'))).toBe(true)
      expect(fb.utxo.isEqual(makeUtxo('foo:0', 'abc'), makeUtxo('foo:0', 'xyz'))).toBe(true)
      expect(fb.utxo.isEqual(makeUtxo('foo:0'), makeUtxo('foo:1'))).toBe(false)
    })

    it('should determine if a utxo is in a list', () => {
      expect(
        fb.utxo.isInList(makeUtxo('foo:3'), [
          makeUtxo('foo:0'),
          makeUtxo('foo:1'),
          makeUtxo('foo:2'),
          makeUtxo('foo:3'),
          makeUtxo('foo:4'),
        ])
      ).toBe(true)

      expect(
        fb.utxo.isInList(makeUtxo('foo:0'), [
          makeUtxo('foo:0'),
          makeUtxo('foo:1'),
          makeUtxo('foo:2'),
          makeUtxo('foo:3'),
          makeUtxo('foo:4'),
        ])
      ).toBe(true)

      expect(
        fb.utxo.isInList(makeUtxo('foo:4'), [
          makeUtxo('foo:0'),
          makeUtxo('foo:1'),
          makeUtxo('foo:2'),
          makeUtxo('foo:3'),
          makeUtxo('foo:4'),
        ])
      ).toBe(true)

      expect(
        fb.utxo.isInList(makeUtxo('foo:5'), [
          makeUtxo('foo:0'),
          makeUtxo('foo:1'),
          makeUtxo('foo:2'),
          makeUtxo('foo:3'),
          makeUtxo('foo:4'),
        ])
      ).toBe(false)
    })

    it('should determine which utxos to freeze', () => {
      const allUtxos = [makeUtxo('foo:0'), makeUtxo('foo:1'), makeUtxo('foo:2'), makeUtxo('foo:3'), makeUtxo('foo:4')]

      let utxosToFreeze = fb.utxo.utxosToFreeze(allUtxos, [makeUtxo('foo:1'), makeUtxo('foo:3')])
      expect(fb.utxo.isInList(makeUtxo('foo:0'), utxosToFreeze)).toBe(true)
      expect(fb.utxo.isInList(makeUtxo('foo:1'), utxosToFreeze)).toBe(false)
      expect(fb.utxo.isInList(makeUtxo('foo:2'), utxosToFreeze)).toBe(true)
      expect(fb.utxo.isInList(makeUtxo('foo:3'), utxosToFreeze)).toBe(false)
      expect(fb.utxo.isInList(makeUtxo('foo:4'), utxosToFreeze)).toBe(true)

      utxosToFreeze = fb.utxo.utxosToFreeze(allUtxos, [makeUtxo('foo:0'), makeUtxo('foo:4')])
      expect(fb.utxo.isInList(makeUtxo('foo:0'), utxosToFreeze)).toBe(false)
      expect(fb.utxo.isInList(makeUtxo('foo:1'), utxosToFreeze)).toBe(true)
      expect(fb.utxo.isInList(makeUtxo('foo:2'), utxosToFreeze)).toBe(true)
      expect(fb.utxo.isInList(makeUtxo('foo:3'), utxosToFreeze)).toBe(true)
      expect(fb.utxo.isInList(makeUtxo('foo:4'), utxosToFreeze)).toBe(false)

      utxosToFreeze = fb.utxo.utxosToFreeze(allUtxos, [makeUtxo('foo:2')])
      expect(fb.utxo.isInList(makeUtxo('foo:0'), utxosToFreeze)).toBe(true)
      expect(fb.utxo.isInList(makeUtxo('foo:1'), utxosToFreeze)).toBe(true)
      expect(fb.utxo.isInList(makeUtxo('foo:2'), utxosToFreeze)).toBe(false)
      expect(fb.utxo.isInList(makeUtxo('foo:3'), utxosToFreeze)).toBe(true)
      expect(fb.utxo.isInList(makeUtxo('foo:4'), utxosToFreeze)).toBe(true)

      utxosToFreeze = fb.utxo.utxosToFreeze(allUtxos, [])
      expect(fb.utxo.isInList(makeUtxo('foo:0'), utxosToFreeze)).toBe(true)
      expect(fb.utxo.isInList(makeUtxo('foo:1'), utxosToFreeze)).toBe(true)
      expect(fb.utxo.isInList(makeUtxo('foo:2'), utxosToFreeze)).toBe(true)
      expect(fb.utxo.isInList(makeUtxo('foo:3'), utxosToFreeze)).toBe(true)
      expect(fb.utxo.isInList(makeUtxo('foo:4'), utxosToFreeze)).toBe(true)
    })

    it('should check wheter all utxos are frozen', () => {
      let utxos = [
        makeUtxo('foo:0', '', true),
        makeUtxo('foo:1', '', true),
        makeUtxo('foo:2', '', true),
        makeUtxo('foo:3', '', true),
        makeUtxo('foo:4', '', true),
      ]
      expect(fb.utxo.allAreFrozen(utxos)).toBe(true)

      utxos = [
        makeUtxo('foo:0', '', true),
        makeUtxo('foo:1', '', true),
        makeUtxo('foo:2', '', false),
        makeUtxo('foo:3', '', true),
        makeUtxo('foo:4', '', true),
      ]
      expect(fb.utxo.allAreFrozen(utxos)).toBe(false)
    })

    describe('isLocked', () => {
      const now = Date.UTC(2009, 0, 3)

      it('should detect timelocked utxo as locked', () => {
        const utxo = {
          // timelocked, not yet expired
          locktime: '2009-01',
          path: `m/84'/1'/0'/0/1:${now / 1_000 + 1}`,
        } as Utxo
        expect(fb.utxo.isLocked(utxo, now)).toBe(true)
      })

      it('should detect expired timelocked utxo as unlocked', () => {
        const utxo = {
          // timelocked, but expired
          locktime: '2009-01',
          path: `m/84'/1'/0'/0/1:${now / 1_000 - 1}`,
        } as Utxo
        expect(fb.utxo.isLocked(utxo, now)).toBe(false)
      })

      it('should detect non-timelocked utxo as unlocked', () => {
        const utxo = {
          // not timelocked
          path: `m/84'/1'/0'/0/1`,
        } as Utxo
        expect(fb.utxo.isLocked(utxo, now)).toBe(false)
      })
    })
  })

  describe('time', () => {
    const now = Date.UTC(2009, 0, 3)

    const oneWeek = Date.UTC(1970, 0, 8)
    const oneDay = Date.UTC(1970, 0, 2)
    const oneAndAHalfYear = Date.UTC(1971, 6)
    const twoYears = Date.UTC(1072, 0)

    const oneDayFromNow = now + oneDay
    const oneWeekFromNow = now + oneWeek
    const fourWeeksFromNow = now + 4 * oneWeek
    const oneMonthFromNow = Date.UTC(2009, 1, 3)
    const twoMonthsFromNow = Date.UTC(2009, 2, 3)
    const oneAndAHalfYearFromNow = now + Date.UTC(1971, 6)
    const twoYearsFromNow = now + Date.UTC(1972, 0)

    describe('timeInterval', () => {
      it('should work for dates in the future', () => {
        expect(fb.time.timeInterval({ from: now, to: oneDayFromNow })).toBe(oneDay)
        expect(fb.time.timeInterval({ from: now, to: oneWeekFromNow })).toBe(oneWeek)
        expect(fb.time.timeInterval({ from: now, to: fourWeeksFromNow })).toBe(4 * oneWeek)
      })

      it('should work for dates in the past', () => {
        expect(fb.time.timeInterval({ from: oneDayFromNow, to: now })).toBe(-oneDay)
        expect(fb.time.timeInterval({ from: oneWeekFromNow, to: now })).toBe(-oneWeek)
        expect(fb.time.timeInterval({ from: fourWeeksFromNow, to: now })).toBe(-4 * oneWeek)
      })

      it('should work for equal dates', () => {
        expect(fb.time.timeInterval({ from: now, to: now })).toBe(0)
      })
    })

    describe('humanReadableDuration', () => {
      expect(fb.time.humanReadableDuration({ to: now, from: now - 1 })).toBe('in 0 seconds')
      expect(fb.time.humanReadableDuration({ to: now, from: now })).toBe('in 0 seconds')
      expect(fb.time.humanReadableDuration({ to: now, from: now + 1 })).toBe('0 seconds ago')

      expect(fb.time.humanReadableDuration({ to: now, from: now + 499 })).toBe('0 seconds ago')
      expect(fb.time.humanReadableDuration({ to: now, from: now + 500 })).toBe('0 seconds ago')
      expect(fb.time.humanReadableDuration({ to: now, from: now + 501 })).toBe('1 second ago')
      expect(fb.time.humanReadableDuration({ to: now, from: now + 1_000 })).toBe('1 second ago')
      expect(fb.time.humanReadableDuration({ to: now, from: now + 59_499 })).toBe('59 seconds ago')
      expect(fb.time.humanReadableDuration({ to: now, from: now + 59_500 })).toBe('59 seconds ago')
      expect(fb.time.humanReadableDuration({ to: now, from: now + 59_501 })).toBe('60 seconds ago')
      expect(fb.time.humanReadableDuration({ to: now, from: now + 89_999 })).toBe('1 minute ago')
      expect(fb.time.humanReadableDuration({ to: now, from: now + 90_000 })).toBe('1 minute ago')
      expect(fb.time.humanReadableDuration({ to: now, from: now + 90_001 })).toBe('2 minutes ago')
      expect(fb.time.humanReadableDuration({ to: now, from: oneDayFromNow - 1 })).toBe('24 hours ago')
      expect(fb.time.humanReadableDuration({ to: now, from: oneDayFromNow })).toBe('24 hours ago')
      expect(fb.time.humanReadableDuration({ to: now, from: oneDayFromNow + 1 })).toBe('1 day ago')

      expect(fb.time.humanReadableDuration({ to: now, from: oneWeekFromNow })).toBe('7 days ago')
      expect(fb.time.humanReadableDuration({ to: now, from: fourWeeksFromNow })).toBe('28 days ago')
      expect(fb.time.humanReadableDuration({ to: now, from: oneMonthFromNow })).toBe('1 month ago')
      expect(fb.time.humanReadableDuration({ to: now, from: twoMonthsFromNow })).toBe('2 months ago')
      expect(fb.time.humanReadableDuration({ to: now, from: oneAndAHalfYearFromNow })).toBe('1 year ago')
      expect(fb.time.humanReadableDuration({ to: now, from: twoYearsFromNow })).toBe('2 years ago')
      expect(fb.time.humanReadableDuration({ to: now, from: Date.UTC(2022, 1, 18) })).toBe('13 years ago')

      expect(fb.time.humanReadableDuration({ to: now - 1, from: now })).toBe('0 seconds ago')
      expect(fb.time.humanReadableDuration({ to: now + 1, from: now })).toBe('in 0 seconds')

      expect(fb.time.humanReadableDuration({ to: now + 499, from: now })).toBe('in 0 seconds')
      expect(fb.time.humanReadableDuration({ to: now + 500, from: now })).toBe('in 1 second')
      expect(fb.time.humanReadableDuration({ to: now + 501, from: now })).toBe('in 1 second')
      expect(fb.time.humanReadableDuration({ to: now + 1000, from: now })).toBe('in 1 second')
      expect(fb.time.humanReadableDuration({ to: now + 59_499, from: now })).toBe('in 59 seconds')
      expect(fb.time.humanReadableDuration({ to: now + 59_500, from: now })).toBe('in 60 seconds')
      expect(fb.time.humanReadableDuration({ to: now + 59_501, from: now })).toBe('in 60 seconds')
      expect(fb.time.humanReadableDuration({ to: now + 89_999, from: now })).toBe('in 1 minute')
      expect(fb.time.humanReadableDuration({ to: now + 90_000, from: now })).toBe('in 2 minutes')
      expect(fb.time.humanReadableDuration({ to: now + 90_001, from: now })).toBe('in 2 minutes')
      expect(fb.time.humanReadableDuration({ to: oneDayFromNow - 1, from: now })).toBe('in 24 hours')
      expect(fb.time.humanReadableDuration({ to: oneDayFromNow, from: now })).toBe('in 24 hours')
      expect(fb.time.humanReadableDuration({ to: oneDayFromNow + 1, from: now })).toBe('in 1 day')

      expect(fb.time.humanReadableDuration({ to: oneWeekFromNow, from: now })).toBe('in 7 days')
      expect(fb.time.humanReadableDuration({ to: fourWeeksFromNow, from: now })).toBe('in 28 days')
      expect(fb.time.humanReadableDuration({ to: oneMonthFromNow, from: now })).toBe('in 1 month')
      expect(fb.time.humanReadableDuration({ to: twoMonthsFromNow, from: now })).toBe('in 2 months')
      expect(fb.time.humanReadableDuration({ to: oneAndAHalfYearFromNow, from: now })).toBe('in 1 year')
      expect(fb.time.humanReadableDuration({ to: twoYearsFromNow, from: now })).toBe('in 2 years')
      expect(fb.time.humanReadableDuration({ to: Date.UTC(2022, 1, 18), from: now })).toBe('in 13 years')
    })

    // Not every month of the year has the same amount of days:
    // Demonstrate and verify that month handling is sane.
    // Also show the edge cases for month having 30 or less days.
    it('should display elapsed time for month values in a sane way', () => {
      const feb01 = Date.UTC(2009, 1, 1)
      expect(fb.time.humanReadableDuration({ to: feb01, from: feb01 + Date.UTC(1970, 0, 31) })).toBe('30 days ago')
      expect(fb.time.humanReadableDuration({ to: feb01, from: feb01 + Date.UTC(1970, 1, 1) })).toBe('1 month ago')
      expect(fb.time.humanReadableDuration({ to: feb01, from: feb01 + Date.UTC(1971, 0, 1) })).toBe('12 months ago')
      expect(fb.time.humanReadableDuration({ to: feb01, from: feb01 + Date.UTC(1971, 0, 2) })).toBe('1 year ago')

      expect(fb.time.humanReadableDuration({ to: feb01 + Date.UTC(1970, 0, 31), from: feb01 })).toBe('in 30 days')
      expect(fb.time.humanReadableDuration({ to: feb01 + Date.UTC(1970, 1, 1), from: feb01 })).toBe('in 1 month')
      expect(fb.time.humanReadableDuration({ to: feb01 + Date.UTC(1971, 0, 1), from: feb01 })).toBe('in 12 months')
      expect(fb.time.humanReadableDuration({ to: feb01 + Date.UTC(1971, 0, 2), from: feb01 })).toBe('in 1 year')

      const mar03 = Date.UTC(2009, 2, 3)
      expect(fb.time.humanReadableDuration({ to: feb01, from: mar03 })).toBe('30 days ago')
      expect(fb.time.humanReadableDuration({ to: mar03, from: feb01 })).toBe('in 30 days')

      const mar04 = Date.UTC(2009, 2, 4)
      expect(fb.time.humanReadableDuration({ to: feb01, from: mar04 })).toBe('1 month ago')
      expect(fb.time.humanReadableDuration({ to: mar04, from: feb01 })).toBe('in 1 month')
    })

    it('should be able to display localized versions', () => {
      expect(fb.time.humanReadableDuration({ to: now, from: now, locale: 'es' })).toBe('dentro de 0 segundos')
      expect(fb.time.humanReadableDuration({ to: now, from: now, locale: 'fr' })).toBe('dans 0 seconde')
      expect(fb.time.humanReadableDuration({ to: now, from: now, locale: 'hi' })).toBe('0 सेकंड में')
      expect(fb.time.humanReadableDuration({ to: now, from: now, locale: 'it' })).toBe('tra 0 secondi')
      expect(fb.time.humanReadableDuration({ to: now, from: now, locale: 'zh' })).toBe('0秒钟后')
      // fallback to english
      expect(fb.time.humanReadableDuration({ to: now, from: now, locale: 'xx' })).toBe('in 0 seconds')
    })
  })
})
