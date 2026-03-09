import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { EarnReportEntry } from '@/components/earn/report/hooks/useQueryYieldgenReport'
import { Balance } from '@/components/ui/jam/Balance'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { Days, Milliseconds } from '@/types/global'

const MILLISECONDS_IN_A_DAY: Milliseconds = 24 * 60 * 60 * 1_000
const DEFAULT_CHART_DAYS: Days = 30

interface DayBucket {
  label: string
  earned: number
  count: number
}

// Group entries into daily buckets for the past N days
const bucketByDay = (entries: EarnReportEntry[], days: Days): DayBucket[] => {
  if (days < 0) {
    return []
  }
  const now = new Date()
  const buckets: DayBucket[] = []

  for (let index = days - 1; index >= 0; index--) {
    const dayStart = new Date(now.getTime() - index * MILLISECONDS_IN_A_DAY)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(dayStart.getTime() + MILLISECONDS_IN_A_DAY)

    const dayEntries = entries.filter(
      (entry) => entry.timestamp >= dayStart && entry.timestamp < dayEnd && entry.earnedAmount != null,
    )

    buckets.push({
      label: dayStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      earned: dayEntries.reduce((sum, entry) => sum + (entry.earnedAmount ?? 0), 0),
      count: dayEntries.length,
    })
  }

  return buckets
}

interface EarnReportChartProps {
  entries: EarnReportEntry[]
  days?: Days
}

export const EarnReportChart = ({ entries, days = DEFAULT_CHART_DAYS }: EarnReportChartProps) => {
  const { t } = useTranslation()
  const buckets = useMemo(() => bucketByDay(entries, days), [entries, days])
  const maxEarned = useMemo(() => Math.max(...buckets.map((bucket) => bucket.earned), 1), [buckets])
  const hasData = buckets.some((bucket) => bucket.earned > 0)

  if (!hasData) {
    return null
  }

  return (
    <div className="space-y-2">
      <div className="text-muted-foreground text-xs font-medium">
        {t('earn.report.chart_title_days', { count: days })}
      </div>
      <TooltipProvider delayDuration={0}>
        <div className="flex h-24 items-end gap-px">
          {buckets.map((bucket) => {
            const heightPercent = maxEarned > 0 ? (bucket.earned / maxEarned) * 100 : 0

            return (
              <Tooltip key={bucket.label}>
                <TooltipTrigger asChild>
                  <div className="flex min-w-0 flex-1 cursor-pointer flex-col justify-end" style={{ height: '100%' }}>
                    <div
                      className="bg-primary/70 hover:bg-primary rounded-t-sm transition-colors"
                      style={{ height: `${Math.max(heightPercent, bucket.earned > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <div className="font-medium">{bucket.label}</div>
                  <div>
                    <Balance valueString={String(bucket.earned)} showBalance={true} enableVisibilityToggle={false} />
                  </div>
                  <div className="text-muted-foreground">
                    {t('earn.report.chart_tooltip_transactions', { count: bucket.count })}
                  </div>
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      </TooltipProvider>
    </div>
  )
}
