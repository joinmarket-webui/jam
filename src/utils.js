export const BTC = 'BTC'
export const SATS = 'sats'

export const serialize = (form) => Object.fromEntries(new FormData(form).entries())

export const walletDisplayName = (name) => name.replace('.jmdat', '')

export const displayDate = (string) => new Date(string).toLocaleString()

export const btcToSats = (value) => Math.round(parseFloat(value) * 100000000)

export const satsToBtc = (value) => parseInt(value, 10) / 100000000

export const copyToClipboard = (text, fallbackInputField, errorMessage) => {
  const copyToClipboardFallback = (inputField) =>
    new Promise((resolve, reject) => {
      inputField.select()
      const success = document.execCommand && document.execCommand('copy')
      inputField.blur()
      success ? resolve(success) : reject(new Error(errorMessage))
    })

  // `navigator.clipboard` might not be available, e.g. on sites served over plain `http`.
  if (!navigator.clipboard) {
    return copyToClipboardFallback(fallbackInputField)
  }

  // might not work on iOS.
  return navigator.clipboard.writeText(text).catch(() => copyToClipboardFallback(fallbackInputField))
}
