import { useMemo } from 'react'
import { MilkIcon, UsersIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { jarBadgeVariant } from '@/components/ui/badge-variants'
import { Button } from '@/components/ui/button'
import { Address } from '@/components/ui/jam/Address'
import { Balance } from '@/components/ui/jam/Balance'
import { CookingPotIcon } from '@/components/ui/jam/CookingPotIcon'
import type { PaymentAttempt } from '@/context/JamSessionInfoContext'
import type { Jar } from '@/context/JamWalletInfoContext'
import { cn } from '@/lib/utils'
import { Item, ItemActions, ItemContent, ItemDescription, ItemFooter, ItemHeader, ItemTitle } from '../ui/item'
import { Label } from '../ui/label'

export interface ActiveCollaborativeSendAlertProps {
  paymentAttempt?: PaymentAttempt
  jars: Jar[]
  isAborting: boolean
  onAbort: () => void
}

export const ActiveCollaborativeSendAlert = ({
  paymentAttempt,
  jars,
  isAborting,
  onAbort,
}: ActiveCollaborativeSendAlertProps) => {
  const { t } = useTranslation()

  const data = paymentAttempt?.data

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
      <Item
        variant="outline"
        className={cn({
          //'ring-brand-success ring-1': value.status.completed,
          //'ring-destructive ring-1': value.status.failed,
          'ring-ring/50 ring-2': true,
        })}
      >
        <ItemHeader className="mb-4">
          <div>
            <ItemTitle className="text-base">{t('send.text_coinjoin_already_running')}</ItemTitle>
            <ItemDescription></ItemDescription>
          </div>
        </ItemHeader>

        <ItemContent className="flex flex-col gap-2 md:flex-row md:gap-8">
          <div className="col-span-full flex justify-center md:col-span-1">
            <CookingPotIcon
              className="animate-pulse"
              sourceJarIndex={data?.source?.fromJar}
              destinationJarIndex={data?.destination?.fromJar}
            />
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
                  <UsersIcon className="mt-0.5 shrink-0" />
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
                  <UsersIcon className="mt-0.5 shrink-0" />
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
        </ItemContent>

        <ItemFooter>
          <ItemActions>
            <Button type="button" variant="destructive" onClick={onAbort} disabled={isAborting}>
              {t('global.abort')}
            </Button>
          </ItemActions>
        </ItemFooter>
      </Item>
    </>
  )
}
