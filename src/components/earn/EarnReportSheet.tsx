import { useCallback, useMemo, useState } from 'react'
import { DownloadIcon, PlusIcon, RefreshCwIcon, SearchIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Balance } from '@/components/ui/jam/Balance'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Spinner } from '@/components/ui/spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useQueryYieldgenReport, type EarnReportEntry } from '@/hooks/useQueryYieldgenReport'
import type { AmountSats } from '@/types/global'
import { EarnReportChart } from './EarnReportChart'

// Compute sum of earned amounts over entries matching a time filter
const sumEarned = (entries: EarnReportEntry[], sinceMs?: number): AmountSats => {
  const filtered =
    sinceMs != null ? entries.filter((entry) => entry.timestamp.getTime() > Date.now() - sinceMs) : entries
  return filtered.reduce((sum, entry) => sum + (entry.earnedAmount ?? 0), 0)
}

const MS_90_DAYS = 90 * 24 * 60 * 60 * 1_000
const MS_30_DAYS = 30 * 24 * 60 * 60 * 1_000
const MS_24_HOURS = 1 * 24 * 60 * 60 * 1_000

type SortKey = 'timestamp' | 'earnedAmount' | 'cjTotalAmount' | 'inputCount' | 'inputAmount'
type SortDirection = 'asc' | 'desc'

interface EarnReportSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const EarnReportSheet = ({ open, onOpenChange }: EarnReportSheetProps) => {
  const { t } = useTranslation()
  const { data: entries, isLoading, refetch, isRefetching } = useQueryYieldgenReport({ enabled: open })

  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('timestamp')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [demoEntries, setDemoEntries] = useState<EarnReportEntry[]>([])

  // Generate a random demo entry spread over the past 30 days
  const addDemoEntry = useCallback(() => {
    const daysAgo = Math.floor(Math.random() * 30)
    const hoursOffset = Math.floor(Math.random() * 24)
    const timestamp = new Date(Date.now() - daysAgo * 86_400_000 - hoursOffset * 3_600_000)
    const cjAmount = Math.floor(Math.random() * 50_000_000) + 1_000_000
    const inputCount = Math.floor(Math.random() * 4) + 1
    const earned = Math.floor(Math.random() * 5000) + 100

    setDemoEntries((previous) => [
      ...previous,
      {
        timestamp,
        cjTotalAmount: cjAmount,
        inputCount,
        inputAmount: Math.floor(cjAmount * 0.4),
        fee: earned,
        earnedAmount: earned,
        confirmationDuration: Math.round(Math.random() * 60 * 100) / 100,
        notes: null,
      },
    ])
  }, [])

  const allEntries = [...(entries ?? []), ...demoEntries]

  const filteredEntries = useMemo(() => {
    if (search === '') return allEntries
    const q = search.replace('.', '').toLowerCase()
    return allEntries.filter(
      (entry) =>
        entry.timestamp.toLocaleString().toLowerCase().includes(q) ||
        entry.cjTotalAmount?.toString().includes(q) ||
        entry.inputCount?.toString().includes(q) ||
        entry.inputAmount?.toString().includes(q) ||
        entry.earnedAmount?.toString().includes(q) ||
        entry.notes?.toLowerCase().includes(q),
    )
  }, [allEntries, search])

  const sortedEntries = useMemo(() => {
    const sorted = filteredEntries.toSorted((a, b) => {
      const valA = a[sortKey]
      const valB = b[sortKey]
      if (valA == null && valB == null) return 0
      if (valA == null) return 1
      if (valB == null) return -1
      if (sortKey === 'timestamp') return (valA as Date).getTime() - (valB as Date).getTime()
      return (valA as number) - (valB as number)
    })
    return sortDirection === 'desc' ? sorted.toReversed() : sorted
  }, [filteredEntries, sortKey, sortDirection])

  // Export visible entries as CSV
  const downloadCsv = useCallback(() => {
    const header = 'timestamp,cj_amount,input_count,input_amount,fee,earned,confirm_minutes,notes'
    const rows = sortedEntries.map((entry) =>
      [
        entry.timestamp.toISOString(),
        entry.cjTotalAmount ?? '',
        entry.inputCount ?? '',
        entry.inputAmount ?? '',
        entry.fee ?? '',
        entry.earnedAmount ?? '',
        entry.confirmationDuration ?? '',
        entry.notes ?? '',
      ].join(','),
    )
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `earn-report-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }, [sortedEntries])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDirection('desc')
    }
  }

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return ''
    return sortDirection === 'asc' ? ' ↑' : ' ↓'
  }

  const earnedTotal = useMemo(() => sumEarned(allEntries), [allEntries])
  const earned90Days = useMemo(() => sumEarned(allEntries, MS_90_DAYS), [allEntries])
  const earned30Days = useMemo(() => sumEarned(allEntries, MS_30_DAYS), [allEntries])
  const earned24Hours = useMemo(() => sumEarned(allEntries, MS_24_HOURS), [allEntries])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="flex h-[90vh] flex-col">
        <SheetHeader>
          <SheetTitle>{t('earn.report.title')}</SheetTitle>
          <SheetDescription>
            {search === ''
              ? t('earn.report.text_report_summary', { count: allEntries.length })
              : t('earn.report.text_report_summary_filtered', { count: filteredEntries.length })}
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Spinner />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
            {/* Stats row */}
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              {(
                [
                  { label: t('earn.report.stats.earned_total'), value: earnedTotal },
                  { label: t('earn.report.stats.earned_90days'), value: earned90Days },
                  { label: t('earn.report.stats.earned_30days'), value: earned30Days },
                  { label: t('earn.report.stats.earned_24hours'), value: earned24Hours },
                ] as const
              ).map((stat) => (
                <Card key={stat.label}>
                  <CardContent className="p-3 text-center">
                    <div className="text-muted-foreground text-xs">{stat.label}</div>
                    <div className="mt-1 text-lg font-semibold">
                      <Balance valueString={String(stat.value)} showBalance={true} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Daily earnings chart */}
            <EarnReportChart entries={allEntries} />

            {/* Toolbar: search + refresh */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <SearchIcon className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                <Input
                  placeholder={t('earn.report.placeholder_search')}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-8"
                />
              </div>
              <Button variant="outline" size="icon" onClick={() => void refetch()} disabled={isRefetching}>
                <RefreshCwIcon className={isRefetching ? 'animate-spin' : ''} />
              </Button>
              <Button variant="outline" size="sm" onClick={downloadCsv} disabled={allEntries.length === 0}>
                <DownloadIcon />
                {t('earn.report.text_button_download_csv')}
              </Button>
              <Button variant="outline" size="sm" onClick={addDemoEntry}>
                <PlusIcon />
                {t('earn.report.text_button_generate_demo_report')}
              </Button>
            </div>

            {/* Table or empty state */}
            {allEntries.length === 0 ? (
              <div className="space-y-2">
                <Alert variant="default">
                  <AlertTitle>{t('earn.alert_empty_report')}</AlertTitle>
                </Alert>
                <Button variant="outline" size="sm" onClick={addDemoEntry}>
                  <PlusIcon />
                  {t('earn.report.text_button_generate_demo_report')}
                </Button>
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer select-none" onClick={() => handleSort('timestamp')}>
                        {t('earn.report.heading_timestamp')}
                        {sortIndicator('timestamp')}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer text-right select-none"
                        onClick={() => handleSort('earnedAmount')}
                      >
                        {t('earn.report.heading_earned')}
                        {sortIndicator('earnedAmount')}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer text-right select-none"
                        onClick={() => handleSort('cjTotalAmount')}
                      >
                        {t('earn.report.heading_cj_amount')}
                        {sortIndicator('cjTotalAmount')}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer text-right select-none"
                        onClick={() => handleSort('inputCount')}
                      >
                        {t('earn.report.heading_input_count')}
                        {sortIndicator('inputCount')}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer text-right select-none"
                        onClick={() => handleSort('inputAmount')}
                      >
                        {t('earn.report.heading_input_value')}
                        {sortIndicator('inputAmount')}
                      </TableHead>
                      <TableHead>{t('earn.report.heading_notes')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedEntries.map((entry, i) => (
                      <TableRow key={i}>
                        <TableCell title={entry.timestamp.toISOString()}>{entry.timestamp.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          {entry.earnedAmount != null && (
                            <Balance valueString={String(entry.earnedAmount)} showBalance={true} />
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {entry.cjTotalAmount != null && (
                            <Balance valueString={String(entry.cjTotalAmount)} showBalance={true} />
                          )}
                        </TableCell>
                        <TableCell className="text-right">{entry.inputCount}</TableCell>
                        <TableCell className="text-right">
                          {entry.inputAmount != null && (
                            <Balance valueString={String(entry.inputAmount)} showBalance={true} />
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[200px] truncate text-xs">
                          {entry.notes}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
