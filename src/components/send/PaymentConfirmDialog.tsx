import { useMemo, useState, type ComponentProps, type ReactNode } from 'react'
import { DialogTitle } from '@radix-ui/react-dialog'
import { InfoIcon } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import type { Jar } from '@/context/JamWalletInfoContext'
import type { FeeConfigValues } from '@/hooks/useFeeConfigValidation'
import type { Utxo } from '@/hooks/useQueryUtxos'
import { factorToPercentage, isValidNumber, SATS } from '@/lib/utils'
import type { AmountSats, WithRequiredProperty } from '@/types/global'
import { DevBadge } from '../dev/DevBadge'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader } from '../ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader } from '../ui/dialog'
import { Balance } from '../ui/jam/Balance'
import { Spinner } from '../ui/spinner'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'
import type { SendFormValues } from './types'

type EstimateMaxCollaboraterFeeResult = {
  maxFee: AmountSats
  fractionOfAmount: number
}
const estimateMaxCollaboraterFee = (
  feeConfigValues: FeeConfigValues,
  amount: AmountSats,
  numCollaborators: number,
): EstimateMaxCollaboraterFeeResult => {
  if (feeConfigValues === undefined) {
    throw new Error('Invalid state: Missing fee config values.')
  }
  const maxFeeAbs = Number.parseInt(feeConfigValues?.max_cj_fee_abs || '', 10)
  if (!isValidNumber(maxFeeAbs)) {
    throw new Error('Invalid state: Missing "max_cj_fee_abs" fee config value.')
  }
  const maxFeeRel = Number.parseFloat(feeConfigValues?.max_cj_fee_rel || '')
  if (!isValidNumber(maxFeeRel)) {
    throw new Error('Invalid state: Missing "max_cj_fee_rel" fee config value.')
  }

  const maxFeePerCollaborator: AmountSats = Math.max(Math.ceil(amount * maxFeeRel), maxFeeAbs)
  const maxFee: AmountSats = numCollaborators > 0 ? Math.min(maxFeePerCollaborator * numCollaborators, amount) : 0
  const fractionOfAmount = amount > 0 ? maxFee / amount : 0
  return {
    maxFee,
    fractionOfAmount,
  }
}

const maxCollaboraterFee = (
  feeConfigValues: FeeConfigValues,
  values: SendFormValues,
): EstimateMaxCollaboraterFeeResult | undefined => {
  if (!values.isCoinJoin || values.numCollaborators === undefined) {
    return undefined
  }
  const amount = values.amount?.isSweep === true ? values.amount.sweepAmount : values.amount?.amount
  return !amount ? undefined : estimateMaxCollaboraterFee(feeConfigValues, amount, values.numCollaborators)
}

type PaymentConfirmDialogProps = WithRequiredProperty<
  Omit<ComponentProps<typeof Dialog>, 'children'>,
  'open' | 'onOpenChange'
> & {
  title: string
  subtitle?: ReactNode | string
  onConfirm: (values: SendFormValues) => Promise<void>
  values: SendFormValues
  meta: {
    feeConfigValues?: FeeConfigValues
    availableUtxos?: Utxo[]
    sourceJar: Jar
    destinationJar?: Jar
  }
  debug?: boolean
}

export default function PaymentConfirmDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  onConfirm,
  values,
  meta,
  debug,
}: PaymentConfirmDialogProps) {
  const { t } = useTranslation()

  const [isConfirming, setIsConfirming] = useState(false)

  const estimatedMaxCollaboratorFee = useMemo(() => {
    if (meta.feeConfigValues === undefined) return undefined
    return maxCollaboraterFee(meta.feeConfigValues, values)
  }, [values, meta.feeConfigValues])

  const handleClose = () => {
    onOpenChange(false)
  }

  const confirm = () => {
    setIsConfirming(true)
    onConfirm(values).finally(() => setIsConfirming(false))
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2 font-semibold">{title}</DialogTitle>
          <DialogDescription className="text-center">{subtitle}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 space-y-1 space-x-4 md:grid-cols-5">
          <div className="col-span-1 font-semibold md:text-right">{t('send.confirm_send_modal.label_source_jar')}</div>
          <div className="col-span-4">
            {meta.sourceJar.name} <span className="text-muted-foreground text-xs">#{meta.sourceJar.jarIndex}</span>
          </div>

          <div className="col-span-1 font-semibold md:text-right">{t('send.confirm_send_modal.label_recipient')}</div>
          <div className="col-span-4 flex flex-col">
            {meta.destinationJar !== undefined ? (
              <>
                <span>
                  {meta.destinationJar.name}{' '}
                  <span className="text-muted-foreground text-xs">#{meta.destinationJar.jarIndex}</span>
                </span>
                <span className="text-muted-foreground text-xs">
                  <span className="font-mono break-all select-all">{values.destination?.address}</span>
                </span>
              </>
            ) : (
              <span className="font-mono break-all select-all">{values.destination?.address}</span>
            )}
          </div>

          <div className="col-span-1 font-semibold md:text-right">{t('send.confirm_send_modal.label_amount')}</div>
          <div className="col-span-4 flex items-center gap-1">
            {values.amount?.isSweep ? (
              <>
                <Trans i18nKey="send.confirm_send_modal.text_sweep_balance">
                  Sweep
                  <Balance valueString={String(values.amount?.sweepAmount)} convertToUnit={SATS} showBalance={true} />
                </Trans>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon className="size-4 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>{t('send.confirm_send_modal.text_sweep_info_popover')}</TooltipContent>
                </Tooltip>
              </>
            ) : (
              <Balance valueString={String(values.amount?.amount)} convertToUnit={SATS} showBalance={true} />
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

              <div className="col-span-4 flex items-center gap-1">
                &le;
                <Balance
                  valueString={String(estimatedMaxCollaboratorFee.maxFee)}
                  convertToUnit={SATS}
                  showBalance={true}
                />
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
        </div>

        {debug && (
          <Card className="mt-8 max-h-[200px] overflow-scroll">
            <CardHeader className="grid">
              <DevBadge className="justify-self-end" />
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <div className="overflow-scroll">
                <code className="light:text-red-700 text-red-800">values:</code>
                <pre className="text-xs">{JSON.stringify(values, null, 2)}</pre>
              </div>
              <div className="overflow-scroll">
                <code className="light:text-red-700 text-red-800">meta:</code>
                <pre className="text-xs">{JSON.stringify(meta, null, 2)}</pre>
              </div>
            </CardContent>
          </Card>
        )}

        <DialogFooter className="sm:justify-center">
          <Button className="flex-1" variant="outline" onClick={handleClose}>
            {t('modal.confirm_button_reject')}
          </Button>
          <Button className="flex-1" onClick={confirm} disabled={isConfirming}>
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
