import * as fb from '../components/fb/utils'
import { Utxos } from '../context/WalletContext'

export type CoinjoinRequirementOptions = {
  minNumberOfUtxos: number // min amount of utxos available
  // https://github.com/JoinMarket-Org/joinmarket-clientserver/blob/v0.9.7/docs/SOURCING-COMMITMENTS.md#wait-for-at-least-5-confirmations
  minConfirmations: number // all utxos needs X confirmations
}

export const DEFAULT_REQUIREMENT_OPTIONS: CoinjoinRequirementOptions = {
  minNumberOfUtxos: 1,
  minConfirmations: 5, // default of `taker_utxo_age` in jm config
}

export interface CoinjoinRequirementViolation {
  hasViolations: boolean
  utxosViolatingRetriesLeft: Utxos
  utxosViolatingMinConfirmations: Utxos
}

export type CoinjoinRequirementViolationWithJarIndex = { jarIndex: number } & CoinjoinRequirementViolation

export interface CoinjoinRequirementSummary {
  isFulfilled: boolean
  options: CoinjoinRequirementOptions
  numberOfMissingUtxos: number
  numberOfMissingConfirmations: number
  violations: CoinjoinRequirementViolationWithJarIndex[]
}

const filterEligibleUtxos = (utxos: Utxos) => {
  return utxos.filter((it) => !it.frozen).filter((it) => !fb.utxo.isLocked(it))
}

const filterUtxosViolatingMinConfirmationRequirement = (utxos: Utxos, minConfirmation: number) => {
  return utxos.filter((it) => it.confirmations < minConfirmation)
}

const filterUtxosViolatingTriesLeftRequirement = (utxos: Utxos) => {
  return utxos.filter((it) => it.tries_remaining === 0)
}

const buildCoinjoinViolationSummaryForJar = (
  utxos: Utxos,
  options: CoinjoinRequirementOptions
): CoinjoinRequirementViolation => {
  const eligibleUtxos = filterEligibleUtxos(utxos)
  const utxosViolatingRetriesLeft = filterUtxosViolatingTriesLeftRequirement(eligibleUtxos)
  const utxosViolatingMinConfirmations = filterUtxosViolatingMinConfirmationRequirement(
    eligibleUtxos,
    options.minConfirmations
  )

  const hasViolations = utxosViolatingRetriesLeft.length > 0 || utxosViolatingMinConfirmations.length > 0

  return {
    hasViolations,
    utxosViolatingRetriesLeft,
    utxosViolatingMinConfirmations,
  }
}

type UtxosByJar = { [key: number]: Utxos }

const groupByJar = (utxos: Utxos): UtxosByJar => {
  return utxos.reduce((res, utxo) => {
    const { mixdepth } = utxo
    res[mixdepth] = res[mixdepth] || []
    res[mixdepth].push(utxo)
    return res
  }, {} as UtxosByJar)
}

export const buildCoinjoinRequirementSummary = (
  utxos: Utxos,
  options = DEFAULT_REQUIREMENT_OPTIONS
): CoinjoinRequirementSummary => {
  const eligibleUtxos = filterEligibleUtxos(utxos)
  const utxosByJars = groupByJar(eligibleUtxos)

  const violations: CoinjoinRequirementViolationWithJarIndex[] = []

  for (const jarIndex in utxosByJars) {
    const violationsByJar = buildCoinjoinViolationSummaryForJar(utxosByJars[jarIndex], options)
    if (violationsByJar.hasViolations) {
      violations.push({ jarIndex: +jarIndex, ...violationsByJar })
    }
  }

  const lowestConfInWallet = violations
    .filter((it) => it.utxosViolatingMinConfirmations.length > 0)
    .map((it) =>
      it.utxosViolatingMinConfirmations.reduce(
        (acc, utxo) => Math.min(acc, utxo.confirmations),
        Number.MAX_SAFE_INTEGER
      )
    )
    .reduce((acc, lowestConfPerJar) => Math.min(acc, lowestConfPerJar), Number.MAX_SAFE_INTEGER)

  const numberOfMissingConfirmations = Math.max(0, options.minConfirmations - lowestConfInWallet)

  const numberOfMissingUtxos = Math.max(0, options.minNumberOfUtxos - eligibleUtxos.length)

  const isFulfilled = numberOfMissingUtxos === 0 && numberOfMissingConfirmations === 0 && violations.length === 0

  return {
    isFulfilled,
    options,
    numberOfMissingUtxos,
    numberOfMissingConfirmations,
    violations,
  }
}
