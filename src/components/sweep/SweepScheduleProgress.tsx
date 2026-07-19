import React, { useMemo, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { DevBadge } from '../dev/DevBadge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion'
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '../ui/item'
import { Address } from '../ui/jam/Address'
import { Separator } from '../ui/separator'
import { Spinner } from '../ui/spinner'
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs'
import { ScheduleProgressEntryItem } from './ScheduleProgressEntryItem'
import type { Schedule, ScheduleProgressSummary } from './scheduleUtils'
import { toScheduleProgressSummary } from './scheduleUtils'

interface SweepScheduleProgressProps {
  schedule: Schedule
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

type Tab = 'active' | 'completed' | 'all'

export const SweepScheduleProgress = ({ schedule, isStopping, onStop, debug }: SweepScheduleProgressProps) => {
  const { t } = useTranslation()
  const progress = toScheduleProgressSummary(schedule)
  const totalHours = Math.ceil(progress.totalWaitSeconds / 60 / 60)
  const totalSeconds = Math.ceil(progress.totalWaitSeconds)

  const [activeTab, setActiveTab] = useState<Tab>('active')

  const activeEntries = useMemo(() => {
    return progress.entries.filter((it) => it.step.isActive)
  }, [progress.entries])
  const completedEntries = useMemo(() => {
    return progress.entries.filter((it) => it.step.isComplete)
  }, [progress.entries])
  const entriesWithExternalDestinationAddress = useMemo(() => {
    return schedule.filter((it) => it.externalDestinationAddress !== undefined)
  }, [schedule])

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
              {progress.currentState?.type === 'waiting_for_confirmation' ? (
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

        {entriesWithExternalDestinationAddress.length === 0 ? null : (
          <Item variant="outline">
            <ItemContent>
              <ItemTitle>
                {t('scheduler.destination_addresses_header_title', {
                  defaultValue: 'Destination Addresses',
                })}
              </ItemTitle>
              <ItemDescription>{t('scheduler.description_destination_addresses')}</ItemDescription>
              {entriesWithExternalDestinationAddress.map((it, index) => {
                return (
                  <div key={index}>
                    {index === 0 ? null : <Separator className="my-2" />}
                    <Address value={it.externalDestinationAddress!} />
                  </div>
                )
              })}
            </ItemContent>
          </Item>
        )}

        <Accordion type="single" collapsible defaultValue="details">
          <AccordionItem value="details">
            <AccordionTrigger>
              {
                /* TODO: i18n */ t('scheduler.button_settings', {
                  defaultValue: 'Schedule details',
                })
              }
            </AccordionTrigger>
            <AccordionContent
              className={cn('flex flex-col gap-6 py-2', 'mx-1' /* add x-spacing for input component focus state*/)}
            >
              <Tabs
                value={activeTab}
                onValueChange={(value) => setActiveTab(value as Tab)}
                className="flex flex-col gap-4"
              >
                <TabsList className="mx-auto flex items-center gap-2">
                  <TabsTrigger value="active" className="cursor-pointer">
                    {/* TODO: i18n */}Active
                  </TabsTrigger>
                  <TabsTrigger value="completed" className="cursor-pointer">
                    {/* TODO: i18n */}Completed ({completedEntries.length})
                  </TabsTrigger>
                  <TabsTrigger value="all" className="cursor-pointer">
                    {/* TODO: i18n */}All ({progress.entries.length})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              {activeTab === 'active' ? (
                <ItemGroup className="space-y-2">
                  {activeEntries.map((entry, index) => {
                    return (
                      <React.Fragment key={index}>
                        <ScheduleProgressEntryItem value={entry} />
                      </React.Fragment>
                    )
                  })}
                </ItemGroup>
              ) : null}
              {activeTab === 'completed' ? (
                completedEntries.length === 0 ? (
                  <>
                    <div className="m-2 flex items-center justify-center gap-2">
                      No completed entries yet.{/* TODO: i18n */}
                    </div>
                  </>
                ) : (
                  <ItemGroup className="space-y-2">
                    {completedEntries.map((entry, index) => {
                      return (
                        <React.Fragment key={index}>
                          <ScheduleProgressEntryItem value={entry} />
                        </React.Fragment>
                      )
                    })}
                  </ItemGroup>
                )
              ) : null}
              {activeTab === 'all' ? (
                <ItemGroup className="space-y-2">
                  {progress.entries.map((entry, index) => {
                    return (
                      <React.Fragment key={index}>
                        <ScheduleProgressEntryItem value={entry} />
                      </React.Fragment>
                    )
                  })}
                </ItemGroup>
              ) : null}
            </AccordionContent>
          </AccordionItem>
        </Accordion>

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
