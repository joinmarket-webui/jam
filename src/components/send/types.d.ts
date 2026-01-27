import type { AmountSats, BitcoinAddress, JarIndex } from '@/types/global'

export type TxFeeValue = number
export type TxFee = {
  value?: TxFeeValue
  unit?: TxFeeUnit
}

export type SourceValue = {
  fromJar: JarIndex
  displaySource: string
}

export type DestinationValue =
  | {
      address: BitcoinAddress
      displayAddress: string
      fromJar: undefined
    }
  | {
      address: BitcoinAddress
      displayAddress: string
      fromJar: JarIndex
    }

export type AmountValue =
  | {
      amount: AmountSats
      isSweep: false
      sweepAmount: undefined
      displaySweepAmount: undefined
    }
  | {
      amount: undefined
      isSweep: true
      sweepAmount: AmountSats
      displaySweepAmount: string
    }

export interface SendFormValues {
  source?: SourceValue
  destination?: DestinationValue
  amount?: AmountValue
  txFee?: TxFee
  isCoinJoin: boolean
  numCollaborators?: number
}
