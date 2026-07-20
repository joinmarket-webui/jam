import { useState } from 'react'
import { AlertTriangleIcon, CheckCircle2Icon } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { cn, shortenStringMiddle } from '@/lib/utils'
import { DevBadge } from '../dev/DevBadge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion'
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '../ui/item'
import { Address } from '../ui/jam/Address'
import { Separator } from '../ui/separator'
import { Spinner } from '../ui/spinner'
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs'
import { ScheduleEntryItem } from './ScheduleEntryItem'
import type { Schedule, ScheduleProgressSummary } from './scheduleUtils'

const SweepProgressBar = ({ progress }: { progress: ScheduleProgressSummary }) => {
  return (
    <div className="bg-muted flex h-3 w-full overflow-hidden rounded-full">
      {progress.steps.map((step, index) => (
        <div
          key={index}
          className={cn('border-r-background h-full border-r-[1px] transition-all last:border-r-0', {
            'bg-primary/35': !step.completed && !step.active,
            'bg-primary motion-safe:animate-pulse': step.active,
            'bg-primary': step.completed,
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

interface SweepScheduleProgressProps {
  schedule: Schedule
  debug?: boolean
}

export const SweepScheduleProgress = ({ schedule, debug }: SweepScheduleProgressProps) => {
  const { t } = useTranslation()
  const totalHours = Math.ceil(schedule.summary.totalWaitSeconds / 60 / 60)
  const totalSeconds = Math.ceil(schedule.summary.totalWaitSeconds)

  const [activeTab, setActiveTab] = useState<Tab>(() => (schedule.summary.derivedStatus.terminated ? 'all' : 'active'))
  const accordionDefaultOpen = !schedule.summary.derivedStatus.terminated

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          {totalHours <= 1 ? (
            <p className="text-sm">
              <Trans
                i18nKey="scheduler.progress_tldr_seconds"
                values={{ length: schedule.entries.length.toLocaleString(), seconds: totalSeconds.toLocaleString() }}
                components={highlightedComponents}
              />
            </p>
          ) : (
            <p className="text-sm">
              <Trans
                i18nKey="scheduler.progress_tldr_hours"
                values={{ length: schedule.entries.length.toLocaleString(), hours: totalHours.toLocaleString() }}
                components={highlightedComponents}
              />
            </p>
          )}
          <p className="text-muted-foreground text-xs">{t('scheduler.progress_description')}</p>
        </div>

        <SweepProgressBar progress={schedule.progress} />

        {schedule.summary.status.completed ? (
          <Alert variant="success">
            <CheckCircle2Icon />
            <AlertTitle>{/* TODO: i18n */ 'Scheduled sweep finished successfully.'}</AlertTitle>
            <AlertDescription />
          </Alert>
        ) : null}

        {schedule.summary.status.failed ? (
          <Alert variant="destructive">
            <AlertTriangleIcon />
            <AlertTitle>{/* TODO: i18n */ 'Scheduled sweep failed.'}</AlertTitle>
            <AlertDescription />
          </Alert>
        ) : null}

        {schedule.summary.status.cancelled ? (
          <Alert variant="warning">
            <AlertTriangleIcon />
            <AlertTitle>{/* TODO: i18n */ 'Scheduled sweep was cancelled.'}</AlertTitle>
            <AlertDescription />
          </Alert>
        ) : null}

        {!schedule.summary.derivedStatus.terminated ? (
          <Alert>
            <Spinner className="motion-reduce:hidden" />
            <AlertTitle>
              {/* Keep a stable fallback state so brief polling gaps never leave this header empty. */}
              {schedule.summary.derivedStatus.value === 'waiting_for_confirmation' ? (
                <Trans
                  i18nKey="scheduler.progress_current_state_waiting_confirmation"
                  values={{
                    current: schedule.active ? (schedule.active.index + 1).toLocaleString() : undefined,
                    total: schedule.entries.length.toLocaleString(),
                    txid: schedule.active?.transactionId ? shortenStringMiddle(schedule.active.transactionId, 12) : '-',
                  }}
                  components={highlightedComponents}
                />
              ) : schedule.summary.derivedStatus.value === 'waiting_before_next' ? (
                <Trans
                  i18nKey="scheduler.progress_current_state_waiting_start"
                  values={{
                    current: schedule.active ? (schedule.active.index + 1).toLocaleString() : undefined,
                    total: schedule.entries.length,
                  }}
                  components={highlightedComponents}
                />
              ) : (
                <Trans
                  i18nKey="scheduler.progress_current_state_executing"
                  values={{
                    current: schedule.active ? (schedule.active.index + 1).toLocaleString() : undefined,
                    total: schedule.entries.length,
                  }}
                  components={highlightedComponents}
                />
              )}
            </AlertTitle>
            <AlertDescription />
          </Alert>
        ) : null}

        {schedule.summary.externalDestinationAddresses.length === 0 ? null : (
          <Item variant="outline">
            <ItemContent>
              <ItemTitle>
                {t('scheduler.destination_addresses_header_title', {
                  defaultValue: 'Destination Addresses',
                })}
              </ItemTitle>
              <ItemDescription>{t('scheduler.description_destination_addresses')}</ItemDescription>
              {schedule.summary.externalDestinationAddresses.map((it, index) => {
                return (
                  <div key={index}>
                    {index === 0 ? null : <Separator className="my-2" />}
                    <Address value={it} />
                  </div>
                )
              })}
            </ItemContent>
          </Item>
        )}

        <Accordion type="single" collapsible defaultValue={accordionDefaultOpen ? 'details' : undefined}>
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
                    {/* TODO: i18n */}Completed ({schedule.completed.length.toLocaleString()})
                  </TabsTrigger>
                  <TabsTrigger value="all" className="cursor-pointer">
                    {/* TODO: i18n */}All ({schedule.entries.length.toLocaleString()})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              {activeTab === 'active' ? (
                schedule.active === undefined ? (
                  <>
                    <div className="m-2 flex items-center justify-center gap-2">
                      No action is active.{/* TODO: i18n */}
                    </div>
                  </>
                ) : (
                  <ItemGroup className="space-y-2">
                    <ScheduleEntryItem value={schedule.active} active />
                  </ItemGroup>
                )
              ) : null}
              {activeTab === 'completed' ? (
                schedule.completed.length === 0 ? (
                  <>
                    <div className="m-2 flex items-center justify-center gap-2">
                      No completed entries yet.{/* TODO: i18n */}
                    </div>
                  </>
                ) : (
                  <ItemGroup className="space-y-2">
                    {schedule.completed.map((entry, index) => {
                      return <ScheduleEntryItem key={index} value={entry} active={entry === schedule.active} />
                    })}
                  </ItemGroup>
                )
              ) : null}
              {activeTab === 'all' ? (
                <ItemGroup className="space-y-2">
                  {schedule.entries.map((entry, index) => {
                    return <ScheduleEntryItem key={index} value={entry} active={entry === schedule.active} />
                  })}
                </ItemGroup>
              ) : null}
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {debug && (
          <Card className="mt-8">
            <CardContent className="flex flex-col gap-2">
              <Accordion type="single" collapsible>
                <AccordionItem value="debug">
                  <AccordionTrigger>
                    <div>
                      Debug <DevBadge className="justify-self-end" />
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="overflow-scroll">
                      <code className="text-destructive">schedule:</code>
                      <pre className="text-xs">{JSON.stringify(schedule, null, 2)}</pre>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  )
}
