import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a wallet name by removing the .jmdat extension for UI display
 * @param walletName - The full wallet name with .jmdat extension
 * @returns The wallet name without the .jmdat extension
 */
export function formatWalletName(walletName: string | null | undefined): string {
  if (!walletName || walletName === 'None') {
    return 'None'
  }

  // Remove .jmdat extension if present
  return walletName.endsWith('.jmdat') ? walletName.slice(0, '.jmdat'.length * -1) : walletName
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
