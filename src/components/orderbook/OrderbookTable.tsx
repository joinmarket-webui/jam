import { useState, useMemo, useEffect } from 'react'
import { rankItem } from '@tanstack/match-sorter-utils'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type SortingState,
  type PaginationState,
  type ColumnDef,
  useReactTable,
  type RowPinningState,
  type RowSelectionState,
  type VisibilityState,
  type FilterFn,
  type FilterFnOption,
  type Table as TableType,
} from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Balance } from '@/components/ui/jam/Balance'
import { TablePagination } from '@/components/ui/jam/TablePagination'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { AmountSats } from '@/types/global'
import { SortIcon } from '../ui/jam/SortIcon'

const ITEMS_PER_PAGE = 25

export interface OrderTableEntry {
  counterparty: string // example: "J5Bv3JSxPFWm2Yjb"
  orderId: string // example: "0" (not unique!)
  type: {
    value: string // original value, example: 'sw0reloffer', 'swreloffer', 'reloffer', 'sw0absoffer', 'swabsoffer', 'absoffer'
    displayValue: string // example: "absolute" or "relative" (respecting i18n)
    badgeColor: Parameters<typeof Badge>[0]['variant']
    tooltip?: 'Native SW Absolute Fee' | 'Native SW Relative Fee' | string
    isAbsolute: boolean
    isRelative: boolean
  }
  fee: {
    value: number
    displayValue: string // example: "250" (abs offers) or "0.000100%" (rel offers)
  }
  minerFeeContribution: string // example: "0"
  minimumSize: string // example: "27300"
  maximumSize: string // example: "237499972700"
  bondValue: {
    value: number
    displayValue: string // example: "0" (no fb) or "114557102085.28133"
    locktime?: number
    displayLocktime?: string
    displayExpiresIn?: string
    amount?: AmountSats
  }
}

const columnHelper = createColumnHelper<OrderTableEntry>()

const fuzzyFilter: FilterFn<OrderTableEntry> = (row, columnId, value, addMeta) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- tanstack/table api
  const itemRank = rankItem(row.getValue(columnId), value)
  addMeta({ itemRank })
  return itemRank.passed
}

interface OrderbookTableProps {
  globalFilter?: string
  tableEntries: OrderTableEntry[]
  selectedEntries: OrderTableEntry[]
  pinnedEntries: OrderTableEntry[]
  onChange?: (table: TableType<OrderTableEntry>) => void
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns = useMemo<ColumnDef<OrderTableEntry, any>[]>(
    () => [
      columnHelper.accessor('counterparty', {
        header: () => <div className="flex items-center">{t('orderbook.table.heading_counterparty')}</div>,
        sortingFn: (a, b) => {
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
      columnHelper.accessor<'type', OrderTableEntry['type']>('type', {
        header: () => <div className="flex items-center">{t('orderbook.table.heading_type')}</div>,
        sortingFn: (a, b) => a.original.type.displayValue.localeCompare(b.original.type.displayValue),
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
        sortingFn: (a, b) => {
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
      columnHelper.accessor<'minimumSize', OrderTableEntry['minimumSize']>('minimumSize', {
        header: () => <div className="flex items-center">{t('orderbook.table.heading_minimum_size')}</div>,
        sortingFn: (a, b) => Number(a.original.minimumSize) - Number(b.original.minimumSize),
        cell: (info) => <Balance valueString={info.getValue()} />,
        meta: {
          align: 'right',
          numeric: true,
        },
      }),
      columnHelper.accessor<'maximumSize', OrderTableEntry['maximumSize']>('maximumSize', {
        header: () => <div className="flex items-center">{t('orderbook.table.heading_maximum_size')}</div>,
        sortingFn: (a, b) => Number(a.original.maximumSize) - Number(b.original.maximumSize),
        cell: (info) => <Balance valueString={info.getValue()} />,
        meta: {
          align: 'right',
          numeric: true,
        },
      }),
      columnHelper.accessor<'minerFeeContribution', OrderTableEntry['minerFeeContribution']>('minerFeeContribution', {
        header: () => <div className="flex items-center">{t('orderbook.table.heading_miner_fee_contribution')}</div>,
        sortingFn: (a, b) => Number(a.original.minerFeeContribution) - Number(b.original.minerFeeContribution),
        cell: (info) => <Balance valueString={info.getValue()} />,
        enableHiding: true,
        meta: {
          align: 'right',
          numeric: true,
        },
      }),
      columnHelper.accessor('bondValue', {
        header: () => <div className="flex items-center">{t('orderbook.table.heading_bond_value')}</div>,
        sortingFn: (a, b) => a.original.bondValue.value - b.original.bondValue.value,
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
                  <Balance
                    valueString={String(bondValue.amount || 0)}
                    convertToUnit="btc"
                    showBalance={true}
                    enableVisibilityToggle={false}
                    highlightSignificantDigits={false}
                  />
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
    ],
    [t],
  )
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({ minerFeeContribution: false })
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [rowPinning, setRowPinning] = useState<RowPinningState>({
    top: [],
    bottom: [],
  })

  const table = useReactTable<OrderTableEntry>({
    data: tableEntries,
    columns,
    filterFns: {
      fuzzy: fuzzyFilter, //define as a filter function that can be used in column definitions
    },
    state: {
      globalFilter,
      sorting,
      pagination,
      rowPinning,
      rowSelection,
      columnVisibility,
    },
    globalFilterFn: 'fuzzy' as FilterFnOption<OrderTableEntry>,
    keepPinnedRows: true,
    enableRowSelection: true,
    autoResetPageIndex: true,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onRowPinningChange: setRowPinning,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  useEffect(() => {
    table.resetRowPinning(true)
    table.getPrePaginationRowModel().rows.forEach((row) => {
      row.pin(pinnedEntries.includes(row.original) ? 'top' : false)
    })
  }, [table, pinnedEntries])

  useEffect(() => {
    table.resetRowSelection(true)
    table.getPrePaginationRowModel().rows.forEach((row) => {
      row.toggleSelected(highlightedEntries.includes(row.original))
    })
  }, [table, highlightedEntries])

  useEffect(() => {
    if (isShowAll) {
      table.setPageSize(tableEntries.length || 1)
    }
  }, [isShowAll, tableEntries.length, table])

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
    if (onChange) {
      onChange(table)
    }
  }, [table, onChange])

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden rounded-lg border shadow-lg">
      <div className="min-h-0 flex-1 overflow-auto">
        <Table className="min-w-[42rem] text-sm">
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
            {tableTopRows().map((row) => (
              <TableRow key={row.id} className={row.getIsSelected() ? 'bg-brand-warning/25!' : ''}>
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
            ))}
            {table.getCenterRows().map((row) => {
              return (
                <TableRow key={row.id} className={row.getIsSelected() ? 'bg-brand-warning/25!' : ''}>
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
              )
            })}
          </TableBody>
        </Table>
      </div>

      <TablePagination
        currentPage={table.getState().pagination.pageIndex + 1}
        totalPages={table.getPageCount()}
        itemsPerPage={isShowAll ? -1 : pagination.pageSize}
        totalItems={table.getFilteredRowModel().rows.length}
        onPageChange={(page) => table.setPageIndex(page - 1)}
        onItemsPerPageChange={(newItemsPerPage) => {
          if (newItemsPerPage === -1) {
            setIsShowAll(true)
            table.setPageSize(tableEntries.length || 1)
          } else {
            setIsShowAll(false)
            table.setPageSize(newItemsPerPage)
          }
          table.setPageIndex(0)
        }}
      />
    </div>
  )
}
