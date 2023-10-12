import { WalletFileName } from './libs/JmWalletApi'

const BTC_FORMATTER = new Intl.NumberFormat('en-US', {
  minimumIntegerDigits: 1,
  minimumFractionDigits: 8,
})

const SATS_FORMATTER = new Intl.NumberFormat('en-US', {
  minimumIntegerDigits: 1,
  minimumFractionDigits: 0,
})

export const BTC: Unit = 'BTC'
export const SATS: Unit = 'sats'

const JM_WALLET_FILE_EXTENSION = '.jmdat'

export const DUMMY_MNEMONIC_PHRASE: MnemonicPhrase =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'.split(' ')

export const SEGWIT_ACTIVATION_BLOCK = 481_824 // https://github.com/bitcoin/bitcoin/blob/v25.0/src/kernel/chainparams.cpp#L86

export const sanitizeWalletName = (name: string) => name.replace(JM_WALLET_FILE_EXTENSION, '')

export const walletDisplayNameToFileName = (name: string) => (name + JM_WALLET_FILE_EXTENSION) as WalletFileName

export const walletDisplayName = (fileName: WalletFileName) => sanitizeWalletName(fileName)

export const displayDate = (string: string) => new Date(string).toLocaleString()

export const btcToSats = (value: string) => Math.round(parseFloat(value) * 100000000)

export const satsToBtc = (value: string) => parseInt(value, 10) / 100000000

export const formatBtc = (value: number) => {
  const decimalPoint = '\u002E'
  const nbHalfSpace = '\u202F'

  const numberString = BTC_FORMATTER.format(value)

  const [integerPart, fractionalPart] = numberString.split(decimalPoint)

  const formattedFractionalPart = fractionalPart
    .split('')
    .map((char, idx) => (idx === 2 || idx === 5 ? `${nbHalfSpace}${char}` : char))
    .join('')

  return integerPart + decimalPoint + formattedFractionalPart
}

export const formatSats = (value: number) => {
  return SATS_FORMATTER.format(value)
}

export const shortenStringMiddle = (value: string, chars = 8, separator = '…') => {
  const prefixLength = Math.max(Math.floor(chars / 2), 1)
  if (value.length <= prefixLength * 2) {
    return `${value}`
  }
  return `${value.substring(0, prefixLength)}${separator}${value.substring(value.length - prefixLength)}`
}

export const percentageToFactor = (val: number, precision = 6) => {
  // Value cannot just be divided
  // e.g. ✗ 0.0027 / 100 == 0.000027000000000000002
  // but: ✓ Number((0.0027 / 100).toFixed(6)) = 0.000027
  return Number((val / 100).toFixed(precision))
}

export const factorToPercentage = (val: number, precision = 6) => {
  // Value cannot just be multiplied
  // e.g. ✗ 0.000027 * 100 == 0.0026999999999999997
  // but: ✓ Number((0.000027 * 100).toFixed(6)) = 0.0027
  return Number((val * 100).toFixed(precision))
}

export const isValidNumber = (val: number | undefined) => typeof val === 'number' && !isNaN(val)

export const UNKNOWN_VERSION: SemVer = { major: 0, minor: 0, patch: 0, raw: 'unknown' }

const versionRegex = new RegExp(/^v?(\d+)\.(\d+)\.(\d+).*$/)
export const toSemVer = (raw?: string): SemVer => {
  const arr = versionRegex.exec(raw || '')
  if (!arr || arr.length < 4) {
    return UNKNOWN_VERSION
  }

  return {
    major: parseInt(arr[1], 10),
    minor: parseInt(arr[2], 10),
    patch: parseInt(arr[3], 10),
    raw,
  }
}

/**
 * Scrolls to the top of the page.
 *
 * Hint: There is a small delay before the scrolling is initiated,
 * in order to mitigate some weird browser behaviour, where it
 * did not properly work without a timeout.
 */
export const scrollToTop = (options?: ScrollOptions) => {
  setTimeout(() => window.scrollTo({ behavior: 'smooth', ...options, top: 0, left: 0 }), 21)
}

export const scrollToTop = () => window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })

export const noop = () => {}

export const setIntervalDebounced = (
  callback: () => Promise<void>,
  delay: Milliseconds,
  onTimerIdChanged: (timerId: NodeJS.Timer) => void,
) => {
  ;(function loop() {
    onTimerIdChanged(
      setTimeout(async () => {
        await callback()
        loop()
      }, delay),
    )
  })()
}
