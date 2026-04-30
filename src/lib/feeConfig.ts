import type { AmountSats, Factor } from '@/types/global'
import { isValidInteger, isValidNumber } from './utils'

export interface JmRawFeeConfigValues {
  max_cj_fee_abs?: string
  max_cj_fee_rel?: string
  tx_fees?: string
  tx_fees_factor?: string
  max_sweep_fee_change?: string
}

export type TxFeeUnit = 'blocks' | 'sats/vbyte'

export const TX_FEE_UNITS = {
  BLOCKS: 'blocks' as TxFeeUnit,
  SATS_PER_VBYTE: 'sats/vbyte' as TxFeeUnit,
}

export interface JamFeeConfigValues {
  maxCjAbsoluteFee?: AmountSats
  maxCjRelativeFee?: Factor
  maxSweepFeeChangeFactor?: Factor
  txFeeFactor?: Factor
  txFee: {
    txFeeUnit: TxFeeUnit
    txFeeInBlocks?: number
    txFeeInSatsPerVbyte?: number
  }
}

export const isMaxFeesConfigMissing = (values: JamFeeConfigValues | undefined): boolean => {
  return !!values && (values.maxCjAbsoluteFee === undefined || values.maxCjRelativeFee === undefined)
}

export const toJamFeeConfigValues = (values: JmRawFeeConfigValues): JamFeeConfigValues => {
  const maxCjAbsoluteFee = Number.parseInt(values.max_cj_fee_abs || '', 10)
  const maxCjRelativeFee = Number.parseFloat(values.max_cj_fee_rel || '')
  const maxSweepFeeChangeFactor = Number.parseFloat(values.max_sweep_fee_change || '')
  const txFeeFactor = Number.parseFloat(values.tx_fees_factor || '')

  const rawTxFeeValue = Number.parseInt(values.tx_fees || '', 10)
  const txFeesInBlocksOrSatsPerKiloVByte = isValidInteger(rawTxFeeValue) ? rawTxFeeValue : undefined
  const txFeeUnit =
    txFeesInBlocksOrSatsPerKiloVByte !== undefined && txFeesInBlocksOrSatsPerKiloVByte > 1_000
      ? TX_FEE_UNITS.SATS_PER_VBYTE
      : TX_FEE_UNITS.BLOCKS

  const txFeeInBlocks = txFeeUnit === TX_FEE_UNITS.BLOCKS ? txFeesInBlocksOrSatsPerKiloVByte : undefined
  const txFeeInSatsPerVbyte =
    txFeeUnit === TX_FEE_UNITS.SATS_PER_VBYTE ? txFeesInBlocksOrSatsPerKiloVByte! / 1_000 : undefined

  return {
    maxCjAbsoluteFee: isValidInteger(maxCjAbsoluteFee) ? maxCjAbsoluteFee : undefined,
    maxCjRelativeFee: isValidNumber(maxCjRelativeFee) ? maxCjRelativeFee : undefined,
    txFeeFactor: isValidNumber(txFeeFactor) ? txFeeFactor : undefined,
    maxSweepFeeChangeFactor: isValidNumber(maxSweepFeeChangeFactor) ? maxSweepFeeChangeFactor : undefined,
    txFee: {
      txFeeUnit,
      txFeeInBlocks,
      txFeeInSatsPerVbyte,
    },
  }
}
