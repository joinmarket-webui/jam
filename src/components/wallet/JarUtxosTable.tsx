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
  type ColumnDef,
  useReactTable,
  type RowPinningState,
  type RowSelectionState,
  type VisibilityState,
  type Column,
  type FilterFn,
  type FilterFnOption,
  type Table as TableType,
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
import { TablePagination } from '@/components/ui/jam/TablePagination'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Utxo } from '@/hooks/useUtxos'
import { cn } from '@/lib/utils'
import { Balance } from '../ui/jam/Balance'

const ITEMS_PER_PAGE = 25

export type UtxoTableEntry = Utxo

type SortKey = keyof UtxoTableEntry

const columnHelper = createColumnHelper<UtxoTableEntry>()

type OrderTableColumnMeta = { align?: string } | undefined

interface SortIconProps {
  className?: string
  sortKey: SortKey
  column: Column<UtxoTableEntry, unknown>
}
const SortIcon = ({ sortKey, column, className }: SortIconProps) => {
  const dir = column.getIsSorted()
  if (!dir) return <ArrowUpDownIcon className={className} />
  const isNumeric =
    sortKey === 'value' ||
    sortKey === 'confirmations' ||
    sortKey === 'mixdepth' ||
    sortKey === 'locktime' ||
    sortKey === 'tries' ||
    sortKey === 'tries_remaining'
  if (isNumeric) {
    return dir === 'desc' ? <ArrowDown10Icon className={className} /> : <ArrowUp01Icon className={className} />
  }
  const isAlphabetic = sortKey === 'address' || sortKey === 'utxo' || sortKey === 'label' || sortKey === 'path'
  if (isAlphabetic) {
    return dir === 'desc' ? <ArrowDownZAIcon className={className} /> : <ArrowUpAZIcon className={className} />
  }
  return dir === 'desc' ? <SortDescIcon className={className} /> : <SortAscIcon className={className} />
}

const fuzzyFilter: FilterFn<UtxoTableEntry> = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue(columnId), value)
  addMeta({ itemRank })
  return itemRank.passed
}

interface JarUtxosTableProps {
  globalFilter?: string
  tableEntries: UtxoTableEntry[]
  selectedEntries: UtxoTableEntry[]
  pinnedEntries: UtxoTableEntry[]
  onChange?: (table: TableType<UtxoTableEntry>) => void
}

export const JarUtxosTable = ({
  globalFilter,
  tableEntries,
  selectedEntries: highlightedEntries,
  pinnedEntries,
  onChange,
}: JarUtxosTableProps) => {
  const { t } = useTranslation()

  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE)
  const [sorting, setSorting] = useState<SortingState>([])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns = useMemo<ColumnDef<UtxoTableEntry, any>[]>(
    () => [
      columnHelper.accessor('value', {
        header: () => <div className="flex items-center">{t('jar_details.utxo_list.column_title_balance')}</div>,
        sortingFn: (a, b) => {
          const val = a.original.address.localeCompare(b.original.address)
          if (val !== 0) return val
          // tie-break using confirmations
          const aid = Number(a.original.confirmations)
          const bid = Number(b.original.confirmations)
          return aid - bid
        },
        cell: (info) => <Balance valueString={String(info.getValue())} />,
        meta: {
          align: 'right',
        },
      }),
      columnHelper.accessor('address', {
        header: () => <div className="flex items-center">{t('jar_details.utxo_list.column_title_address')}</div>,
        sortingFn: (a, b) => {
          const val = a.original.address.localeCompare(b.original.address)
          if (val !== 0) return val
          // tie-break using confirmations
          const aid = Number(a.original.confirmations)
          const bid = Number(b.original.confirmations)
          return aid - bid
        },
        cell: (info) => <span className="font-mono text-sm">{info.getValue()}</span>,
      }),
      columnHelper.accessor('confirmations', {
        header: () => t('jar_details.utxo_list.column_title_confirmations'),
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor('label', {
        header: () => t('jar_details.utxo_list.column_title_label_and_status'),
        cell: (info) => info.getValue(),
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

  const table = useReactTable<UtxoTableEntry>({
    data: tableEntries,
    columns,
    filterFns: {
      fuzzy: fuzzyFilter, //define as a filter function that can be used in column definitions
    },
    state: {
      globalFilter,
      sorting,
      pagination: {
        pageIndex: Math.max(0, currentPage - 1),
        pageSize: itemsPerPage === -1 ? tableEntries.length || 1 : itemsPerPage,
      },
      rowPinning,
      rowSelection,
      columnVisibility,
    },
    globalFilterFn: 'fuzzy' as FilterFnOption<UtxoTableEntry>,
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

  useEffect(() => {
    if (onChange) {
      onChange(table)
    }
  }, [table, onChange])

  return (
    <div className="flex flex-1 flex-col gap-2 overflow-hidden rounded-lg border shadow-lg">
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
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
          <TableBody className=":bg-foreground [&>tr:nth-child(odd)]:bg-foreground/10 [&>tr]:hover:bg-foreground/20!">
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

      <TablePagination
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
