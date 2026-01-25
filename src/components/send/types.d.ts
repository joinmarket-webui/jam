import type { AmountSats, BitcoinAddress, JarIndex } from '@/types/global'

export type TxFeeValue = number
export type TxFee = {
  value?: TxFeeValue
  unit?: TxFeeUnit
}

export type DestinationValue =
  | {
      address: BitcoinAddress
      fromJar: undefined
      displayAddress: undefined
    }
  | {
      address: BitcoinAddress
      fromJar: JarIndex
      displayAddress: string
    }

export type AmountValue =
  | {
      amount: AmountSats
      isSweep: false
      displaySweepAmount: undefined
    }
  | {
      amount: undefined
      isSweep: true
      displaySweepAmount: string
    }

export interface SendFormValues {
  sourceJarIndex?: JarIndex
  destination?: DestinationValue
  amount?: AmountValue
  txFee?: TxFee
  isCoinJoin: boolean
  numCollaborators?: number
}
