import * as fb from './fb_utils'

import { Lockdate } from '../../libs/JmWalletApi'

describe('fb_utils', () => {
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
  })

  describe('time', () => {
    const now = Date.UTC(2009, 0, 3)

    it('should display elapsed time as string', () => {
      const oneWeek = Date.UTC(1970, 0, 8)
      const oneDayFromNow = now + Date.UTC(1970, 0, 2)
      const oneWeekFromNow = now + oneWeek
      const fourWeeksAfterNow = now + 4 * oneWeek
      const oneMonthFromNow = Date.UTC(2009, 1, 3)
      const twoMonthFromNow = Date.UTC(2009, 2, 3)
      const oneAndAHalfYearFromNow = now + Date.UTC(1971, 6)
      const twoYearsFromNow = now + Date.UTC(1972, 0)

      expect(fb.time.elapsed(now, now - 1)).toBe('in 0 seconds')
      expect(fb.time.elapsed(now, now)).toBe('in 0 seconds')
      expect(fb.time.elapsed(now, now + 1)).toBe('0 seconds ago')

      expect(fb.time.elapsed(now, now + 499)).toBe('0 seconds ago')
      expect(fb.time.elapsed(now, now + 500)).toBe('0 seconds ago')
      expect(fb.time.elapsed(now, now + 501)).toBe('1 second ago')
      expect(fb.time.elapsed(now, now + 1_000)).toBe('1 second ago')
      expect(fb.time.elapsed(now, now + 59_499)).toBe('59 seconds ago')
      expect(fb.time.elapsed(now, now + 59_500)).toBe('59 seconds ago')
      expect(fb.time.elapsed(now, now + 59_501)).toBe('60 seconds ago')
      expect(fb.time.elapsed(now, now + 89_999)).toBe('1 minute ago')
      expect(fb.time.elapsed(now, now + 90_000)).toBe('1 minute ago')
      expect(fb.time.elapsed(now, now + 90_001)).toBe('2 minutes ago')
      expect(fb.time.elapsed(now, oneDayFromNow - 1)).toBe('24 hours ago')
      expect(fb.time.elapsed(now, oneDayFromNow)).toBe('24 hours ago')
      expect(fb.time.elapsed(now, oneDayFromNow + 1)).toBe('1 day ago')

      expect(fb.time.elapsed(now, oneWeekFromNow)).toBe('7 days ago')
      expect(fb.time.elapsed(now, fourWeeksAfterNow)).toBe('28 days ago')
      expect(fb.time.elapsed(now, oneMonthFromNow)).toBe('1 month ago')
      expect(fb.time.elapsed(now, twoMonthFromNow)).toBe('2 months ago')
      expect(fb.time.elapsed(now, oneAndAHalfYearFromNow)).toBe('1 year ago')
      expect(fb.time.elapsed(now, twoYearsFromNow)).toBe('2 years ago')
      expect(fb.time.elapsed(now, Date.UTC(2022, 1, 18))).toBe('13 years ago')

      expect(fb.time.elapsed(now - 1, now)).toBe('0 seconds ago')
      expect(fb.time.elapsed(now + 1, now)).toBe('in 0 seconds')

      expect(fb.time.elapsed(now + 499, now)).toBe('in 0 seconds')
      expect(fb.time.elapsed(now + 500, now)).toBe('in 1 second')
      expect(fb.time.elapsed(now + 501, now)).toBe('in 1 second')
      expect(fb.time.elapsed(now + 1000, now)).toBe('in 1 second')
      expect(fb.time.elapsed(now + 59_499, now)).toBe('in 59 seconds')
      expect(fb.time.elapsed(now + 59_500, now)).toBe('in 60 seconds')
      expect(fb.time.elapsed(now + 59_501, now)).toBe('in 60 seconds')
      expect(fb.time.elapsed(now + 89_999, now)).toBe('in 1 minute')
      expect(fb.time.elapsed(now + 90_000, now)).toBe('in 2 minutes')
      expect(fb.time.elapsed(now + 90_001, now)).toBe('in 2 minutes')
      expect(fb.time.elapsed(oneDayFromNow - 1, now)).toBe('in 24 hours')
      expect(fb.time.elapsed(oneDayFromNow, now)).toBe('in 24 hours')
      expect(fb.time.elapsed(oneDayFromNow + 1, now)).toBe('in 1 day')

      expect(fb.time.elapsed(oneWeekFromNow, now)).toBe('in 7 days')
      expect(fb.time.elapsed(fourWeeksAfterNow, now)).toBe('in 28 days')
      expect(fb.time.elapsed(oneMonthFromNow, now)).toBe('in 1 month')
      expect(fb.time.elapsed(twoMonthFromNow, now)).toBe('in 2 months')
      expect(fb.time.elapsed(oneAndAHalfYearFromNow, now)).toBe('in 1 year')
      expect(fb.time.elapsed(twoYearsFromNow, now)).toBe('in 2 years')
      expect(fb.time.elapsed(Date.UTC(2022, 1, 18), now)).toBe('in 13 years')
    })

    // Not every month of the year has the same amount of days:
    // Demonstrate and verify that month handling is sane.
    // Also show the edge cases for month having 30 or less days.
    it('should display elapsed time for month values in a sane way', () => {
      const feb01 = Date.UTC(2009, 1, 1)
      expect(fb.time.elapsed(feb01, feb01 + Date.UTC(1970, 0, 31))).toBe('30 days ago')
      expect(fb.time.elapsed(feb01, feb01 + Date.UTC(1970, 1, 1))).toBe('1 month ago')
      expect(fb.time.elapsed(feb01, feb01 + Date.UTC(1971, 0, 1))).toBe('12 months ago')
      expect(fb.time.elapsed(feb01, feb01 + Date.UTC(1971, 0, 2))).toBe('1 year ago')

      expect(fb.time.elapsed(feb01 + Date.UTC(1970, 0, 31), feb01)).toBe('in 30 days')
      expect(fb.time.elapsed(feb01 + Date.UTC(1970, 1, 1), feb01)).toBe('in 1 month')
      expect(fb.time.elapsed(feb01 + Date.UTC(1971, 0, 1), feb01)).toBe('in 12 months')
      expect(fb.time.elapsed(feb01 + Date.UTC(1971, 0, 2), feb01)).toBe('in 1 year')

      const mar03 = Date.UTC(2009, 2, 3)
      expect(fb.time.elapsed(feb01, mar03)).toBe('30 days ago')
      expect(fb.time.elapsed(mar03, feb01)).toBe('in 30 days')

      const mar04 = Date.UTC(2009, 2, 4)
      expect(fb.time.elapsed(feb01, mar04)).toBe('1 month ago')
      expect(fb.time.elapsed(mar04, feb01)).toBe('in 1 month')
    })

    it('should be able to display localized versions', () => {
      expect(fb.time.elapsed(now, now, 'es')).toBe('dentro de 0 segundos')
      expect(fb.time.elapsed(now, now, 'fr')).toBe('dans 0 seconde')
      expect(fb.time.elapsed(now, now, 'hi')).toBe('0 सेकंड में')
      expect(fb.time.elapsed(now, now, 'it')).toBe('tra 0 secondi')
      expect(fb.time.elapsed(now, now, 'zh')).toBe('0秒钟后')
      // fallback to english
      expect(fb.time.elapsed(now, now, 'xx')).toBe('in 0 seconds')
    })
  })
})
