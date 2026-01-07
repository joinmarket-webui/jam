import { createContext, useContext } from 'react'
import type { ErrorMessage } from '@joinmarket-webui/joinmarket-api-ts/jm'
import type { Utxo } from '@/hooks/useUtxos'
import type { AmountSats } from '@/types/global'

// Comments for tailwind importer (ADAPT THE COMMENT IF YOU CHANGE THE VALUE)
// "text-[#e2b86a]", "group-hover/jar:text-[#e2b86a]"
// "text-[#3b5ba9]", "group-hover/jar:text-[#3b5ba9]"
// "text-[#c94f7c]", "group-hover/jar:text-[#c94f7c]"
// "text-[#a67c52]", "group-hover/jar:text-[#a67c52]"
// "text-[#7c3fa6]", "group-hover/jar:text-[#7c3fa6]"
type MainJarColor = '#e2b86a' | '#3b5ba9' | '#c94f7c' | '#a67c52' | '#7c3fa6'
// Comments for tailwind importer (ADAPT THE COMMENT IF YOU CHANGE THE VALUE)
// "text-[#808080]", "group-hover/jar:text-[#808080]"
type UnknownJarColor = '#808080'

export type JarColor = MainJarColor | UnknownJarColor

export type Jar = {
  accountIndex: number
  name: string
  color: JarColor
  balance: AmountSats
}

export const jarTemplates: Array<Pick<Jar, 'accountIndex' | 'name' | 'color'>> = [
  { accountIndex: 0, name: 'Apricot', color: '#e2b86a' },
  { accountIndex: 1, name: 'Blueberry', color: '#3b5ba9' },
  { accountIndex: 2, name: 'Cherry', color: '#c94f7c' },
  { accountIndex: 3, name: 'Date', color: '#a67c52' },
  { accountIndex: 4, name: 'Elderberry', color: '#7c3fa6' },
]

export type FidelityBondSummary = {
  fbOutputs: Utxo[]
}

interface JamWalletInfoContextType {
  jars: Jar[]
  totalBalance: AmountSats
  fidelityBondSummary: FidelityBondSummary
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
