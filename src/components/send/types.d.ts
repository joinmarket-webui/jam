import type { AmountSats, BitcoinAddress, JarIndex } from '@/types/global'

export type TxFeeValue = number
export type TxFee = {
  value?: TxFeeValue
  unit?: TxFeeUnit
}

export type DestinationValue = {
  value: BitcoinAddress
  fromJar?: JarIndex
}

export type AmountValue =
  | {
      value: AmountSats
    }
  | {
      //displayValue: AmountSats
      isSweep: true
    }

export interface SendFormValues {
  sourceJarIndex?: JarIndex
  destination?: DestinationValue
  amount?: AmountValue
  txFee?: TxFee
  isCoinJoin: boolean
  numCollaborators?: number
}
