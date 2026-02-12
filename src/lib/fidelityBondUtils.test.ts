import { describe, it, expect } from 'vitest'
import type { Utxo } from '@/hooks/useQueryUtxos'
import * as fb from './fidelityBondUtils'

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
  }) as Utxo

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

      expect(() => fb.lockdate.fromTimestamp(Number.NaN)).toThrowError('Unsupported input: NaN')
    })

    it('should convert lockdate to timestamp', () => {
      expect(fb.lockdate.toTimestamp('2008-10')).toBe(Date.UTC(2008, 9, 1))
      expect(fb.lockdate.toTimestamp('2009-01')).toBe(Date.UTC(2009, 0, 1))
      expect(fb.lockdate.toTimestamp('2999-12')).toBe(Date.UTC(2999, 11))

      expect(() => fb.lockdate.toTimestamp('-1' as fb.Lockdate)).toThrowError('Unsupported format')
      expect(() => fb.lockdate.toTimestamp('2008-1' as fb.Lockdate)).toThrowError('Unsupported format')
      expect(() => fb.lockdate.toTimestamp('10000-01' as fb.Lockdate)).toThrowError('Unsupported format')
      expect(() => fb.lockdate.toTimestamp('' as fb.Lockdate)).toThrowError('Unsupported format')
      expect(() => fb.lockdate.toTimestamp('any' as fb.Lockdate)).toThrowError('Unsupported format')
    })

    it('should silently roll over out-of-range months', () => {
      // Date.UTC(2009, 12) rolls over to Jan 2010
      expect(fb.lockdate.toTimestamp('2009-13' as fb.Lockdate)).toBe(Date.UTC(2010, 0, 1))
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
        ]),
      ).toBe(true)

      expect(
        fb.utxo.isInList(makeUtxo('foo:0'), [
          makeUtxo('foo:0'),
          makeUtxo('foo:1'),
          makeUtxo('foo:2'),
          makeUtxo('foo:3'),
          makeUtxo('foo:4'),
        ]),
      ).toBe(true)

      expect(
        fb.utxo.isInList(makeUtxo('foo:4'), [
          makeUtxo('foo:0'),
          makeUtxo('foo:1'),
          makeUtxo('foo:2'),
          makeUtxo('foo:3'),
          makeUtxo('foo:4'),
        ]),
      ).toBe(true)

      expect(
        fb.utxo.isInList(makeUtxo('foo:5'), [
          makeUtxo('foo:0'),
          makeUtxo('foo:1'),
          makeUtxo('foo:2'),
          makeUtxo('foo:3'),
          makeUtxo('foo:4'),
        ]),
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
          locktime: '2009-03-01 00:00:00',
          path: `m/84'/1'/0'/0/1:${now / 1_000 + 1}`,
        } as Utxo
        expect(fb.utxo.isLocked(utxo, now)).toBe(true)
      })

      it('should detect expired timelocked utxo as unlocked', () => {
        const utxo = {
          // timelocked, but expired
          locktime: '2009-03-01 00:00:00',
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

    describe('isFidelityBond', () => {
      it('should return true when locktime is present', () => {
        const utxo = { locktime: '2025-06-01 00:00:00', path: `m/84'/1'/0'/0/1:1748736000` } as Utxo
        expect(fb.utxo.isFidelityBond(utxo)).toBe(true)
      })

      it('should return false when locktime is missing', () => {
        expect(fb.utxo.isFidelityBond(makeUtxo('abc:0'))).toBe(false)
      })

      it('should return false when locktime is empty string', () => {
        const utxo = { locktime: '', path: `m/84'/1'/0'/0/1` } as unknown as Utxo
        expect(fb.utxo.isFidelityBond(utxo)).toBe(false)
      })
    })

    describe('getLocktime', () => {
      it('should extract locktime from a fidelity bond utxo', () => {
        const utxo = {
          locktime: '2025-06-01 00:00:00',
          path: `m/84'/1'/0'/0/1:1748736000`,
        } as Utxo
        expect(fb.utxo.getLocktime(utxo)).toBe(1748736000 * 1_000)
      })

      it('should return null for a regular utxo', () => {
        expect(fb.utxo.getLocktime(makeUtxo('abc:0'))).toBeNull()
      })

      it('should return null when path has no colon separator', () => {
        const utxo = { locktime: '2025-06-01 00:00:00', path: `m/84'/1'/0'/0/1` } as Utxo
        expect(fb.utxo.getLocktime(utxo)).toBeNull()
      })

      it('should return null when path has multiple colon separators', () => {
        const utxo = { locktime: '2025-06-01 00:00:00', path: `m/84'/1'/0'/0/1:123:456` } as Utxo
        expect(fb.utxo.getLocktime(utxo)).toBeNull()
      })

      it('should return null when locktime in path is not a number', () => {
        const utxo = { locktime: '2025-06-01 00:00:00', path: `m/84'/1'/0'/0/1:notanumber` } as Utxo
        expect(fb.utxo.getLocktime(utxo)).toBeNull()
      })
    })
  })
})
