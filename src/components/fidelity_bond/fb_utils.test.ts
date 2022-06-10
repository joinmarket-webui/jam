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
})
