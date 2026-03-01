import type { FeeConfigValues } from '@/hooks/useFeeConfigValidation'
import type { AmountSats } from '@/types/global'

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
  if (!Number.isFinite(maxAbsoluteFee)) {
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
