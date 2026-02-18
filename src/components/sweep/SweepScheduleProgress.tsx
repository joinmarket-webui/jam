import { Trans, useTranslation } from 'react-i18next'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Spinner } from '../ui/spinner'
import type { Schedule } from './scheduleUtils'
import { toScheduleProgressSummary } from './scheduleUtils'

interface SweepScheduleProgressProps {
  schedule: Schedule
  isStopping: boolean
  onStop: () => Promise<void>
}

const SweepProgressBar = ({ schedule }: { schedule: Schedule }) => {
  const progress = toScheduleProgressSummary(schedule)

  return (
    <div className="bg-muted flex h-3 w-full overflow-hidden rounded-full">
      {progress.steps.map((step, index) => (
        <div
          key={index}
          className={cn('border-r-background h-full border-r-[1px] transition-all last:border-r-0', {
            'bg-primary/35': !step.isComplete && !step.isActive,
            'bg-primary motion-safe:animate-pulse': step.isActive,
            'bg-primary': step.isComplete,
          })}
          style={{ width: `${step.widthPercent}%` }}
        />
      ))}
    </div>
  )
}

export const SweepScheduleProgress = ({ schedule, isStopping, onStop }: SweepScheduleProgressProps) => {
  const { t } = useTranslation()
  const progress = toScheduleProgressSummary(schedule)
  const totalHours = Math.ceil(progress.totalWaitSeconds / 60 / 60)
  const totalSeconds = Math.ceil(progress.totalWaitSeconds)
  const highlightedComponents = {
    '1': <span className="font-semibold" />,
    '3': <span className="font-semibold" />,
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          {totalHours <= 1 ? (
            <p className="text-sm">
              <Trans
                i18nKey="scheduler.progress_tldr_seconds"
                values={{ length: progress.totalTransactions, seconds: totalSeconds }}
                components={highlightedComponents}
              />
            </p>
          ) : (
            <p className="text-sm">
              <Trans
                i18nKey="scheduler.progress_tldr_hours"
                values={{ length: progress.totalTransactions, hours: totalHours }}
                components={highlightedComponents}
              />
            </p>
          )}
          <p className="text-muted-foreground text-xs">{t('scheduler.progress_description')}</p>
        </div>

        <SweepProgressBar schedule={schedule} />

        {progress.isDone ? (
          <Alert variant="success">
            <Spinner className="motion-reduce:hidden" />
            <AlertTitle>{t('scheduler.progress_done')}</AlertTitle>
          </Alert>
        ) : (
          <Alert>
            <Spinner className="motion-reduce:hidden" />
            <AlertTitle>
              <Trans
                i18nKey="scheduler.progress_current_state"
                values={{
                  current: progress.currentTransactionIndex + 1,
                  total: progress.totalTransactions,
                }}
                components={highlightedComponents}
              />
            </AlertTitle>
            <AlertDescription />
          </Alert>
        )}

        <Button type="button" onClick={() => void onStop()} disabled={isStopping} size="lg" className="w-full">
          {isStopping ? (
            <>
              <Spinner className="motion-reduce:hidden" />
              {t('scheduler.button_stop')}
            </>
          ) : (
            t('scheduler.button_stop')
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
