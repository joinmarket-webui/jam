import { useMemo, type ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { jarBadgeVariant } from '@/components/ui/badge-variants'
import { Address } from '@/components/ui/jam/Address'
import { Balance } from '@/components/ui/jam/Balance'
import type { PaymentAttempt } from '@/context/JamSessionInfoContext'
import type { Jar } from '@/context/JamWalletInfoContext'
import type { WithRequiredProperty } from '@/types/global'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Spinner } from '../ui/spinner'

type PaymentAbortDialogProps = WithRequiredProperty<
  Omit<ComponentProps<typeof Dialog>, 'children'>,
  'open' | 'onOpenChange'
> & {
  isConfirming: boolean
  onConfirm: () => Promise<void>
  paymentAttempt?: PaymentAttempt
  jars?: Jar[]
}

export const PaymentAbortDialog = ({
  open,
  onOpenChange,
  isConfirming,
  onConfirm,
  paymentAttempt,
  jars = [],
  ...dialogProps
}: PaymentAbortDialogProps) => {
  const { t } = useTranslation()

  const data = paymentAttempt?.data

  const sourceJar = useMemo(() => {
    if (data?.source?.fromJar === undefined) return undefined
    return jars.find((jar) => jar.jarIndex === data.source.fromJar)
  }, [jars, data])

  const destinationJar = useMemo(() => {
    if (data?.destination?.fromJar === undefined) return undefined
    return jars.find((jar) => jar.jarIndex === data.destination.fromJar)
  }, [jars, data])

  const amountInSats = data?.amount.isSweep ? data.amount.sweepAmount : data?.amount.amount

  return (
    <Dialog open={open} onOpenChange={onOpenChange} {...dialogProps}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('send.confirm_abort_modal.title')}</DialogTitle>
          <DialogDescription>{t('send.confirm_abort_modal.text_body')}</DialogDescription>
        </DialogHeader>

        {data && (
          <div className="bg-muted/40 space-y-3 rounded-lg border p-4 text-sm">
            {sourceJar && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground font-medium">
                  {t('send.confirm_send_modal.label_source_jar')}
                </span>
                <Badge variant={jarBadgeVariant(sourceJar.jarIndex)}>
                  {sourceJar.name} <span className="text-xs">#{sourceJar.jarIndex.toLocaleString()}</span>
                </Badge>
              </div>
            )}

            {amountInSats !== undefined && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground font-medium">
                  {t('send.confirm_send_modal.label_amount')}
                  {data.amount.isSweep && (
                    <Badge variant="outline" className="ml-1.5 text-xs">
                      Sweep
                    </Badge>
                  )}
                </span>
                <span className="font-semibold">
                  <Balance valueString={String(amountInSats)} />
                </span>
              </div>
            )}

            {(destinationJar || data.destination?.address) && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground block text-xs font-semibold tracking-wider uppercase">
                    {t('send.confirm_send_modal.label_recipient')}
                  </span>
                  {destinationJar && (
                    <Badge variant={jarBadgeVariant(destinationJar.jarIndex)}>
                      {destinationJar.name} <span className="text-xs">#{destinationJar.jarIndex.toLocaleString()}</span>
                    </Badge>
                  )}
                </div>
                {data.destination?.address && (
                  <div className="bg-background/80 flex items-center justify-between rounded border p-2">
                    <Address className="text-xs" value={data.destination.address} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isConfirming}>
            {t('modal.confirm_button_reject')}
          </Button>
          <Button variant="destructive" onClick={() => void onConfirm()} disabled={isConfirming}>
            {isConfirming ? (
              <>
                <Spinner className="motion-reduce:hidden" />
                {t('global.abort')}
              </>
            ) : (
              t('global.abort')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
