import type { TFunction } from 'i18next'
import * as yup from 'yup'
import { type TxFeeUnit } from '@/lib/feeConfig'
import { TX_FEE_UNITS } from '@/lib/feeConfig'
import type { JamFeeConfigValues } from '@/lib/feeConfig'
import { isValidInteger, isValidNumber } from '@/lib/utils'

export const MIN_TX_FEE_IN_BLOCKS = 1
export const MAX_TX_FEE_IN_BLOCKS = 1_000

export const MIN_TX_FEE_IN_SATS_PER_VBYTE = 1.001
export const MAX_TX_FEE_IN_SATS_PER_VBYTE = 350

export const toTxFeeFormDefaultValues = (feeConfigValues: JamFeeConfigValues): TxFeeFormValues => {
  return {
    txFee: {
      txFeeUnit: feeConfigValues.txFee.txFeeUnit,
      txFeeInBlocks: feeConfigValues.txFee.txFeeInBlocks,
      txFeeInSatsPerVbyte: feeConfigValues.txFee.txFeeInSatsPerVbyte,
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

export function createTxFeeFormSchema({
  t,
}: {
  t: TFunction<'translation', undefined>
}): yup.ObjectSchema<TxFeeFormValues> {
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
          txFeeUnit: yup.mixed<TxFeeUnit>().oneOf(Object.values(TX_FEE_UNITS)).required(),
          txFeeInBlocks: yup.number().when('txFeeUnit', {
            is: (val: TxFeeUnit) => val === TX_FEE_UNITS.BLOCKS,
            then: (schema) =>
              schema
                .integer(feedbackInvalidTxFeesBlocks)
                .transform((value) => (isValidInteger(value) ? value : null))
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
            is: (val: TxFeeUnit) => val === TX_FEE_UNITS.SATS_PER_VBYTE,
            then: (schema) =>
              schema
                .transform((value) => (isValidNumber(value) ? value : null))
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
