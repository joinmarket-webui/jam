import { describe, expect, it } from 'vitest'
import { earnReportToCsv, yieldgenReportToEarnReportEntries } from '@/components/earn/report/hooks/earnReportParser'

const EXPECTED_HEADER_LINE =
  'timestamp,cj amount/satoshi,my input count,my input value/satoshi,cjfee/satoshi,earned/satoshi,confirm time/min,notes\n'

describe('yieldgenReportToEarnReportEntries', () => {
  it('should parse empty data correctly', () => {
    const entries = yieldgenReportToEarnReportEntries([])
    expect(entries.length).toBe(0)
  })

  it('should parse data only containing headers correctly', () => {
    const entries = yieldgenReportToEarnReportEntries([EXPECTED_HEADER_LINE])
    expect(entries.length).toBe(0)
  })

  it('should parse expected data structure correctly', () => {
    const exampleData = [
      EXPECTED_HEADER_LINE,
      '2008/10/31 02:42:54,,,,,,,Connected\n',
      '2009/01/03 02:54:42,14999989490,4,20000005630,250,250,0.42,\n',
      '2009/01/03 03:03:32,10000000000,3,15000016390,250,250,0.8,\n',
      '2009/01/03 03:04:47,4999981140,1,5000016640,250,250,0,\n',
      '2009/01/03 03:06:07,1132600000,1,2500000000,250,250,13.37,\n',
      '2009/01/03 03:07:27,8867393010,2,10000000000,250,250,42,\n',
      '2009/01/03 03:08:52,1132595980,1,1367400250,250,250,0.17,\n',
    ]

    const entries = yieldgenReportToEarnReportEntries(exampleData)

    expect(entries.length).toBe(7)

    // Connected note entry
    const firstEntry = entries[0]
    expect(firstEntry.timestamp.toUTCString()).toBe('Fri, 31 Oct 2008 02:42:54 GMT')
    expect(firstEntry.cjTotalAmount).toBe(null)
    expect(firstEntry.inputCount).toBe(null)
    expect(firstEntry.inputAmount).toBe(null)
    expect(firstEntry.fee).toBe(null)
    expect(firstEntry.earnedAmount).toBe(null)
    expect(firstEntry.confirmationDuration).toBe(null)
    expect(firstEntry.notes).toBe('Connected')

    // Transaction entry
    const lastEntry = entries.at(-1)!
    expect(lastEntry.timestamp.toUTCString()).toBe('Sat, 03 Jan 2009 03:08:52 GMT')
    expect(lastEntry.cjTotalAmount).toBe(1132595980)
    expect(lastEntry.inputCount).toBe(1)
    expect(lastEntry.inputAmount).toBe(1367400250)
    expect(lastEntry.fee).toBe(250)
    expect(lastEntry.earnedAmount).toBe(250)
    expect(lastEntry.confirmationDuration).toBe(0.17)
    expect(lastEntry.notes).toBe(null)
  })

  it('strips CRLF line breaks and handles empty notes as null', () => {
    const dataWithCrlf = [
      EXPECTED_HEADER_LINE,
      '2009/01/03 02:54:42,14999989490,4,20000005630,250,250,0.42,\r\n',
      '2009/01/03 03:08:52,1132595980,1,1367400250,250,250,0.17,round 1\r\n',
    ]

    const entries = yieldgenReportToEarnReportEntries(dataWithCrlf)
    expect(entries).toHaveLength(2)
    expect(entries[0].notes).toBe(null)
    expect(entries[1].notes).toBe('round 1')
  })

  it('should handle unexpected/malformed data in a sane way', () => {
    const unexpectedHeader = EXPECTED_HEADER_LINE + ',foo,bar'
    const emptyLine = ''
    const onlyNewline = '\n'
    const shortLine = '2009/01/03 04:04:04,,,'
    const longLine = '2009/01/03 05:05:05,,,,,,,,,,,,,,,,,,,,,,,'
    const malformedLine = 'this,is,a,malformed,line,with,some,unexpected,data'

    const exampleData = [unexpectedHeader, emptyLine, onlyNewline, shortLine, longLine, malformedLine]

    const entries = yieldgenReportToEarnReportEntries(exampleData)

    expect(entries.length).toBe(2)

    const firstEntry = entries[0]
    expect(firstEntry.timestamp.toUTCString()).toBe('Sat, 03 Jan 2009 05:05:05 GMT')
    expect(firstEntry.cjTotalAmount).toBe(null)
    expect(firstEntry.earnedAmount).toBe(null)

    const secondEntry = entries[1]
    expect(secondEntry.timestamp.toUTCString()).toBe('Invalid Date')
    expect(secondEntry.cjTotalAmount).toBe(Number.NaN)
    expect(secondEntry.notes).toBe('unexpected')
  })
})

describe('earnReportToCsv', () => {
  it('returns only the header when entries are empty', () => {
    const csv = earnReportToCsv([])
    expect(csv).toBe('timestamp,cj_amount,input_count,input_amount,fee,earned,confirm_minutes,notes')
  })

  it('correctly serializes entries to CSV', () => {
    const csv = earnReportToCsv([
      {
        timestamp: new Date('2026-06-13T12:00:00.000Z'),
        cjTotalAmount: 100_000,
        inputCount: 2,
        inputAmount: 150_000,
        fee: 250,
        earnedAmount: 500,
        confirmationDuration: 1.5,
        notes: null,
      },
      {
        timestamp: new Date('2026-06-14T15:30:00.000Z'),
        cjTotalAmount: 200_000,
        inputCount: 3,
        inputAmount: 250_000,
        fee: 500,
        earnedAmount: 1_000,
        confirmationDuration: 2,
        notes: 'Connected',
      },
    ])

    const lines = csv.trim().split('\n')
    expect(lines).toHaveLength(3)
    expect(lines[0]).toBe('timestamp,cj_amount,input_count,input_amount,fee,earned,confirm_minutes,notes')
    expect(lines[1]).toBe('2026-06-13T12:00:00.000Z,100000,2,150000,250,500,1.5,')
    expect(lines[2]).toBe('2026-06-14T15:30:00.000Z,200000,3,250000,500,1000,2,Connected')
  })

  it('serializes invalid dates as empty timestamp', () => {
    const csv = earnReportToCsv([
      {
        timestamp: new Date('invalid'),
        cjTotalAmount: null,
        inputCount: null,
        inputAmount: null,
        fee: null,
        earnedAmount: null,
        confirmationDuration: null,
        notes: 'bad date',
      },
    ])

    const lines = csv.trim().split('\n')
    expect(lines[1]).toBe(',,,,,,,bad date')
  })

  it('escapes special characters such as commas, quotes, and newlines in notes', () => {
    const csv = earnReportToCsv([
      {
        timestamp: new Date('2026-06-13T12:00:00.000Z'),
        cjTotalAmount: 100_000,
        inputCount: 2,
        inputAmount: 150_000,
        fee: 250,
        earnedAmount: 500,
        confirmationDuration: 1.5,
        notes: 'round 1, "special" note\nnewline',
      },
    ])

    const lines = csv.trim().split('\n')
    expect(lines[0]).toBe('timestamp,cj_amount,input_count,input_amount,fee,earned,confirm_minutes,notes')
    expect(csv).toContain('"round 1, ""special"" note\nnewline"')
  })
})
