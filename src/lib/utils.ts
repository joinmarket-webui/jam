import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const JM_WALLET_FILE_EXTENSION = '.jmdat'

/**
 * Formats a wallet name by removing the .jmdat extension for UI display
 * @param walletName - The full wallet name with .jmdat extension
 * @returns The wallet name without the .jmdat extension
 */
export function formatWalletName(walletName: string): string {
  return walletName.replace(JM_WALLET_FILE_EXTENSION, '')
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

declare type SemVer = { major: number; minor: number; patch: number; raw?: string }

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
