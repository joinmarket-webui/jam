import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import type { ErrorMessage } from '@joinmarket-webui/joinmarket-api-ts/jm'
import type { Jar } from '@/hooks/useWalletDisplay'
import type { AmountSats, Currency } from '@/types/global'

interface JamDisplayContextType {
  currency: Currency
  isPrivate: boolean
  toggleCurrencyUnit: () => void
  togglePrivacyMode: () => void
  toggleDisplayMode: () => void
  formatAmount: (amount: number) => string
  currencySymbol: (size?: 'sm' | 'lg') => ReactNode
  jars: Jar[]
  totalBalance: AmountSats
  walletName: string | null
  isLoading: boolean
  error: Error | ErrorMessage | null
  refetchWalletData: () => void
}

export const JamDisplayContext = createContext<JamDisplayContextType | undefined>(undefined)

export const useJamDisplayContext = () => {
  const context = useContext(JamDisplayContext)
  if (context === undefined) {
    throw new Error('useJamDisplayContext must be used within a JamDisplayContextProvider')
  }
  return context
}
