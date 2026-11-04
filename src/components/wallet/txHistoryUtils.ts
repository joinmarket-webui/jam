import type { HistoryEntry } from '@/hooks/useQueryWalletHistory'

/**
 * The amount transferred by a history entry.
 *
 * `cj_amount` is only set for coinjoins (maker/taker). Direct sends and
 * deposits only carry their amount in `amount`.
 */
export const historyEntryAmount = (entry: HistoryEntry): number | undefined => entry.cj_amount ?? entry.amount

const hasTimeZoneDesignator = (value: string) => /(Z|[+-]\d{2}:?\d{2})$/i.test(value)

/**
 * Parses a history entry timestamp.
 *
 * joinmarket-ng sends timestamps without an offset; they are UTC (see #1542).
 */
export const parseHistoryTimestamp = (value: string): Date =>
  new Date(hasTimeZoneDesignator(value) ? value : `${value}Z`)

const formatCsvTimestamp = (value: string): string => {
  const date = parseHistoryTimestamp(value)
  return Number.isNaN(date.getTime()) ? value : date.toISOString()
}

const formatCsvField = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return ''
  const stringValue = String(value)
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replaceAll('"', '""')}"`
  }
  return stringValue
}

export const txHistoryToCsv = (entries: HistoryEntry[]): string => {
  const header = 'timestamp,txid,role,amount,net_fee,confirmations'
  const rows = entries.map((entry) =>
    [
      formatCsvField(formatCsvTimestamp(entry.timestamp)),
      formatCsvField(entry.txid),
      formatCsvField(entry.role),
      formatCsvField(historyEntryAmount(entry)),
      formatCsvField(entry.net_fee),
      formatCsvField(entry.confirmations),
    ].join(','),
  )
  return [header, ...rows].join('\n')
}
