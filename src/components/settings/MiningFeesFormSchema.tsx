import type { TFunction } from 'i18next'
import * as yup from 'yup'
import {
  TX_FEES_FACTOR_MIN,
  TX_FEES_FACTOR_MAX,
  MAX_SWEEP_FEE_CHANGE_MIN,
  MAX_SWEEP_FEE_CHANGE_MAX,
} from '@/constants/jam'
import { txFeeUnit, type TxFeeUnit } from '@/constants/jm'
import { factorToPercentage } from '@/lib/utils'

export type MiningFeesFormValues = {
  feeType: TxFeeUnit
  txFeesBlocks?: number
  txFeesSatsPerVbyte?: number
  txFeesFactorInPercent?: number
  maxSweepFeeChangeInPercent?: number
}

export function miningFeesFormSchema(enableFormValidation: boolean, t: TFunction<'translation', undefined>) {
  if (!enableFormValidation) {
    return yup
      .object({
        feeType: yup.string<TxFeeUnit>().oneOf([txFeeUnit.BLOCKS, txFeeUnit.SATS_PER_KILO_VBYTE]).required(),
        txFeesBlocks: yup.string().default(''),
        txFeesSatsPerVbyte: yup.string().default(''),
        txFeesFactorInPercent: yup.string().default(''),
        maxSweepFeeChange: yup.string().default(''),
      })
      .required()
  }

  const txFeesBlocksMessage = t('settings.fees.feedback_invalid_tx_fees_blocks', {
    min: Number(1).toLocaleString(),
    max: Number(1_000).toLocaleString(),
  })
  const txFeesSatsMessage = t('settings.fees.feedback_invalid_tx_fees_satspervbyte', {
    min: Number(1.001).toLocaleString(),
    max: Number(350).toLocaleString(),
  })
  const txFeesFactorMessage = t('settings.fees.feedback_invalid_tx_fees_factor', {
    min: factorToPercentage(TX_FEES_FACTOR_MIN).toLocaleString(),
    max: factorToPercentage(TX_FEES_FACTOR_MAX).toLocaleString(),
  })
  const maxSweepFeeChangeMessage = t('settings.fees.feedback_invalid_max_sweep_fee_change', {
    min: factorToPercentage(MAX_SWEEP_FEE_CHANGE_MIN).toLocaleString(),
    max: factorToPercentage(MAX_SWEEP_FEE_CHANGE_MAX).toLocaleString(),
  })

  return yup
    .object({
      feeType: yup.string<TxFeeUnit>().oneOf([txFeeUnit.BLOCKS, txFeeUnit.SATS_PER_KILO_VBYTE]).required(),
      txFeesBlocks: yup.number().when('feeType', {
        is: txFeeUnit.BLOCKS,
        then: (schema) =>
          schema
            .integer(txFeesBlocksMessage)
            .transform((value) => (Number.isSafeInteger(value) ? Number(value) : null))
            .min(1, txFeesBlocksMessage)
            .max(1_000, txFeesBlocksMessage)
            .required(txFeesBlocksMessage),
        otherwise: (schema) => schema.nullable().optional(),
      }),
      txFeesSatsPerVbyte: yup.number().when('feeType', {
        is: txFeeUnit.SATS_PER_KILO_VBYTE,
        then: (schema) =>
          schema
            .transform((value) => (Number.isFinite(value) ? Number(value) : null))
            .min(1.001, txFeesSatsMessage)
            .max(350, txFeesSatsMessage)
            .required(txFeesSatsMessage),
        otherwise: (schema) => schema.nullable().optional(),
      }),
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
    .required()
}
