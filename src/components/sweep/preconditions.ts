import type { Utxo } from '@/hooks/useQueryUtxos'
import * as fb from '@/lib/fidelityBondUtils'

export interface SweepPreconditionOptions {
  minNumberOfUtxos: number
  minConfirmations: number
}

export interface SweepPreconditionSummary {
  isFulfilled: boolean
  options: SweepPreconditionOptions
  numberOfMissingUtxos: number
  numberOfMissingConfirmations: number
  retryLockedUtxos: Utxo[]
}

const DEFAULT_OPTIONS: SweepPreconditionOptions = {
  minNumberOfUtxos: 1,
  minConfirmations: 5,
}

const isUtxoEligible = (utxo: Utxo): boolean => {
  return !utxo.frozen && !fb.utxo.isLocked(utxo)
}

const groupByJarIndex = (utxos: Utxo[]): Map<number, Utxo[]> => {
  return utxos.reduce((acc, utxo) => {
    const key = utxo.mixdepth
    const current = acc.get(key) ?? []
    current.push(utxo)
    acc.set(key, current)
    return acc
  }, new Map<number, Utxo[]>())
}

const toRetryLockedUtxos = (eligibleUtxos: Utxo[]): Utxo[] => {
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

const toNumberOfMissingConfirmations = (utxos: Utxo[], minConfirmations: number): number => {
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
    ...DEFAULT_OPTIONS,
    ...options,
  }

  const eligibleUtxos = utxos.filter((utxo) => isUtxoEligible(utxo))
  const numberOfMissingUtxos = Math.max(0, mergedOptions.minNumberOfUtxos - eligibleUtxos.length)
  const numberOfMissingConfirmations =
    numberOfMissingUtxos > 0 ? 0 : toNumberOfMissingConfirmations(eligibleUtxos, mergedOptions.minConfirmations)

  const retryLockedUtxos = toRetryLockedUtxos(eligibleUtxos)

  return {
    isFulfilled: numberOfMissingUtxos === 0 && numberOfMissingConfirmations === 0 && retryLockedUtxos.length === 0,
    options: mergedOptions,
    numberOfMissingUtxos,
    numberOfMissingConfirmations,
    retryLockedUtxos,
  }
}
