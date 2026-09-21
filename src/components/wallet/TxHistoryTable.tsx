import { useEffect, useMemo, useState } from 'react'
import {
  createColumnHelper,
  flexRender,
  useTable,
  type PaginationState,
  type Row,
  type SortingState,
} from '@tanstack/react-table'
import type { TFunction } from 'i18next'
import { CheckIcon, ChevronDownIcon, CopyIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { TablePagination } from '@/components/ui/jam/TablePagination'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { HistoryEntry } from '@/hooks/useQueryWalletHistory'
import { cn, shortenStringMiddle } from '@/lib/utils'
import { Alert, AlertDescription } from '../ui/alert'
import { Button } from '../ui/button'
import { buttonVariants } from '../ui/button-variants'
import { Card, CardContent } from '../ui/card'
import { Balance } from '../ui/jam/Balance'
import { CopyButton } from '../ui/jam/CopyButton'
import { SortIcon } from '../ui/jam/SortIcon'
import { StatusBadge } from '../ui/jam/StatusBadge'
import { txHistoryTableFeatures } from './TxHistoryTable.schema'

const ITEMS_PER_PAGE = 25

type KnownHistoryRole = NonNullable<HistoryEntry['role']>
type StatusBadgeVariant = NonNullable<Parameters<typeof StatusBadge>[0]['variant']>

const ROLE_VARIANT: Record<KnownHistoryRole, StatusBadgeVariant> = {
  maker: 'cj-out',
  taker: 'cj-change',
  send: 'used-empty',
  deposit: 'deposit',
}

const columnHelper = createColumnHelper<typeof txHistoryTableFeatures, HistoryEntry>()

const historyRole = (entry: HistoryEntry): KnownHistoryRole | undefined => {
  return ['maker', 'taker', 'send', 'deposit'].includes(entry.role ?? '') ? entry.role : undefined
}

const roleLabel = (entry: HistoryEntry, t: TFunction) => {
  const role = historyRole(entry)
  return role ? t(`tx_history.label_role_${role}`) : entry.role || ''
}

const dateTimeValue = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 0 : date.getTime()
}

const formatDateTime = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

const TxHistoryDetails = ({ entry }: { entry: HistoryEntry }) => {
  return (
    <Card>
      <CardContent className="overflow-x-auto p-4 font-mono text-xs">
        <pre>{JSON.stringify(entry, null, 2)}</pre>
      </CardContent>
    </Card>
  )
}

const TxHistoryTableRow = ({ row }: { row: Row<typeof txHistoryTableFeatures, HistoryEntry> }) => {
  return (
    <>
      <TableRow key={row.id}>
        {row.getVisibleCells().map((cell) => {
          const meta = cell.column.columnDef.meta as { align?: string } | undefined
          const alignCenter = meta?.align === 'center'
          const alignRight = meta?.align === 'right'
          return (
            <TableCell
              key={cell.id}
              className={cn({
                'text-center': alignCenter,
                'text-right': alignRight,
              })}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </TableCell>
          )
        })}
      </TableRow>
      {row.getIsExpanded() && (
        <TableRow>
          <TableCell colSpan={row.getAllCells().length} className="p-2">
            <TxHistoryDetails entry={row.original} />
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

const txHistoryTableColumns = (t: TFunction) =>
  columnHelper.columns([
    columnHelper.accessor('timestamp', {
      header: () => t('tx_history.column_title_date'),
      sortFn: (a, b) => dateTimeValue(a.original.timestamp) - dateTimeValue(b.original.timestamp),
      cell: (info) => <span className="text-nowrap">{formatDateTime(String(info.getValue()))}</span>,
      meta: {
        alphabetic: true,
      },
    }),
    columnHelper.accessor('role', {
      header: () => t('tx_history.column_title_role'),
      sortFn: (a, b) => roleLabel(a.original, t).localeCompare(roleLabel(b.original, t)),
      cell: (info) => {
        const role = historyRole(info.row.original)
        return (
          <StatusBadge variant={role ? ROLE_VARIANT[role] : 'default'}>{roleLabel(info.row.original, t)}</StatusBadge>
        )
      },
    }),
    columnHelper.accessor('cj_amount', {
      header: () => t('tx_history.column_title_amount'),
      sortFn: (a, b) => (a.original.cj_amount ?? 0) - (b.original.cj_amount ?? 0),
      cell: (info) => <Balance valueString={String(info.getValue() ?? 0)} />,
      meta: {
        numeric: true,
        align: 'right',
      },
    }),
    columnHelper.accessor('net_fee', {
      header: () => t('tx_history.column_title_net_fee'),
      sortFn: (a, b) => (a.original.net_fee ?? 0) - (b.original.net_fee ?? 0),
      cell: (info) => <Balance valueString={String(info.getValue() ?? 0)} />,
      meta: {
        numeric: true,
        align: 'right',
      },
    }),
    columnHelper.accessor('confirmations', {
      header: () => t('tx_history.column_title_confirmations'),
      sortFn: (a, b) => (a.original.confirmations ?? 0) - (b.original.confirmations ?? 0),
      cell: (info) => <>{info.getValue() ?? 0}</>,
      meta: {
        numeric: true,
        align: 'center',
      },
    }),
    columnHelper.accessor('txid', {
      header: () => t('tx_history.column_title_txid'),
      cell: (info) => {
        const txid = String(info.getValue() ?? '')
        return txid ? (
          <div className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 font-mono text-xs slashed-zero select-all">{shortenStringMiddle(txid, 16)}</span>
            <CopyButton
              value={txid}
              text={<CopyIcon />}
              successText={<CheckIcon className="text-brand-success" />}
              className={cn(buttonVariants({ variant: 'outline', size: 'icon-xs' }), 'shrink-0')}
              onSuccess={() => toast.success(t('tx_history.copy_txid_success'))}
              onError={() => toast.error(t('tx_history.copy_txid_error'))}
            />
          </div>
        ) : (
          ''
        )
      },
      enableSorting: false,
    }),
    columnHelper.display({
      id: 'expand-col',
      cell: ({ row }) => {
        return row.getCanExpand() ? (
          <Button size="sm" variant="outline" onClick={row.getToggleExpandedHandler()}>
            {t('jar_details.utxo_list.row_button_details')}
            <ChevronDownIcon
              className={cn('text-muted-foreground size-4 transition-transform duration-200', {
                'rotate-180': row.getIsExpanded(),
              })}
            />
          </Button>
        ) : (
          ''
        )
      },
      enableSorting: false,
    }),
  ])

interface TxHistoryTableProps {
  history: HistoryEntry[]
  compact?: boolean
}

export const TxHistoryTable = ({ history, compact = false }: TxHistoryTableProps) => {
  const { t } = useTranslation()
  const [sorting, setSorting] = useState<SortingState>([{ id: 'timestamp', desc: true }])
  const [isShowAll, setIsShowAll] = useState(false)
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: compact ? 5 : ITEMS_PER_PAGE,
  })

  const columns = useMemo(() => txHistoryTableColumns(t), [t])

  const { setPageSize, setPageIndex, getPageCount, getFilteredRowModel, ...table } = useTable({
    features: txHistoryTableFeatures,
    data: history,
    columns,
    state: {
      sorting,
      pagination,
    },
    autoResetPageIndex: true,
    getRowId: (row, index) => `${row.txid || 'notxid'}-${row.source_mixdepth ?? 0}-${row.timestamp}-${index}`,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getRowCanExpand: () => true,
    paginateExpandedRows: false,
  })

  useEffect(() => {
    if (isShowAll) {
      setPageSize(history.length || 1)
    }
  }, [setPageSize, isShowAll, history.length])

  if (history.length === 0) {
    return (
      <Alert>
        <AlertDescription>{t('tx_history.empty_history')}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-2 overflow-hidden rounded-lg border shadow-lg">
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const meta = header.column.columnDef.meta as { align?: string } | undefined
                  const alignCenter = meta?.align === 'center'
                  const alignRight = meta?.align === 'right'
                  return (
                    <TableHead
                      key={header.id}
                      className={cn({
                        'cursor-pointer select-none': canSort,
                        'text-center': alignCenter,
                        'text-right': alignRight,
                      })}
                      onClick={canSort ? () => header.column.toggleSorting() : undefined}
                    >
                      <div
                        className={cn('flex items-center gap-2', {
                          'cursor-pointer select-none': canSort,
                          'justify-center': alignCenter,
                          'justify-end': alignRight,
                          'font-bold': header.column.getIsSorted(),
                          'text-muted-foreground': sorting.length > 0 && !header.column.getIsSorted(),
                        })}
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
          <TableBody className=":bg-foreground [&>tr:nth-child(odd)]:bg-foreground/10 [&>tr]:hover:bg-foreground/20!">
            {table.getRowModel().rows.map((row) => (
              <TxHistoryTableRow key={row.id} row={row} />
            ))}
          </TableBody>
        </Table>
      </div>

      {!compact && (
        <TablePagination
          currentPage={pagination.pageIndex + 1}
          totalPages={getPageCount()}
          itemsPerPage={isShowAll ? -1 : pagination.pageSize}
          totalItems={getFilteredRowModel().rows.length}
          onPageChange={(page) => setPageIndex(page - 1)}
          onItemsPerPageChange={(newItemsPerPage) => {
            if (newItemsPerPage === -1) {
              setIsShowAll(true)
              setPageSize(history.length || 1)
            } else {
              setIsShowAll(false)
              setPageSize(newItemsPerPage)
            }
            setPageIndex(0)
          }}
        />
      )}
    </div>
  )
}
