import { useState, useMemo, useEffect } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type SortingState,
  type ColumnDef,
  useReactTable,
  type RowPinningState,
  type RowSelectionState,
  type VisibilityState,
  type Column,
} from '@tanstack/react-table'
import {
  ArrowUpDownIcon,
  SortDescIcon,
  SortAscIcon,
  ArrowUp01Icon,
  ArrowDown10Icon,
  ArrowDownZAIcon,
  ArrowUpAZIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Balance } from '@/components/ui/jam/Balance'
import { Pagination } from '@/components/ui/pagination'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn, BTC } from '@/lib/utils'
import type { AmountSats } from '@/types/global'

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

type SortKey = keyof OrderTableEntry

const columnHelper = createColumnHelper<OrderTableEntry>()

type OrderTableColumnMeta = { align?: string } | undefined

interface SortIconProps {
  className?: string
  sortKey: SortKey
  column: Column<OrderTableEntry, unknown>
}
const SortIcon = ({ sortKey, column, className }: SortIconProps) => {
  const dir = column.getIsSorted()
  if (!dir) return <ArrowUpDownIcon className={className} />
  const isNumeric =
    sortKey === 'orderId' ||
    sortKey === 'bondValue' ||
    sortKey === 'minimumSize' ||
    sortKey === 'maximumSize' ||
    sortKey === 'fee'
  if (isNumeric) {
    return dir === 'desc' ? <ArrowDown10Icon className={className} /> : <ArrowUp01Icon className={className} />
  }
  const isAlphabetic = sortKey === 'counterparty' || sortKey === 'type'
  if (isAlphabetic) {
    return dir === 'desc' ? <ArrowDownZAIcon className={className} /> : <ArrowUpAZIcon className={className} />
  }
  return dir === 'desc' ? <SortDescIcon className={className} /> : <SortAscIcon className={className} />
}

interface OrderbookTableProps {
  tableEntries: OrderTableEntry[]
  selectedEntries: OrderTableEntry[]
  pinnedEntries: OrderTableEntry[]
}

export const OrderbookTable = ({
  tableEntries,
  selectedEntries: highlightedEntries,
  pinnedEntries,
}: OrderbookTableProps) => {
  const { t } = useTranslation()

  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE)
  const [sorting, setSorting] = useState<SortingState>([])

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
        cell: (info) => <span className="font-mono text-sm">{info.getValue()}</span>,
      }),
      columnHelper.accessor('orderId', {
        header: () => t('orderbook.table.heading_order_id'),
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor('type', {
        header: () => <div className="flex items-center">{t('orderbook.table.heading_type')}</div>,
        sortingFn: (a, b) => a.original.type.displayValue.localeCompare(b.original.type.displayValue),
        cell: (info) => (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant={info.getValue().badgeColor}>{info.getValue().displayValue}</Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{info.getValue().tooltip}</p>
            </TooltipContent>
          </Tooltip>
        ),
        meta: {
          align: 'center',
        } as OrderTableColumnMeta,
      }),
      columnHelper.accessor('fee', {
        header: () => <div className="flex items-center justify-end">{t('orderbook.table.heading_fee')}</div>,
        // Custom sorting: absolute before relative, then by fee value
        sortingFn: (a, b) => {
          if (a.original.type.isAbsolute !== b.original.type.isAbsolute) return a.original.type.isAbsolute ? -1 : 1
          return a.original.fee.value - b.original.fee.value
        },
        cell: (info) => {
          const entry = info.row.original
          return entry.fee.displayValue.includes('%') ? (
            <span className="font-mono">{entry.fee.displayValue}</span>
          ) : (
            <Balance colored={false} valueString={entry.fee.displayValue} />
          )
        },
        meta: {
          align: 'right',
        } as OrderTableColumnMeta,
      }),
      columnHelper.accessor('minimumSize', {
        header: () => <div className="flex items-center">{t('orderbook.table.heading_minimum_size')}</div>,
        sortingFn: (a, b) => Number(a.original.minimumSize) - Number(b.original.minimumSize),
        cell: (info) => <Balance colored={false} valueString={info.getValue()} />,
        meta: {
          align: 'right',
        } as OrderTableColumnMeta,
      }),
      columnHelper.accessor('maximumSize', {
        header: () => <div className="flex items-center">{t('orderbook.table.heading_maximum_size')}</div>,
        sortingFn: (a, b) => Number(a.original.maximumSize) - Number(b.original.maximumSize),
        cell: (info) => <Balance colored={false} valueString={info.getValue()} />,
        meta: {
          align: 'right',
        } as OrderTableColumnMeta,
      }),
      columnHelper.accessor('minerFeeContribution', {
        header: () => <div className="flex items-center">{t('orderbook.table.heading_miner_fee_contribution')}</div>,
        sortingFn: (a, b) => Number(a.original.minerFeeContribution) - Number(b.original.minerFeeContribution),
        cell: (info) => <Balance colored={false} valueString={info.getValue()} />,
        enableHiding: true,
        meta: {
          align: 'right',
        } as OrderTableColumnMeta,
      }),
      columnHelper.accessor('bondValue', {
        header: () => <div className="flex items-center">{t('orderbook.table.heading_bond_value')}</div>,
        sortingFn: (a, b) => a.original.bondValue.value - b.original.bondValue.value,
        cell: (info) => {
          const entry = info.row.original
          return entry.bondValue.value > 0 ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help">{entry.bondValue.displayValue}</span>
              </TooltipTrigger>
              <TooltipContent>
                <div>
                  <Balance valueString={String(entry.bondValue.amount || 0)} colored={false} convertToUnit={BTC} />
                  {entry.bondValue.displayLocktime && (
                    <div className="mt-1 text-xs">
                      {entry.bondValue.displayLocktime} ({entry.bondValue.displayExpiresIn})
                    </div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          ) : (
            <>{entry.bondValue.displayValue}</>
          )
        },
        meta: {
          align: 'right',
        } as OrderTableColumnMeta,
      }),
    ],
    [t],
  )
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    minerFeeContribution: false,
  })
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [rowPinning, setRowPinning] = useState<RowPinningState>({
    top: [],
    bottom: [],
  })

  const table = useReactTable({
    data: tableEntries,
    columns,
    state: {
      sorting,
      pagination: {
        pageIndex: Math.max(0, currentPage - 1),
        pageSize: itemsPerPage === -1 ? tableEntries.length || 1 : itemsPerPage,
      },
      rowPinning,
      rowSelection,
      columnVisibility,
    },
    keepPinnedRows: true,
    enableRowSelection: true,
    onSortingChange: setSorting,
    onRowPinningChange: setRowPinning,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualFiltering: true, // we filter before passing to table
  })

  useEffect(() => {
    table.resetRowPinning(true)
    table.getRowModel().rows.forEach((row) => {
      row.pin(pinnedEntries.includes(row.original) ? 'top' : false)
    })
  }, [table, pinnedEntries])

  useEffect(() => {
    table.resetRowSelection(true)
    table.getRowModel().rows.forEach((row) => {
      row.toggleSelected(highlightedEntries.includes(row.original))
    })
  }, [table, highlightedEntries])

  const totalPages = useMemo(() => {
    if (itemsPerPage === -1) {
      return 1
    }
    return Math.max(1, Math.ceil(tableEntries.length / itemsPerPage))
  }, [itemsPerPage, tableEntries.length])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
      table.setPageIndex(Math.max(0, totalPages - 1))
    }
  }, [totalPages, currentPage, table])

  const handleSort = (key: SortKey) => {
    const col = table.getColumn(key)
    if (col) {
      col.toggleSorting()
    }
  }

  const tableTopRows = () => {
    try {
      // pinned offers might not be included in the table data,
      // and the internal model of the table does not match anymore
      return table.getTopRows()
    } catch (e) {
      console.debug('Error while rendering top table rows', e)
      return []
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-2 overflow-hidden rounded-lg border shadow-lg">
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 border-b backdrop-blur">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const key = header.column.id as SortKey
                  const alignCenter = (header.column.columnDef.meta as OrderTableColumnMeta)?.align === 'center'
                  const alignRight = (header.column.columnDef.meta as OrderTableColumnMeta)?.align === 'right'
                  return (
                    <TableHead
                      key={header.id}
                      className={cn({
                        'cursor-pointer select-none': canSort,
                        'text-center': alignCenter,
                        'text-right': alignRight,
                      })}
                      onClick={canSort ? () => handleSort(key) : undefined}
                    >
                      <div
                        className={cn('flex items-center gap-2', {
                          'cursor-pointer select-none': canSort,
                          'justify-center': alignCenter,
                          'justify-end': alignRight,
                        })}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort ? <SortIcon className="size-4" sortKey={key} column={header.column} /> : undefined}
                      </div>
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className="[&>tr:nth-child(odd)]:bg-muted/20">
            {tableTopRows().map((row) => (
              <TableRow key={row.id} className={row.getIsSelected() ? 'light:bg-yellow-500/30! bg-yellow-950!' : ''}>
                {row.getVisibleCells().map((cell) => {
                  const alignCenter = (cell.column.columnDef.meta as OrderTableColumnMeta)?.align === 'center'
                  const alignRight = (cell.column.columnDef.meta as OrderTableColumnMeta)?.align === 'right'
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
                <TableRow key={row.id} className={row.getIsSelected() ? 'light:bg-yellow-500/30! bg-yellow-950!' : ''}>
                  {row.getVisibleCells().map((cell) => {
                    const alignCenter = (cell.column.columnDef.meta as OrderTableColumnMeta)?.align === 'center'
                    const alignRight = (cell.column.columnDef.meta as OrderTableColumnMeta)?.align === 'right'
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

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        totalItems={tableEntries.length}
        onPageChange={(page) => {
          setCurrentPage(page)
          table.setPageIndex(Math.max(0, page - 1))
        }}
        onItemsPerPageChange={(newItemsPerPage) => {
          setItemsPerPage(newItemsPerPage)
          const size = newItemsPerPage === -1 ? table.getPrePaginationRowModel().rows.length || 1 : newItemsPerPage
          table.setPageSize(size)
          setCurrentPage(1)
          table.setPageIndex(0)
        }}
      />
    </div>
  )
}
