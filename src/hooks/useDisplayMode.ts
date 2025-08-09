import { useState } from 'react'

export type DisplayMode = 'sats' | 'btc' | 'private'

const DISPLAY_MODE_STORAGE_KEY = 'jam-display-mode'

export function useDisplayMode() {
  const [displayMode, setDisplayMode] = useState<DisplayMode>(() => {
    try {
      const stored = localStorage.getItem(DISPLAY_MODE_STORAGE_KEY)
      return (stored as DisplayMode) || 'sats'
    } catch {
      return 'sats'
    }
  })

  const toggleDisplayMode = (mode?: DisplayMode) => {
    let newMode: DisplayMode

    if (mode) {
      newMode = mode
    } else {
      newMode = displayMode === 'sats' ? 'btc' : displayMode === 'btc' ? 'private' : 'sats'
    }

    setDisplayMode(newMode)

    localStorage.setItem(DISPLAY_MODE_STORAGE_KEY, newMode)
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
