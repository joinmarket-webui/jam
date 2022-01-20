export const ACCOUNTS = [0, 1, 2, 3, 4]
export const BTC = 'BTC'
export const SATS = 'SATS'

export const serialize = form =>
  Object.fromEntries(new FormData(form).entries())

export const dasherize = string =>
  String(string).replace(/\W+/gi, '-')

export const lowercaseFirstChar = string =>
  string.charAt(0).toLowerCase() + string.slice(1)

export const upcaseFirstChar = string =>
  string.charAt(0).toUpperCase() + string.slice(1)

export const titleize = string =>
  string
    .split(/\W+/gi)
    .map(w => upcaseFirstChar(w))
    .join(' ')

export const walletDisplayName = name => name.replace('.jmdat', '')

export const displayDate = string => (new Date(string)).toLocaleString()

export const btcToSats = value => Math.round(parseFloat(value) * 100000000)

export const satsToBtc = value => parseInt(value, 10) / 100000000

export const valueToUnit = (value, unit, showValue = false) => {
  if (!showValue) {
    return `*** ${unit}`
  }

  const isSats = value === parseInt(value)
  const isBTC = !isSats && typeof(value) === 'string' && value.indexOf('.') > -1

  if (isBTC && unit === BTC) return `${value} ${BTC}`
  if (isBTC && unit === SATS) return `${btcToSats(value)} ${SATS}`
  if (isSats && unit === SATS) return `${value} ${SATS}`
  if (isSats && unit === BTC) return `${satsToBtc(value)} ${BTC}`
  return `${value} ${unit}`
}
