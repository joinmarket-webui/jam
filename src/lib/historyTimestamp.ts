const HISTORY_TIMESTAMP_REGEX =
  /^(\d{4})[-/](\d{2})[-/](\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:?\d{2})?$/

const offsetInMinutes = (offset: string | undefined): number => {
  if (offset === undefined || offset === 'Z') return 0
  const sign = offset.startsWith('-') ? -1 : 1
  const digits = offset.slice(1).replace(':', '')
  return sign * (Number.parseInt(digits.slice(0, 2), 10) * 60 + Number.parseInt(digits.slice(2), 10))
}

export const parseHistoryTimestamp = (value: string): Date | undefined => {
  const match = HISTORY_TIMESTAMP_REGEX.exec(value.trim())
  if (match === null) return undefined

  const [, year, month, day, hours, minutes, seconds, fraction, offset] = match
  const [y, mo, d, h, mi, s] = [year, month, day, hours, minutes, seconds].map((it) => Number.parseInt(it, 10))
  const millis = fraction === undefined ? 0 : Number.parseInt(fraction.padEnd(3, '0').slice(0, 3), 10)

  const utcMillis = Date.UTC(y, mo - 1, d, h, mi, s, millis)
  const date = new Date(utcMillis)
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== mo - 1 ||
    date.getUTCDate() !== d ||
    date.getUTCHours() !== h ||
    date.getUTCMinutes() !== mi ||
    date.getUTCSeconds() !== s
  ) {
    return undefined
  }

  return new Date(utcMillis - offsetInMinutes(offset) * 60 * 1_000)
}
