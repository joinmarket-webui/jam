import { useState, useMemo, useEffect } from 'react'
import { rankItem } from '@tanstack/match-sorter-utils'
import {
  createColumnHelper,
  flexRender,
  useTable,
  type SortingState,
  type PaginationState,
  type RowPinningState,
  type RowSelectionState,
  type ColumnVisibilityState,
  type FilterFn,
  type RowModel,
} from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Balance } from '@/components/ui/jam/Balance'
import { TablePagination } from '@/components/ui/jam/TablePagination'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { SortIcon } from '../ui/jam/SortIcon'
import { orderbookTableFeatures, type OrderTableEntry } from './OrderbookTable.schema'

export type { OrderTableEntry } from './OrderbookTable.schema'

const ITEMS_PER_PAGE = 25

const fuzzyFilter: FilterFn<typeof orderbookTableFeatures, OrderTableEntry> = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue(columnId), value as string)
  addMeta?.({ itemRank })
  return itemRank.passed
}

const columnHelper = createColumnHelper<typeof orderbookTableFeatures, OrderTableEntry>()

interface OrderbookTableProps {
  globalFilter?: string
  tableEntries: OrderTableEntry[]
  selectedEntries: OrderTableEntry[]
  pinnedEntries: OrderTableEntry[]
  onChange?: (table: RowModel<typeof orderbookTableFeatures, OrderTableEntry>) => void
}

export const OrderbookTable = ({
  globalFilter,
  tableEntries,
  selectedEntries: highlightedEntries,
  pinnedEntries,
  onChange,
}: OrderbookTableProps) => {
  const { t } = useTranslation()

  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: ITEMS_PER_PAGE })
  const [isShowAll, setIsShowAll] = useState(false)

  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor('counterparty', {
          header: () => <div className="flex items-center">{t('orderbook.table.heading_counterparty')}</div>,
          sortFn: (a, b) => {
            const val = a.original.counterparty.localeCompare(b.original.counterparty)
            if (val !== 0) return val
            // tie-break using orderId
            const aid = Number(a.original.orderId)
            const bid = Number(b.original.orderId)
            return aid - bid
          },
          cell: (info) => <span className="font-mono text-sm select-all">{info.getValue()}</span>,
          meta: {
            alphabetic: true,
          },
        }),
        columnHelper.accessor('orderId', {
          header: () => t('orderbook.table.heading_order_id'),
          cell: (info) => <span>{info.getValue()}</span>,
          meta: {
            numeric: true,
          },
        }),
        columnHelper.accessor('type', {
          header: () => <div className="flex items-center">{t('orderbook.table.heading_type')}</div>,
          sortFn: (a, b) => a.original.type.displayValue.localeCompare(b.original.type.displayValue),
          cell: (info) => {
            const value = info.getValue()
            return (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant={value.badgeColor}>{value.displayValue}</Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{value.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            )
          },
          meta: {
            align: 'center',
            alphabetic: true,
          },
        }),
        columnHelper.accessor('fee', {
          header: () => <div className="flex items-center justify-end">{t('orderbook.table.heading_fee')}</div>,
          // Custom sorting: absolute before relative, then by fee value
          sortFn: (a, b) => {
            if (a.original.type.isAbsolute !== b.original.type.isAbsolute) {
              return a.original.type.isAbsolute ? -1 : 1
            }
            return a.original.fee.value - b.original.fee.value
          },
          cell: ({
            row: {
              original: {
                type: { isAbsolute },
                fee,
              },
            },
          }) => {
            return isAbsolute ? (
              <span className="slashed-zero tabular-nums">{fee.displayValue}</span>
            ) : (
              <Balance valueString={fee.displayValue} />
            )
          },
          meta: {
            align: 'right',
            numeric: true,
          },
        }),
        columnHelper.accessor('minimumSize', {
          header: () => <div className="flex items-center">{t('orderbook.table.heading_minimum_size')}</div>,
          sortFn: (a, b) => Number(a.original.minimumSize) - Number(b.original.minimumSize),
          cell: (info) => <Balance valueString={String(info.getValue())} />,
          meta: {
            align: 'right',
            numeric: true,
          },
        }),
        columnHelper.accessor('maximumSize', {
          header: () => <div className="flex items-center">{t('orderbook.table.heading_maximum_size')}</div>,
          sortFn: (a, b) => Number(a.original.maximumSize) - Number(b.original.maximumSize),
          cell: (info) => <Balance valueString={String(info.getValue())} />,
          meta: {
            align: 'right',
            numeric: true,
          },
        }),
        columnHelper.accessor('minerFeeContribution', {
          header: () => <div className="flex items-center">{t('orderbook.table.heading_miner_fee_contribution')}</div>,
          sortFn: (a, b) => Number(a.original.minerFeeContribution) - Number(b.original.minerFeeContribution),
          cell: (info) => <Balance valueString={String(info.getValue())} />,
          enableHiding: true,
          meta: {
            align: 'right',
            numeric: true,
          },
        }),
        columnHelper.accessor('bondValue', {
          header: () => <div className="flex items-center">{t('orderbook.table.heading_bond_value')}</div>,
          sortFn: (a, b) => a.original.bondValue.value - b.original.bondValue.value,
          cell: ({
            row: {
              original: { bondValue },
            },
          }) => {
            return bondValue.value > 0 ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-help slashed-zero tabular-nums">{bondValue.displayValue}</span>
                </TooltipTrigger>
                <TooltipContent>
                  <div>
                    <Balance valueString={String(bondValue.amount || 0)} convertToUnit="btc" />
                    {bondValue.displayLocktime && (
                      <div className="mt-1 text-xs">
                        {bondValue.displayLocktime} ({bondValue.displayExpiresIn})
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            ) : (
              <>{bondValue.displayValue}</>
            )
          },
          meta: {
            numeric: true,
            align: 'right',
          },
        }),
      ]),
    [t],
  )
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>({ minerFeeContribution: false })
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [rowPinning, setRowPinning] = useState<RowPinningState>({
    top: [],
    bottom: [],
  })

  const {
    setPageSize,
    setPageIndex,
    getPageCount,
    getFilteredRowModel,
    resetRowSelection,
    getPrePaginatedRowModel,
    resetRowPinning,
    ...table
  } = useTable({
    features: orderbookTableFeatures,
    data: tableEntries,
    columns,
    state: {
      globalFilter,
      sorting,
      pagination,
      rowPinning,
      rowSelection,
      columnVisibility,
    },
    globalFilterFn: fuzzyFilter,
    keepPinnedRows: true,
    enableRowSelection: true,
    autoResetPageIndex: true,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onRowPinningChange: setRowPinning,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
  })

  useEffect(() => {
    resetRowPinning(true)
    getPrePaginatedRowModel().rows.forEach((row) => {
      row.pin(pinnedEntries.includes(row.original) ? 'top' : false)
    })
  }, [resetRowPinning, getPrePaginatedRowModel, pinnedEntries])

  useEffect(() => {
    resetRowSelection(true)
    getPrePaginatedRowModel().rows.forEach((row) => {
      row.toggleSelected(highlightedEntries.includes(row.original))
    })
  }, [resetRowSelection, getPrePaginatedRowModel, highlightedEntries])

  useEffect(() => {
    if (isShowAll) {
      setPageSize(tableEntries.length || 1)
    }
  }, [setPageSize, isShowAll, tableEntries.length])

  const tableTopRows = () => {
    try {
      // pinned offers might not be included in the table data,
      // and the internal model of the table does not match anymore
      return table.getTopRows()
    } catch (error: unknown) {
      console.debug('Error while rendering top table rows', error)
      return []
    }
  }

  useEffect(() => {
    onChange?.(getFilteredRowModel())
  }, [getFilteredRowModel, onChange])

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden rounded-lg border shadow-lg">
      <div className="min-h-0 flex-1 overflow-auto">
        <Table className="min-w-[42rem] text-sm">
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
            {tableTopRows().map((row) => (
              <TableRow key={row.id} className={row.getIsSelected() ? 'bg-brand-warning/25!' : ''}>
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
            ))}
            {table.getCenterRows().map((row) => {
              return (
                <TableRow key={row.id} className={row.getIsSelected() ? 'bg-brand-warning/25!' : ''}>
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
              )
            })}
          </TableBody>
        </Table>
      </div>

      <TablePagination
        currentPage={pagination.pageIndex + 1}
        totalPages={getPageCount()}
        itemsPerPage={isShowAll ? -1 : pagination.pageSize}
        totalItems={getFilteredRowModel().rows.length}
        onPageChange={(page) => setPageIndex(page - 1)}
        onItemsPerPageChange={(newItemsPerPage) => {
          if (newItemsPerPage === -1) {
            setIsShowAll(true)
            setPageSize(tableEntries.length || 1)
          } else {
            setIsShowAll(false)
            setPageSize(newItemsPerPage)
          }
          setPageIndex(0)
        }}
      />
    </div>
  )
}
