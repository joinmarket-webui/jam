import { useMemo } from 'react'
import { CoinsIcon, GoalIcon, MilkIcon, UsersIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { jarBadgeVariant } from '@/components/ui/badge-variants'
import { Button } from '@/components/ui/button'
import { Address } from '@/components/ui/jam/Address'
import { Balance } from '@/components/ui/jam/Balance'
import { CookingPotIcon } from '@/components/ui/jam/CookingPotIcon'
import type { TakerInfo } from '@/context/JamSessionInfoContext'
import type { Jar } from '@/context/JamWalletInfoContext'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card'
import { Label } from '../ui/label'

export interface ActiveCollaborativeSendAlertProps {
  takerInfo: TakerInfo
  jars: Jar[]
  isAborting: boolean
  onAbort?: () => void
}

export const ActiveCollaborativeSendAlert = ({
  takerInfo,
  jars,
  isAborting,
  onAbort,
}: ActiveCollaborativeSendAlertProps) => {
  const { t } = useTranslation()

  const data = takerInfo.currentPaymentAttempt?.data

  const sourceJar = useMemo(() => {
    if (data?.source?.fromJar === undefined) return undefined
    return jars.find((index) => index.jarIndex === data.source.fromJar)
  }, [jars, data])

  const destinationJar = useMemo(() => {
    if (data?.destination?.fromJar === undefined) return undefined
    return jars.find((index) => index.jarIndex === data.destination.fromJar)
  }, [jars, data])

  return (
    <>
      <Card
        className={cn('ring-ring/50 ring-2', {
          'ring-mute-foreground': takerInfo.running,
          'ring-brand-success': takerInfo.status.completed,
          'ring-destructive/50': takerInfo.status.failed,
          'ring-brand-warning': takerInfo.status.cancelled,
        })}
      >
        <CardHeader className="mb-4">
          <CardTitle className="text-base">
            {takerInfo.running ? t('send.text_coinjoin_already_running') : t('send.alert_collaborative_stopped_title')}
          </CardTitle>
        </CardHeader>
        <CardContent className={cn('flex flex-col gap-2', { 'md:flex-row md:gap-8': data !== undefined })}>
          <div className="col-span-full flex flex-col items-center justify-center md:col-span-1">
            <CookingPotIcon
              animate={takerInfo.running}
              className={takerInfo.running ? 'animate-pulse' : undefined}
              sourceJarIndex={data?.source?.fromJar}
              destinationJarIndex={data?.destination?.fromJar}
            />
            {takerInfo.status.value}
          </div>
          {data && (
            <>
              <div className="grid grid-cols-1 gap-4">
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
                      <Label className="font-semibold">{t('send.confirm_send_modal.label_num_collaborators')}</Label>
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
              </div>
            </>
          )}
        </CardContent>

        <CardFooter className="justify-end">
          {onAbort && (
            <Button type="button" variant="ghost" onClick={onAbort} disabled={isAborting}>
              {t('global.abort')}
            </Button>
          )}
        </CardFooter>
      </Card>
    </>
  )
}
