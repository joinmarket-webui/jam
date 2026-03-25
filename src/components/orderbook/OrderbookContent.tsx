import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { RowModel } from '@tanstack/react-table'
import type { i18n } from 'i18next'
import { ChevronDownIcon, RefreshCwIcon, PlusIcon, AlertCircleIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStore } from 'zustand'
import { DevBadge } from '@/components/dev/DevBadge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { JM_DUST_THRESHOLD } from '@/constants/jm'
import * as OrderbookApi from '@/lib/api/orderbook'
import type { OrderbookOffer, OrderbookFidelityBond } from '@/lib/api/orderbook'
import { withQueryDelay } from '@/lib/queryClient'
import { cn, factorToPercentage, isAbsoluteOffer, isRelativeOffer, pseudoRandomInteger, time } from '@/lib/utils'
import { jamSettingsStore } from '@/store/jamSettingsStore'
import { jmSessionStore } from '@/store/jmSessionStore'
import { Balance } from '../ui/jam/Balance'
import { Spinner } from '../ui/spinner'
import { OrderbookChart } from './OrderbookChart'
import { OrderbookTable, type OrderTableEntry } from './OrderbookTable'

const offerToTableEntry = (
  offer: OrderbookOffer,
  fidelityBond: OrderbookFidelityBond | undefined,
  i18n: i18n,
): OrderTableEntry => {
  const isAbsolute = isAbsoluteOffer(offer.ordertype)
  const isRelative = isRelativeOffer(offer.ordertype)

  return {
    counterparty: offer.counterparty,
    orderId: String(offer.oid),
    type: {
      value: offer.ordertype,
      displayValue: isAbsolute
        ? i18n.t('orderbook.text_offer_type_absolute')
        : isRelative
          ? i18n.t('orderbook.text_offer_type_relative')
          : offer.ordertype,
      badgeColor: isAbsolute ? 'default' : isRelative ? 'secondary' : 'outline',
      tooltip:
        offer.ordertype === 'sw0absoffer'
          ? 'Native SW Absolute Fee'
          : offer.ordertype === 'sw0reloffer'
            ? 'Native SW Relative Fee'
            : undefined,
      isAbsolute: isAbsolute,
      isRelative: isRelative,
    },
    fee:
      typeof offer.cjfee === 'number'
        ? {
            value: offer.cjfee,
            displayValue: String(offer.cjfee),
          }
        : (() => {
            const value = Number.parseFloat(offer.cjfee || '0')
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
        ? time.humanReadableDuration({
            to: fidelityBond.locktime * 1_000,
            locale: i18n.resolvedLanguage || i18n.language,
          })
        : undefined,
      amount: fidelityBond?.amount,
    },
  }
}

interface OrderbookContentProps {
  className?: string
  enabled: boolean
}

export const OrderbookContent = ({ enabled, className }: OrderbookContentProps) => {
  const { t, i18n } = useTranslation()

  const nickname = useStore(jmSessionStore, (state) => state.state?.nickname)

  const [searchInputRaw, setSearchInputRaw] = useState('')
  const [isHighlightMyOffers, setHighlightMyOffers] = useState(false)
  const [isPinMyOffers, setPinMyOffers] = useState(false)

  const [demoOffers, setDemoOffers] = useState<OrderbookOffer[]>([])
  const isDeveloperMode = useStore(jamSettingsStore, (state) => state.state.developerMode)
  const showDemoButton = useMemo(() => isDeveloperMode, [isDeveloperMode])

  const __dev_generateDemoReportEntryButton = () => {
    const randomMinsize = pseudoRandomInteger(JM_DUST_THRESHOLD, JM_DUST_THRESHOLD + 100_000)
    const randomOrdertype = Math.random() > 0.5 ? 'sw0absoffer' : 'sw0reloffer'
    const randomCounterparty = `demo_` + pseudoRandomInteger(0, 10)

    const randomOffer: OrderbookOffer = {
      counterparty: randomCounterparty,
      oid: demoOffers.filter((it) => it.counterparty === randomCounterparty).length,
      ordertype: randomOrdertype,
      minsize: randomMinsize,
      maxsize: randomMinsize + pseudoRandomInteger(21_000, 21_000_000),
      txfee: 0,
      cjfee:
        randomOrdertype === 'sw0absoffer'
          ? pseudoRandomInteger(0, 10_000)
          : Number.parseFloat(Math.random().toFixed(5)),
      fidelity_bond_value: Math.random() > 0.25 ? 0 : pseudoRandomInteger(1_000, 21_000_000),
    }

    setDemoOffers((val) => [...val, randomOffer])
  }

  const { isFetching: isFetchingOrderbookRefresh, refetch: refetchOrderbookRefresh } = useQuery({
    queryKey: ['orderbook-refresh'],
    queryFn: withQueryDelay(OrderbookApi.refreshOrderbook, {
      throttle: 210,
    }),
    enabled: false, // invoke manually only!
  })

  const {
    data: orderbookData,
    isLoading: isLoadingInitially,
    error,
    refetch: refetchOrderbookData,
    isFetching: isFetchingOrderbookData,
  } = useQuery({
    queryKey: ['orderbook'],
    queryFn: withQueryDelay(OrderbookApi.fetchOrderbook, {
      throttle: 210,
    }),
    enabled,
  })

  const isFetching = isFetchingOrderbookData || isFetchingOrderbookRefresh

  const tableEntries = useMemo(() => {
    const realOffers = orderbookData?.offers || []
    const allOffers = [...realOffers, ...demoOffers]

    if (allOffers.length === 0) {
      return []
    }

    const fidelityBondsMap = new Map<string, OrderbookFidelityBond>()
    orderbookData?.fidelitybonds?.forEach((bond) => {
      fidelityBondsMap.set(bond.counterparty, bond)
    })

    return allOffers.map((offer) => offerToTableEntry(offer, fidelityBondsMap.get(offer.counterparty), i18n))
  }, [orderbookData, demoOffers, i18n])

  const myOffers = useMemo(() => {
    return nickname ? tableEntries.filter((it) => it.counterparty === nickname) : []
  }, [nickname, tableEntries])

  const highlightedOffers = useMemo<OrderTableEntry[]>(
    () => (isHighlightMyOffers ? myOffers : []),
    [isHighlightMyOffers, myOffers],
  )
  const pinnedToTopOffers = useMemo<OrderTableEntry[]>(() => (isPinMyOffers ? myOffers : []), [isPinMyOffers, myOffers])

  const [tableRowModel, setTableRowModel] = useState<RowModel<OrderTableEntry>>()

  const summary = useMemo(() => {
    const uniqueCounterparties = new Set((tableRowModel?.rows ?? []).map((it) => it.original.counterparty))
    return {
      count: tableRowModel?.rows.length || 0,
      counterpartyCount: uniqueCounterparties.size,
    }
  }, [tableRowModel])

  const marketSummary = useMemo(() => {
    const entries = (tableRowModel?.rows ?? []).map((r) => r.original)
    if (entries.length === 0) return null

    const absoluteOffers = entries.filter((offer) => offer.type.isAbsolute)
    const relativeOffers = entries.filter((offer) => offer.type.isRelative)

    const counterpartyBonds = new Map<string, number>()
    for (const offer of entries) {
      const previous = counterpartyBonds.get(offer.counterparty)
      if (previous === undefined || offer.bondValue.value > previous) {
        counterpartyBonds.set(offer.counterparty, offer.bondValue.value)
      }
    }
    const bondedMakers = [...counterpartyBonds.values()].filter((v) => v > 0).length

    const median = (values: number[]) => {
      if (values.length === 0) return 0
      // eslint-disable-next-line unicorn/no-array-sort -- toSorted() not supported in target browsers
      const sorted = [...values].sort((a, b) => a - b)
      const mid = Math.floor(sorted.length / 2)
      return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
    }

    const maxSizes = entries.map((offer) => Number(offer.maximumSize))
    const minSizes = entries.map((offer) => Number(offer.minimumSize))

    return {
      medianAbsFee:
        absoluteOffers.length > 0 ? Math.round(median(absoluteOffers.map((offer) => offer.fee.value))) : null,
      medianRelFee: relativeOffers.length > 0 ? median(relativeOffers.map((offer) => offer.fee.value)) : null,
      totalLiquidity: maxSizes.reduce((sum, v) => sum + v, 0),
      minOfferSize: Math.min(...minSizes),
      maxOfferSize: Math.max(...maxSizes),
      bondedMakers,
      unbondedMakers: counterpartyBonds.size - bondedMakers,
    }
  }, [tableRowModel])

  const handleClearAndReload = async () => {
    await refetchOrderbookRefresh().then(() => refetchOrderbookData())
  }

  const handleReload = async () => {
    await refetchOrderbookData()
  }

  if (error) {
    return (
      <div className={cn('mx-auto space-y-3', className)}>
        <div className="flex flex-col items-start gap-2">
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription>
              {t('orderbook.error_loading_orderbook_failed', {
                reason: error.message || t('global.errors.reason_unknown'),
              })}
            </AlertDescription>
          </Alert>

          <Button variant="ghost" onClick={() => void refetchOrderbookData()} disabled={isFetching}>
            <RefreshCwIcon className={cn({ 'motion-safe:animate-spin': isFetching })} />
            {t('global.retry')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('mx-auto flex-1 space-y-3', className)}>
      <div className="flex flex-col items-start justify-center gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-muted-foreground text-sm">
            {searchInputRaw === ''
              ? t('orderbook.text_orderbook_summary', summary)
              : t('orderbook.text_orderbook_summary_filtered', summary)}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {showDemoButton && (
            <Button
              className="text-xs"
              variant="outline"
              size="sm"
              onClick={__dev_generateDemoReportEntryButton}
              disabled={isFetching}
            >
              <PlusIcon className="size-3" />
              Add Demo Entry
              <DevBadge />
            </Button>
          )}

          <ButtonGroup>
            <Button
              variant="outline"
              className="rounded-r-none"
              size="sm"
              onClick={() => void handleReload()}
              disabled={isFetching}
            >
              <RefreshCwIcon className={cn({ 'motion-safe:animate-spin': isFetching })} />
              {t('orderbook.button_reload_title')}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isFetching}>
                  <ChevronDownIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-52">
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => void handleClearAndReload()} disabled={isFetching}>
                    {t('orderbook.button_refresh_text')}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </ButtonGroup>

          <Input
            placeholder={t('orderbook.placeholder_search')}
            value={searchInputRaw}
            onChange={(event) => setSearchInputRaw(event.target.value)}
            className="w-64"
            disabled={isFetching}
          />
        </div>
      </div>

      {/* Controls */}
      {nickname && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-4">
            <Switch
              id="highlight-my-offers"
              checked={isHighlightMyOffers}
              onCheckedChange={(checked) => setHighlightMyOffers(checked)}
              disabled={isFetching}
            />
            <Label htmlFor="highlight-my-offers" className="flex flex-col items-start gap-0">
              <div className="font-medium">{t('orderbook.label_highlight_own_orders')}</div>
              {myOffers.length === 0 ? (
                <div className="text-muted-foreground text-sm">{t('orderbook.text_highlight_own_orders_subtitle')}</div>
              ) : undefined}
            </Label>
          </div>

          {myOffers.length > 0 && (
            <div className="flex items-center gap-4">
              <Switch
                id="pin-my-offers"
                checked={isPinMyOffers}
                onCheckedChange={(checked) => {
                  setPinMyOffers(checked)
                  if (checked) {
                    setHighlightMyOffers(true)
                  }
                }}
                disabled={isFetching}
              />
              <Label htmlFor="pin-my-offers" className="flex flex-col items-start gap-0">
                <div className="font-medium">{t('orderbook.label_pin_to_top_own_orders')}</div>
                <div className="text-muted-foreground text-sm">
                  {t('orderbook.text_pin_to_top_own_orders_subtitle')}
                </div>
              </Label>
            </div>
          )}
        </div>
      )}

      {marketSummary && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('orderbook.market_summary_title')}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Tabs defaultValue="summary">
              <TabsList>
                <TabsTrigger value="summary" className="cursor-pointer">
                  {t('orderbook.tab_summary')}
                </TabsTrigger>
                <TabsTrigger value="charts" className="cursor-pointer">
                  {t('orderbook.tab_charts')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="summary">
                <div className="text-muted-foreground grid gap-1 text-sm sm:grid-cols-2">
                  {marketSummary.medianAbsFee !== null && (
                    <p className="flex items-center gap-1">
                      <span>{t('orderbook.market_summary_median_abs_fee_label')}:</span>
                      <Balance valueString={String(marketSummary.medianAbsFee)} enableVisibilityToggle={false} />
                    </p>
                  )}
                  {marketSummary.medianRelFee !== null && (
                    <p>
                      {t('orderbook.market_summary_median_rel_fee', {
                        value: factorToPercentage(marketSummary.medianRelFee).toFixed(4),
                      })}
                    </p>
                  )}
                  <p className="flex items-center gap-1">
                    <span>{t('orderbook.market_summary_total_liquidity_label')}:</span>
                    <Balance valueString={String(marketSummary.totalLiquidity)} enableVisibilityToggle={false} />
                  </p>
                  <p className="flex items-center gap-1">
                    <span>{t('orderbook.market_summary_offer_min_size_label')}:</span>
                    <Balance valueString={String(marketSummary.minOfferSize)} enableVisibilityToggle={false} />
                    <span>–</span>
                    <Balance valueString={String(marketSummary.maxOfferSize)} enableVisibilityToggle={false} />
                  </p>
                  <p>
                    {t('orderbook.market_summary_bonded_makers', {
                      bonded: marketSummary.bondedMakers,
                      unbonded: marketSummary.unbondedMakers,
                    })}
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="charts">
                <OrderbookChart entries={(tableRowModel?.rows ?? []).map((r) => r.original)} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {isLoadingInitially ? (
        <div className="py-12">
          <div className="text-muted-foreground m-2 flex items-center justify-center gap-2">
            <Spinner className="motion-reduce:hidden" />
            {t('global.loading')}
          </div>
        </div>
      ) : tableEntries.length === 0 ? (
        <div className="py-12 text-center">
          <div className="text-muted-foreground">{t('orderbook.alert_empty_orderbook')}</div>
        </div>
      ) : (
        <OrderbookTable
          tableEntries={tableEntries}
          selectedEntries={highlightedOffers}
          pinnedEntries={pinnedToTopOffers}
          globalFilter={searchInputRaw}
          onChange={(table) => {
            setTableRowModel(table.getFilteredRowModel())
          }}
        />
      )}
    </div>
  )
}
