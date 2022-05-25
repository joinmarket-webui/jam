export const BTC = 'BTC'
export const SATS = 'sats'

export const walletDisplayName = (name: string) => name.replace('.jmdat', '')

export const displayDate = (string: string) => new Date(string).toLocaleString()

export const btcToSats = (value: string) => Math.round(parseFloat(value) * 100000000)

export const satsToBtc = (value: string) => parseInt(value, 10) / 100000000

export const copyToClipboard = (
  text: string,
  fallbackInputField?: HTMLInputElement,
  errorMessage?: string
): Promise<boolean> => {
  const copyToClipboardFallback = (
    inputField: HTMLInputElement,
    errorMessage = 'Cannot copy value to clipboard'
  ): Promise<boolean> =>
    new Promise((resolve, reject) => {
      inputField.select()
      const success = document.execCommand && document.execCommand('copy')
      inputField.blur()
      success ? resolve(success) : reject(new Error(errorMessage))
    })

  // `navigator.clipboard` might not be available, e.g. on sites served over plain `http`.
  if (!navigator.clipboard && fallbackInputField) {
    return copyToClipboardFallback(fallbackInputField)
  }

  // might not work on iOS.
  return navigator.clipboard
    .writeText(text)
    .then(() => true)
    .catch((e: Error) => {
      if (fallbackInputField) {
        return copyToClipboardFallback(fallbackInputField, errorMessage)
      } else {
        throw e
      }
    })
}

export const formatBtc = (value: number) => {
  const decimalPoint = '\u002E'
  const nbHalfSpace = '\u202F'

  const formatter = new Intl.NumberFormat('en-US', {
    minimumIntegerDigits: 1,
    minimumFractionDigits: 8,
  })

  const numberString = formatter.format(value)

  const [integerPart, fractionalPart] = numberString.split(decimalPoint)

  const formattedFractionalPart = fractionalPart
    .split('')
    .map((char, idx) => (idx === 2 || idx === 5 ? `${nbHalfSpace}${char}` : char))
    .join('')

  return integerPart + decimalPoint + formattedFractionalPart
}

export const formatSats = (value: number) => {
  const formatter = new Intl.NumberFormat('en-US', {
    minimumIntegerDigits: 1,
    minimumFractionDigits: 0,
  })

  return formatter.format(value)
}
