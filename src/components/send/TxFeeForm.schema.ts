import type { TFunction } from 'i18next'
import * as yup from 'yup'
import { txFeeUnit, type TxFeeUnit } from '@/constants/jm'
import type { FeeConfigValues } from '@/lib/feeConfig'
import { toTxFee } from './feeEstimate'

export const MIN_TX_FEE_IN_BLOCKS = 1
export const MAX_TX_FEE_IN_BLOCKS = 1_000

export const MIN_TX_FEE_IN_SATS_PER_VBYTE = 1.001
export const MAX_TX_FEE_IN_SATS_PER_VBYTE = 350

export const toTxFeeFormDefaultValues = (feeConfigValues: FeeConfigValues): TxFeeFormValues => {
  const txFee = toTxFee(feeConfigValues)
  return {
    txFee: {
      txFeeUnit: txFee.unit,
      txFeeInBlocks: txFee.unit === txFeeUnit.BLOCKS ? txFee.value : undefined,
      txFeeInSatsPerVbyte: txFee.unit === txFeeUnit.SATS_PER_KILO_VBYTE ? txFee.value / 1_000 : undefined,
    },
  }
}

export interface TxFeeFormValues {
  txFee: {
    txFeeUnit: TxFeeUnit
    txFeeInBlocks?: number
    txFeeInSatsPerVbyte?: number
  }
}

export function createTxFeeFormSchema(t: TFunction): yup.ObjectSchema<TxFeeFormValues> {
  const feedbackInvalidTxFeesBlocks = t('settings.fees.feedback_invalid_tx_fees_blocks', {
    min: MIN_TX_FEE_IN_BLOCKS,
    max: MAX_TX_FEE_IN_BLOCKS,
  })
  const feedbackInvalidTxFeeInSatsPerVbyte = t('settings.fees.feedback_invalid_tx_fees_satspervbyte', {
    min: MIN_TX_FEE_IN_SATS_PER_VBYTE,
    max: MAX_TX_FEE_IN_SATS_PER_VBYTE,
  })

  return yup
    .object({
      txFee: yup
        .object({
          txFeeUnit: yup.mixed<TxFeeUnit>().oneOf(Object.values(txFeeUnit)).required(),
          txFeeInBlocks: yup.number().when('txFeeUnit', {
            is: (val: TxFeeUnit) => val === 'blocks',
            then: (schema) =>
              schema
                .integer(feedbackInvalidTxFeesBlocks)
                .transform((value) => (Number.isSafeInteger(value) ? Number(value) : null))
                .min(MIN_TX_FEE_IN_BLOCKS, feedbackInvalidTxFeesBlocks)
                .max(MAX_TX_FEE_IN_BLOCKS, feedbackInvalidTxFeesBlocks)
                .required(feedbackInvalidTxFeesBlocks),
            otherwise: (schema) =>
              schema
                .transform(() => null)
                .nullable()
                .optional(),
          }),
          txFeeInSatsPerVbyte: yup.number().when('txFeeUnit', {
            is: (val: TxFeeUnit) => val === 'sats/kilo-vbyte',
            then: (schema) =>
              schema
                .transform((value) => (Number.isFinite(value) ? Number(value) : null))
                .min(MIN_TX_FEE_IN_SATS_PER_VBYTE, feedbackInvalidTxFeeInSatsPerVbyte)
                .max(MAX_TX_FEE_IN_SATS_PER_VBYTE, feedbackInvalidTxFeeInSatsPerVbyte)
                .required(feedbackInvalidTxFeeInSatsPerVbyte),
            otherwise: (schema) =>
              schema
                .transform(() => null)
                .nullable()
                .optional(),
          }),
        })
        .required(),
    })
    .required()
}
