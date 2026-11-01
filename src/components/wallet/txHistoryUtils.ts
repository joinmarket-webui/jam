import type { HistoryEntry } from '@/hooks/useQueryWalletHistory'

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
      formatCsvField(entry.cj_amount ?? entry.amount),
      formatCsvField(entry.net_fee),
      formatCsvField(entry.confirmations),
    ].join(','),
  )
  return [header, ...rows].join('\n')
}
