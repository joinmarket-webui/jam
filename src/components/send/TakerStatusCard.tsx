import {
  AlertTriangleIcon,
  CheckIcon,
  CoinsIcon,
  CopyIcon,
  FingerprintIcon,
  GoalIcon,
  MilkIcon,
  UsersIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { jarBadgeVariant } from '@/components/ui/badge-variants'
import { Button } from '@/components/ui/button'
import { Address } from '@/components/ui/jam/Address'
import { Balance } from '@/components/ui/jam/Balance'
import { CookingPotIcon } from '@/components/ui/jam/CookingPotIcon'
import type { TakerInfo } from '@/context/JamSessionInfoContext'
import type { Jar } from '@/context/JamWalletInfoContext'
import type { TakerStatus } from '@/lib/takerStatus'
import { cn } from '@/lib/utils'
import { buttonVariants } from '../ui/button-variants'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card'
import { CopyButton } from '../ui/jam/CopyButton'
import { Label } from '../ui/label'

const STATUS_I18N_KEYS: Record<string, string> = {
  idle: 'send.taker_status.status_idle',
  fetching_orderbook: 'send.taker_status.status_fetching_orderbook',
  filling: 'send.taker_status.status_filling',
  authenticating: 'send.taker_status.status_authenticating',
  collecting_signatures: 'send.taker_status.status_collecting_signatures',
  broadcasting: 'send.taker_status.status_broadcasting',
  complete: 'send.taker_status.status_complete',
  failed: 'send.taker_status.status_failed',
  cancelled: 'send.taker_status.status_cancelled',
} satisfies Partial<Record<TakerStatus, string>>

const TakerStatusText = ({ takerInfo }: { takerInfo: TakerInfo }) => {
  const { t } = useTranslation()
  const { value, completedUnverified } = takerInfo.status

  if (value === undefined) {
    // no status reported (yet), e.g. right after start or if not supported by the backend
    return <>{takerInfo.running ? t('send.taker_status.status_idle') : t('send.taker_status.status_unknown')}</>
  }
  if (completedUnverified) {
    return <>{t('send.taker_status.status_complete_unverified')}</>
  }
  const i18nKey = STATUS_I18N_KEYS[value]
  return <>{i18nKey ? t(i18nKey) : t('send.taker_status.status_unmapped', { value })}</>
}

export interface TakerStatusCardProps {
  takerInfo: TakerInfo
  jars: Jar[]
  isAborting: boolean
  onAbort?: () => void
  onDone?: () => void
}

export const TakerStatusCard = ({ takerInfo, jars, isAborting, onAbort, onDone }: TakerStatusCardProps) => {
  const { t } = useTranslation()

  const data = takerInfo.currentPaymentAttempt?.data

  const sourceJar =
    data?.source?.fromJar === undefined ? undefined : jars.find((index) => index.jarIndex === data.source.fromJar)
  const destinationJar =
    data?.destination?.fromJar === undefined
      ? undefined
      : jars.find((index) => index.jarIndex === data.destination.fromJar)

  const txid = takerInfo.__raw?.txid ?? undefined
  const error = takerInfo.__raw?.error ?? undefined
  const hasEndedWithUnknownOutcome = !takerInfo.running && takerInfo.status.value === undefined
  const isActive = takerInfo.running && !takerInfo.status.final
  const hasAdditionalInfo = data !== undefined || !!txid || !!error

  return (
    <>
      <Card
        className={cn('ring-ring/50 ring-2', {
          'ring-muted-foreground': isActive,
          'ring-brand-success': takerInfo.status.completed && !takerInfo.status.completedUnverified,
          'ring-destructive/50': takerInfo.status.failed,
          'ring-brand-warning': takerInfo.status.cancelled || takerInfo.status.completedUnverified,
        })}
      >
        <CardHeader className="mb-4">
          <CardTitle className="text-base">{t('send.taker_status.title')}</CardTitle>
        </CardHeader>
        <CardContent className={cn('flex flex-col gap-2', { 'md:flex-row md:gap-8': hasAdditionalInfo })}>
          <div className="col-span-full flex flex-col items-center justify-center md:col-span-1">
            <CookingPotIcon
              animate={isActive}
              className={isActive ? 'animate-pulse' : undefined}
              sourceJarIndex={data?.source?.fromJar}
              destinationJarIndex={data?.destination?.fromJar}
            />
            <span data-testid="taker-status-text">
              <TakerStatusText takerInfo={takerInfo} />
            </span>
          </div>
          {hasAdditionalInfo && (
            <>
              <div className="grid grid-cols-1 gap-4">
                {data && (
                  <>
                    {sourceJar ? (
                      <div className="flex min-w-0 items-start gap-4">
                        <MilkIcon className="mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1 space-y-1">
                          <Label className="font-semibold">{t('send.confirm_send_modal.label_source_jar')}</Label>
                          <Badge variant={jarBadgeVariant(sourceJar.jarIndex)}>
                            {sourceJar.name} <span className="text-xs">#{sourceJar.jarIndex.toLocaleString()}</span>
                          </Badge>
                        </div>
                      </div>
                    ) : null}

                    <div className="flex min-w-0 items-start gap-4">
                      <CoinsIcon className="mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1 space-y-1">
                        <Label className="font-semibold">
                          {t('send.confirm_send_modal.label_amount')}
                          {data.amount.isSweep ? (
                            <Badge variant="outline" className="text-xs">
                              Sweep
                            </Badge>
                          ) : null}
                        </Label>
                        {data.amount.isSweep ? (
                          <Balance valueString={String(data.amount.sweepAmount)} />
                        ) : (
                          <Balance valueString={String(data.amount.amount)} />
                        )}
                      </div>
                    </div>

                    {data.numCollaborators !== undefined ? (
                      <div className="flex min-w-0 items-start gap-4">
                        <UsersIcon className="mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1 space-y-1">
                          <Label className="font-semibold">
                            {t('send.confirm_send_modal.label_num_collaborators')}
                          </Label>
                          {data.numCollaborators.toLocaleString()}
                        </div>
                      </div>
                    ) : null}

                    <div className="col-span-full flex min-w-0 items-start gap-4">
                      <GoalIcon className="mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1 space-y-1">
                        <Label className="font-semibold">{t('send.confirm_send_modal.label_recipient')}</Label>
                        {destinationJar && (
                          <Badge variant={jarBadgeVariant(destinationJar.jarIndex)}>
                            {destinationJar.name}{' '}
                            <span className="text-xs">#{destinationJar.jarIndex.toLocaleString()}</span>
                          </Badge>
                        )}
                        <Address
                          className="text-muted-foreground font-mono text-xs"
                          value={data.destination.address}
                          copyable={true}
                        />
                      </div>
                    </div>
                  </>
                )}

                {txid && (
                  <>
                    <div className="col-span-full flex min-w-0 items-start gap-4">
                      <FingerprintIcon className="mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <Label className="font-semibold">{t('scheduler.label_transaction_id')}</Label>

                        <div className="flex items-center gap-2">
                          <span className="text-md block font-mono break-all select-all">{txid}</span>
                          <CopyButton
                            value={txid}
                            text={
                              <>
                                <CopyIcon />
                                <span className="sr-only">{t('global.button_copy_text')}</span>
                              </>
                            }
                            successText={
                              <>
                                <CheckIcon />
                                <span className="sr-only">{t('global.button_copy_text_confirmed')}</span>
                              </>
                            }
                            className={cn(buttonVariants({ variant: 'outline', size: 'xs' }), 'shrink-0')}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {error ? (
                  <div className="text-destructive col-span-full flex min-w-0 items-start gap-4">
                    <AlertTriangleIcon className="mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <Label className="font-semibold">{t('global.error')}</Label>
                      {error}
                    </div>
                  </div>
                ) : null}

                {takerInfo.status.completedUnverified ? (
                  <div className="text-muted-foreground col-span-full text-sm">
                    {t('send.taker_status.text_complete_unverified')}
                  </div>
                ) : null}

                {hasEndedWithUnknownOutcome ? (
                  <div className="text-muted-foreground col-span-full text-sm">
                    {t('send.alert_collaborative_stopped_description')}
                  </div>
                ) : null}
              </div>
            </>
          )}
        </CardContent>

        {((onAbort && isActive) || onDone) && (
          <CardFooter className="justify-end gap-2">
            {onAbort && isActive && (
              <Button type="button" variant="ghost" onClick={onAbort} disabled={isAborting}>
                {t('global.abort')}
              </Button>
            )}
            {onDone && (
              <Button type="button" variant="outline" onClick={onDone}>
                {t('global.done')}
              </Button>
            )}
          </CardFooter>
        )}
      </Card>
    </>
  )
}
