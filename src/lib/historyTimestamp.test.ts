import { describe, expect, it } from 'vitest'
import { yieldgenReportToEarnReportEntries } from '@/components/earn/report/hooks/earnReportParser'
import { withTimeZone } from '@/test/withTimeZone'
import { parseHistoryTimestamp } from './historyTimestamp'

const EXPECTED_UTC = '2026-10-14T10:38:39.123Z'

describe('parseHistoryTimestamp', () => {
  it('interprets timestamps without a time zone designator as UTC regardless of the local time zone', () => {
    for (const timeZone of ['UTC', 'America/New_York', 'Asia/Kolkata', 'Pacific/Chatham']) {
      withTimeZone(timeZone, () => {
        expect(parseHistoryTimestamp('2026-10-14T10:38:39.123456')?.toISOString()).toBe(EXPECTED_UTC)
        expect(parseHistoryTimestamp('2026-10-14T10:38:39')?.toISOString()).toBe('2026-10-14T10:38:39.000Z')
      })
    }
  })

  it('parses the yieldgen report format', () => {
    withTimeZone('America/New_York', () => {
      expect(parseHistoryTimestamp('2026/10/14 10:38:39')?.toISOString()).toBe('2026-10-14T10:38:39.000Z')
    })
  })

  it('respects an explicit offset', () => {
    withTimeZone('America/New_York', () => {
      expect(parseHistoryTimestamp('2026-10-14T10:38:39.123456Z')?.toISOString()).toBe(EXPECTED_UTC)
      expect(parseHistoryTimestamp('2026-10-14T10:38:39.123456+00:00')?.toISOString()).toBe(EXPECTED_UTC)
      expect(parseHistoryTimestamp('2026-10-14T16:08:39.123456+05:30')?.toISOString()).toBe(EXPECTED_UTC)
      expect(parseHistoryTimestamp('2026-10-14T06:38:39.123-0400')?.toISOString()).toBe(EXPECTED_UTC)
    })
  })

  it('truncates fractional seconds to milliseconds', () => {
    expect(parseHistoryTimestamp('2026-10-14T10:38:39.1')?.toISOString()).toBe('2026-10-14T10:38:39.100Z')
    expect(parseHistoryTimestamp('2026-10-14T10:38:39.999999')?.toISOString()).toBe('2026-10-14T10:38:39.999Z')
  })

  it('returns undefined for invalid values', () => {
    expect(parseHistoryTimestamp('')).toBeUndefined()
    expect(parseHistoryTimestamp('this')).toBeUndefined()
    expect(parseHistoryTimestamp('2026-10-14')).toBeUndefined()
    expect(parseHistoryTimestamp('2026-02-30T10:38:39')).toBeUndefined()
    expect(parseHistoryTimestamp('2026-10-14T25:38:39')).toBeUndefined()
    expect(parseHistoryTimestamp('2026-10-14T10:38:39 GMT')).toBeUndefined()
  })

  it('yields the same time for an entry of the wallet history and the yieldgen report', () => {
    withTimeZone('Asia/Kolkata', () => {
      const fromHistory = parseHistoryTimestamp('2026-10-14T10:38:39')
      const [fromReport] = yieldgenReportToEarnReportEntries(['header', '2026/10/14 10:38:39,1000,1,2000,250,250,,'])

      expect(fromHistory?.getTime()).toBe(fromReport.timestamp.getTime())
    })
  })
})
