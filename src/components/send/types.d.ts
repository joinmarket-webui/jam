import type { AmountSats, BitcoinAddress, JarIndex } from '@/types/global'

export type TxFeeValue = number
export type TxFee = {
  value?: TxFeeValue
  unit?: TxFeeUnit
}

export type SourceValue = {
  fromJar: JarIndex
}

export type DestinationValue =
  | {
      address: BitcoinAddress
      fromJar: undefined
    }
  | {
      address: BitcoinAddress
      fromJar: JarIndex
    }

export type AmountValue =
  | {
      amount: AmountSats
      isSweep: false
      sweepAmount: undefined
    }
  | {
      amount: undefined
      isSweep: true
      sweepAmount: AmountSats
    }

export interface SendFormValues {
  source?: SourceValue
  destination?: DestinationValue
  amount?: AmountValue
  txFee?: TxFee
  isCoinJoin: boolean
  numCollaborators?: number
}
