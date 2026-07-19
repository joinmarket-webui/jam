import {
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
import { cn, time } from '@/lib/utils'
import { Badge } from '../ui/badge'
import { jarBadgeVariant } from '../ui/badge-variants'
import { buttonVariants } from '../ui/button-variants'
import { Item, ItemContent, ItemDescription, ItemHeader, ItemTitle } from '../ui/item'
import { Address } from '../ui/jam/Address'
import { CopyButton } from '../ui/jam/CopyButton'
import { Label } from '../ui/label'
import { formatDuration, type ScheduleProgressEntry } from './scheduleUtils'

export const ScheduleProgressEntryItem = ({ value }: { value: ScheduleProgressEntry }) => {
  const { t, i18n } = useTranslation()

  return (
    <Item
      variant="outline"
      className={cn({
        'bg-secondary/80 text-secondary-foreground': !value.step.isActive,
        'bg-muted text-muted-foreground': value.step.isComplete,
        'ring-ring/50 ring-2': value.step.isActive,
      })}
    >
      <ItemHeader>
        <div>
          <ItemTitle>{t('scheduler.progress_entry_label', { index: value.index + 1 })}</ItemTitle>
          <ItemDescription>
            {
              /* TODO: i18n */
              value.__raw.kind === 'taker_coinjoin' ? (
                <Trans
                  i18nKey="A collaborative transaction as <1>taker</1> with {{numberOfRequestedCounterparties}} counterparties"
                  values={{ numberOfRequestedCounterparties: value.__raw.numberOfRequestedCounterparties }}
                  components={{
                    '1': <span className="font-semibold" />,
                  }}
                />
              ) : value.__raw.kind === 'maker_session' ? (
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
          <Badge
            variant={value.step.isActive ? 'outline' : value.step.isComplete ? 'success' : 'muted'}
            className={cn({
              'ring-ring/50 ring-1 motion-safe:animate-pulse': value.step.isActive,
            })}
          >
            {/* TODO: i18n */ value.__raw?.__raw?.status}
          </Badge>
          <Badge
            variant={
              value.__raw.kind === 'taker_coinjoin'
                ? 'default'
                : value.__raw.kind === 'maker_session'
                  ? 'info'
                  : 'outline'
            }
          >
            {
              /* TODO: i18n */ value.__raw.kind === 'taker_coinjoin'
                ? 'Send'
                : value.__raw.kind === 'maker_session'
                  ? 'Earn'
                  : 'outline'
            }
          </Badge>
          {value.__raw?.__raw?.amount === 0 ? <Badge variant="outline">{/* TODO: i18n */ 'Sweep'}</Badge> : null}
        </div>
      </ItemHeader>
      <ItemContent className="grid gap-4 sm:grid-cols-2">
        {value.__raw.startedAt ? (
          <div className="flex min-w-0 items-start gap-4">
            <CalendarClockIcon className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1 space-y-1">
              <Label className="font-semibold">{/*TODO: i18n */ 'Started At'}</Label>
              <span title={value.__raw.startedAt.toISOString()}>{value.__raw.startedAt.toLocaleString()}</span>
            </div>
          </div>
        ) : null}
        {value.__raw.finishedAt ? (
          <div className="flex min-w-0 items-start gap-4">
            <CalendarCheck2Icon className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1 space-y-1">
              <Label className="font-semibold">{/*TODO: i18n */ 'Finished At'}</Label>
              <span title={value.__raw.finishedAt.toISOString()}>{value.__raw.finishedAt.toLocaleString()}</span>
            </div>
          </div>
        ) : null}

        {value.__raw.jar ? (
          <div className="flex min-w-0 items-start gap-4">
            <MilkIcon className="shrink-0" />
            <div className="min-w-0 flex-1">
              <Badge variant={jarBadgeVariant(value.__raw.jar.jarIndex)}>
                {value.__raw.jar.name} <span className="text-xs">#{value.__raw.jar.jarIndex.toLocaleString()}</span>
              </Badge>
            </div>
          </div>
        ) : null}

        {value.__raw.numberOfRequestedCounterparties ? (
          <div className="flex min-w-0 items-start gap-4">
            <UsersIcon className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1 space-y-1">
              <Label className="font-semibold">{/*TODO: i18n */ 'Request collaborators'}</Label>

              {value.__raw.numberOfRequestedCounterparties.toLocaleString()}
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

        {value.__raw.idleTimeoutSeconds ? (
          <div className="flex min-w-0 items-start gap-4">
            <ClockFadingIcon className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1 space-y-1">
              <Label className="font-semibold">{/* TODO: i18n*/ 'Idle Timeout'}</Label>
              {time.humanReadableRelativeTimeInterval(
                value.__raw.idleTimeoutSeconds * 1_000,
                i18n.resolvedLanguage || i18n.language,
              )}
            </div>
          </div>
        ) : null}

        {value.__raw.waitTimeInSeconds ? (
          <div className="flex min-w-0 items-start gap-4">
            <TimerResetIcon className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1 space-y-1">
              <Label className="font-semibold">{t('scheduler.progress_entry_wait_before_next_title')}</Label>
              {value.isLast ? '-' : formatDuration(value.__raw.waitTimeInSeconds, t)}
            </div>
          </div>
        ) : null}

        {value.__raw.__raw?.txid ? (
          <div className="col-span-2 flex min-w-0 items-start gap-4">
            <FingerprintIcon className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <Label className="font-semibold">{/*TODO: i18n */ 'Transaction ID'}</Label>

              <div className="flex items-center gap-2">
                <span className="text-md block font-mono break-all select-all">{value.__raw.__raw.txid}</span>
                <CopyButton
                  value={value.__raw.__raw.txid}
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

        {value.__raw.externalDestinationAddress ? (
          <div className="col-span-2 flex min-w-0 items-start gap-4">
            <ExternalLinkIcon className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <Label className="font-semibold">{/*TODO: i18n */ 'External destination'}</Label>
              <Address value={value.__raw.externalDestinationAddress ?? ' test'} />
            </div>
          </div>
        ) : null}
      </ItemContent>
    </Item>
  )
}
