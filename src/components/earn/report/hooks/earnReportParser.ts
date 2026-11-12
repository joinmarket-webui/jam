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
  const cleanLine = line.replace(/\r?\n$/, '')
  if (!cleanLine.includes(',')) return null

  const values = cleanLine.split(',')
  if (values.length < 8) return null

  const rawNotes = values[7].trim()

  return {
    timestamp: parseYieldgenTimestamp(values[0]),
    cjTotalAmount: values[1] !== '' ? Number.parseInt(values[1], 10) : null,
    inputCount: values[2] !== '' ? Number.parseInt(values[2], 10) : null,
    inputAmount: values[3] !== '' ? Number.parseInt(values[3], 10) : null,
    fee: values[4] !== '' ? Number.parseInt(values[4], 10) : null,
    earnedAmount: values[5] !== '' ? Number.parseInt(values[5], 10) : null,
    confirmationDuration: values[6] !== '' ? Number.parseFloat(values[6]) : null,
    notes: rawNotes !== '' ? rawNotes : null,
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

const isValidDate = (date: Date) => !Number.isNaN(date.getTime())

const formatCsvField = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return ''
  const stringValue = String(value)
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replaceAll('"', '""')}"`
  }
  return stringValue
}

export const earnReportToCsv = (entries: EarnReportEntry[]): string => {
  const header = 'timestamp,cj_amount,input_count,input_amount,fee,earned,confirm_minutes,notes'
  const rows = entries.map((entry) =>
    [
      formatCsvField(isValidDate(entry.timestamp) ? entry.timestamp.toISOString() : ''),
      formatCsvField(entry.cjTotalAmount),
      formatCsvField(entry.inputCount),
      formatCsvField(entry.inputAmount),
      formatCsvField(entry.fee),
      formatCsvField(entry.earnedAmount),
      formatCsvField(entry.confirmationDuration),
      formatCsvField(entry.notes),
    ].join(','),
  )
  return [header, ...rows].join('\n')
}
