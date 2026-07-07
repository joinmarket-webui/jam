import { useMemo, useState, type ComponentProps } from 'react'
import { DialogTitle } from '@radix-ui/react-dialog'
import { InfoIcon } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { getJarBadgeVariant } from '@/components/ui/badge-variants'
import type { Jar } from '@/context/JamWalletInfoContext'
import type { Utxo } from '@/hooks/useQueryUtxos'
import type { JamFeeConfigValues } from '@/lib/feeConfig'
import { factorToPercentage } from '@/lib/utils'
import type { WithRequiredProperty } from '@/types/global'
import { DevBadge } from '../dev/DevBadge'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader } from '../ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader } from '../ui/dialog'
import { Address } from '../ui/jam/Address'
import { Balance } from '../ui/jam/Balance'
import { Spinner } from '../ui/spinner'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'
import { estimateMaxCollaboratorFee, useMiningFeeText, type EstimateMaxCollaboratorFeeResult } from './feeEstimate'
import type { SendFormValues } from './types'

const maxCollaboraterFee = (
  feeConfigValues: JamFeeConfigValues,
  values: SendFormValues,
): EstimateMaxCollaboratorFeeResult | undefined => {
  if (!values.isCoinJoin || values.numCollaborators === undefined) {
    return undefined
  }
  const amount = values.amount?.isSweep === true ? values.amount.sweepAmount : values.amount?.amount
  return !amount ? undefined : estimateMaxCollaboratorFee(feeConfigValues, amount, values.numCollaborators)
}

type PaymentConfirmDialogProps = WithRequiredProperty<
  Omit<ComponentProps<typeof Dialog>, 'children'>,
  'open' | 'onOpenChange'
> & {
  onConfirm: (values: SendFormValues) => Promise<void>
  values: SendFormValues
  meta: {
    feeConfigValues: JamFeeConfigValues
    availableUtxos?: Utxo[]
    sourceJar: Jar
    destinationJar?: Jar
  }
  debug?: boolean
}

export default function PaymentConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  values,
  meta,
  debug,
  ...dialogProps
}: PaymentConfirmDialogProps) {
  const { t } = useTranslation()

  const [isConfirming, setIsConfirming] = useState(false)

  const estimatedMaxCollaboratorFee = useMemo(() => {
    return maxCollaboraterFee(meta.feeConfigValues, values)
  }, [values, meta.feeConfigValues])

  const miningFeeText = useMiningFeeText({
    feeConfigValues: {
      txFeeFactor: meta.feeConfigValues.txFeeFactor || 0,
      txFee: {
        txFeeUnit: values.txFee.txFeeUnit,
        txFeeInBlocks: values.txFee.txFeeInBlocks,
        txFeeInSatsPerVbyte: values.txFee.txFeeInSatsPerVbyte,
      },
    },
    t,
  })

  const handleClose = () => {
    onOpenChange(false)
  }

  const confirm = async () => {
    setIsConfirming(true)
    try {
      await onConfirm(values)
    } finally {
      setIsConfirming(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose} {...dialogProps}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center justify-center gap-2 text-center font-semibold">
            {t('send.confirm_send_modal.title')}
          </DialogTitle>
          <DialogDescription className="text-center">
            {values.isCoinJoin === true ? (
              <span className="text-brand-success/80 font-semibold">
                {t('send.confirm_send_modal.text_collaborative_tx_enabled')}
              </span>
            ) : (
              <span className="text-destructive font-semibold">
                {t('send.confirm_send_modal.text_collaborative_tx_disabled')}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-5">
          <div className="col-span-1 font-semibold md:text-right">{t('send.confirm_send_modal.label_source_jar')}</div>
          <div className="col-span-4">
            <Badge variant={getJarBadgeVariant(meta.sourceJar.jarIndex)}>
              {meta.sourceJar.name} <span>#{meta.sourceJar.jarIndex}</span>
            </Badge>
          </div>

          <div className="col-span-1 font-semibold md:text-right">{t('send.confirm_send_modal.label_recipient')}</div>
          <div className="col-span-4 flex flex-col">
            {meta.destinationJar !== undefined ? (
              <>
                <div>
                  <Badge variant={getJarBadgeVariant(meta.destinationJar.jarIndex)}>
                    {meta.destinationJar.name} <span>#{meta.destinationJar.jarIndex}</span>
                  </Badge>
                </div>
                <Address
                  className="text-muted-foreground text-xs"
                  value={values.destination?.address ?? ''}
                  copyable={true}
                />
              </>
            ) : (
              <Address value={values.destination?.address ?? ''} copyable={true} />
            )}
          </div>

          <div className="col-span-1 font-semibold md:text-right">{t('send.confirm_send_modal.label_amount')}</div>
          <div className="col-span-4 flex flex-wrap items-center gap-1">
            {values.amount?.isSweep ? (
              <>
                <Trans i18nKey="send.confirm_send_modal.text_sweep_balance">
                  Sweep
                  <Balance valueString={String(values.amount?.sweepAmount)} />
                </Trans>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon className="size-4 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>{t('send.confirm_send_modal.text_sweep_info_popover')}</TooltipContent>
                </Tooltip>
              </>
            ) : (
              <Balance valueString={String(values.amount?.amount)} />
            )}
          </div>
          {values.numCollaborators !== undefined && (
            <>
              <div className="col-span-1 font-semibold md:text-right">
                {t('send.confirm_send_modal.label_num_collaborators')}
              </div>
              <div className="col-span-4">{values.numCollaborators}</div>
            </>
          )}

          {estimatedMaxCollaboratorFee !== undefined && (
            <>
              <div className="col-span-1 font-semibold md:text-right">
                {t('send.confirm_send_modal.label_estimated_max_collaborator_fee')}
              </div>

              <div className="col-span-4 flex flex-wrap items-center gap-1">
                &le;
                <Balance valueString={String(estimatedMaxCollaboratorFee.maxFee)} showBalance={true} />
                <span className="text-muted-foreground text-xs">
                  ({factorToPercentage(estimatedMaxCollaboratorFee.fractionOfAmount)}%)
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon className="size-4 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    {t('send.confirm_send_modal.text_estimated_max_collaborator_fee_info_popover')}
                  </TooltipContent>
                </Tooltip>
              </div>
            </>
          )}

          {miningFeeText && (
            <>
              <div className="col-span-1 font-semibold md:text-right">
                {t('send.confirm_send_modal.label_miner_fee')}
              </div>
              <div className="col-span-4">{miningFeeText}</div>
            </>
          )}
        </div>

        {debug && (
          <Card className="mt-8 max-h-[200px] overflow-scroll">
            <CardHeader className="grid">
              <DevBadge className="justify-self-end" />
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <div className="overflow-scroll">
                <code className="text-destructive">values:</code>
                <pre className="text-xs">{JSON.stringify(values, null, 2)}</pre>
              </div>
              <div className="overflow-scroll">
                <code className="text-destructive">meta:</code>
                <pre className="text-xs">{JSON.stringify(meta, null, 2)}</pre>
              </div>
            </CardContent>
          </Card>
        )}

        <DialogFooter className="gap-3 sm:justify-center">
          <Button className="min-h-12 flex-1 text-base" variant="outline" size="xxl" onClick={handleClose}>
            {t('modal.confirm_button_reject')}
          </Button>
          <Button
            className="min-h-12 flex-1 text-base"
            size="xxl"
            onClick={() => void confirm()}
            disabled={isConfirming}
          >
            {isConfirming ? (
              <>
                <Spinner className="motion-reduce:hidden" />
                {t('modal.confirm_button_accept')}
              </>
            ) : (
              <>{t('modal.confirm_button_accept')}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
