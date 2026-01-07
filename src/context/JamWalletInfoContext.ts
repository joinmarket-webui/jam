import { createContext, useContext } from 'react'
import type { ErrorMessage } from '@joinmarket-webui/joinmarket-api-ts/jm'
import type { AmountSats } from '@/types/global'

export type JarColor = '#e2b86a' | '#3b5ba9' | '#c94f7c' | '#a67c52' | '#7c3fa6'

export type Jar = {
  name: string
  color: JarColor
  balance: AmountSats
  account: string
}

export const jarTemplates: Array<Pick<Jar, 'name' | 'color'>> = [
  { name: 'Apricot', color: '#e2b86a' },
  { name: 'Blueberry', color: '#3b5ba9' },
  { name: 'Cherry', color: '#c94f7c' },
  { name: 'Date', color: '#a67c52' },
  { name: 'Elderberry', color: '#7c3fa6' },
]

interface JamWalletInfoContextType {
  jars: Jar[]
  totalBalance: AmountSats
  walletName: string | null
  isLoading: boolean
  error: Error | ErrorMessage | null
  refetchWalletData: () => void
}

export const JamWalletInfoContext = createContext<JamWalletInfoContextType | undefined>(undefined)

export const useJamWalletInfoContext = () => {
  const context = useContext(JamWalletInfoContext)
  if (context === undefined) {
    throw new Error('useJamWalletInfoContext must be used within a JamWalletInfoContextProvider')
  }
  return context
}
