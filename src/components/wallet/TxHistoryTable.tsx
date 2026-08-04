import { useEffect, useMemo, useState } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type CellContext,
  type PaginationState,
  type Row,
  type SortingState,
  useReactTable,
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

const ITEMS_PER_PAGE = 25

type KnownHistoryRole = 'maker' | 'taker' | 'send' | 'deposit'
type StatusBadgeVariant = NonNullable<Parameters<typeof StatusBadge>[0]['variant']>

const ROLE_VARIANT: Record<KnownHistoryRole, StatusBadgeVariant> = {
  maker: 'cj-out',
  taker: 'default',
  send: 'used-empty',
  deposit: 'deposit',
}

const columnHelper = createColumnHelper<HistoryEntry>()

const historyRole = (entry: HistoryEntry): KnownHistoryRole | undefined => {
  return ['maker', 'taker', 'send', 'deposit'].includes(entry.role ?? '') ? (entry.role as KnownHistoryRole) : undefined
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

const TxHistoryTableRow = ({ row }: { row: Row<HistoryEntry> }) => {
  return (
    <>
      <TableRow key={row.id}>
        {row.getVisibleCells().map((cell) => {
          const alignCenter = cell.column.columnDef.meta?.align === 'center'
          const alignRight = cell.column.columnDef.meta?.align === 'right'
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

const txHistoryTableColumns = (t: TFunction) => {
  return [
    columnHelper.accessor('timestamp', {
      header: () => t('tx_history.column_title_date'),
      sortingFn: (a, b) => dateTimeValue(a.original.timestamp) - dateTimeValue(b.original.timestamp),
      cell: (info) => <span className="text-nowrap">{formatDateTime(info.getValue())}</span>,
      meta: {
        alphabetic: true,
      },
    }),
    columnHelper.accessor('role', {
      header: () => t('tx_history.column_title_role'),
      sortingFn: (a, b) => roleLabel(a.original, t).localeCompare(roleLabel(b.original, t)),
      cell: (info) => {
        const role = historyRole(info.row.original)
        return (
          <StatusBadge variant={role ? ROLE_VARIANT[role] : 'default'}>{roleLabel(info.row.original, t)}</StatusBadge>
        )
      },
    }),
    columnHelper.accessor('cj_amount', {
      header: () => t('tx_history.column_title_amount'),
      sortingFn: (a, b) => (a.original.cj_amount ?? 0) - (b.original.cj_amount ?? 0),
      cell: (info) => <Balance valueString={String(info.getValue() ?? 0)} />,
      meta: {
        numeric: true,
        align: 'right',
      },
    }),
    columnHelper.accessor('net_fee', {
      header: () => t('tx_history.column_title_net_fee'),
      sortingFn: (a, b) => (a.original.net_fee ?? 0) - (b.original.net_fee ?? 0),
      cell: (info) => <Balance valueString={String(info.getValue() ?? 0)} />,
      meta: {
        numeric: true,
        align: 'right',
      },
    }),
    columnHelper.accessor('confirmations', {
      header: () => t('tx_history.column_title_confirmations'),
      sortingFn: (a, b) => (a.original.confirmations ?? 0) - (b.original.confirmations ?? 0),
      cell: (info) => <>{info.getValue() ?? 0}</>,
      meta: {
        numeric: true,
        align: 'center',
      },
    }),
    columnHelper.accessor('txid', {
      header: () => t('tx_history.column_title_txid'),
      cell: (info) => {
        const txid = info.getValue() ?? ''
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
    {
      id: 'expand-col',
      cell: ({ row }: CellContext<HistoryEntry, unknown>) => {
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
    },
  ]
}

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

  useEffect(() => {
    if (isShowAll) {
      setPagination((previous) => ({
        ...previous,
        pageSize: Math.max(1, history.length),
        pageIndex: 0,
      }))
    }
  }, [history.length, isShowAll])

  const columns = useMemo(() => txHistoryTableColumns(t), [t])

  const table = useReactTable<HistoryEntry>({
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
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowCanExpand: () => true,
    getExpandedRowModel: getExpandedRowModel(),
    paginateExpandedRows: false,
  })

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
                  const alignCenter = header.column.columnDef.meta?.align === 'center'
                  const alignRight = header.column.columnDef.meta?.align === 'right'
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
                          'text-muted-foreground': table.getState().sorting.length > 0 && !header.column.getIsSorted(),
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
          currentPage={table.getState().pagination.pageIndex + 1}
          totalPages={table.getPageCount()}
          itemsPerPage={isShowAll ? -1 : pagination.pageSize}
          totalItems={table.getFilteredRowModel().rows.length}
          onPageChange={(page) => table.setPageIndex(page - 1)}
          onItemsPerPageChange={(newItemsPerPage) => {
            if (newItemsPerPage === -1) {
              setIsShowAll(true)
              table.setPageSize(history.length || 1)
            } else {
              setIsShowAll(false)
              table.setPageSize(newItemsPerPage)
            }
            table.setPageIndex(0)
          }}
        />
      )}
    </div>
  )
}
