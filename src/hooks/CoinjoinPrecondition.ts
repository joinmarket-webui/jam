import { useMemo } from 'react'
import { isLocked } from '../hooks/BalanceSummary'
import { Utxos } from '../context/WalletContext'

export const COINJOIN_PRECONDITIONS = {
  MIN_NUMBER_OF_UTXOS: 1, // min amount of utxos available
  // https://github.com/JoinMarket-Org/joinmarket-clientserver/blob/v0.9.6/docs/SOURCING-COMMITMENTS.md#wait-for-at-least-5-confirmations
  MIN_CONFIRMATIONS_OF_SINGLE_UTXO: 5, // at least one utxo needs X confirmations
  MIN_OVERALL_REMAINING_RETRIES: 1, // amount of overall retries available
}

export interface CoinjoinPreconditionSummary {
  isFulfilled: boolean
  numberOfMissingUtxos: number
  amountOfMissingConfirmations: number
  amountOfMissingOverallRetries: number
}

export const useCoinjoinPreconditionSummary = (utxos: Utxos): CoinjoinPreconditionSummary => {
  const eligibleUtxos = useMemo(() => {
    return utxos.filter((it) => !it.frozen).filter((it) => !isLocked(it))
  }, [utxos])

  return useMemo(() => {
    const numberOfMissingUtxos = Math.max(0, COINJOIN_PRECONDITIONS.MIN_NUMBER_OF_UTXOS - eligibleUtxos.length)

    const overallRetriesRemaining = eligibleUtxos.reduce((acc, utxo) => acc + utxo.tries_remaining, 0)
    const amountOfMissingOverallRetries = Math.max(
      0,
      COINJOIN_PRECONDITIONS.MIN_OVERALL_REMAINING_RETRIES - overallRetriesRemaining
    )

    const maxConfirmations =
      eligibleUtxos.length === 0 ? 0 : eligibleUtxos.reduce((acc, utxo) => Math.max(acc, utxo.confirmations), 0)
    const amountOfMissingConfirmations = Math.max(
      0,
      COINJOIN_PRECONDITIONS.MIN_CONFIRMATIONS_OF_SINGLE_UTXO - maxConfirmations
    )

    const isFulfilled =
      numberOfMissingUtxos === 0 && amountOfMissingOverallRetries === 0 && amountOfMissingConfirmations === 0

    return {
      isFulfilled,
      numberOfMissingUtxos,
      amountOfMissingConfirmations,
      amountOfMissingOverallRetries,
    }
  }, [eligibleUtxos])
}
