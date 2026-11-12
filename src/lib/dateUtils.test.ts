import { describe, expect, it } from 'vitest'
import { withTimeZone } from '@/test/withTimeZone'
import { hasTimeZoneDesignator, isValidDate, normalizeTimestamp, parseTimestamp } from './dateUtils'

describe('dateUtils', () => {
  describe('normalizeTimestamp', () => {
    it('converts slash-separated dates to hyphenated format', () => {
      expect(normalizeTimestamp('2026/11/09 07:22:05')).toBe('2026-11-09T07:22:05')
      expect(normalizeTimestamp('2008/10/31 02:42:54')).toBe('2008-10-31T02:42:54')
    })

    it('replaces space between date and time with T', () => {
      expect(normalizeTimestamp('2026-10-31 13:10:05')).toBe('2026-10-31T13:10:05')
      expect(normalizeTimestamp('2026-10-14 10:38:39.123456')).toBe('2026-10-14T10:38:39.123456')
    })

    it('normalizes trailing GMT or UTC indicators to Z', () => {
      expect(normalizeTimestamp('2026/11/09 07:22:05 GMT')).toBe('2026-11-09T07:22:05Z')
      expect(normalizeTimestamp('2026/11/09 07:22:05 UTC')).toBe('2026-11-09T07:22:05Z')
      expect(normalizeTimestamp('2026-10-31 13:10:05 GMT')).toBe('2026-10-31T13:10:05Z')
    })

    it('preserves existing ISO 8601 formatting and explicit offsets', () => {
      expect(normalizeTimestamp('2026-07-28T12:00:00Z')).toBe('2026-07-28T12:00:00Z')
      expect(normalizeTimestamp('2026-07-28T17:30:00+05:30')).toBe('2026-07-28T17:30:00+05:30')
      expect(normalizeTimestamp('2026-10-31 18:40:05+05:30')).toBe('2026-10-31T18:40:05+05:30')
    })
  })
  describe('hasTimeZoneDesignator', () => {
    it('detects Z or z time zone indicator', () => {
      expect(hasTimeZoneDesignator('2026-07-28T12:00:00Z')).toBe(true)
      expect(hasTimeZoneDesignator('2026-07-28T12:00:00z')).toBe(true)
      expect(hasTimeZoneDesignator('2026-07-28T12:00:00Z  ')).toBe(true)
    })

    it('detects +/- offset indicators', () => {
      expect(hasTimeZoneDesignator('2026-07-28T12:00:00+00:00')).toBe(true)
      expect(hasTimeZoneDesignator('2026-07-28T12:00:00-04:00')).toBe(true)
      expect(hasTimeZoneDesignator('2026-07-28T12:00:00+05:30')).toBe(true)
      expect(hasTimeZoneDesignator('2026-07-28T12:00:00+0200')).toBe(true)
      expect(hasTimeZoneDesignator('2026-07-28T12:00:00-0800')).toBe(true)
    })

    it('detects GMT and UTC indicators', () => {
      expect(hasTimeZoneDesignator('2008/10/31 02:42:54 GMT')).toBe(true)
      expect(hasTimeZoneDesignator('2008/10/31 02:42:54 UTC')).toBe(true)
    })

    it('returns false for timestamps without an explicit time zone', () => {
      expect(hasTimeZoneDesignator('2026-07-28T12:00:00.123456')).toBe(false)
      expect(hasTimeZoneDesignator('2026-07-28T12:00:00')).toBe(false)
      expect(hasTimeZoneDesignator('2008/10/31 02:42:54')).toBe(false)
      expect(hasTimeZoneDesignator('2009-01-03 05:05:05')).toBe(false)
      expect(hasTimeZoneDesignator('')).toBe(false)
    })
  })

  describe('isValidDate', () => {
    it('returns true for valid Date instances', () => {
      expect(isValidDate(new Date())).toBe(true)
      expect(isValidDate(new Date('2026-07-28T12:00:00Z'))).toBe(true)
      expect(isValidDate(new Date(1_225_420_974_000))).toBe(true)
    })

    it('returns false for invalid Date instances or non-Date values', () => {
      expect(isValidDate(new Date('invalid'))).toBe(false)
      expect(isValidDate(new Date(Number.NaN))).toBe(false)
      expect(isValidDate(undefined)).toBe(false)
      expect(isValidDate(null)).toBe(false)
      expect(isValidDate('2026-07-28T12:00:00Z')).toBe(false)
      expect(isValidDate(1_225_420_974_000)).toBe(false)
      expect(isValidDate({})).toBe(false)
    })
  })

  describe('parseTimestamp', () => {
    it('parses timestamps without a time zone designator as UTC across different local time zones', () => {
      withTimeZone('America/New_York', () => {
        const parsed = parseTimestamp('2026-07-28T12:00:00.123456')
        expect(parsed?.toISOString()).toBe('2026-07-28T12:00:00.123Z')
      })

      withTimeZone('Asia/Kolkata', () => {
        const parsed = parseTimestamp('2026-07-28T12:00:00.123456')
        expect(parsed?.toISOString()).toBe('2026-07-28T12:00:00.123Z')
      })
    })

    it('respects explicit time zone designators', () => {
      withTimeZone('America/New_York', () => {
        const parsedZ = parseTimestamp('2026-07-28T12:00:00.000Z')
        expect(parsedZ?.toISOString()).toBe('2026-07-28T12:00:00.000Z')

        const parsedOffset = parseTimestamp('2026-07-28T17:30:00+05:30')
        expect(parsedOffset?.toISOString()).toBe('2026-07-28T12:00:00.000Z')
      })
    })

    it('parses slash-separated date formats (e.g. yieldgen CSV) as UTC', () => {
      withTimeZone('America/New_York', () => {
        const parsed = parseTimestamp('2008/10/31 02:42:54')
        expect(parsed?.toISOString()).toBe('2008-10-31T02:42:54.000Z')

        const parsedGmt = parseTimestamp('2008/10/31 02:42:54 GMT')
        expect(parsedGmt?.toISOString()).toBe('2008-10-31T02:42:54.000Z')

        const parsedUtc = parseTimestamp('2026/11/09 07:22:05 UTC')
        expect(parsedUtc?.toISOString()).toBe('2026-11-09T07:22:05.000Z')
      })
    })

    it('parses space-separated date-time strings without offset as UTC', () => {
      withTimeZone('America/New_York', () => {
        const parsed = parseTimestamp('2026-10-31 13:10:05')
        expect(parsed?.toISOString()).toBe('2026-10-31T13:10:05.000Z')
      })
    })

    it('trims leading and trailing whitespace', () => {
      const parsed = parseTimestamp('   2026-07-28T12:00:00Z   ')
      expect(parsed?.toISOString()).toBe('2026-07-28T12:00:00.000Z')
    })

    it('returns undefined for invalid, empty, or nil values', () => {
      expect(parseTimestamp(undefined)).toBeUndefined()
      expect(parseTimestamp(null)).toBeUndefined()
      expect(parseTimestamp('')).toBeUndefined()
      expect(parseTimestamp(' '.repeat(3))).toBeUndefined()
      expect(parseTimestamp('invalid-date')).toBeUndefined()
      expect(parseTimestamp('not-a-timestamp')).toBeUndefined()
    })
  })
})
