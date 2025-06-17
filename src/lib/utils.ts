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
  return walletName.endsWith('.jmdat') ? walletName.slice(0, -6) : walletName
}
