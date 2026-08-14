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
import { Balance } from '@/components/ui/jam/Balance'
import { TablePagination } from '@/components/ui/jam/TablePagination'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { Address } from '../ui/jam/Address'
import { SortIcon } from '../ui/jam/SortIcon'
import { StatusBadge } from '../ui/jam/StatusBadge'
import { branchEntryTableFeatures, type BranchEntryTableRow } from './BranchEntryTable.schema'

export type { BranchEntryApiObject, BranchEntryTableRow } from './BranchEntryTable.schema'

const ITEMS_PER_PAGE = 25

const fuzzyFilter: FilterFn<typeof branchEntryTableFeatures, BranchEntryTableRow> = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue(columnId), value as string)
  addMeta?.({ itemRank })
  return itemRank.passed
}

const columnHelper = createColumnHelper<typeof branchEntryTableFeatures, BranchEntryTableRow>()

interface BranchEntryTableProps {
  globalFilter?: string
  tableEntries: BranchEntryTableRow[]
  selectedEntries: BranchEntryTableRow[]
  pinnedEntries: BranchEntryTableRow[]
  onChange?: (table: RowModel<typeof branchEntryTableFeatures, BranchEntryTableRow>) => void
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

  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor('derivationIndex', {
          header: () => <div className="flex items-center">{/* TODO: i18n */}</div>,
          sortFn: (a, b) => {
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
        columnHelper.accessor('address', {
          header: () => (
            <div className="flex items-center">
              {t(/* TODO: i18n keys */ 'jar_details.utxo_list.column_title_address')}
            </div>
          ),
          sortFn: (a, b) => {
            const val = a.original.address.localeCompare(b.original.address)
            if (val !== 0) return val
            // tie-break using derivationIndex
            return a.original.derivationIndex - b.original.derivationIndex
          },
          cell: (info) => <Address value={String(info.getValue())} className="text-sm" copyable={true} />,
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
          sortFn: (a, b) => {
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
      ]),
    [t],
  )
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>({
    minerFeeContribution: false,
  })
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
    resetRowPinning,
    getRowModel,
    ...table
  } = useTable({
    features: branchEntryTableFeatures,
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
    getRowModel().rows.forEach((row) => {
      row.pin(pinnedEntries.includes(row.original) ? 'top' : false)
    })
  }, [resetRowPinning, getRowModel, pinnedEntries])

  useEffect(() => {
    resetRowSelection(true)
    getRowModel().rows.forEach((row) => {
      row.toggleSelected(highlightedEntries.includes(row.original))
    })
  }, [resetRowSelection, getRowModel, highlightedEntries])

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
