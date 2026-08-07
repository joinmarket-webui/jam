import { useMemo } from 'react'
import { UsersIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { jarBadgeVariant } from '@/components/ui/badge-variants'
import { Button } from '@/components/ui/button'
import { Address } from '@/components/ui/jam/Address'
import { Balance } from '@/components/ui/jam/Balance'
import { CookingPotIcon } from '@/components/ui/jam/CookingPotIcon'
import type { PaymentAttempt } from '@/context/JamSessionInfoContext'
import type { Jar } from '@/context/JamWalletInfoContext'

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
    <Alert variant="warning" className="motion-safe:animate-in blur-in p-4 md:p-6">
      <div className="mb-4 flex items-center gap-2.5">
        <AlertTitle className="text-base">{t('send.text_coinjoin_already_running')}</AlertTitle>
      </div>

      <AlertDescription className="mt-2">
        <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
          <div className="border-border/40 flex justify-center border-b pb-4 lg:col-span-3 lg:border-r lg:border-b-0 lg:pr-6 lg:pb-0">
            <CookingPotIcon
              className="animate-pulse"
              sourceJarIndex={data?.source?.fromJar}
              destinationJarIndex={data?.destination?.fromJar}
            />
          </div>

          <div className="space-y-4 lg:col-span-9">
            {data && (
              <div className="border-border/50 bg-card/60 overflow-hidden rounded-xl border p-4 shadow-xs md:p-5">
                <div className="grid grid-cols-[110px_1fr] items-center gap-x-3 gap-y-3.5 text-sm">
                  <span className="text-muted-foreground font-medium">
                    {t('send.confirm_send_modal.label_source_jar')}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant={jarBadgeVariant(sourceJar?.jarIndex ?? data.source.fromJar)}>
                      {sourceJar?.name ? (
                        <>
                          {sourceJar.name} <span>#{sourceJar.jarIndex}</span>
                        </>
                      ) : (
                        <span>Jar #{data.source.fromJar}</span>
                      )}
                    </Badge>
                  </div>

                  <span className="text-muted-foreground font-medium">
                    {t('send.confirm_send_modal.label_recipient')}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {destinationJar !== undefined && (
                      <Badge variant={jarBadgeVariant(destinationJar.jarIndex)}>
                        {destinationJar.name ? (
                          <>
                            {destinationJar.name} <span>#{destinationJar.jarIndex}</span>
                          </>
                        ) : (
                          <span>Jar #{destinationJar.jarIndex}</span>
                        )}
                      </Badge>
                    )}
                    {data.destination.address ? (
                      <Address
                        className="text-muted-foreground font-mono text-xs"
                        value={data.destination.address}
                        copyable={true}
                      />
                    ) : (
                      destinationJar === undefined && <span className="text-muted-foreground">-</span>
                    )}
                  </div>

                  <span className="text-muted-foreground font-medium">{t('send.confirm_send_modal.label_amount')}</span>
                  <div className="flex flex-col gap-2 font-medium sm:flex-row sm:items-center">
                    {data.amount.isSweep ? (
                      <>
                        <Badge
                          variant="outline"
                          className="border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-600 dark:text-amber-400"
                        >
                          Sweep
                        </Badge>
                        <Balance valueString={String(data.amount.sweepAmount ?? 0)} />
                      </>
                    ) : (
                      <Balance valueString={String(data.amount.amount)} />
                    )}
                  </div>

                  {data.numCollaborators !== undefined && (
                    <>
                      <span className="text-muted-foreground font-medium">
                        {t('send.confirm_send_modal.label_num_collaborators')}
                      </span>
                      <div className="flex items-center gap-1.5 font-medium">
                        <UsersIcon className="text-muted-foreground size-4 shrink-0" />
                        <span>{data.numCollaborators}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
            <div className="pt-1">
              <Button variant="outline" onClick={onAbort} disabled={isAborting}>
                {t('global.abort')}
              </Button>
            </div>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  )
}
