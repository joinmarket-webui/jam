import { Trans, useTranslation } from 'react-i18next'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Spinner } from '../ui/spinner'
import type { Schedule, ScheduleEntryState } from './scheduleUtils'
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

  const formatWaitTime = (seconds: number): string => {
    const roundedSeconds = Math.max(0, Math.ceil(seconds))
    const minutes = Math.floor(roundedSeconds / 60)
    const remainingSeconds = roundedSeconds % 60

    if (minutes === 0) {
      return t('scheduler.progress_wait_seconds', { seconds: remainingSeconds })
    }
    if (remainingSeconds === 0) {
      return t('scheduler.progress_wait_minutes', { minutes })
    }
    return t('scheduler.progress_wait_minutes_seconds', { minutes, seconds: remainingSeconds })
  }

  const toScheduleEntryStateText = (state: ScheduleEntryState, txid?: string): string => {
    if (state === 'confirmed') {
      return t('scheduler.progress_entry_state_confirmed')
    }
    if (state === 'broadcasted') {
      return t('scheduler.progress_entry_state_waiting_confirmation', { txid: txid ?? '-' })
    }
    return t('scheduler.progress_entry_state_pending')
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
              {/* Keep a stable fallback state so brief polling gaps never leave this header empty. */}
              {progress.currentState?.type === 'waiting_before_next' ? (
                <Trans
                  i18nKey="scheduler.progress_current_state_wait_before_next"
                  values={{
                    current: progress.currentState.currentTransaction,
                    total: progress.currentState.totalTransactions,
                    wait: formatWaitTime(progress.currentState.waitSeconds ?? 0),
                  }}
                  components={highlightedComponents}
                />
              ) : progress.currentState?.type === 'waiting_for_confirmation' ? (
                <Trans
                  i18nKey="scheduler.progress_current_state_waiting_confirmation"
                  values={{
                    current: progress.currentState.currentTransaction,
                    total: progress.currentState.totalTransactions,
                    txid: progress.currentState.txid ?? '-',
                  }}
                  components={highlightedComponents}
                />
              ) : progress.currentState?.type === 'transaction_confirmed' ? (
                <Trans
                  i18nKey="scheduler.progress_current_state_transaction_confirmed"
                  values={{
                    current: progress.currentState.currentTransaction,
                    total: progress.currentState.totalTransactions,
                  }}
                  components={highlightedComponents}
                />
              ) : (
                <Trans
                  i18nKey="scheduler.progress_current_state_creating_next"
                  values={{
                    current: progress.currentTransactionIndex + 1,
                    total: progress.totalTransactions,
                  }}
                  components={highlightedComponents}
                />
              )}
            </AlertTitle>
            <AlertDescription />
          </Alert>
        )}

        <div className="space-y-2 rounded-lg border p-3">
          <div className="font-medium">{t('scheduler.progress_schedule_info_title')}</div>
          <div className="space-y-2">
            {progress.entries.map((entry) => (
              <div
                key={entry.index}
                className="bg-muted/30 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-md px-2 py-1.5 text-xs"
              >
                <div className="font-medium">{t('scheduler.progress_entry_label', { index: entry.index + 1 })}</div>
                <div className="text-muted-foreground">{toScheduleEntryStateText(entry.state, entry.txid)}</div>
                <div className="text-muted-foreground">
                  {entry.isLast
                    ? t('scheduler.progress_entry_wait_final')
                    : t('scheduler.progress_entry_wait_before_next', {
                        wait: formatWaitTime(entry.waitBeforeNextSeconds),
                      })}
                </div>
              </div>
            ))}
          </div>
        </div>

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
