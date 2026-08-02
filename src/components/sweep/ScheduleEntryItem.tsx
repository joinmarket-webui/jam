import {
  AlertTriangleIcon,
  CalendarCheck2Icon,
  CalendarClockIcon,
  ClockFadingIcon,
  CopyCheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  FingerprintIcon,
  MilkIcon,
  TimerResetIcon,
  UsersIcon,
} from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Badge } from '../ui/badge'
import { jarBadgeVariant, type BadgeVariant } from '../ui/badge-variants'
import { buttonVariants } from '../ui/button-variants'
import { Item, ItemContent, ItemDescription, ItemHeader, ItemTitle } from '../ui/item'
import { Address } from '../ui/jam/Address'
import { CopyButton } from '../ui/jam/CopyButton'
import { Label } from '../ui/label'
import { formatDuration, type ScheduleEntry } from './scheduleUtils'

const EntryStatusBadge = ({ active, status }: { active: boolean; status: ScheduleEntry['status'] }) => {
  const variant: BadgeVariant = (() => {
    if (active) return 'outline'
    switch (status.value) {
      case 'completed':
        return 'success'
      case 'failed':
        return 'destructive'
      case 'cancelled':
        return 'warning'
      case 'skipped':
        return 'outline'
      default:
        return 'muted'
    }
  })()
  return (
    <Badge
      variant={variant}
      className={cn({
        'ring-ring/50 ring-1 motion-safe:animate-pulse': active,
      })}
    >
      {/* TODO: i18n */ status.value}
    </Badge>
  )
}

export const ScheduleEntryItem = ({ value, active }: { value: ScheduleEntry; active: boolean }) => {
  const { t } = useTranslation()

  return (
    <Item
      variant="outline"
      className={cn({
        'ring-brand-success ring-1': value.status.completed,
        'ring-destructive ring-1': value.status.failed,
        'ring-muted-foreground ring-1': value.status.skipped,
        'ring-ring/50 ring-2': active,
        'bg-muted text-muted-foreground': value.derivedStatus.terminated,
      })}
    >
      <ItemHeader>
        <div>
          <ItemTitle
            className={cn({
              'text-destructive': value.status.failed,
              'text-brand-warning': value.status.cancelled,
              'text-muted-foreground': value.status.skipped,
            })}
          >
            {t('scheduler.progress_entry_label', { index: (value.index + 1).toLocaleString('en-US') })}
          </ItemTitle>
          <ItemDescription>
            {
              /* TODO: i18n */
              value.kind === 'taker_coinjoin' ? (
                <Trans
                  i18nKey="A collaborative transaction as <1>taker</1> with {{numberOfRequestedCounterparties}} counterparties"
                  values={{
                    numberOfRequestedCounterparties: value.numberOfRequestedCounterparties?.toLocaleString('en-US'),
                  }}
                  components={{
                    '1': <span className="font-semibold" />,
                  }}
                />
              ) : value.kind === 'maker_session' ? (
                <Trans
                  i18nKey="A collaborative transaction as <1>maker</1>"
                  components={{
                    '1': <span className="font-semibold" />,
                  }}
                />
              ) : null
            }
          </ItemDescription>
        </div>
        <div className="flex flex-row-reverse flex-wrap items-center gap-2">
          <EntryStatusBadge active={active} status={value.status} />
          {value.kind === 'maker_session' ? <Badge variant="info">{/* TODO: i18n */ 'Earn'}</Badge> : null}
          {value.kind === 'taker_coinjoin' ? <Badge variant="default">{/* TODO: i18n */ 'Send'}</Badge> : null}
          {value.isSweep ? <Badge variant="outline">{/* TODO: i18n */ 'Sweep'}</Badge> : null}
        </div>
      </ItemHeader>
      <ItemContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {value.__raw?.error ? (
          <div className="text-destructive col-span-full flex min-w-0 items-start gap-4">
            <AlertTriangleIcon className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <Label className="font-semibold">{/*TODO: i18n */ 'Error'}</Label>
              {value.__raw?.error ?? t('global.errors.reason_unknown')}
            </div>
          </div>
        ) : null}
        {value.startedAt ? (
          <div className="flex min-w-0 items-start gap-4">
            <CalendarClockIcon className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1 space-y-1">
              <Label className="font-semibold">{/*TODO: i18n */ 'Started At'}</Label>
              <span title={value.startedAt.toISOString()}>{value.startedAt.toLocaleString('en-US')}</span>
            </div>
          </div>
        ) : null}
        {value.startedAt || value.finishedAt ? (
          <div className="flex min-w-0 items-start gap-4">
            <CalendarCheck2Icon className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1 space-y-1">
              <Label className="font-semibold">{/*TODO: i18n */ 'Finished At'}</Label>
              {value.finishedAt === undefined ? (
                '-'
              ) : (
                <span title={value.finishedAt.toISOString()}>{value.finishedAt.toLocaleString('en-US')}</span>
              )}
            </div>
          </div>
        ) : null}

        {value.jar ? (
          <div className="flex min-w-0 items-start gap-4">
            <MilkIcon className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1 space-y-1">
              <Label className="font-semibold">{/*TODO: i18n */ 'Source Jar'}</Label>
              <Badge variant={jarBadgeVariant(value.jar.jarIndex)}>
                {value.jar.name} <span className="text-xs">#{value.jar.jarIndex.toLocaleString('en-US')}</span>
              </Badge>
            </div>
          </div>
        ) : null}

        {value.numberOfRequestedCounterparties ? (
          <div className="flex min-w-0 items-start gap-4">
            <UsersIcon className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1 space-y-1">
              <Label className="font-semibold">{/*TODO: i18n */ 'Request collaborators'}</Label>
              {value.numberOfRequestedCounterparties.toLocaleString('en-US')}
            </div>
          </div>
        ) : null}

        {/*value.__raw.durationSeconds ? (
          <div className="flex min-w-0 items-start gap-4">
            <ClockFadingIcon className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1 space-y-1">
              <Label className="font-semibold">{'Duration'}</Label>
              <span>{value.__raw.durationSeconds}</span>
            </div>
          </div>
        ) : null*/}

        {value.idleTimeoutSeconds ? (
          <div className="flex min-w-0 items-start gap-4">
            <ClockFadingIcon className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1 space-y-1">
              <Label className="font-semibold">{/* TODO: i18n*/ 'Idle Timeout'}</Label>
              {formatDuration(value.idleTimeoutSeconds, t)}
            </div>
          </div>
        ) : null}

        {value.waitTimeInSeconds ? (
          <div className="flex min-w-0 items-start gap-4">
            <TimerResetIcon className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1 space-y-1">
              <Label className="font-semibold">{t('scheduler.progress_entry_wait_before_next_title')}</Label>
              {value.waitTimeInSeconds <= 0 ? '-' : formatDuration(value.waitTimeInSeconds, t)}
            </div>
          </div>
        ) : null}

        {value.externalDestinationAddress ? (
          <div className="col-span-full flex min-w-0 items-start gap-4">
            <ExternalLinkIcon className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <Label className="font-semibold">{/*TODO: i18n */ 'External destination'}</Label>
              <Address value={value.externalDestinationAddress} />
            </div>
          </div>
        ) : null}

        {value.transactionId ? (
          <div className="col-span-full flex min-w-0 items-start gap-4">
            <FingerprintIcon className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <Label className="font-semibold">{/*TODO: i18n */ 'Transaction ID'}</Label>

              <div className="flex items-center gap-2">
                <span className="text-md block font-mono break-all select-all">{value.transactionId}</span>
                <CopyButton
                  value={value.transactionId}
                  text={
                    <>
                      <CopyIcon />
                      {t('global.button_copy_text')}
                    </>
                  }
                  successText={
                    <>
                      <CopyCheckIcon />
                      {t('global.button_copy_text_confirmed')}
                    </>
                  }
                  className={cn(buttonVariants({ variant: 'outline', size: 'xs' }), 'shrink-0')}
                />
              </div>
            </div>
          </div>
        ) : null}
      </ItemContent>
    </Item>
  )
}
