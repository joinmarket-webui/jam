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
