export const ACCOUNTS = [0, 1, 2, 3, 4]
export const BTC = 'BTC'
export const SATS = 'sats'

export const serialize = (form) => Object.fromEntries(new FormData(form).entries())

export const walletDisplayName = (name) => name.replace('.jmdat', '')

export const displayDate = (string) => new Date(string).toLocaleString()

export const btcToSats = (value) => Math.round(parseFloat(value) * 100000000)

export const satsToBtc = (value) => parseInt(value, 10) / 100000000
