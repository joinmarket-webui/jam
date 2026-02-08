import { createContext, useContext } from 'react'
import type { ErrorMessage, WalletDisplayResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { Network, type AddressInfo } from 'bitcoin-address-validation'
import type { UseQueryDisplayWalletResult } from '@/hooks/useQueryDisplayWallet'
import type { FidelityBondUtxo, UseQueryUtxosResult, Utxo } from '@/hooks/useQueryUtxos'
import type { BalanceSummary } from '@/lib/balanceSummary'
import type { BitcoinAddress, HdPath, JarIndex } from '@/types/global'

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

export type JarColor = MainJarColor | UnknownJarColor | `#${string}`

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

export type AddressStaticStatus = 'new' | 'used' | 'reused' | 'cj-out' | 'change-out' | 'non-cj-change' | 'deposit'

type AddressStatusDynamic = string

export type AddressStatus = AddressStaticStatus | AddressStatusDynamic

export type AddressMeta = {
  jarIndex: JarIndex
  address: BitcoinAddress
  used: boolean
  status: AddressStatus
  info?: Omit<AddressInfo, 'address'>
  __raw: NonNullable<
    NonNullable<
      NonNullable<
        NonNullable<NonNullable<WalletDisplayResponse['walletinfo']>['accounts']>[number]['branches']
      >[number]['entries']
    >
  >[number]
}

export type AddressSummary = {
  [key: AddressMeta['address']]: AddressMeta
}

export type AccountBranchType = 'external addresses' | 'internal addresses'

type AccountApiObject = NonNullable<NonNullable<WalletDisplayResponse['walletinfo']>['accounts']>[number]

export type AccountBranch = {
  type: AccountBranchType | string
  derivation: HdPath
  __raw: NonNullable<AccountApiObject['branches']>[number]
}

export type AccountMeta = {
  jarIndex: JarIndex
  branches: AccountBranch[]
  __raw: NonNullable<NonNullable<WalletDisplayResponse['walletinfo']>['accounts']>[number]
}
export type AccountSummary = {
  [key: AccountMeta['jarIndex']]: AccountMeta
}

interface JamWalletInfoContextType {
  walletName: string | null
  walletBalanceSummary: WalletBalanceSummary
  fidelityBondSummary: FidelityBondSummary
  addressSummary: AddressSummary
  accountSummary: AccountSummary
  jars: Jar[]

  detectedNetwork: Network | null

  isLoading: boolean
  isFetching: boolean
  error: Error | ErrorMessage | null
  refetch: () => Promise<unknown>

  utxosQueryResult: UseQueryUtxosResult['queryResult']
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

export const useAddressSummary = () => {
  const { addressSummary } = useJamWalletInfoContext()
  return { addressSummary }
}

export const useAccountSummary = () => {
  const { accountSummary } = useJamWalletInfoContext()
  return { accountSummary }
}

const FALLBACK_NETWORK = Network.mainnet
export const useDetectNetwork = () => {
  const { detectedNetwork } = useJamWalletInfoContext()
  return { detectedNetwork, fallbackNetwork: FALLBACK_NETWORK, network: detectedNetwork ?? FALLBACK_NETWORK }
}
