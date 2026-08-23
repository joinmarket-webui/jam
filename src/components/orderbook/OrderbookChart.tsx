import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { OFFER_FEE_BANDS } from '@/constants/jam'
import { factorToPercentage } from '@/lib/utils'
import type { OrderTableEntry } from './OrderbookTable'

type FeeMode = 'relative' | 'absolute'

interface FeeBucket {
  fee?: number
  exact: number
  near: number
}

const bucketByQuantizationBand = (entries: OrderTableEntry[], mode: FeeMode) => {
  const offersByMaker = new Map<string, OrderTableEntry>()

  for (const entry of entries) {
    if (entry.bondValue.value <= 0) continue
    if (mode === 'absolute' && !entry.type.isAbsolute) continue
    if (mode === 'relative' && !entry.type.isRelative) continue

    const previous = offersByMaker.get(entry.counterparty)
    if (Number.isFinite(entry.fee.value) && (!previous || entry.fee.value < previous.fee.value)) {
      offersByMaker.set(entry.counterparty, entry)
    }
  }

  const grid = OFFER_FEE_BANDS[mode]
  const buckets: FeeBucket[] = grid.map((fee) => ({ fee, exact: 0, near: 0 }))
  const above: FeeBucket = { exact: 0, near: 0 }
  let exactTotal = 0

  for (const offer of offersByMaker.values()) {
    const index = grid.findIndex((fee) => fee >= offer.fee.value)
    const bucket = index === -1 ? above : buckets[index]

    if (index !== -1 && offer.fee.value === grid[index]) {
      bucket.exact += 1
      exactTotal += 1
    } else {
      bucket.near += 1
    }
  }

  if (above.near > 0) buckets.push(above)

  return { buckets, exactTotal, makerCount: offersByMaker.size }
}

const formatFee = (mode: FeeMode, fee?: number) => {
  const value = fee ?? OFFER_FEE_BANDS[mode].at(-1)
  if (value === undefined) return ''
  const label = mode === 'relative' ? `${factorToPercentage(value)}%` : value.toLocaleString()
  return fee === undefined ? `${label}+` : label
}

interface OrderbookChartProps {
  entries: OrderTableEntry[]
}

export const OrderbookChart = ({ entries }: OrderbookChartProps) => {
  const { t } = useTranslation()
  const [mode, setMode] = useState<FeeMode>('relative')
  const { buckets, exactTotal, makerCount } = useMemo(() => bucketByQuantizationBand(entries, mode), [entries, mode])
  const maxCount = Math.max(...buckets.map((bucket) => bucket.exact + bucket.near), 1)

  if (entries.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-muted-foreground text-xs font-medium">{t('orderbook.chart_title')}</div>
        <ButtonGroup>
          <Button
            type="button"
            size="xs"
            variant={mode === 'relative' ? 'secondary' : 'outline'}
            aria-pressed={mode === 'relative'}
            onClick={() => setMode('relative')}
          >
            {t('orderbook.chart_relative_offers')}
          </Button>
          <Button
            type="button"
            size="xs"
            variant={mode === 'absolute' ? 'secondary' : 'outline'}
            aria-pressed={mode === 'absolute'}
            onClick={() => setMode('absolute')}
          >
            {t('orderbook.chart_absolute_offers')}
          </Button>
        </ButtonGroup>
      </div>

      <p className="text-muted-foreground text-xs">
        {makerCount === 0
          ? t('orderbook.chart_no_bonded_makers')
          : t('orderbook.chart_exact_summary', { exact: exactTotal, total: makerCount })}
      </p>

      <TooltipProvider delayDuration={0}>
        <div className="overflow-x-auto pb-1">
          <div className="flex min-w-xl gap-1">
            {buckets.map((bucket) => {
              const total = bucket.exact + bucket.near
              const fee = formatFee(mode, bucket.fee)
              const tooltip =
                bucket.fee === undefined
                  ? t('orderbook.chart_tooltip_above', { count: total })
                  : t('orderbook.chart_tooltip', { fee, exact: bucket.exact, near: bucket.near })

              return (
                <div key={fee} className="flex min-w-10 flex-1 flex-col items-center gap-1">
                  <span className="text-muted-foreground text-[10px] tabular-nums">{total}</span>
                  <div className="flex h-24 w-full items-end">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label={tooltip}
                          className="bg-muted flex w-full flex-col overflow-hidden rounded-t-sm transition-opacity hover:opacity-80"
                          style={{ height: total === 0 ? 2 : `${Math.max((total / maxCount) * 100, 4)}%` }}
                        >
                          {bucket.near > 0 && (
                            <span
                              className="bg-primary/35 w-full"
                              style={{ height: `${(bucket.near / total) * 100}%` }}
                            />
                          )}
                          {bucket.exact > 0 && (
                            <span
                              className="bg-primary w-full"
                              style={{ height: `${(bucket.exact / total) * 100}%` }}
                            />
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        <div className="font-medium">{fee}</div>
                        <div>{tooltip}</div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <span className="text-muted-foreground text-[10px] whitespace-nowrap">{fee}</span>
                </div>
              )
            })}
          </div>
        </div>
      </TooltipProvider>

      <p className="text-muted-foreground text-center text-[10px]">
        {t(mode === 'absolute' ? 'orderbook.chart_absolute_axis' : 'orderbook.chart_relative_axis')}
      </p>
      <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-[10px]">
        <span className="flex items-center gap-1">
          <span className="bg-primary size-2 rounded-sm" />
          {t('orderbook.chart_legend_exact')}
        </span>
        <span className="flex items-center gap-1">
          <span className="bg-primary/35 size-2 rounded-sm" />
          {t('orderbook.chart_legend_near')}
        </span>
      </div>
    </div>
  )
}
