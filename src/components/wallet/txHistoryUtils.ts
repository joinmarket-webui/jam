import type { HistoryEntry } from '@/hooks/useQueryWalletHistory'

/**
 * The amount transferred by a history entry.
 *
 * `cj_amount` is only set for coinjoins (maker/taker). Direct sends and
 * deposits only carry their amount in `amount`.
 */
export const historyEntryAmount = (entry: HistoryEntry): number | undefined => entry.cj_amount ?? entry.amount

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
      formatCsvField(entry.timestamp),
      formatCsvField(entry.txid),
      formatCsvField(entry.role),
      formatCsvField(historyEntryAmount(entry)),
      formatCsvField(entry.net_fee),
      formatCsvField(entry.confirmations),
    ].join(','),
  )
  return [header, ...rows].join('\n')
}
