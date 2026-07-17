import React from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { type Jar } from '@/context/JamWalletInfoContext'
import { cn } from '@/lib/utils'
import { DevBadge } from '../dev/DevBadge'
import { Badge } from '../ui/badge'
import { jarBadgeVariant } from '../ui/badge-variants'
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '../ui/item'
import { Address } from '../ui/jam/Address'
import { Separator } from '../ui/separator'
import { Spinner } from '../ui/spinner'
import { ScheduleProgressEntryItem } from './ScheduleProgressEntryItem'
import type { Schedule, ScheduleEntryState, ScheduleProgressSummary } from './scheduleUtils'
import { toScheduleProgressSummary } from './scheduleUtils'

interface SweepScheduleProgressProps {
  schedule: Schedule
  jars: Jar[]
  isStopping: boolean
  onStop: () => Promise<void>
  debug?: boolean
}

const SweepProgressBar = ({ progress }: { progress: ScheduleProgressSummary }) => {
  return (
    <div className="bg-muted flex h-3 w-full overflow-hidden rounded-full">
      {progress.entries
        .map((it) => it.step)
        .map((step, index) => (
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

const highlightedComponents = {
  '1': <span className="font-semibold" />,
  '3': <span className="font-semibold" />,
}

export const SweepScheduleProgress = ({ schedule, jars, isStopping, onStop, debug }: SweepScheduleProgressProps) => {
  const { t } = useTranslation()
  const progress = toScheduleProgressSummary(schedule)
  const totalHours = Math.ceil(progress.totalWaitSeconds / 60 / 60)
  const totalSeconds = Math.ceil(progress.totalWaitSeconds)

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

        <SweepProgressBar progress={progress} />

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
                  i18nKey="scheduler.progress_current_state_confirmed"
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

        <Item variant="outline">
          <ItemContent>
            <ItemTitle>
              {t('scheduler.destination_addresses_header_title', {
                defaultValue: 'Destination Addresses',
              })}
            </ItemTitle>
            <ItemDescription>
              {t('scheduler.description_destination_addresses', {
                defaultValue: 'Destination Addresses',
              })}
            </ItemDescription>
            {schedule
              .filter((it) => it.externalDestinationAddress !== undefined)
              .map((it, index) => {
                return (
                  <div key={index}>
                    {index === 0 ? null : <Separator className="my-2" />}
                    <Address value={it.externalDestinationAddress!} />
                  </div>
                )
              })}
          </ItemContent>
        </Item>

        <ItemGroup className="space-y-2">
          {progress.entries.map((entry, index) => {
            return (
              <React.Fragment key={index}>
                <ScheduleProgressEntryItem value={entry} />
              </React.Fragment>
            )
          })}
        </ItemGroup>

        <div className="space-y-2 rounded-lg border p-3">
          <div className="font-medium">{t('scheduler.progress_schedule_info_title')}</div>
          <div className="space-y-2">
            {progress.entries.map((entry) => {
              const jar =
                entry.__raw.jarIndex !== undefined ? jars.find((it) => it.jarIndex === entry.__raw.jarIndex) : undefined
              return (
                <div
                  key={entry.index}
                  className={cn(
                    'bg-muted/30 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-md px-2 py-1.5 text-xs',
                    {
                      'bg-secondary/80 text-secondary-foreground': !entry.step.isActive,
                      'bg-muted text-muted-foreground': entry.step.isComplete,
                      'ring-ring/50 ring-2 motion-safe:animate-pulse': entry.step.isActive,
                    },
                  )}
                >
                  <div className="font-medium">{t('scheduler.progress_entry_label', { index: entry.index + 1 })}</div>
                  <div className="space-x-2 font-medium">
                    <Badge
                      variant={
                        entry.__raw.kind === 'taker_coinjoin'
                          ? 'default'
                          : entry.__raw.kind === 'maker_session'
                            ? 'secondary'
                            : 'outline'
                      }
                    >
                      {entry.__raw.kind === 'taker_coinjoin'
                        ? 'Send'
                        : entry.__raw.kind === 'maker_session'
                          ? 'Earn'
                          : 'outline'}
                    </Badge>
                    {jar ? (
                      <Badge variant={jarBadgeVariant(jar.jarIndex)}>
                        {jar.name} <span className="text-xs">#{jar.jarIndex}</span>
                      </Badge>
                    ) : null}
                    <Badge variant={entry.step.isActive ? 'outline' : entry.step.isComplete ? 'success' : 'muted'}>
                      {entry.__raw?.__raw?.status}
                    </Badge>

                    {entry.__raw?.__raw?.amount === 0 ? <Badge variant="outline">Sweep</Badge> : null}
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
              )
            })}
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

        {debug && (
          <Card className="mt-8">
            <CardHeader className="grid">
              <DevBadge className="justify-self-end" />
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <div className="overflow-scroll">
                <code className="text-destructive">progress:</code>
                <pre className="text-xs">{JSON.stringify(progress, null, 2)}</pre>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  )
}
