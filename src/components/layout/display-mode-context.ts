import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import type { Currency } from '@/hooks/useDisplaySettings'

export type JarColor = '#e2b86a' | '#3b5ba9' | '#c94f7c' | '#a67c52' | '#7c3fa6'

export const jarTemplates: Array<{
  name: string
  color: JarColor
}> = [
  { name: 'Apricot', color: '#e2b86a' },
  { name: 'Blueberry', color: '#3b5ba9' },
  { name: 'Cherry', color: '#c94f7c' },
  { name: 'Date', color: '#a67c52' },
  { name: 'Elderberry', color: '#7c3fa6' },
]

export interface Jar {
  name: string
  color: JarColor
  balance: number
  account?: string
}

export interface DisplayModeContextType {
  currency: Currency
  isPrivate: boolean
  toggleCurrencyUnit: () => void
  togglePrivacyMode: () => void
  toggleDisplayMode: () => void
  formatAmount: (amount: number) => string
  getLogo: (size?: 'sm' | 'lg') => ReactNode
  jars: Jar[]
  totalBalance: number
  walletName: string | null
  isLoading: boolean
  error: Error | null
  refetchWalletData: () => void
}

export const DisplayModeContext = createContext<DisplayModeContextType | undefined>(undefined)

export const useJamDisplayContext = () => {
  const context = useContext(DisplayModeContext)
  if (context === undefined) {
    throw new Error('useJamDisplayContext must be used within a Layout')
  }
  return context
}
