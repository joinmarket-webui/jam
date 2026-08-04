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
import { Balance } from '@/components/ui/jam/Balance'
import { TablePagination } from '@/components/ui/jam/TablePagination'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { AccountBranch } from '@/context/JamWalletInfoContext'
import type { UtxoTag } from '@/lib/tags'
import { cn } from '@/lib/utils'
import type { AmountSats, BitcoinAddress, HdPath } from '@/types/global'
import { Address } from '../ui/jam/Address'
import { SortIcon } from '../ui/jam/SortIcon'
import { StatusBadge } from '../ui/jam/StatusBadge'

const ITEMS_PER_PAGE = 25

export type BranchEntryApiObject = NonNullable<AccountBranch['__raw']['entries']>[number]

export type BranchEntryTableRow = BranchEntryApiObject & {
  derivationIndex: number
  derivationPath: HdPath
  address: BitcoinAddress
  balance: AmountSats
  tags: UtxoTag[]
}

const columnHelper = createColumnHelper<BranchEntryTableRow>()

const fuzzyFilter: FilterFn<BranchEntryTableRow> = (row, columnId, value, addMeta) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- tanstack/table api
  const itemRank = rankItem(row.getValue(columnId), value)
  addMeta({ itemRank })
  return itemRank.passed
}

interface BranchEntryTableProps {
  globalFilter?: string
  tableEntries: BranchEntryTableRow[]
  selectedEntries: BranchEntryTableRow[]
  pinnedEntries: BranchEntryTableRow[]
  onChange?: (table: TableType<BranchEntryTableRow>) => void
}

export const BranchEntryTable = ({
  globalFilter,
  tableEntries,
  selectedEntries: highlightedEntries,
  pinnedEntries,
  onChange,
}: BranchEntryTableProps) => {
  const { t } = useTranslation()

  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: ITEMS_PER_PAGE })
  const [isShowAll, setIsShowAll] = useState(false)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns = useMemo<ColumnDef<BranchEntryTableRow, any>[]>(
    () => [
      columnHelper.accessor('derivationIndex', {
        header: () => <div className="flex items-center">{/* TODO: i18n */}</div>,
        sortingFn: (a, b) => {
          return a.original.derivationIndex - b.original.derivationIndex
        },
        cell: (info) => (
          <code className="text-break">
            <span className="text-muted-foreground">…/</span>
            {info.getValue()}
          </code>
        ),
        meta: {
          align: 'right',
          numeric: true,
        },
      }),
      columnHelper.accessor<'address', BranchEntryTableRow['address']>('address', {
        header: () => (
          <div className="flex items-center">
            {t(/* TODO: i18n keys */ 'jar_details.utxo_list.column_title_address')}
          </div>
        ),
        sortingFn: (a, b) => {
          const val = a.original.address.localeCompare(b.original.address)
          if (val !== 0) return val
          // tie-break using derivationIndex
          return a.original.derivationIndex - b.original.derivationIndex
        },
        cell: (info) => <Address value={info.getValue()} className="text-sm" copyable={true} />,
        meta: {
          alphabetic: true,
        },
      }),
      columnHelper.accessor('balance', {
        header: () => (
          <div className="flex items-center">
            {t(/* TODO: i18n keys */ 'jar_details.utxo_list.column_title_balance')}
          </div>
        ),
        sortingFn: (a, b) => {
          const val = a.original.balance - b.original.balance
          if (val !== 0) return val
          // tie-break using derivationIndex
          return a.original.derivationIndex - b.original.derivationIndex
        },
        cell: (info) => <Balance valueString={String(info.getValue())} />,
        meta: {
          align: 'right',
          numeric: true,
        },
      }),
      columnHelper.accessor('tags', {
        header: () => t(/* TODO: i18n keys */ 'jar_details.utxo_list.column_title_label_and_status'),
        cell: (info) => (
          <div className="flex items-center gap-2">
            {info.row.original.tags.map((it, index) => {
              const tooltipKey = `jar_details.utxo_list.utxo_tag_tooltip_${it.value.replaceAll(':', '_')}`
              const tooltip = t(tooltipKey)
              const hasTooltip = tooltip !== tooltipKey
              return (
                <StatusBadge key={index} variant={it.variant} tooltip={hasTooltip ? tooltip : undefined}>
                  {it.displayValue}
                </StatusBadge>
              )
            })}
          </div>
        ),
        enableSorting: false,
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

  const table = useReactTable<BranchEntryTableRow>({
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
    globalFilterFn: 'fuzzy' as FilterFnOption<BranchEntryTableRow>,
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
