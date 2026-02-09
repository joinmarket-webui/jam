import type { PropsWithChildren } from 'react'
import { CurrencySymbol } from '@/components/ui/jam/CurrencySymbol'
import { useDisplaySettings } from '@/hooks/useDisplaySettings'
import { JamDisplayContext } from './JamDisplayContext'

export const JamDisplayContextProvider = ({ children }: PropsWithChildren<unknown>) => {
  const { currency, isPrivate, toggleCurrencyUnit, togglePrivacyMode, toggleDisplayMode, formatAmount } =
    useDisplaySettings()

  const displayContextValue = {
    currency,
    isPrivate,
    toggleCurrencyUnit,
    togglePrivacyMode,
    toggleDisplayMode,
    formatAmount,
    currencySymbol: () => <CurrencySymbol currency={currency} isPrivate={isPrivate} />,
  }

  return <JamDisplayContext.Provider value={displayContextValue}>{children}</JamDisplayContext.Provider>
}
