import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { OfferType } from '@/constants/jm'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const JM_WALLET_FILE_EXTENSION = '.jmdat'

export type Unit = 'BTC' | 'sats'

export const BTC: Unit = 'BTC'
export const SATS: Unit = 'sats'

// Time-related types
export type Milliseconds = number
export type Seconds = number
export type TimeInterval = number

// can be any of ['sw0reloffer', 'swreloffer', 'reloffer']
export const isRelativeOffer = (offertype: OfferType) => offertype.includes('reloffer')

// can be any of ['sw0absoffer', 'swabsoffer', 'absoffer']
export const isAbsoluteOffer = (offertype: OfferType) => offertype.includes('absoffer')

export type WalletFileName = `${string}.jmdat`

/**
 * Formats a wallet name by removing the .jmdat extension
 * @param name The full wallet name with .jmdat extension
 * @returns The wallet name without the .jmdat extension
 */
export const sanitizeWalletName = (name: WalletFileName) => name.replace(JM_WALLET_FILE_EXTENSION, '')

export const walletDisplayNameToFileName = (name: string) => (name + JM_WALLET_FILE_EXTENSION) as WalletFileName

export const walletDisplayName = (fileName: WalletFileName) => sanitizeWalletName(fileName)

export const sortWallets = (
  wallets: WalletFileName[],
  activeWalletFileName: WalletFileName | null = null,
): WalletFileName[] => {
  if (activeWalletFileName && wallets.indexOf(activeWalletFileName) >= 0) {
    return [activeWalletFileName, ...sortWallets(wallets.filter((a) => a !== activeWalletFileName))]
  } else {
    return [...wallets].sort((a, b) => a.localeCompare(b))
  }
}

export const setIntervalDebounced = (
  callback: () => Promise<void>,
  delay: number,
  onTimerIdChanged: (timerId: NodeJS.Timeout) => void,
  onError: (error: unknown, loop: () => void) => void = (_, loop) => loop(),
) => {
  ;(function loop() {
    onTimerIdChanged(
      setTimeout(async () => {
        try {
          await callback()
          loop()
        } catch (e: unknown) {
          onError(e, loop)
        }
      }, delay),
    )
  })()
}

export const satsToBtc = (value: string) => parseInt(value, 10) / 100000000

export const btcToSats = (value: string) => Math.round(parseFloat(value) * 100000000)

export const SEGWIT_ACTIVATION_BLOCK = 481_824 // https://github.com/bitcoin/bitcoin/blob/v25.0/src/kernel/chainparams.cpp#L86

export const percentageToFactor = (val: number, precision = 6) => {
  return Number((val / 100).toFixed(precision))
}

export const isValidNumber = (val: number | undefined | null) => typeof val === 'number' && !isNaN(val)

export const formatBtc = (value: number) => {
  return value.toFixed(8)
}

export const formatSats = (value: number) => {
  return value.toLocaleString()
}

export const factorToPercentage = (val: number, precision = 6) => {
  // Value cannot just be multiplied
  // e.g. ✗ 0.000027 * 100 == 0.0026999999999999997
  // but: ✓ Number((0.000027 * 100).toFixed(6)) = 0.0027
  return Number((val * 100).toFixed(precision))
}

export const time = (() => {
  type Unit = 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second'

  // These values don't need to be exact.
  // They are only used to approximate a human readable
  // representation of a time interval--e.g. "in 2 months".
  const UNIT_MILLIS: { [key in Unit]: Milliseconds } = {
    year: 24 * 60 * 60 * 1_000 * 365,
    month: (24 * 60 * 60 * 1_000 * 365) / 12, // ~30.42 days
    day: 24 * 60 * 60 * 1_000,
    hour: 60 * 60 * 1_000,
    minute: 60 * 1_000,
    second: 1_000,
  }

  const humanReadableDuration = ({
    from = Date.now(),
    to,
    locale = 'en',
  }: {
    from?: Milliseconds
    to: Milliseconds
    locale?: string
  }) => humanReadableTimeInterval(timeInterval({ from, to }), locale)

  const timeInterval = ({ from = Date.now(), to }: { from?: Milliseconds; to: Milliseconds }): TimeInterval => {
    return to - from
  }

  const humanReadableTimeInterval = (timeInterval: TimeInterval, locale: string = 'en') => {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'always', style: 'long' })

    const sortedUnits = (Object.keys(UNIT_MILLIS) as Unit[])
      .sort((lhs, rhs) => UNIT_MILLIS[lhs] - UNIT_MILLIS[rhs])
      .reverse()

    for (const unit of sortedUnits) {
      const limit = UNIT_MILLIS[unit]

      if (Math.abs(timeInterval) > limit) {
        return rtf.format(Math.round(timeInterval / limit), unit)
      }
    }

    return rtf.format(Math.round(timeInterval / UNIT_MILLIS['second']), 'second')
  }

  return {
    timeInterval,
    humanReadableDuration,
  }
})()

/**
 * Formats fidelity bond time duration in a human-readable format
 * Enhanced version that supports both new simplified format and old advanced format
 * @param options - Configuration object with to timestamp and optional from timestamp and locale
 * @param options.to - Target timestamp in milliseconds
 * @param options.from - Optional source timestamp in milliseconds (defaults to Date.now())
 * @param options.locale - Optional locale string (defaults to 'en')
 * @param options.useAdvanced - Whether to use advanced formatting with full units (defaults to false for backward compatibility)
 * @returns Human-readable duration string
 */
export const humanReadableDuration = ({
  to,
  from = Date.now(),
  locale = 'en',
  useAdvanced = false,
}: {
  to: number
  from?: number
  locale?: string
  useAdvanced?: boolean
}): string => {
  if (useAdvanced) {
    // Use the advanced time module for full Intl.RelativeTimeFormat support
    return time.humanReadableDuration({ from, to, locale })
  }

  // Use the simplified version for backward compatibility
  const now = from
  const diff = to - now

  if (diff <= 0) return 'Expired'

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''}`
  }
  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`
  }
  return 'Less than 1 hour'
}

type SemVer = { major: number; minor: number; patch: number; raw?: string }

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

export const ReloadDelay = async () => {
  await new Promise((resolve) => setTimeout(resolve, 500))
}

// not cryptographically random. returned number is in range [min, max] (both inclusive).
export const pseudoRandomNumber = (min: number, max: number) => {
  return Math.round(Math.random() * (max - min)) + min
}
