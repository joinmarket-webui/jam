import { useMemo } from 'react'
import type { TFunction } from 'i18next'
import { txFeeUnit } from '@/constants/jm'
import type { FeeConfigValues } from '@/hooks/useFeeConfigValidation'
import { isValidNumber } from '@/lib/utils'
import type { AmountSats } from '@/types/global'
import type { TxFee } from './types'

export type EstimateMaxCollaboratorFeeResult = {
  maxFee: AmountSats
  fractionOfAmount: number
}

export const estimateMaxCollaboratorFee = (
  feeConfigValues: FeeConfigValues,
  amount: AmountSats,
  numberOfCollaborators: number,
): EstimateMaxCollaboratorFeeResult => {
  if (feeConfigValues === undefined) {
    throw new Error('Invalid state: Missing fee config values.')
  }
  const maxAbsoluteFee = Number.parseInt(feeConfigValues.max_cj_fee_abs || '', 10)
  if (!Number.isSafeInteger(maxAbsoluteFee)) {
    throw new TypeError('Invalid state: Missing "max_cj_fee_abs" fee config value.')
  }
  const maxRelativeFee = Number.parseFloat(feeConfigValues.max_cj_fee_rel || '')
  if (!Number.isFinite(maxRelativeFee)) {
    throw new TypeError('Invalid state: Missing "max_cj_fee_rel" fee config value.')
  }

  const maxFeePerCollaborator: AmountSats = Math.max(Math.ceil(amount * maxRelativeFee), maxAbsoluteFee)
  const maxFee: AmountSats =
    numberOfCollaborators > 0 ? Math.min(maxFeePerCollaborator * numberOfCollaborators, amount) : 0
  const fractionOfAmount = amount > 0 ? maxFee / amount : 0

  return {
    maxFee,
    fractionOfAmount,
  }
}

export const feeRange: (txFee: TxFee, txFeeFactor: number) => [number, number] = (txFee, txFeeFactor) => {
  if (txFee.unit !== txFeeUnit.SATS_PER_KILO_VBYTE) {
    throw new Error('This function can only be used with unit `sats/kilo-vbyte`')
  }
  const satsPerVByte = txFee.value / 1_000
  const minFeeSatsPerVByte = Math.max(1, satsPerVByte)
  const maxFeeSatsPerVByte = satsPerVByte * (1 + txFeeFactor)
  return [minFeeSatsPerVByte, maxFeeSatsPerVByte]
}

export const toTxFee = (feeConfigValues: FeeConfigValues): TxFee => {
  const value = Number.parseInt(feeConfigValues.tx_fees || '', 10)
  const unit = value >= 1_001 ? txFeeUnit.SATS_PER_KILO_VBYTE : txFeeUnit.BLOCKS
  return { unit, value }
}

export const useMiningFeeText = ({
  tx_fees,
  tx_fees_factor,
  t,
}: {
  tx_fees: TxFee
  tx_fees_factor?: number
  t: TFunction
}) => {
  return useMemo(() => {
    if (!isValidNumber(tx_fees.value) || !isValidNumber(tx_fees_factor)) return null

    if (tx_fees.unit === txFeeUnit.BLOCKS) {
      return t('send.confirm_send_modal.text_miner_fee_in_targeted_blocks', { count: tx_fees.value })
    } else {
      const [minFeeSatsPerVByte, maxFeeSatsPerVByte] = feeRange(tx_fees, tx_fees_factor)
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
  }, [t, tx_fees, tx_fees_factor])
}
