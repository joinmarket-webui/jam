import type { TFunction } from 'i18next'
import * as yup from 'yup'
import {
  TX_FEES_FACTOR_MIN,
  TX_FEES_FACTOR_MAX,
  MAX_SWEEP_FEE_CHANGE_MIN,
  MAX_SWEEP_FEE_CHANGE_MAX,
} from '@/constants/jam'
import { factorToPercentage } from '@/lib/utils'
import { createTxFeeFormSchema, type TxFeeFormValues } from '../send/TxFeeForm.schema'

export type MiningFeesFormValues = {
  txFeesFactorInPercent?: number
  maxSweepFeeChangeInPercent?: number
  txFee: TxFeeFormValues['txFee']
}

export function createMiningFeesFormSchema({
  t,
}: {
  t: TFunction<'translation', undefined>
}): yup.ObjectSchema<MiningFeesFormValues> {
  const txFeesFactorMessage = t('settings.fees.feedback_invalid_tx_fees_factor', {
    min: factorToPercentage(TX_FEES_FACTOR_MIN).toLocaleString(),
    max: factorToPercentage(TX_FEES_FACTOR_MAX).toLocaleString(),
  })
  const maxSweepFeeChangeMessage = t('settings.fees.feedback_invalid_max_sweep_fee_change', {
    min: factorToPercentage(MAX_SWEEP_FEE_CHANGE_MIN).toLocaleString(),
    max: factorToPercentage(MAX_SWEEP_FEE_CHANGE_MAX).toLocaleString(),
  })

  return (
    yup
      .object({
        txFeesFactorInPercent: yup
          .number()
          .transform((value) => (Number.isFinite(value) ? Number(value) : null))
          .min(factorToPercentage(TX_FEES_FACTOR_MIN), txFeesFactorMessage)
          .max(factorToPercentage(TX_FEES_FACTOR_MAX), txFeesFactorMessage)
          .required(txFeesFactorMessage),
        maxSweepFeeChangeInPercent: yup
          .number()
          .transform((value) => (Number.isFinite(value) ? Number(value) : null))
          .min(factorToPercentage(MAX_SWEEP_FEE_CHANGE_MIN), maxSweepFeeChangeMessage)
          .max(factorToPercentage(MAX_SWEEP_FEE_CHANGE_MAX), maxSweepFeeChangeMessage)
          .required(maxSweepFeeChangeMessage),
      })
      // eslint-disable-next-line unicorn/prefer-spread -- false positive
      .concat(createTxFeeFormSchema({ t }))
      .required()
  )
}
