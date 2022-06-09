import * as Api from '../../libs/JmWalletApi'

type Milliseconds = number

export const lockdate = (() => {
  const _fromDate = (date: Date): Api.Lockdate => {
    return `${date.getUTCFullYear()}-${date.getUTCMonth() >= 9 ? '' : '0'}${1 + date.getUTCMonth()}` as Api.Lockdate
  }
  const fromTimestamp = (timestamp: Milliseconds): Api.Lockdate => {
    if (Number.isNaN(timestamp)) throw new Error('Unsupported input: NaN')
    return _fromDate(new Date(timestamp))
  }
  const toTimestamp = (lockdate: Api.Lockdate): Milliseconds => {
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

  return {
    fromTimestamp,
    toTimestamp,
  }
})()

export const time = (() => {
  type UnitKey = 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second'

  type Units = {
    [key in UnitKey]: Milliseconds
  }

  // These numbers do not need to be exact.
  // They are used solely to display a string representation
  // of elapsed time. e.g. "in 2 months"
  const units: Units = {
    year: 24 * 60 * 60 * 1_000 * 365,
    month: (24 * 60 * 60 * 1_000 * 365) / 12, // ~30.42 days
    day: 24 * 60 * 60 * 1_000,
    hour: 60 * 60 * 1_000,
    minute: 60 * 1_000,
    second: 1_000,
  }

  type Locales = Intl.UnicodeBCP47LocaleIdentifier | Intl.UnicodeBCP47LocaleIdentifier[]

  const OPTIONS: Intl.RelativeTimeFormatOptions = { numeric: 'always', style: 'long' }
  const elapsed = (d1: Milliseconds, d2: Milliseconds = Date.now(), locales: Locales = 'en') => {
    const rtf = new Intl.RelativeTimeFormat(locales, OPTIONS)
    const elapsedInMillis: Milliseconds = d1 - d2

    for (let k of Object.keys(units) as UnitKey[]) {
      const limit: number = units[k]
      if (Math.abs(elapsedInMillis) > limit) {
        return rtf.format(Math.round(elapsedInMillis / limit), k)
      }
    }

    return rtf.format(Math.round(elapsedInMillis / units['second']), 'second')
  }

  return {
    elapsed,
  }
})()
