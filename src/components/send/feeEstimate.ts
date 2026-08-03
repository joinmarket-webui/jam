import { useMemo } from 'react'
import type { TFunction } from 'i18next'
import { TX_FEE_UNITS } from '@/lib/feeConfig'
import type { JamFeeConfigValues } from '@/lib/feeConfig'
import type { AmountSats } from '@/types/global'

export type EstimateMaxCollaboratorFeeResult = {
  maxFee: AmountSats
  fractionOfAmount: number
}

export const estimateMaxCollaboratorFee = (
  feeConfigValues: JamFeeConfigValues,
  amount: AmountSats,
  numberOfCollaborators: number,
): EstimateMaxCollaboratorFeeResult => {
  if (feeConfigValues.maxCjAbsoluteFee === undefined) {
    throw new TypeError('Invalid state: Missing "max_cj_fee_abs" fee config value.')
  }
  if (feeConfigValues.maxCjRelativeFee === undefined) {
    throw new TypeError('Invalid state: Missing "max_cj_fee_rel" fee config value.')
  }

  const maxFeePerCollaborator: AmountSats = Math.max(
    Math.ceil(amount * feeConfigValues.maxCjRelativeFee),
    feeConfigValues.maxCjAbsoluteFee,
  )
  const maxFee: AmountSats =
    numberOfCollaborators > 0 ? Math.min(maxFeePerCollaborator * numberOfCollaborators, amount) : 0
  const fractionOfAmount = amount > 0 ? maxFee / amount : 0

  return {
    maxFee,
    fractionOfAmount,
  }
}

const feeRange: (feeConfigValues: Required<Pick<JamFeeConfigValues, 'txFee' | 'txFeeFactor'>>) => [number, number] = (
  feeConfigValues,
) => {
  if (feeConfigValues.txFee.txFeeUnit !== TX_FEE_UNITS.SATS_PER_VBYTE) {
    throw new Error('This function can only be used with unit `sats/vbyte`')
  }
  const minFeeSatsPerVByte = Math.max(1, feeConfigValues.txFee.txFeeInSatsPerVbyte!)
  const maxFeeSatsPerVByte = feeConfigValues.txFee.txFeeInSatsPerVbyte! * (1 + feeConfigValues.txFeeFactor)
  return [minFeeSatsPerVByte, maxFeeSatsPerVByte]
}

export const useMiningFeeText = ({
  feeConfigValues,
  t,
}: {
  feeConfigValues: Required<Pick<JamFeeConfigValues, 'txFee' | 'txFeeFactor'>>
  t: TFunction
}) => {
  return useMemo(() => {
    if (feeConfigValues.txFee.txFeeUnit === TX_FEE_UNITS.BLOCKS) {
      return t('send.confirm_send_modal.text_miner_fee_in_targeted_blocks', {
        count: feeConfigValues.txFee.txFeeInBlocks,
      })
    } else {
      const [minFeeSatsPerVByte, maxFeeSatsPerVByte] = feeRange(feeConfigValues)
      const fractionDigits = 2

      if (minFeeSatsPerVByte.toFixed(fractionDigits) === maxFeeSatsPerVByte.toFixed(fractionDigits)) {
        return t('send.confirm_send_modal.text_miner_fee_in_satspervbyte_exact', {
          value: minFeeSatsPerVByte.toLocaleString(undefined, {
            maximumFractionDigits: Math.log10(1_000),
          }),
        })
      }

      return t('send.confirm_send_modal.text_miner_fee_in_satspervbyte_randomized', {
        min: minFeeSatsPerVByte.toLocaleString(undefined, {
          maximumFractionDigits: fractionDigits,
        }),
        max: maxFeeSatsPerVByte.toLocaleString(undefined, {
          maximumFractionDigits: fractionDigits,
        }),
      })
    }
  }, [t, feeConfigValues])
}
