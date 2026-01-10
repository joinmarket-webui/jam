import { useState, useMemo } from 'react'
import { DropdownMenu } from '@radix-ui/react-dropdown-menu'
import { useQuery } from '@tanstack/react-query'
import type { RowModel } from '@tanstack/react-table'
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
  pseudoRandomNumber,
} from '@/lib/utils'
import { jamSettingsStore } from '@/store/jamSettingsStore'
import { jmSessionStore } from '@/store/jmSessionStore'
import { DevBadge } from '../dev/DevBadge'
import { Alert, AlertDescription } from '../ui/alert'
import { ButtonGroup } from '../ui/button-group'
import { DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu'
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

  const [searchInputRaw, setSearchInputRaw] = useState('')
  const [isHighlightMyOffers, setHighlightMyOffers] = useState(false)
  const [isPinMyOffers, setPinMyOffers] = useState(false)

  const [demoOffers, setDemoOffers] = useState<OrderbookOffer[]>([])
  const isDeveloperMode = useStore(jamSettingsStore, (state) => state.state.developerMode)
  const showDemoButton = useMemo(() => isDeveloperMode, [isDeveloperMode])

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

  const { isFetching: isFetchingOrderbookRefresh, refetch: refetchOrderbookRefresh } = useQuery({
    queryKey: ['orderbook-refresh'],
    queryFn: withQueryDelay(OrderbookApi.refreshOrderbook, {
      delayAfter: 210,
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
      delayAfter: 210,
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
            {searchInputRaw === ''
              ? t('orderbook.text_orderbook_summary', summary)
              : t('orderbook.text_orderbook_summary_filtered', summary)}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {showDemoButton && (
            <Button variant="outline" size="sm" onClick={__dev_generateDemoReportEntryButton} disabled={isFetching}>
              <PlusIcon />
              Generate Demo Entry
              <DevBadge />
            </Button>
          )}

          <ButtonGroup>
            <Button variant="outline" className="rounded-r-none" size="sm" onClick={handleReload} disabled={isFetching}>
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
                  <DropdownMenuItem onClick={handleClearAndReload} disabled={isFetching}>
                    {t('orderbook.button_refresh_text')}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </ButtonGroup>

          <Input
            placeholder={t('orderbook.placeholder_search')}
            value={searchInputRaw}
            onChange={(e) => setSearchInputRaw(e.target.value)}
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

      {isLoadingInitially ? (
        <div className="py-12">
          <div className="text-muted-foreground m-2 flex items-center justify-center gap-2">
            <Loader2Icon className="h-5 w-5 animate-spin motion-reduce:hidden" />
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
