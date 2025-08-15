import { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDownIcon, ChevronUpIcon, RefreshCw, ArrowUpDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Balance } from '@/components/ui/Balance'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useApiClient } from '@/hooks/useApiClient'
import { fetchOrderbook, type OrderbookOffer, type FidelityBond } from '@/lib/api/orderbook'
import { sessionOptions } from '@/lib/jm-api/generated/client/@tanstack/react-query.gen'
import { cn, factorToPercentage, isAbsoluteOffer, isRelativeOffer, BTC, humanReadableDuration } from '@/lib/utils'

const ITEMS_PER_PAGE = 25

interface OrderTableEntry {
  counterparty: string
  orderId: string
  type: {
    value: string
    displayValue: string
    badgeColor: 'default' | 'secondary'
    tooltip?: string
    isAbsolute?: boolean
    isRelative?: boolean
  }
  fee: {
    value: number
    displayValue: string
  }
  minerFeeContribution: string
  minimumSize: string
  maximumSize: string
  bondValue: {
    value: number
    displayValue: string
    locktime?: number
    displayLocktime?: string
    displayExpiresIn?: string
    amount?: number
  }
}

// TODO: check out libraries
type SortKey = 'counterparty' | 'type' | 'fee' | 'minimumSize' | 'maximumSize' | 'minerFeeContribution' | 'bondValue'

const offerToTableEntry = (
  offer: OrderbookOffer,
  fidelityBond: FidelityBond | undefined,
  t: (key: string, options?: Record<string, unknown>) => string,
): OrderTableEntry => {
  const isAbs = isAbsoluteOffer(offer.ordertype)
  const isRel = isRelativeOffer(offer.ordertype)

  return {
    counterparty: offer.counterparty,
    orderId: String(offer.oid),
    type: {
      value: offer.ordertype,
      displayValue: isAbs ? t('orderbook.text_offer_type_absolute') : t('orderbook.text_offer_type_relative'),
      badgeColor: isAbs ? 'default' : 'secondary',
      tooltip:
        offer.ordertype === 'sw0absoffer'
          ? 'Native SW Absolute Fee'
          : offer.ordertype === 'sw0reloffer'
            ? 'Native SW Relative Fee'
            : offer.ordertype,
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
      displayLocktime: fidelityBond?.locktime ? new Date(fidelityBond.locktime * 1000).toDateString() : undefined,
      displayExpiresIn: fidelityBond?.locktime
        ? humanReadableDuration({ to: fidelityBond.locktime * 1000 })
        : undefined,
      amount: fidelityBond?.amount,
    },
  }
}

interface OrderbookProps {
  isModal?: boolean
}

export const Orderbook = ({ isModal = false }: OrderbookProps) => {
  const { t } = useTranslation()
  const client = useApiClient()

  const sessionQuery = useQuery({
    ...sessionOptions({ client }),
    staleTime: 60000,
  })

  const nickname = sessionQuery.data?.nickname

  const [searchQuery, setSearchQuery] = useState('')
  const [highlightMyOffers, setHighlightMyOffers] = useState(false)
  const [pinMyOffers, setPinMyOffers] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE)
  const [showRefreshDropdown, setShowRefreshDropdown] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('minimumSize')
  const [sortReverse, setSortReverse] = useState(false)
  const [localLoading, setLocalLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

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

  const userOffers = useMemo<string[]>(() => (nickname ? [nickname] : []), [nickname])

  const {
    data: orderbookData,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['orderbook'],
    queryFn: fetchOrderbook,
    refetchInterval: 30000,
  })

  // Combine both loading states for UI
  const isLoadingData = isRefetching || localLoading

  const tableEntries = useMemo(() => {
    if (!orderbookData?.offers) return []

    const fidelityBondsMap = new Map<string, FidelityBond>()
    orderbookData.fidelitybonds?.forEach((bond) => {
      fidelityBondsMap.set(bond.counterparty, bond)
    })

    return orderbookData.offers.map((offer) => offerToTableEntry(offer, fidelityBondsMap.get(offer.counterparty), t))
  }, [orderbookData, t])

  const ownOffers = useMemo(() => {
    return nickname ? tableEntries.filter((it) => it.counterparty === nickname) : []
  }, [nickname, tableEntries])

  const filteredAndSortedOffers = useMemo(() => {
    if (!tableEntries) return []

    let offers = [...tableEntries]

    const searchVal = searchQuery.replace('.', '').toLowerCase()
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

    const sortFunctions = {
      counterparty: (a: OrderTableEntry, b: OrderTableEntry) => {
        const val = a.counterparty.localeCompare(b.counterparty)
        return val !== 0 ? val : +a.orderId - +b.orderId
      },
      type: (a: OrderTableEntry, b: OrderTableEntry) => a.type.displayValue.localeCompare(b.type.displayValue),
      fee: (a: OrderTableEntry, b: OrderTableEntry) => {
        if (a.type.isAbsolute !== b.type.isAbsolute) {
          return a.type.isAbsolute === true ? 1 : -1
        }
        return a.fee.value - b.fee.value
      },
      minimumSize: (a: OrderTableEntry, b: OrderTableEntry) => +a.minimumSize - +b.minimumSize,
      maximumSize: (a: OrderTableEntry, b: OrderTableEntry) => +a.maximumSize - +b.maximumSize,
      minerFeeContribution: (a: OrderTableEntry, b: OrderTableEntry) =>
        +a.minerFeeContribution - +b.minerFeeContribution,
      bondValue: (a: OrderTableEntry, b: OrderTableEntry) => a.bondValue.value - b.bondValue.value,
    }

    offers.sort(sortFunctions[sortKey])
    if (sortReverse) offers.reverse()

    if (pinMyOffers && ownOffers.length > 0) {
      const userOffersFiltered = offers.filter((offer) => userOffers.includes(offer.counterparty))
      const otherOffers = offers.filter((offer) => !userOffers.includes(offer.counterparty))
      return [...userOffersFiltered, ...otherOffers]
    }

    return offers
  }, [tableEntries, searchQuery, sortKey, sortReverse, pinMyOffers, ownOffers, userOffers])

  const totalPages = Math.ceil(filteredAndSortedOffers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedOffers = filteredAndSortedOffers.slice(startIndex, startIndex + itemsPerPage)

  const summary = useMemo(() => {
    const uniqueCounterparties = new Set(filteredAndSortedOffers.map((offer) => offer.counterparty))
    return {
      count: filteredAndSortedOffers.length,
      counterpartyCount: uniqueCounterparties.size,
    }
  }, [filteredAndSortedOffers])

  const handlePinToggle = (checked: boolean) => {
    setPinMyOffers(checked)
    if (checked) {
      setHighlightMyOffers(true)
    }
  }

  const handleClearAndReload = async () => {
    setLocalLoading(true)
    setSearchQuery('')
    setCurrentPage(1)
    setItemsPerPage(ITEMS_PER_PAGE)

    setSortKey('minimumSize')
    setSortReverse(false)
    setShowRefreshDropdown(false)

    // Add a small delay to show the loading state
    await new Promise((resolve) => setTimeout(resolve, 500))

    await refetch()
    setLocalLoading(false)
  }

  const handleReload = async () => {
    setLocalLoading(true)
    setShowRefreshDropdown(false)

    // Add a small delay to show the loading state
    const [refetchResult] = await Promise.all([refetch(), new Promise((resolve) => setTimeout(resolve, 300))])

    setLocalLoading(false)
    return refetchResult
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortReverse(!sortReverse)
    } else {
      setSortKey(key)
      setSortReverse(false)
    }
  }

  const getSortIcon = (columnKey: SortKey) => {
    if (sortKey !== columnKey) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />
    }
    return sortReverse ? <ChevronDownIcon className="ml-2 h-4 w-4" /> : <ChevronUpIcon className="ml-2 h-4 w-4" />
  }

  const renderOrderFee = (entry: OrderTableEntry) => {
    return entry.fee.displayValue.includes('%') ? (
      <span className="font-mono">{entry.fee.displayValue}</span>
    ) : (
      <Balance colored={false} valueString={entry.fee.displayValue} />
    )
  }

  const isUserOffer = (counterparty: string) => userOffers.includes(counterparty)

  if (error) {
    return (
      <div className="p-6">
        <div className="mb-4 text-red-600">
          {t('orderbook.error_loading_orderbook_failed', { reason: (error as Error).message })}
        </div>
        <Button onClick={() => refetch()}>{t('global.retry')}</Button>
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', isModal ? 'flex h-full flex-col p-10' : 'm-10 p-6')}>
      {/* Header */}
      {!isModal && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('orderbook.title')}</h1>
            <p className="text-muted-foreground mt-1">
              {searchQuery === ''
                ? tableEntries.length === 1
                  ? t('orderbook.text_orderbook_summary_one', {
                      count: tableEntries.length,
                      counterpartyCount: new Set(tableEntries.map((e) => e.counterparty)).size,
                    })
                  : t('orderbook.text_orderbook_summary_other', {
                      count: tableEntries.length,
                      counterpartyCount: new Set(tableEntries.map((e) => e.counterparty)).size,
                    })
                : t('orderbook.text_orderbook_summary_filtered', summary)}
            </p>
          </div>

          <div className="flex items-center space-x-2">
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
                  <RefreshCw className={cn('ml-2 h-4 w-4', isLoadingData && 'animate-spin')} />
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
                ? tableEntries.length === 1
                  ? t('orderbook.text_orderbook_summary_one', {
                      count: tableEntries.length,
                      counterpartyCount: new Set(tableEntries.map((e) => e.counterparty)).size,
                    })
                  : t('orderbook.text_orderbook_summary_other', {
                      count: tableEntries.length,
                      counterpartyCount: new Set(tableEntries.map((e) => e.counterparty)).size,
                    })
                : t('orderbook.text_orderbook_summary_filtered', summary)}
            </p>
          </div>

          <div className="flex items-center space-x-2">
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
                  <RefreshCw className={cn('ml-2 h-4 w-4', isLoadingData && 'animate-spin')} />
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
      {nickname && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                checked={highlightMyOffers}
                onCheckedChange={setHighlightMyOffers}
                disabled={isLoadingData || ownOffers.length === 0}
              />
              <div>
                <div className="font-medium">{t('orderbook.label_highlight_own_orders')}</div>
                <div className="text-muted-foreground text-sm">
                  {ownOffers.length === 0 ? t('orderbook.text_highlight_own_orders_subtitle') : undefined}
                </div>
              </div>
            </div>
          </div>

          {ownOffers.length > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch checked={pinMyOffers} onCheckedChange={handlePinToggle} disabled={isLoadingData} />
                <div>
                  <div className="font-medium">{t('orderbook.label_pin_to_top_own_orders')}</div>
                  <div className="text-muted-foreground text-sm">
                    {t('orderbook.text_pin_to_top_own_orders_subtitle')}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="py-12 text-center">
          <div className="text-muted-foreground">{t('global.loading')}</div>
        </div>
      ) : filteredAndSortedOffers.length === 0 ? (
        <div className="py-12 text-center">
          <div className="text-muted-foreground">{t('orderbook.alert_empty_orderbook')}</div>
        </div>
      ) : (
        <div className={cn('rounded-md border', isModal && 'flex flex-1 flex-col overflow-hidden')}>
          <div className={cn(isModal && 'flex-1 overflow-auto')}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('counterparty')}>
                    <div className="flex items-center">
                      {t('orderbook.table.heading_counterparty')}
                      {getSortIcon('counterparty')}
                    </div>
                  </TableHead>
                  <TableHead>{t('orderbook.table.heading_order_id')}</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('type')}>
                    <div className="flex items-center">
                      {t('orderbook.table.heading_type')}
                      {getSortIcon('type')}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('fee')}>
                    <div className="flex items-center">
                      {t('orderbook.table.heading_fee')}
                      {getSortIcon('fee')}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('minimumSize')}>
                    <div className="flex items-center">
                      {t('orderbook.table.heading_minimum_size')}
                      {getSortIcon('minimumSize')}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('maximumSize')}>
                    <div className="flex items-center">
                      {t('orderbook.table.heading_maximum_size')}
                      {getSortIcon('maximumSize')}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('minerFeeContribution')}>
                    <div className="flex items-center">
                      {t('orderbook.table.heading_miner_fee_contribution')}
                      {getSortIcon('minerFeeContribution')}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('bondValue')}>
                    <div className="flex items-center">
                      {t('orderbook.table.heading_bond_value')}
                      {getSortIcon('bondValue')}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedOffers.map((offer) => {
                  const isOwn = isUserOffer(offer.counterparty)
                  const shouldHighlight = highlightMyOffers && isOwn

                  return (
                    <TableRow
                      key={`${offer.counterparty}-${offer.orderId}`}
                      className={cn(
                        shouldHighlight && 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950',
                      )}
                    >
                      <TableCell className="font-mono text-sm">{offer.counterparty}</TableCell>
                      <TableCell>{offer.orderId}</TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant={offer.type.badgeColor}>{offer.type.displayValue}</Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{offer.type.tooltip}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>{renderOrderFee(offer)}</TableCell>
                      <TableCell>
                        <Balance colored={false} valueString={offer.minimumSize} />
                      </TableCell>
                      <TableCell>
                        <Balance colored={false} valueString={offer.maximumSize} />
                      </TableCell>
                      <TableCell>
                        <Balance colored={false} valueString={offer.minerFeeContribution} />
                      </TableCell>
                      <TableCell className="font-mono">
                        {offer.bondValue.value > 0 ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help">{offer.bondValue.displayValue}</span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div>
                                <Balance
                                  valueString={String(offer.bondValue.amount || 0)}
                                  colored={false}
                                  convertToUnit={BTC}
                                />
                                {offer.bondValue.displayLocktime && (
                                  <div className="mt-1 text-xs">
                                    {offer.bondValue.displayLocktime} ({offer.bondValue.displayExpiresIn})
                                  </div>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <>{offer.bondValue.displayValue}</>
                        )}
                      </TableCell>
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
            totalItems={filteredAndSortedOffers.length}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(newItemsPerPage) => {
              setItemsPerPage(newItemsPerPage)
              setCurrentPage(1)
            }}
          />
        </div>
      )}
    </div>
  )
}
