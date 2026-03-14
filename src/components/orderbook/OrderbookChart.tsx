import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { OrderTableEntry } from './OrderbookTable'

interface FeeBucket {
    label: string
    min: number
    max: number
    count: number
}

const FEE_RANGES = [
    { min: 0, max: 100 },
    { min: 100, max: 500 },
    { min: 500, max: 1_000 },
    { min: 1_000, max: 5_000 },
    { min: 5_000, max: 10_000 },
    { min: 10_000, max: Number.POSITIVE_INFINITY },
]

const bucketByFeeRange = (entries: OrderTableEntry[]): FeeBucket[] => {
    const absoluteOffers = entries.filter((entry) => entry.type.isAbsolute)
    if (absoluteOffers.length === 0) return []

    return FEE_RANGES.map(({ min, max }) => {
        const count = absoluteOffers.filter((offer) => offer.fee.value >= min && offer.fee.value < max).length
        const label =
            max === Number.POSITIVE_INFINITY ? `${min.toLocaleString()}+` : `${min.toLocaleString()} – ${max.toLocaleString()}`
        return { label, min, max, count }
    }).filter((bucket) => bucket.count > 0)
}

interface OrderbookChartProps {
    entries: OrderTableEntry[]
}

export const OrderbookChart = ({ entries }: OrderbookChartProps) => {
    const { t } = useTranslation()
    const buckets = useMemo(() => bucketByFeeRange(entries), [entries])
    const maxCount = useMemo(() => Math.max(...buckets.map((bucket) => bucket.count), 1), [buckets])

    if (buckets.length === 0) {
        return null
    }

    return (
        <div className="space-y-2">
            <div className="text-muted-foreground text-xs font-medium">{t('orderbook.chart_title')}</div>
            <TooltipProvider delayDuration={0}>
                <div className="flex h-24 items-end gap-px">
                    {buckets.map((bucket) => {
                        const heightPercent = maxCount > 0 ? (bucket.count / maxCount) * 100 : 0

                        return (
                            <Tooltip key={bucket.label}>
                                <TooltipTrigger asChild>
                                    <div className="flex min-w-0 flex-1 cursor-pointer flex-col justify-end" style={{ height: '100%' }}>
                                        <div
                                            className="bg-primary/70 hover:bg-primary rounded-t-sm transition-colors"
                                            style={{ height: `${Math.max(heightPercent, bucket.count > 0 ? 4 : 0)}%` }}
                                        />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                    <div className="font-medium">{bucket.label} sats</div>
                                    <div>
                                        {t('orderbook.chart_tooltip_offers', { count: bucket.count })}
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        )
                    })}
                </div>
                <div className="text-muted-foreground flex justify-between text-[10px]">
                    {buckets.length > 0 && (
                        <>
                            <span>{buckets[0].label}</span>
                            {buckets.length > 1 && <span>{buckets.at(-1)?.label}</span>}
                        </>
                    )}
                </div>
            </TooltipProvider>
        </div>
    )
}
