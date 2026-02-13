import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import type { Currency } from '@/types/global'

interface JamDisplayContextType {
  currency: Currency
  isPrivate: boolean
  toggleCurrencyUnit: () => void
  togglePrivacyMode: () => void
  toggleDisplayMode: () => void
  hiddenAmountPlaceholder: string
  formatAmount: (props: { amount: number; convertToUnit?: Currency | undefined; hidden?: boolean }) => string
  currencySymbol: (size?: 'sm' | 'lg') => ReactNode
}

export const JamDisplayContext = createContext<JamDisplayContextType | undefined>(undefined)

export const useJamDisplayContext = () => {
  const context = useContext(JamDisplayContext)
  if (context === undefined) {
    throw new Error('useJamDisplayContext must be used within a JamDisplayContextProvider')
  }
  return context
}
