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
      sweepUtxos: undefined
    }
  | {
      amount: undefined
      isSweep: true
      sweepAmount: AmountSats
      /**
       * The exact utxos (as `txid:vout` strings) that made up the source jar's
       * available balance at the moment "Sweep" was clicked. Sent as
       * `input_utxos` so the backend sweeps precisely these utxos instead of
       * re-deriving "everything unfrozen in the mixdepth" at broadcast time,
       * which can silently differ if the jar's contents changed in between.
       */
      sweepUtxos: string[]
    }

export interface SendFormValues {
  source: SourceValue
  destination: DestinationValue
  amount: AmountValue
  isCoinJoin: boolean
  numCollaborators?: number
  txFee: TxFeeFormValues['txFee']
}
