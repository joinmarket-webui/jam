import { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
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
} from '@tanstack/react-table'
import type { i18n } from 'i18next'
import {
  ChevronDownIcon,
  ChevronUpIcon,
  RefreshCwIcon,
  ArrowUpDownIcon,
  PlusIcon,
  AlertCircleIcon,
  Loader2Icon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStore } from 'zustand'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Balance } from '@/components/ui/jam/Balance'
import { Pagination } from '@/components/ui/pagination'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { JM_DUST_THRESHOLD } from '@/constants/jm'
import { fetchOrderbook, refreshOrderbook, type OrderbookOffer, type OrderbookFidelityBond } from '@/lib/api/orderbook'
//import { withQueryDelay } from '@/lib/queryClient'
import {
  cn,
  factorToPercentage,
  isAbsoluteOffer,
  isRelativeOffer,
  BTC,
  humanReadableDuration,
  delayedPromise,
  pseudoRandomNumber,
} from '@/lib/utils'
import { jamSettingsStore } from '@/store/jamSettingsStore'
import { jmSessionStore } from '@/store/jmSessionStore'
import type { AmountSats } from '@/types/global'
import { DevBadge } from './dev/DevBadge'
import { Alert, AlertDescription } from './ui/alert'
import { Label } from './ui/label'

const ITEMS_PER_PAGE = 25

interface OrderTableEntry {
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

type SortKey =
  | 'counterparty'
  | 'orderId'
  | 'type'
  | 'fee'
  | 'minimumSize'
  | 'maximumSize'
  | 'minerFeeContribution'
  | 'bondValue'

const offerToTableEntry = (
  offer: OrderbookOffer,
  fidelityBond: OrderbookFidelityBond | undefined,
  i18n: i18n,
): OrderTableEntry => {
  const isAbs = isAbsoluteOffer(offer.ordertype)
  const isRel = isRelativeOffer(offer.ordertype)

  return {
    counterparty: offer.counterparty,
    orderId: String(offer.oid),
    type: {
      value: offer.ordertype,
      displayValue: isAbs
        ? i18n.t('orderbook.text_offer_type_absolute')
        : isRel
          ? i18n.t('orderbook.text_offer_type_relative')
          : offer.ordertype,
      badgeColor: isAbs ? 'default' : isRel ? 'secondary' : 'outline',
      tooltip:
        offer.ordertype === 'sw0absoffer'
          ? 'Native SW Absolute Fee'
          : offer.ordertype === 'sw0reloffer'
            ? 'Native SW Relative Fee'
            : undefined,
      isAbsolute: isAbs,
      isRelative: isRel,
    },
    fee:
      typeof offer.cjfee === 'number'
        ? {
            value: offer.cjfee,
            displayValue: String(offer.cjfee),
          }
        : (() => {
            const value = parseFloat(offer.cjfee || '0')
            return {
              value,
              displayValue: factorToPercentage(value).toFixed(4) + '%',
            }
          })(),
    minerFeeContribution: String(offer.txfee || 0),
    minimumSize: String(offer.minsize || 0),
    maximumSize: String(offer.maxsize || 0),
    bondValue: {
      value: offer.fidelity_bond_value || 0,
      displayValue: String((offer.fidelity_bond_value || 0).toFixed(0)),
      locktime: fidelityBond?.locktime,
      displayLocktime: fidelityBond?.locktime ? new Date(fidelityBond.locktime * 1_000).toDateString() : undefined,
      displayExpiresIn: fidelityBond?.locktime
        ? humanReadableDuration({ to: fidelityBond.locktime * 1_000, locale: i18n.resolvedLanguage || i18n.language })
        : undefined,
      amount: fidelityBond?.amount,
    },
  }
}

interface OrderbookProps {
  isModal?: boolean
}

export const Orderbook = ({ isModal = false }: OrderbookProps) => {
  const { t, i18n } = useTranslation()

  const jmSessionState = useStore(jmSessionStore, (state) => state.state)
  const nickname = useMemo(() => jmSessionState?.nickname, [jmSessionState])

  const [searchQuery, setSearchQuery] = useState('')
  const [highlightMyOffers, setHighlightMyOffers] = useState(false)
  const [pinMyOffers, setPinMyOffers] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE)
  const [showRefreshDropdown, setShowRefreshDropdown] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])
  const [localLoading, setLocalLoading] = useState(false)
  const [demoOffers, setDemoOffers] = useState<OrderbookOffer[]>([])
  const isDeveloperMode = useStore(jamSettingsStore, (state) => state.state.developerMode)
  const showDemoButton = useMemo(() => isDeveloperMode, [isDeveloperMode])
  const dropdownRef = useRef<HTMLDivElement>(null)

  const __dev_generateDemoReportEntryButton = () => {
    const randomMinsize = pseudoRandomNumber(JM_DUST_THRESHOLD, JM_DUST_THRESHOLD + 100_000)
    const randomOrdertype = Math.random() > 0.5 ? 'sw0absoffer' : 'sw0reloffer'
    const randomCounterparty = `demo_` + pseudoRandomNumber(0, 10)

    const randomOffer: OrderbookOffer = {
      counterparty: randomCounterparty,
      oid: demoOffers.filter((e) => e.counterparty === randomCounterparty).length,
      ordertype: randomOrdertype,
      minsize: randomMinsize,
      maxsize: randomMinsize + pseudoRandomNumber(21_000, 21_000_000),
      txfee: 0,
      cjfee: randomOrdertype === 'sw0absoffer' ? pseudoRandomNumber(0, 10_000) : parseFloat(Math.random().toFixed(5)),
      fidelity_bond_value: Math.random() > 0.25 ? 0 : pseudoRandomNumber(1_000, 21_000_000),
    }

    setDemoOffers((prev) => [...prev, randomOffer])
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowRefreshDropdown(false)
      }
    }

    if (showRefreshDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showRefreshDropdown])

  const {
    data: orderbookData,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['orderbook'],
    queryFn: fetchOrderbook,
  })

  // Combine both loading states for UI
  const isLoadingData = isRefetching || localLoading

  const tableEntries = useMemo(() => {
    const realOffers = orderbookData?.offers || []
    const allOffers = [...realOffers, ...demoOffers]

    if (allOffers.length === 0) return []

    const fidelityBondsMap = new Map<string, OrderbookFidelityBond>()
    orderbookData?.fidelitybonds?.forEach((bond) => {
      fidelityBondsMap.set(bond.counterparty, bond)
    })

    return allOffers.map((offer) => offerToTableEntry(offer, fidelityBondsMap.get(offer.counterparty), i18n))
  }, [orderbookData, demoOffers, i18n])

  const ownOffers = useMemo(() => {
    return nickname ? tableEntries.filter((it) => it.counterparty === nickname) : []
  }, [nickname, tableEntries])

  const filteredBaseData = useMemo(() => {
    if (!tableEntries) return []
    const searchVal = searchQuery.replace('.', '').toLowerCase()
    let offers = [...tableEntries]
    if (searchVal !== '') {
      offers = offers.filter((entry) => {
        return (
          entry.type.displayValue.toLowerCase().includes(searchVal) ||
          entry.counterparty.toLowerCase().includes(searchVal) ||
          entry.fee.displayValue.replace('.', '').toLowerCase().includes(searchVal) ||
          entry.minimumSize.replace('.', '').toLowerCase().includes(searchVal) ||
          entry.maximumSize.replace('.', '').toLowerCase().includes(searchVal) ||
          entry.minerFeeContribution.replace('.', '').toLowerCase().includes(searchVal) ||
          entry.bondValue.displayValue.replace('.', '').toLowerCase().includes(searchVal) ||
          entry.orderId.toLowerCase().includes(searchVal)
        )
      })
    }
    if (pinMyOffers && ownOffers.length > 0) {
      const userOffersFiltered = offers.filter((offer) => ownOffers.includes(offer))
      const otherOffers = offers.filter((offer) => !ownOffers.includes(offer))
      return [...userOffersFiltered, ...otherOffers]
    }
    return offers
  }, [tableEntries, searchQuery, pinMyOffers, ownOffers])

  // Define columns with custom cells and sorting
  const columnHelper = createColumnHelper<OrderTableEntry>()
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
      }),
      columnHelper.accessor('fee', {
        header: () => <div className="flex items-center">{t('orderbook.table.heading_fee')}</div>,

        // Custom sorting: absolute before relative, then by fee value
        sortingFn: (a, b) => {
          const aAbs = !!a.original.type.isAbsolute
          const bAbs = !!b.original.type.isAbsolute
          if (aAbs !== bAbs) return aAbs ? -1 : 1
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
      }),
      columnHelper.accessor('minimumSize', {
        header: () => <div className="flex items-center">{t('orderbook.table.heading_minimum_size')}</div>,

        sortingFn: (a, b) => Number(a.original.minimumSize) - Number(b.original.minimumSize),
        cell: (info) => <Balance colored={false} valueString={info.getValue()} />,
      }),
      columnHelper.accessor('maximumSize', {
        header: () => <div className="flex items-center">{t('orderbook.table.heading_maximum_size')}</div>,

        sortingFn: (a, b) => Number(a.original.maximumSize) - Number(b.original.maximumSize),
        cell: (info) => <Balance colored={false} valueString={info.getValue()} />,
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
      }),
    ],
    [t, columnHelper],
  )

  const table = useReactTable({
    data: filteredBaseData,
    columns,
    state: {
      sorting,
      pagination: {
        pageIndex: Math.max(0, currentPage - 1),
        pageSize: itemsPerPage === -1 ? filteredBaseData.length || 1 : itemsPerPage,
      },
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualFiltering: true, // we filter before passing to table
  })

  const totalPages = useMemo(() => {
    if (itemsPerPage === -1) return 1
    const total = filteredBaseData.length
    return Math.max(1, Math.ceil(total / itemsPerPage))
  }, [itemsPerPage, filteredBaseData])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
      table.setPageIndex(Math.max(0, totalPages - 1))
    }
  }, [totalPages, currentPage, table])

  const getRowsToRender = () => {
    const rows = table.getRowModel().rows
    if (pinMyOffers && ownOffers.length > 0) {
      const mine = rows.filter((r) => ownOffers.includes(r.original))
      const others = rows.filter((r) => !ownOffers.includes(r.original))
      return [...mine, ...others]
    }
    return rows
  }

  const summary = useMemo(() => {
    const uniqueCounterparties = new Set(filteredBaseData.map((offer) => offer.counterparty))
    return {
      count: filteredBaseData.length,
      counterpartyCount: uniqueCounterparties.size,
    }
  }, [filteredBaseData])

  const handlePinToggle = (checked: boolean) => {
    setPinMyOffers(checked)
    if (!ownOffers.length) return
    if (checked) {
      setHighlightMyOffers(true)
    }
  }

  const handleClearAndReload = async () => {
    setLocalLoading(true)
    setSearchQuery('')
    setCurrentPage(1)
    setItemsPerPage(ITEMS_PER_PAGE)
    setDemoOffers([]) // Clear demo offers when clearing everything
    setSorting([])
    setShowRefreshDropdown(false)

    try {
      await refreshOrderbook()
        .then(() => refetch())
        // Add a small delay to avoid flickering
        .then(() => delayedPromise(200))
    } finally {
      setLocalLoading(false)
    }
  }

  const handleReload = async () => {
    setLocalLoading(true)
    setShowRefreshDropdown(false)

    try {
      // Add a small delay to avoid flickering
      await refetch().then(() => delayedPromise(200))
    } finally {
      setLocalLoading(false)
    }
  }

  const handleSort = (key: SortKey) => {
    const col = table.getColumn(key)
    if (col) {
      col.toggleSorting()
    }
  }

  const getSortIcon = (columnKey: SortKey) => {
    const col = table.getColumn(columnKey)
    const dir = col?.getIsSorted()
    if (!dir) return <ArrowUpDownIcon className="ml-2 h-4 w-4" />
    return dir === 'desc' ? <ChevronDownIcon className="ml-2 h-4 w-4" /> : <ChevronUpIcon className="ml-2 h-4 w-4" />
  }

  if (error) {
    return (
      <div className="space-y-2 p-6">
        <Alert variant="destructive">
          <AlertCircleIcon className="size-4" />
          <AlertDescription>
            {t('orderbook.error_loading_orderbook_failed', {
              reason: error.message || t('global.errors.reason_unknown'),
            })}
          </AlertDescription>
        </Alert>

        <Button onClick={() => refetch()} disabled={isLoadingData}>
          <RefreshCwIcon className={cn('ml-2 h-4 w-4', { 'motion-safe:animate-spin': isLoadingData })} />
          {t('global.retry')}
        </Button>
      </div>
    )
  }

  return (
    <div
      className={cn('space-y-6', {
        'flex h-full flex-col p-10': isModal,
        'm-10 p-6': !isModal,
      })}
    >
      {/* Header */}
      {!isModal && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('orderbook.title')}</h1>
            <p className="text-muted-foreground mt-1">
              {searchQuery === ''
                ? t('orderbook.text_orderbook_summary', {
                    count: tableEntries.length,
                    counterpartyCount: new Set(tableEntries.map((e) => e.counterparty)).size,
                  })
                : t('orderbook.text_orderbook_summary_filtered', summary)}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {showDemoButton && (
              <Button
                variant="outline"
                size="sm"
                onClick={__dev_generateDemoReportEntryButton}
                disabled={isLoadingData}
                className="relative"
              >
                Generate Demo Entry
                <PlusIcon className="ml-2 h-4 w-4" />
                <DevBadge />
              </Button>
            )}

            <div className="relative" ref={dropdownRef}>
              <div className="flex">
                <Button
                  variant="outline"
                  className="rounded-r-none"
                  size="sm"
                  onClick={handleReload}
                  disabled={isLoadingData}
                >
                  {t('orderbook.button_reload_title')}
                  <RefreshCwIcon className={cn('ml-2 h-4 w-4', { 'animate-spin': isLoadingData })} />
                </Button>
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-l-none border-l-0 px-2"
                    onClick={() => setShowRefreshDropdown(!showRefreshDropdown)}
                    disabled={isLoadingData}
                  >
                    <ChevronDownIcon className="h-4 w-4" />
                  </Button>
                  {showRefreshDropdown && (
                    <div className="bg-background absolute top-full right-0 z-10 mt-1 min-w-[200px] rounded-md border py-2 shadow-lg">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start rounded-none"
                        onClick={handleClearAndReload}
                        disabled={isLoadingData}
                      >
                        {t('orderbook.button_refresh_text')}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Input
              placeholder={t('orderbook.placeholder_search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64"
              disabled={isLoadingData}
            />
          </div>
        </div>
      )}

      {/* Modal Header with controls */}
      {isModal && (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm">
              {searchQuery === ''
                ? t('orderbook.text_orderbook_summary', {
                    count: tableEntries.length,
                    counterpartyCount: new Set(tableEntries.map((e) => e.counterparty)).size,
                  })
                : t('orderbook.text_orderbook_summary_filtered', summary)}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {showDemoButton && (
              <Button
                variant="outline"
                size="sm"
                onClick={__dev_generateDemoReportEntryButton}
                disabled={isLoadingData}
                className="relative"
              >
                Generate Demo Entry
                <PlusIcon className="ml-2 h-4 w-4" />
                <DevBadge />
              </Button>
            )}

            <div className="relative" ref={dropdownRef}>
              <div className="flex">
                <Button
                  variant="outline"
                  className="rounded-r-none"
                  size="sm"
                  onClick={handleReload}
                  disabled={isLoadingData}
                >
                  {t('orderbook.button_reload_title')}
                  <RefreshCwIcon
                    className={cn('ml-2 h-4 w-4', {
                      'animate-spin': isLoadingData,
                    })}
                  />
                </Button>
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-l-none border-l-0 px-2"
                    onClick={() => setShowRefreshDropdown(!showRefreshDropdown)}
                    disabled={isLoadingData}
                  >
                    <ChevronDownIcon className="h-4 w-4" />
                  </Button>
                  {showRefreshDropdown && (
                    <div className="bg-background absolute top-full right-0 z-10 mt-1 min-w-[200px] rounded-md border py-2 shadow-lg">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start rounded-none"
                        onClick={handleClearAndReload}
                        disabled={isLoadingData}
                      >
                        {t('orderbook.button_refresh_text')}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Input
              placeholder={t('orderbook.placeholder_search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64"
              disabled={isLoadingData}
            />
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Switch
              id="highlight-my-offers"
              checked={highlightMyOffers}
              onCheckedChange={setHighlightMyOffers}
              disabled={isLoadingData}
            />
            <Label htmlFor="highlight-my-offers" className="flex flex-col items-start gap-0">
              <div className="font-medium">{t('orderbook.label_highlight_own_orders')}</div>
              <div className="text-muted-foreground text-sm">
                {ownOffers.length === 0 ? t('orderbook.text_highlight_own_orders_subtitle') : undefined}
              </div>
            </Label>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch
              id="pin-my-offers"
              checked={pinMyOffers}
              onCheckedChange={handlePinToggle}
              disabled={isLoadingData}
            />
            <Label htmlFor="pin-my-offers" className="flex flex-col items-start gap-0">
              <div className="font-medium">{t('orderbook.label_pin_to_top_own_orders')}</div>
              <div className="text-muted-foreground text-sm">{t('orderbook.text_pin_to_top_own_orders_subtitle')}</div>
            </Label>
          </div>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="py-12">
          <div className="text-muted-foreground m-2 flex items-center justify-center gap-2">
            <Loader2Icon className="h-5 w-5 animate-spin motion-reduce:hidden" />
            {t('global.loading')}
          </div>
        </div>
      ) : filteredBaseData.length === 0 ? (
        <div className="py-12 text-center">
          <div className="text-muted-foreground">{t('orderbook.alert_empty_orderbook')}</div>
        </div>
      ) : (
        <div className={cn('rounded-lg border shadow-sm', { 'flex flex-1 flex-col overflow-hidden': isModal })}>
          <div
            className={cn({
              'flex-1 overflow-auto': isModal,
            })}
          >
            <Table>
              <TableHeader className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 border-b backdrop-blur">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const canSort = header.column.getCanSort()
                      const key = header.column.id as SortKey
                      const alignRight =
                        (header.column.columnDef.meta as { align?: string } | undefined)?.align === 'right'
                      return (
                        <TableHead
                          key={header.id}
                          className={cn({
                            'cursor-pointer select-none': canSort,
                            'text-right': alignRight,
                          })}
                          onClick={canSort ? () => handleSort(key) : undefined}
                        >
                          <div className="flex items-center">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {canSort && getSortIcon(key)}
                          </div>
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody className="[&>tr:nth-child(odd)]:bg-muted/20">
                {getRowsToRender().map((row) => {
                  const shouldHighlight = highlightMyOffers && ownOffers.includes(row.original)
                  return (
                    <TableRow
                      key={row.id}
                      className={cn(
                        shouldHighlight &&
                          '!border-yellow-300 !bg-yellow-50 ring-1 ring-yellow-300/40 dark:!border-yellow-700 dark:!bg-yellow-950 dark:ring-yellow-800/40',
                      )}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const alignRight =
                          (cell.column.columnDef.meta as { align?: string } | undefined)?.align === 'right'
                        return (
                          <TableCell key={cell.id} className={cn(alignRight && 'text-right font-mono')}>
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
            totalItems={filteredBaseData.length}
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
      )}
    </div>
  )
}
