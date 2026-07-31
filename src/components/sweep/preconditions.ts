import { JM_TAKER_UTXO_AGE } from '@/constants/jm'
import type { Utxo } from '@/hooks/useQueryUtxos'
import * as fb from '@/lib/fidelityBondUtils'

export interface SweepPreconditionOptions {
  minNumberOfUtxos: number
  minConfirmations: number
  maxNumberOfNonFrozenFidelityBondOutputs: number
}

export interface SweepPreconditionSummary {
  isFulfilled: boolean
  options: SweepPreconditionOptions
  numberOfMissingUtxos: number
  numberOfMissingConfirmations: number
  numberOfNonFrozenFidelityBondOutputs: number
  retryLockedUtxos: Utxo[]
}

export const SWEEP_PRECONDITION_DEFAULT_OPTIONS: SweepPreconditionOptions = Object.freeze({
  minNumberOfUtxos: 1,
  minConfirmations: JM_TAKER_UTXO_AGE,
  maxNumberOfNonFrozenFidelityBondOutputs: 0,
})

const groupByJarIndex = (utxos: Utxo[]): Map<number, Utxo[]> => {
  return utxos.reduce((acc, utxo) => {
    const key = utxo.mixdepth
    const current = acc.get(key) ?? []
    current.push(utxo)
    acc.set(key, current)
    return acc
  }, new Map<number, Utxo[]>())
}

const filterUtxosBlockedByRetryLimit = (eligibleUtxos: Utxo[]): Utxo[] => {
  const utxosByJar = groupByJarIndex(eligibleUtxos)
  const blockedUtxos: Utxo[] = []

  for (const jarUtxos of utxosByJar.values()) {
    const hasAtLeastOneRetry = jarUtxos.some((utxo) => (utxo.tries_remaining ?? 0) > 0)
    if (!hasAtLeastOneRetry) {
      blockedUtxos.push(...jarUtxos.filter((utxo) => (utxo.tries_remaining ?? 0) <= 0))
    }
  }

  return blockedUtxos
}

const calcMissingConfirmations = (utxos: Utxo[], minConfirmations: number): number => {
  if (utxos.length === 0) {
    return 0
  }

  const lowestConfirmations = utxos.reduce((acc, utxo) => {
    return Math.min(acc, Math.max(0, utxo.confirmations))
  }, Number.POSITIVE_INFINITY)

  return Math.max(0, minConfirmations - lowestConfirmations)
}

export const buildSweepPreconditionSummary = (
  utxos: Utxo[],
  options: Partial<SweepPreconditionOptions> = {},
): SweepPreconditionSummary => {
  const mergedOptions: SweepPreconditionOptions = {
    ...SWEEP_PRECONDITION_DEFAULT_OPTIONS,
    ...options,
  }

  const { nonFrozenFbUtxos, eligibleUtxos } = utxos
    .filter((it) => it.frozen !== true)
    .reduce(
      (context, utxo) => {
        if (fb.utxo.isFidelityBond(utxo)) {
          context.nonFrozenFbUtxos.push(utxo)
        } else {
          context.eligibleUtxos.push(utxo)
        }
        return context
      },
      { nonFrozenFbUtxos: [] as Utxo[], eligibleUtxos: [] as Utxo[] },
    )

  if (nonFrozenFbUtxos.length > mergedOptions.maxNumberOfNonFrozenFidelityBondOutputs) {
    return {
      isFulfilled: false,
      options: mergedOptions,
      numberOfNonFrozenFidelityBondOutputs: nonFrozenFbUtxos.length,
      numberOfMissingUtxos: 0,
      numberOfMissingConfirmations: 0,
      retryLockedUtxos: [],
    }
  }

  const numberOfMissingUtxos = Math.max(0, mergedOptions.minNumberOfUtxos - eligibleUtxos.length)
  const numberOfMissingConfirmations =
    numberOfMissingUtxos > 0 ? 0 : calcMissingConfirmations(eligibleUtxos, mergedOptions.minConfirmations)

  const retryLockedUtxos = filterUtxosBlockedByRetryLimit(eligibleUtxos)

  return {
    isFulfilled: numberOfMissingUtxos === 0 && numberOfMissingConfirmations === 0 && retryLockedUtxos.length === 0,
    options: mergedOptions,
    numberOfNonFrozenFidelityBondOutputs: 0,
    numberOfMissingUtxos,
    numberOfMissingConfirmations,
    retryLockedUtxos,
  }
}
