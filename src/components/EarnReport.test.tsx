import { yieldgenReportToEarnReportEntries } from './EarnReport'

describe('Earn Report', () => {
  it('should parse empty data correctly', () => {
    const entries = yieldgenReportToEarnReportEntries([])
    expect(entries.length).toBe(0)
  })

  it('should parse data only containing headers correctly', () => {
    const onlyHeaders = [
      'timestamp,cj amount/satoshi,my input count,my input value/satoshi,cjfee/satoshi,earned/satoshi,confirm time/min,notes\n',
    ]

    const entries = yieldgenReportToEarnReportEntries(onlyHeaders)

    expect(entries.length).toBe(0)
  })

  it('should parse expected data structure correctly', () => {
    const exampleData = [
      'timestamp,cj amount/satoshi,my input count,my input value/satoshi,cjfee/satoshi,earned/satoshi,confirm time/min,notes\n',
      '2009/01/03 02:54:42,,,,,,,Connected\n',
      '2009/01/03 03:02:12,14999989490,4,20000005630,250,250,0.42,\n',
      '2009/01/03 03:03:32,10000000000,3,15000016390,250,250,0.8,\n',
      '2009/01/03 03:04:47,4999981140,1,5000016640,250,250,0,\n',
      '2009/01/03 03:06:07,1132600000,1,2500000000,250,250,13.37,\n',
      '2009/01/03 03:07:27,8867393010,2,10000000000,250,250,42,\n',
      '2009/01/03 03:08:52,1132595980,1,1367400250,250,250,0.17,\n',
    ]

    const entries = yieldgenReportToEarnReportEntries(exampleData)

    expect(entries.length).toBe(7)

    const firstEntry = entries[0]
    expect(firstEntry.timestamp.toUTCString()).toBe('Sat, 03 Jan 2009 02:54:42 GMT')
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
})
