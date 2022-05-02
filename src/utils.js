export const BTC = 'BTC'
export const SATS = 'sats'

export const walletDisplayName = (name) => name.replace('.jmdat', '')

export const displayDate = (string) => new Date(string).toLocaleString()

export const btcToSats = (value) => Math.round(parseFloat(value) * 100000000)

export const satsToBtc = (value) => parseInt(value, 10) / 100000000
