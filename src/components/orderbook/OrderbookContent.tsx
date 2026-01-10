import { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { i18n } from 'i18next'
import { ChevronDownIcon, RefreshCwIcon, PlusIcon, AlertCircleIcon, Loader2Icon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStore } from 'zustand'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { JM_DUST_THRESHOLD } from '@/constants/jm'
import * as OrderbookApi from '@/lib/api/orderbook'
import type { OrderbookOffer, OrderbookFidelityBond } from '@/lib/api/orderbook'
import { withQueryDelay } from '@/lib/queryClient'
import {
  cn,
  factorToPercentage,
  isAbsoluteOffer,
  isRelativeOffer,
  humanReadableDuration,
  delayedPromise,
  pseudoRandomNumber,
} from '@/lib/utils'
import { jamSettingsStore } from '@/store/jamSettingsStore'
import { jmSessionStore } from '@/store/jmSessionStore'
import { DevBadge } from '../dev/DevBadge'
import { Alert, AlertDescription } from '../ui/alert'
import { Label } from '../ui/label'
import { OrderbookTable, type OrderTableEntry } from './OrderbookTable'

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

interface OrderbookContentProps {
  className?: string
}

export const OrderbookContent = ({ className }: OrderbookContentProps) => {
  const { t, i18n } = useTranslation()

  const nickname = useStore(jmSessionStore, (state) => state.state?.nickname)

  const [searchQuery, setSearchQuery] = useState('')
  const [isHighlightMyOffers, setHighlightMyOffers] = useState(false)
  const [isPinMyOffers, setPinMyOffers] = useState(false)

  const [showRefreshDropdown, setShowRefreshDropdown] = useState(false)

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

  const { isFetching: isFetchingOrderbookRefresh, refetch: refetchOrderbookRefresh } = useQuery({
    queryKey: ['orderbook-refresh'],
    queryFn: withQueryDelay(OrderbookApi.refreshOrderbook, {
      delayAfter: 200,
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
      delayAfter: 200,
    }),
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
    return offers
  }, [tableEntries, searchQuery])

  const summary = useMemo(() => {
    const uniqueCounterparties = new Set(filteredBaseData.map((offer) => offer.counterparty))
    return {
      count: filteredBaseData.length,
      counterpartyCount: uniqueCounterparties.size,
    }
  }, [filteredBaseData])

  const handleClearAndReload = async () => {
    setShowRefreshDropdown(false)

    await refetchOrderbookRefresh().then(() => refetchOrderbookData())
  }

  const handleReload = async () => {
    setShowRefreshDropdown(false)
    await refetchOrderbookData().then(() => delayedPromise(200))
  }

  const highlightedOffers: OrderTableEntry[] = isHighlightMyOffers ? myOffers : []
  const pinnedToTopOffers: OrderTableEntry[] = isPinMyOffers ? myOffers : []

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

          <Button variant="ghost" onClick={() => refetchOrderbookData()} disabled={isFetching}>
            <RefreshCwIcon className={cn({ 'motion-safe:animate-spin': isFetching })} />
            {t('global.retry')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('mx-auto space-y-3', className)}>
      <div className="flex flex-col items-start justify-center gap-2 sm:flex-row sm:items-center sm:justify-between">
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
              disabled={isFetching}
              className="relative"
            >
              <PlusIcon />
              Generate Demo Entry
              <DevBadge />
            </Button>
          )}

          {/* TODO: replace manual dropdown with shadcn component */}
          <div className="relative" ref={dropdownRef}>
            <div className="flex">
              <Button
                variant="outline"
                className="rounded-r-none"
                size="sm"
                onClick={handleReload}
                disabled={isFetching}
              >
                <RefreshCwIcon className={cn({ 'motion-safe:animate-spin': isFetching })} />
                {t('orderbook.button_reload_title')}
              </Button>
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-l-none border-l-0"
                  onClick={() => setShowRefreshDropdown(!showRefreshDropdown)}
                  disabled={isFetching}
                >
                  <ChevronDownIcon />
                </Button>
                {showRefreshDropdown && (
                  <div className="bg-background absolute top-full right-0 z-100 mt-1 min-w-[200px] rounded-md border py-2 shadow-lg">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start rounded-none"
                      onClick={handleClearAndReload}
                      disabled={isFetching}
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

      {/* Table */}
      {isLoadingInitially ? (
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
        <OrderbookTable
          tableEntries={filteredBaseData}
          selectedEntries={highlightedOffers}
          pinnedEntries={pinnedToTopOffers}
        />
      )}
    </div>
  )
}
