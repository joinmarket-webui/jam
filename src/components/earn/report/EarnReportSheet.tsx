import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { DownloadIcon, PlusIcon, RefreshCwIcon, SearchIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStore } from 'zustand'
import { DevBadge } from '@/components/dev/DevBadge'
import { useQueryYieldgenReport, type EarnReportEntry } from '@/components/earn/report/hooks/useQueryYieldgenReport'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Balance } from '@/components/ui/jam/Balance'
import { SortIcon } from '@/components/ui/jam/SortIcon'
import { TablePagination } from '@/components/ui/jam/TablePagination'
import { Spinner } from '@/components/ui/spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { pseudoRandomFloat, pseudoRandomInteger } from '@/lib/utils'
import { jamSettingsStore } from '@/store/jamSettingsStore'
import type { AmountSats, Milliseconds } from '@/types/global'
import { EarnReportChart } from './EarnReportChart'

// Bitcoin genesis block date - used as the default 'since' for all-time sums
const BITCOIN_GENESIS_DATE = new Date('2009-01-03T18:15:05Z')

const sumEarned = (entries: EarnReportEntry[], since: Date): AmountSats => {
  return entries.filter((entry) => entry.timestamp >= since).reduce((sum, entry) => sum + (entry.earnedAmount ?? 0), 0)
}

const generateDemoEntry = () => {
  const daysAgo = pseudoRandomInteger(0, 180)
  const cjTotalAmount = pseudoRandomInteger(50_000, 1_000_000_000)
  return {
    timestamp: new Date(Date.now() - pseudoRandomInteger(0, daysAgo * MILLISECONDS_IN_A_DAY)),
    cjTotalAmount: pseudoRandomInteger(50_000, 1_000_000_000),
    inputCount: pseudoRandomInteger(1, 8),
    earnedAmount: pseudoRandomInteger(100, 5_000),
    inputAmount: Math.floor(cjTotalAmount * pseudoRandomFloat(0.1, 0.9)),
    confirmationDuration: pseudoRandomInteger(1, 180),
    fee: 0,
    notes: null,
  }
}

const MILLISECONDS_IN_A_DAY: Milliseconds = 24 * 60 * 60 * 1_000
const MILLISECONDS_IN_30_DAYS: Milliseconds = 30 * MILLISECONDS_IN_A_DAY
const MILLISECONDS_IN_90_DAYS: Milliseconds = 90 * MILLISECONDS_IN_A_DAY

const ITEMS_PER_PAGE = 25

const columnHelper = createColumnHelper<EarnReportEntry>()

type EarnReportColumnMeta = { align?: string; numeric?: boolean } | undefined

interface EarnReportSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const EarnReportSheet = ({ open, onOpenChange }: EarnReportSheetProps) => {
  const { t } = useTranslation()
  const { data: entries, isLoading, refetch, isRefetching } = useQueryYieldgenReport({ enabled: open })
  const isDeveloperMode = useStore(jamSettingsStore, (state) => state.state.developerMode)
  const [now] = useState(() => Date.now())

  const [demoEntries, setDemoEntries] = useState<EarnReportEntry[]>([])
  const [sorting, setSorting] = useState<SortingState>([{ id: 'timestamp', desc: true }])
  const [globalFilter, setGlobalFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE)

  const addDemoEntry = useCallback(() => {
    setDemoEntries((previous) => [...previous, generateDemoEntry()])
  }, [])

  const allEntries = useMemo(() => [...(entries ?? []), ...demoEntries], [entries, demoEntries])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns = useMemo<ColumnDef<EarnReportEntry, any>[]>(
    () => [
      columnHelper.accessor('timestamp', {
        header: () => t('earn.report.heading_timestamp'),
        sortingFn: (a, b) => a.original.timestamp.getTime() - b.original.timestamp.getTime(),
        cell: (info) => {
          const ts = info.getValue() as Date
          return <span title={ts.toISOString()}>{ts.toLocaleString()}</span>
        },
      }),
      columnHelper.accessor('earnedAmount', {
        header: () => <div className="flex items-center justify-end">{t('earn.report.heading_earned')}</div>,
        cell: (info) =>
          info.getValue() != null ? <Balance valueString={String(info.getValue())} showBalance={true} /> : undefined,
        meta: { align: 'right', numeric: true } as EarnReportColumnMeta,
      }),
      columnHelper.accessor('cjTotalAmount', {
        header: () => <div className="flex items-center justify-end">{t('earn.report.heading_cj_amount')}</div>,
        cell: (info) =>
          info.getValue() != null ? <Balance valueString={String(info.getValue())} showBalance={true} /> : undefined,
        meta: { align: 'right', numeric: true } as EarnReportColumnMeta,
      }),
      columnHelper.accessor('inputCount', {
        header: () => <div className="flex items-center justify-end">{t('earn.report.heading_input_count')}</div>,
        cell: (info) => <span>{info.getValue() as number}</span>,
        meta: { align: 'right', numeric: true } as EarnReportColumnMeta,
      }),
      columnHelper.accessor('inputAmount', {
        header: () => <div className="flex items-center justify-end">{t('earn.report.heading_input_value')}</div>,
        cell: (info) =>
          info.getValue() != null ? <Balance valueString={String(info.getValue())} showBalance={true} /> : undefined,
        meta: { align: 'right', numeric: true } as EarnReportColumnMeta,
      }),
      columnHelper.accessor('notes', {
        header: () => t('earn.report.heading_notes'),
        enableSorting: false,
        cell: (info) => <span className="text-muted-foreground max-w-[200px] truncate text-xs">{info.getValue()}</span>,
      }),
    ],
    [t],
  )

  const table = useReactTable<EarnReportEntry>({
    data: allEntries,
    columns,
    state: {
      globalFilter,
      sorting,
      pagination: {
        pageIndex: Math.max(0, currentPage - 1),
        pageSize: itemsPerPage === -1 ? allEntries.length || 1 : itemsPerPage,
      },
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const totalPages = useMemo(() => {
    if (itemsPerPage === -1) return 1
    return Math.max(1, Math.ceil(allEntries.length / itemsPerPage))
  }, [itemsPerPage, allEntries.length])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
      table.setPageIndex(Math.max(0, totalPages - 1))
    }
  }, [totalPages, currentPage, table])

  const visibleRows = table.getRowModel().rows

  // Export visible entries as CSV
  const downloadCsv = useCallback(() => {
    const header = 'timestamp,cj_amount,input_count,input_amount,fee,earned,confirm_minutes,notes'
    const rows = visibleRows.map((row) =>
      [
        row.original.timestamp.toISOString(),
        row.original.cjTotalAmount ?? '',
        row.original.inputCount ?? '',
        row.original.inputAmount ?? '',
        row.original.fee ?? '',
        row.original.earnedAmount ?? '',
        row.original.confirmationDuration ?? '',
        row.original.notes ?? '',
      ].join(','),
    )
    const value = header + '\n' + rows.join('\n')
    const blob = new Blob([value], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `earn-report-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    setTimeout(() => {
      URL.revokeObjectURL(url)
    }, 0)
  }, [visibleRows])

  const earnedTotal = useMemo(() => sumEarned(allEntries, BITCOIN_GENESIS_DATE), [allEntries])

  // TODO: `since` date should be on start of day
  const earned90Days = useMemo(() => sumEarned(allEntries, new Date(now - MILLISECONDS_IN_90_DAYS)), [allEntries, now])
  const earned30Days = useMemo(() => sumEarned(allEntries, new Date(now - MILLISECONDS_IN_30_DAYS)), [allEntries, now])
  const earned24Hours = useMemo(() => sumEarned(allEntries, new Date(now - MILLISECONDS_IN_A_DAY)), [allEntries, now])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom flex h-screen max-w-screen! flex-col rounded-none border-none">
        <DialogHeader>
          <DialogTitle>
            {t('earn.report.title')}
            <span className="text-muted-foreground ml-2 text-sm font-normal">
              {globalFilter === ''
                ? t('earn.report.text_report_summary', { count: allEntries.length })
                : t('earn.report.text_report_summary_filtered', { count: table.getFilteredRowModel().rows.length })}
            </span>
          </DialogTitle>
        </DialogHeader>

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
                  value={globalFilter}
                  onChange={(event) => setGlobalFilter(event.target.value)}
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
              {isDeveloperMode ? (
                <Button variant="outline" size="sm" onClick={addDemoEntry}>
                  <PlusIcon />
                  {t('earn.report.text_button_generate_demo_report')}
                  <DevBadge />
                </Button>
              ) : undefined}
            </div>

            {/* Table or empty state */}
            {allEntries.length === 0 ? (
              <div className="space-y-2">
                <Alert variant="default">
                  <AlertTitle>{t('earn.alert_empty_report')}</AlertTitle>
                </Alert>
              </div>
            ) : (
              <div className="flex flex-1 flex-col gap-2 overflow-hidden rounded-lg border shadow-lg">
                <div className="flex-1 overflow-auto">
                  <Table>
                    <TableHeader>
                      {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                          {headerGroup.headers.map((header) => {
                            const canSort = header.column.getCanSort()
                            const alignRight = (header.column.columnDef.meta as EarnReportColumnMeta)?.align === 'right'
                            return (
                              <TableHead
                                key={header.id}
                                className={canSort ? 'cursor-pointer select-none' : ''}
                                onClick={canSort ? () => header.column.toggleSorting() : undefined}
                              >
                                <div
                                  className={`flex items-center gap-2 ${alignRight ? 'justify-end' : ''} ${canSort ? 'cursor-pointer select-none' : ''} ${header.column.getIsSorted() ? 'font-bold' : ''} ${table.getState().sorting.length > 0 && !header.column.getIsSorted() ? 'text-muted-foreground' : ''}`}
                                >
                                  {flexRender(header.column.columnDef.header, header.getContext())}
                                  {canSort ? <SortIcon className="size-4" column={header.column} /> : undefined}
                                </div>
                              </TableHead>
                            )
                          })}
                        </TableRow>
                      ))}
                    </TableHeader>
                    <TableBody>
                      {visibleRows.map((row) => (
                        <TableRow key={row.id}>
                          {row.getVisibleCells().map((cell) => {
                            const alignRight = (cell.column.columnDef.meta as EarnReportColumnMeta)?.align === 'right'
                            return (
                              <TableCell key={cell.id} className={alignRight ? 'text-right' : ''}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </TableCell>
                            )
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <TablePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  itemsPerPage={itemsPerPage}
                  totalItems={allEntries.length}
                  onPageChange={(page) => {
                    setCurrentPage(page)
                    table.setPageIndex(Math.max(0, page - 1))
                  }}
                  onItemsPerPageChange={(newItemsPerPage) => {
                    setItemsPerPage(newItemsPerPage)
                    const size =
                      newItemsPerPage === -1 ? table.getPrePaginationRowModel().rows.length || 1 : newItemsPerPage
                    table.setPageSize(size)
                    setCurrentPage(1)
                    table.setPageIndex(0)
                  }}
                />
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
