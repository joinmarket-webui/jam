import { useState } from 'react'

export type DisplayMode = 'sats' | 'btc'

export function useDisplayMode() {
  const [displayMode, setDisplayMode] = useState<DisplayMode>('sats')

  const toggleDisplayMode = () => setDisplayMode((m) => (m === 'sats' ? 'btc' : 'sats'))

  function formatAmount(amount: number): string {
    if (displayMode === 'btc') {
      return (amount / 100_000_000).toLocaleString(undefined, {
        maximumFractionDigits: 8,
      })
    }
    return amount.toLocaleString()
  }

  return {
    displayMode,
    toggleDisplayMode,
    formatAmount,
  }
}
