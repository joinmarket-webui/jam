import type { AmountSats } from '@/types/global'

type Minutes = number

export interface EarnReportEntry {
  timestamp: Date
  cjTotalAmount: AmountSats | null
  inputCount: number | null
  inputAmount: AmountSats | null
  fee: AmountSats | null
  earnedAmount: AmountSats | null
  confirmationDuration: Minutes | null
  notes: string | null
}

// Yieldgen CSV timestamp format: yyyy/MM/dd HH:mm:ss
const parseYieldgenTimestamp = (val: string) => {
  return new Date(Date.parse(`${val} GMT`))
}

const yieldgenReportLineToEntry = (line: string): EarnReportEntry | null => {
  if (!line.includes(',')) return null

  const values = line.split(',')
  if (values.length < 8) return null

  return {
    timestamp: parseYieldgenTimestamp(values[0]),
    cjTotalAmount: values[1] !== '' ? Number.parseInt(values[1], 10) : null,
    inputCount: values[2] !== '' ? Number.parseInt(values[2], 10) : null,
    inputAmount: values[3] !== '' ? Number.parseInt(values[3], 10) : null,
    fee: values[4] !== '' ? Number.parseInt(values[4], 10) : null,
    earnedAmount: values[5] !== '' ? Number.parseInt(values[5], 10) : null,
    confirmationDuration: values[6] !== '' ? Number.parseFloat(values[6]) : null,
    notes: values[7] !== '' ? values[7] : null,
  }
}

/** Parse yieldgen report CSV lines (including header) into structured entries */
export const yieldgenReportToEarnReportEntries = (lines: string[]): EarnReportEntry[] => {
  // Report is "empty" if it just contains the header line
  const linesWithoutHeader = lines.length <= 1 ? [] : lines.slice(1)

  return linesWithoutHeader
    .map((line) => yieldgenReportLineToEntry(line))
    .filter((entry): entry is EarnReportEntry => entry !== null)
}
