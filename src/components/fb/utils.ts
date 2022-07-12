import { Lockdate } from '../../libs/JmWalletApi'
import { Utxo } from '../../context/WalletContext'

type Milliseconds = number
type Seconds = number

export type YearsRange = {
  min: number
  max: number
}

export const toYearsRange = (min: number, max: number): YearsRange => {
  if (max <= min) {
    throw new Error('Invalid values for range of years.')
  }
  return { min, max }
}

// A maximum of years for a timelock to be accepted.
// This is useful in simple mode - when it should be prevented that users
// lock up their coins for an awful amount of time by accident.
// In "advanced" mode, this can be dropped or increased substantially.
export const DEFAULT_MAX_TIMELOCK_YEARS = 10
export const DEFAULT_TIMELOCK_YEARS_RANGE = toYearsRange(0, DEFAULT_MAX_TIMELOCK_YEARS)

// The months ahead for the initial lock date.
// It is recommended to start locking for a period of between 3 months and 1 years initially.
// This value should be at the lower end of this recommendation.
// See https://github.com/JoinMarket-Org/joinmarket-clientserver/blob/master/docs/fidelity-bonds.md#what-amount-of-bitcoins-to-lock-up-and-for-how-long
// for more information (last checked on 2022-06-13).
// Exported for tests only!
export const __INITIAL_LOCKDATE_MONTH_AHEAD = 3

export const lockdate = (() => {
  const _fromDate = (date: Date): Lockdate => {
    return `${date.getUTCFullYear()}-${date.getUTCMonth() >= 9 ? '' : '0'}${1 + date.getUTCMonth()}` as Lockdate
  }
  const fromTimestamp = (timestamp: Milliseconds): Lockdate => {
    if (Number.isNaN(timestamp)) throw new Error('Unsupported input: NaN')
    return _fromDate(new Date(timestamp))
  }
  const toTimestamp = (lockdate: Lockdate): Milliseconds => {
    const split = lockdate.split('-')
    if (split.length !== 2 || split[0].length !== 4 || split[1].length !== 2) {
      throw new Error('Unsupported format')
    }

    const year = parseInt(split[0], 10)
    const month = parseInt(split[1], 10)
    if (Number.isNaN(year) || Number.isNaN(month)) {
      throw new Error('Unsupported format')
    }
    return Date.UTC(year, month - 1, 1)
  }

  /**
   * Returns a lockdate an initial lockdate in the future.
   *
   * This method tries to provide a date that is at least
   * {@link __INITIAL_LOCKDATE_MONTH_AHEAD} months after {@link now}.
   *
   * @param now the reference date
   * @param range a min/max range of years
   * @returns an initial lockdate
   */
  const initial = (now: Date, range: YearsRange = DEFAULT_TIMELOCK_YEARS_RANGE): Lockdate => {
    const year = now.getUTCFullYear()
    const month = now.getUTCMonth()

    const minMonthAhead = Math.max(range.min * 12, __INITIAL_LOCKDATE_MONTH_AHEAD + 1)
    const initYear = year + Math.floor((month + minMonthAhead) / 12)
    const initMonth = (month + minMonthAhead) % 12
    return fromTimestamp(Date.UTC(initYear, initMonth, 1))
  }

  return {
    fromTimestamp,
    toTimestamp,
    initial,
  }
})()

export const utxo = (() => {
  const isEqual = (lhs: Utxo, rhs: Utxo) => {
    return lhs.utxo === rhs.utxo
  }

  const isInList = (utxo: Utxo, list: Array<Utxo>) => list.findIndex((it) => isEqual(it, utxo)) !== -1

  const utxosToFreeze = (allUtxos: Array<Utxo>, fbUtxos: Array<Utxo>) =>
    allUtxos.filter((utxo) => !isInList(utxo, fbUtxos))

  const allAreFrozen = (utxos: Array<Utxo>) => utxos.every((utxo) => utxo.frozen)

  const isLocked = (utxo: Utxo, refTime: Milliseconds = Date.now()) => {
    if (!utxo.locktime) return false

    const pathAndLocktime = utxo.path.split(':')
    if (pathAndLocktime.length !== 2) return false

    const locktimeUnixTimestamp: Seconds = parseInt(pathAndLocktime[1], 10)
    if (Number.isNaN(locktimeUnixTimestamp)) return false

    return locktimeUnixTimestamp * 1_000 >= refTime
  }

  return { isEqual, isInList, utxosToFreeze, allAreFrozen, isLocked }
})()
