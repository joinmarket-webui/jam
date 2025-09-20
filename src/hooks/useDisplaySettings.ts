import { useCallback, useState } from 'react'

export type Currency = 'sats' | 'btc'

const CURRENCY_STORAGE_KEY = 'jam-currency-unit'
const PRIVACY_MODE_STORAGE_KEY = 'jam-privacy-mode'

export function useDisplaySettings() {
  const [currency, setCurrency] = useState<Currency>(() => {
    try {
      const stored = localStorage.getItem(CURRENCY_STORAGE_KEY)
      return (stored as Currency) === 'btc' ? 'btc' : 'sats'
    } catch {
      return 'sats'
    }
  })

  const [isPrivate, setIsPrivate] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(PRIVACY_MODE_STORAGE_KEY)
      return stored === 'true'
    } catch {
      return false
    }
  })

  const setCurrencyUnit = useCallback((newCurrency: Currency) => {
    setCurrency(newCurrency)
    try {
      localStorage.setItem(CURRENCY_STORAGE_KEY, newCurrency)
    } catch (error) {
      console.error('Failed to save currency unit:', error)
    }
  }, [])

  const toggleCurrencyUnit = useCallback(() => {
    setCurrencyUnit(currency === 'sats' ? 'btc' : 'sats')
  }, [currency, setCurrencyUnit])

  const setPrivacyMode = useCallback((isPrivateEnabled: boolean) => {
    setIsPrivate(isPrivateEnabled)
    try {
      localStorage.setItem(PRIVACY_MODE_STORAGE_KEY, String(isPrivateEnabled))
    } catch (error) {
      console.error('Failed to save privacy mode:', error)
    }
  }, [])

  const togglePrivacyMode = useCallback(() => {
    setPrivacyMode(!isPrivate)
  }, [isPrivate, setPrivacyMode])

  const toggleDisplayMode = useCallback(() => {
    if (isPrivate) {
      setPrivacyMode(false)
      setCurrencyUnit('sats')
    } else if (currency === 'sats') {
      setCurrencyUnit('btc')
    } else {
      setPrivacyMode(true)
    }
  }, [isPrivate, currency, setPrivacyMode, setCurrencyUnit])

  const formatAmount = useCallback(
    (amount: number): string => {
      if (isPrivate) {
        return '****'
      }

      if (currency === 'btc') {
        return (amount / 100_000_000).toLocaleString(undefined, {
          minimumFractionDigits: 8,
          maximumFractionDigits: 8,
        })
      }

      return amount.toLocaleString()
    },
    [currency, isPrivate],
  )

  return {
    currency,
    isPrivate,
    toggleCurrencyUnit,
    togglePrivacyMode,
    toggleDisplayMode,
    formatAmount,
  }
}
