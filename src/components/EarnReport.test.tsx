import { yieldgenReportToEarnReportEntries } from './EarnReport'

const EXPECTED_HEADER_LINE =
  'timestamp,cj amount/satoshi,my input count,my input value/satoshi,cjfee/satoshi,earned/satoshi,confirm time/min,notes\n'

describe('Earn Report', () => {
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

    const firstEntry = entries[0]
    expect(firstEntry.timestamp.toUTCString()).toBe('Fri, 31 Oct 2008 02:42:54 GMT')
    expect(firstEntry.cjTotalAmount).toBe(null)
    expect(firstEntry.inputCount).toBe(null)
    expect(firstEntry.inputAmount).toBe(null)
    expect(firstEntry.fee).toBe(null)
    expect(firstEntry.earnedAmount).toBe(null)
    expect(firstEntry.confirmationDuration).toBe(null)
    expect(firstEntry.notes).toBe('Connected\n')

    const lastEntry = entries[entries.length - 1]
    expect(lastEntry.timestamp.toUTCString()).toBe('Sat, 03 Jan 2009 03:08:52 GMT')
    expect(lastEntry.cjTotalAmount).toBe(1132595980)
    expect(lastEntry.inputCount).toBe(1)
    expect(lastEntry.inputAmount).toBe(1367400250)
    expect(lastEntry.fee).toBe(250)
    expect(lastEntry.earnedAmount).toBe(250)
    expect(lastEntry.confirmationDuration).toBe(0.17)
    expect(lastEntry.notes).toBe('\n')
  })

  it('should handle unexpected/malformed data in a sane way', () => {
    const unexpectedHeader = EXPECTED_HEADER_LINE + ',foo,bar'
    const emptyLine = '' // should be skipped
    const onlyNewLine = '\n' // should be skipped
    const shortLine = '2009/01/03 04:04:04,,,' // should be skipped
    const longLine = '2009/01/03 05:05:05,,,,,,,,,,,,,,,,,,,,,,,' // should be parsed
    const malformedLine = 'this,is,a,malformed,line,with,some,unexpected,data' // should be parsed

    const exampleData = [unexpectedHeader, emptyLine, onlyNewLine, shortLine, longLine, malformedLine]

    const entries = yieldgenReportToEarnReportEntries(exampleData)

    expect(entries.length).toBe(2)

    const firstEntry = entries[0]
    expect(firstEntry.timestamp.toUTCString()).toBe('Sat, 03 Jan 2009 05:05:05 GMT')
    expect(firstEntry.cjTotalAmount).toBe(null)
    expect(firstEntry.inputCount).toBe(null)
    expect(firstEntry.inputAmount).toBe(null)
    expect(firstEntry.fee).toBe(null)
    expect(firstEntry.earnedAmount).toBe(null)
    expect(firstEntry.confirmationDuration).toBe(null)
    expect(firstEntry.notes).toBe(null)

    const secondEntry = entries[1]
    expect(secondEntry.timestamp.toUTCString()).toBe('Invalid Date')
    expect(secondEntry.cjTotalAmount).toBe(NaN)
    expect(secondEntry.inputCount).toBe(NaN)
    expect(secondEntry.inputAmount).toBe(NaN)
    expect(secondEntry.fee).toBe(NaN)
    expect(secondEntry.earnedAmount).toBe(NaN)
    expect(secondEntry.confirmationDuration).toBe(NaN)
    expect(secondEntry.notes).toBe('unexpected')
  })
})
