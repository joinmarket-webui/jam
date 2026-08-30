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
  type Row,
  type OnChangeFn,
  type HeaderContext,
  type CellContext,
} from '@tanstack/react-table'
import type { TFunction } from 'i18next'
import { ChevronDownIcon, SnowflakeIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Balance } from '@/components/ui/jam/Balance'
import { TablePagination } from '@/components/ui/jam/TablePagination'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { Checkbox } from '../ui/checkbox'
import { Address } from '../ui/jam/Address'
import { SortIcon } from '../ui/jam/SortIcon'
import { StatusBadge } from '../ui/jam/StatusBadge'
import { jarUtxosTableFeatures, type UtxoTableEntry } from './JarUtxosTable.schema'

export type { UtxoTableEntry } from './JarUtxosTable.schema'

const ITEMS_PER_PAGE = 25

const fuzzyFilter: FilterFn<typeof jarUtxosTableFeatures, UtxoTableEntry> = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue(columnId), value as string)
  addMeta?.({ itemRank })
  return itemRank.passed
}

const columnHelper = createColumnHelper<typeof jarUtxosTableFeatures, UtxoTableEntry>()

const UtxoTableRow = ({ row }: { row: Row<typeof jarUtxosTableFeatures, UtxoTableEntry> }) => {
  return (
    <>
      <TableRow
        key={row.id}
        className={cn({
          'bg-brand-info/20!': row.original.utxo.frozen === true,
          'bg-brand-warning/25!': row.getIsSelected(),
        })}
      >
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
            <Card>
              <CardContent className="text-xs">
                <pre>{JSON.stringify(row.original.utxo, null, 2)}</pre>
              </CardContent>
            </Card>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

const AUTO_CHANGE_SELECTION_TOAST_ID = 'utxo.selection_changed_automatically'

const utxoTableColumns = (enableSelectAllToggle: boolean, t: TFunction) =>
  columnHelper.columns([
    {
      id: 'select-col',
      header: ({ table }: HeaderContext<typeof jarUtxosTableFeatures, UtxoTableEntry, unknown>) => (
        <Checkbox
          disabled={enableSelectAllToggle === false}
          checked={
            table.getIsAllRowsSelected()
              ? true
              : table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected()
                ? 'indeterminate'
                : false
          }
          onCheckedChange={(checked) => {
            table.toggleAllRowsSelected(checked === true)
            toast.dismiss(AUTO_CHANGE_SELECTION_TOAST_ID)
          }}
        />
      ),
      cell: ({ row, table }: CellContext<typeof jarUtxosTableFeatures, UtxoTableEntry, unknown>) => (
        <Checkbox
          className="light:bg-background/80"
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onCheckedChange={(checked) => {
            const address = row.original.utxo.address
            const eligibleRows = table
              .getRowModel()
              .rows.filter((it) => it.original.utxo.address === address)
              .filter((it) => it.getIsSelected() !== checked)

            eligibleRows.forEach((it) => it.toggleSelected())

            if (eligibleRows.length > 1) {
              const affectedCount = eligibleRows.length - 1
              toast.warning(t('jar_details.utxo_list.toast_auto_selection_title'), {
                description: checked
                  ? t('jar_details.utxo_list.toast_auto_selected_with_address', { count: affectedCount, address })
                  : t('jar_details.utxo_list.toast_auto_deselected_with_address', { count: affectedCount, address }),
                id: AUTO_CHANGE_SELECTION_TOAST_ID,
                duration: 10_000,
              })
            } else {
              toast.dismiss(AUTO_CHANGE_SELECTION_TOAST_ID)
            }
          }}
        />
      ),
    },
    columnHelper.accessor('utxo.frozen', {
      header: () => <></>,
      sortFn: ({ original: { utxo: a } }, { original: { utxo: b } }) => {
        const val = (a.frozen ? 1 : 0) - (b.frozen ? 1 : 0)
        if (val !== 0) return val
        // tie-break using confirmations
        return a.confirmations - b.confirmations
      },
      cell: (info) => {
        return (
          <div className="flex justify-center">
            {info.getValue() === true ? (
              <div className="flex justify-center">
                <SnowflakeIcon className="size-4" />
              </div>
            ) : undefined}
          </div>
        )
      },
      meta: {
        align: 'center',
      },
    }),
    columnHelper.accessor('utxo.value', {
      header: () => t('jar_details.utxo_list.column_title_balance'),
      sortFn: ({ original: { utxo: a } }, { original: { utxo: b } }) => {
        const val = a.value - b.value
        if (val !== 0) return val
        // tie-break using confirmations
        return a.confirmations - b.confirmations
      },
      cell: (info) => <Balance valueString={String(info.getValue())} />,
      meta: {
        align: 'right',
        numeric: true,
      },
    }),
    columnHelper.accessor('utxo.confirmations', {
      header: () => t('jar_details.utxo_list.column_title_confirmations'),
      cell: (info) => <span className="slashed-zero tabular-nums">{info.getValue()}</span>,
      meta: {
        numeric: true,
        align: 'right',
      },
    }),
    columnHelper.accessor('tags', {
      header: () => t('jar_details.utxo_list.column_title_label_and_status'),
      cell: ({
        row: {
          original: { tags },
        },
      }) => (
        <div className="flex items-center gap-2">
          {tags.map((it, index) => {
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
    columnHelper.accessor<'utxo.address', UtxoTableEntry['utxo']['address']>('utxo.address', {
      header: () => t('jar_details.utxo_list.column_title_address'),
      sortFn: (a, b) => {
        const val = a.original.utxo.address.localeCompare(b.original.utxo.address)
        if (val !== 0) return val
        // tie-break using confirmations
        const aid = Number(a.original.utxo.confirmations)
        const bid = Number(b.original.utxo.confirmations)
        return aid - bid
      },
      cell: (info) => <Address value={info.getValue()} className="text-sm" copyable={true} />,
      meta: {
        alphabetic: true,
      },
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

const defaultRowSelection = (_ignoredOnPurpose: Row<typeof jarUtxosTableFeatures, UtxoTableEntry>): boolean => true

interface JarUtxosTableProps {
  globalFilter?: string
  tableEntries: UtxoTableEntry[]
  pinnedEntries: UtxoTableEntry[]
  initialRowSelection?: RowSelectionState
  enableRowSelection?: boolean | ((row: Row<typeof jarUtxosTableFeatures, UtxoTableEntry>) => boolean)
  onChange?: (table: RowModel<typeof jarUtxosTableFeatures, UtxoTableEntry>) => void
  onRowSelectionChange?: OnChangeFn<RowSelectionState>
}

export const JarUtxosTable = ({
  globalFilter,
  tableEntries,
  pinnedEntries,
  initialRowSelection,
  enableRowSelection = defaultRowSelection,
  onChange,
  onRowSelectionChange,
}: JarUtxosTableProps) => {
  const { t } = useTranslation()

  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: ITEMS_PER_PAGE })
  const [isShowAll, setIsShowAll] = useState(false)
  const enableSelectAllToggle = useMemo(
    () => enableRowSelection !== undefined && enableRowSelection !== false,
    [enableRowSelection],
  )

  const columns = useMemo(() => utxoTableColumns(enableSelectAllToggle, t), [enableSelectAllToggle, t])

  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>({
    minerFeeContribution: false,
  })
  const [rowPinning, setRowPinning] = useState<RowPinningState>({
    top: [],
    bottom: [],
  })

  const [rowSelection, setRowSelection] = useState<RowSelectionState>(initialRowSelection ?? {})

  const { setPageSize, setPageIndex, getPageCount, getFilteredRowModel, resetRowPinning, getRowModel, ...table } =
    useTable({
      features: jarUtxosTableFeatures,
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
      enableRowSelection,
      enableMultiRowSelection: true,
      autoResetPageIndex: true,
      getRowId: (row) => row.utxo.utxo,
      onSortingChange: setSorting,
      onPaginationChange: setPagination,
      onRowPinningChange: setRowPinning,
      onRowSelectionChange: (rowSelection) => {
        setRowSelection(rowSelection)
        onRowSelectionChange?.(rowSelection)
      },
      onColumnVisibilityChange: setColumnVisibility,
      getRowCanExpand: () => true,
      paginateExpandedRows: false,
    })

  useEffect(() => {
    resetRowPinning(true)
    getRowModel().rows.forEach((row) => {
      row.pin(pinnedEntries.includes(row.original) ? 'top' : false)
    })
  }, [resetRowPinning, getRowModel, pinnedEntries])

  useEffect(() => {
    if (isShowAll) {
      setPageSize(tableEntries.length || 1)
    }
  }, [setPageSize, isShowAll, tableEntries.length])

  useEffect(() => {
    onChange?.(getFilteredRowModel())
  }, [getFilteredRowModel, onChange])

  useEffect(() => {
    return () => {
      toast.dismiss(AUTO_CHANGE_SELECTION_TOAST_ID)
    }
  }, [])

  const tableTopRows = () => {
    try {
      return table.getTopRows()
    } catch (error: unknown) {
      console.debug('Error while rendering top table rows', error)
      return []
    }
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
                          'text-muted-foreground': table.state.sorting.length > 0 && !header.column.getIsSorted(),
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
              <UtxoTableRow key={row.id} row={row} />
            ))}
            {table.getCenterRows().map((row) => (
              <UtxoTableRow key={row.id} row={row} />
            ))}
          </TableBody>
        </Table>
      </div>

      <TablePagination
        currentPage={table.state.pagination.pageIndex + 1}
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
