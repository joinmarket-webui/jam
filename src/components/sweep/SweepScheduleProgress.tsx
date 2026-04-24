import { Trans, useTranslation } from 'react-i18next'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Balance } from '@/components/ui/jam/Balance'
import { Spinner } from '../ui/spinner'
import type { Schedule, ScheduleEntryState, SchedulePhase } from './scheduleUtils'
import { toScheduleProgressSummary, toPhaseStatus, isScheduleTerminal } from './scheduleUtils'

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
  const isTerminal = isScheduleTerminal(schedule)
  const isSuccessTerminal = isTerminal && toPhaseStatus(schedule.status) === 'completed'
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
    if (state === 'failed') {
      return t('scheduler.progress_entry_state_failed')
    }
    if (state === 'cancelled') {
      return t('scheduler.progress_entry_state_cancelled')
    }
    return t('scheduler.progress_entry_state_pending')
  }

  const describePhasePlan = (phase: SchedulePhase): React.ReactNode => {
    const kind = phase.kind
    if (kind === 'maker_session') {
      const target = phase.target_cj_count ?? undefined
      const duration = phase.duration_seconds ?? undefined
      const parts: string[] = ['Maker session']
      if (typeof target === 'number') parts.push(`${target} CJs target`)
      if (typeof duration === 'number') parts.push(`${Math.round(duration)}s max`)
      return parts.join(' · ')
    }

    // Taker / bondless burst share the same informational fields.
    const pieces: React.ReactNode[] = []
    if (kind === 'bondless_taker_burst') {
      pieces.push(<span key="kind">Bondless burst</span>)
      if (typeof phase.cj_count === 'number') pieces.push(<span key="cj">{phase.cj_count} CJs</span>)
    } else {
      pieces.push(<span key="kind">Taker CoinJoin</span>)
    }

    if (typeof phase.mixdepth === 'number') pieces.push(<span key="mix">mixdepth {phase.mixdepth}</span>)

    if (phase.amount === 0) {
      pieces.push(<span key="amt">sweep</span>)
    } else if (typeof phase.amount === 'number' && phase.amount > 0) {
      pieces.push(
        <span key="amt" className="inline-flex items-center gap-1">
          <Balance valueString={`${phase.amount}`} convertToUnit="sats" showBalance />
        </span>,
      )
    } else if (typeof phase.amount_fraction === 'number') {
      pieces.push(<span key="amt">{Math.round(phase.amount_fraction * 100)}% of mixdepth</span>)
    }

    const destination = phase.destination
    if (typeof destination === 'string' && destination.length > 0) {
      pieces.push(
        <span key="dst">
          → {destination === 'INTERNAL' ? <em>internal</em> : `${destination.slice(0, 12)}…${destination.slice(-6)}`}
        </span>,
      )
    }

    if (typeof phase.counterparty_count === 'number') {
      pieces.push(<span key="cp">{phase.counterparty_count} makers</span>)
    }

    return (
      <span className="inline-flex flex-wrap items-center gap-x-1 gap-y-0.5">
        {pieces.map((piece, index) => (
          <span key={index} className="inline-flex items-center">
            {index > 0 && <span className="text-muted-foreground/60 px-1">·</span>}
            {piece}
          </span>
        ))}
      </span>
    )
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

        {!isTerminal && progress.isDone ? (
          <Alert variant="success">
            <Spinner className="motion-reduce:hidden" />
            <AlertTitle>{t('scheduler.progress_done')}</AlertTitle>
          </Alert>
        ) : null}

        {isSuccessTerminal && (
          <Alert variant="success">
            <AlertTitle>{t('scheduler.progress_done')}</AlertTitle>
          </Alert>
        )}

        {!isTerminal && !progress.isDone && (
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
            {progress.entries.map((entry) => {
              const phase = schedule.phases[entry.index]
              return (
                <div
                  key={entry.index}
                  className="bg-muted/30 flex flex-col gap-1 rounded-md px-2 py-1.5 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <div className="font-medium">
                      {t('scheduler.progress_entry_label', { index: entry.index + 1 })}
                    </div>
                    <div className="text-muted-foreground">{toScheduleEntryStateText(entry.state, entry.txid)}</div>
                    <div className="text-muted-foreground">
                      {entry.isLast
                        ? t('scheduler.progress_entry_wait_final')
                        : t('scheduler.progress_entry_wait_before_next', {
                            wait: formatWaitTime(entry.waitBeforeNextSeconds),
                          })}
                    </div>
                  </div>
                  {phase !== undefined && (
                    <div className="text-muted-foreground text-[11px] leading-snug">{describePhasePlan(phase)}</div>
                  )}
                  {phase?.error && (
                    <div className="text-destructive text-[11px] leading-snug break-words">{phase.error}</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {!isTerminal && (
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
        )}
      </CardContent>
    </Card>
  )
}
