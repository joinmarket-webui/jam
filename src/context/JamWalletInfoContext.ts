import { createContext, useContext } from 'react'
import type { ErrorMessage } from '@joinmarket-webui/joinmarket-api-ts/jm'
import type { UseQueryDisplayWalletResult } from '@/hooks/useQueryDisplayWallet'
import type { FidelityBondUtxo, UseUtxosResult, Utxo } from '@/hooks/useUtxos'
import type { BalanceSummary } from '@/lib/balanceSummary'
import type { JarIndex } from '@/types/global'

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
  jarIndex: JarIndex
  name: string
  color: JarColor
  balanceSummary: BalanceSummary
  utxos: Utxo[]
}

export type FidelityBondSummary = {
  fbOutputs: FidelityBondUtxo[]
}

export type WalletBalanceSummary = BalanceSummary

interface JamWalletInfoContextType {
  walletName: string | null
  walletBalanceSummary: WalletBalanceSummary
  fidelityBondSummary: FidelityBondSummary
  jars: Jar[]

  isLoading: boolean
  isFetching: boolean
  error: Error | ErrorMessage | null
  refetch: () => Promise<unknown>

  utxosQueryResult: UseUtxosResult['queryResult']
  displayWalletQueryResult: UseQueryDisplayWalletResult['queryResult']
}

export const JamWalletInfoContext = createContext<JamWalletInfoContextType | undefined>(undefined)

export const useJamWalletInfoContext = () => {
  const context = useContext(JamWalletInfoContext)
  if (context === undefined) {
    throw new Error('useJamWalletInfoContext must be used within a JamWalletInfoContextProvider')
  }
  return context
}

export const useWalletBalanceSummary = () => {
  const { walletBalanceSummary, isFetching: isLoading } = useJamWalletInfoContext()
  return { walletBalanceSummary, isLoading }
}

export const useJars = () => {
  const { jars, isFetching: isLoading } = useJamWalletInfoContext()
  return { jars, isLoading }
}
