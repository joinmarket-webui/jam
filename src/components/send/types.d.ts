import type { AmountSats, BitcoinAddress, JarIndex } from '@/types/global'
import type { TxFeeFormValues } from './TxFeeForm.schema'

export type SourceValue = {
  fromJar: JarIndex
}

export type DestinationValue = {
  address: BitcoinAddress
  fromJar: JarIndex | undefined
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
  source: SourceValue
  destination: DestinationValue
  amount: AmountValue
  isCoinJoin: boolean
  numCollaborators?: number
  txFee: TxFeeFormValues['txFee']
}
