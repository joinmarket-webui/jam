import { useState } from 'react'

export type DisplayMode = 'sats' | 'btc' | 'private'

export function useDisplayMode() {
  const [displayMode, setDisplayMode] = useState<DisplayMode>('sats')

  const toggleDisplayMode = (mode?: DisplayMode) => {
    if (mode) {
      setDisplayMode(mode as DisplayMode)
      return
    } else {
      setDisplayMode((m) => {
        if (m === 'sats') return 'btc'
        if (m === 'btc') return 'private'
        return 'sats'
      })
    }
  }

  function formatAmount(amount: number): string {
    if (displayMode === 'btc') {
      return (amount / 100_000_000).toLocaleString(undefined, {
        minimumFractionDigits: 8,
        maximumFractionDigits: 8,
      })
    } else if (displayMode === 'private') {
      return '****'
    }
    return amount.toLocaleString()
  }

  return {
    displayMode,
    toggleDisplayMode,
    formatAmount,
  }
}
