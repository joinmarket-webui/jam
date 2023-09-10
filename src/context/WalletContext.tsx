import { createContext, useEffect, useCallback, useState, useContext, PropsWithChildren, useMemo } from 'react'

import { getSession } from '../session'
import * as fb from '../components/fb/utils'
import * as Api from '../libs/JmWalletApi'

import { WalletBalanceSummary, toBalanceSummary } from './BalanceSummary'

export interface CurrentWallet {
  name: Api.WalletName
  token: Api.ApiToken
}

// TODO: move these interfaces to JmWalletApi, once distinct types are used as return value instead of plain "Response"
export type Utxo = {
  address: Api.BitcoinAddress
  path: string
  label: string
  value: Api.AmountSats
  tries: number
  tries_remaining: number
  external: boolean
  mixdepth: number
  confirmations: number
  frozen: boolean
  utxo: Api.UtxoId
  // `locktime` in format "yyyy-MM-dd 00:00:00"
  // NOTE: it is unparsable with safari Date constructor
  locktime?: string
}

export type Utxos = Utxo[]

interface UtxosResponse {
  utxos: Utxos
}

interface WalletDisplayResponse {
  walletinfo: WalletDisplayInfo
}

type BalanceString = `${number}.${string}`

interface WalletDisplayInfo {
  wallet_name: string
  total_balance: BalanceString
  /**
   * @since clientserver v0.9.7
   * @description available balance (total - frozen - locked)
   *   This value can report less than available in case of address reuse.
   *   See https://github.com/JoinMarket-Org/joinmarket-clientserver/pull/1285#issuecomment-1136438072
   *   Utxos controlled by the same key will not be taken into account if at least one output is
   *   frozen (last checked on 2022-05-24).
   */
  available_balance: BalanceString
  accounts: Account[]
}

export interface Account {
  account: string
  account_balance: BalanceString
  available_balance: BalanceString
  branches: Branch[]
}

export interface Branch {
  branch: string
  balance: BalanceString
  available_balance: BalanceString
  entries: BranchEntry[]
}

export type AddressStatus = 'new' | 'used' | 'reused' | 'cj-out' | 'change-out' | 'non-cj-change' | 'deposit'

export interface BranchEntry {
  hd_path: string
  address: Api.BitcoinAddress
  amount: BalanceString
  available_balance: BalanceString
  status: AddressStatus
  label: string
  extradata: string
}

export type CombinedRawWalletData = {
  utxos: UtxosResponse
  display: WalletDisplayResponse
}

type AddressInfo = {
  status: AddressStatus
  address: Api.BitcoinAddress
}

type AddressSummary = {
  [key: Api.BitcoinAddress]: AddressInfo
}

type FidenlityBondSummary = {
  fbOutputs: Utxos
}

export type UtxosByJar = { [key: JarIndex]: Utxos }

export interface WalletInfo {
  balanceSummary: WalletBalanceSummary
  addressSummary: AddressSummary
  fidelityBondSummary: FidenlityBondSummary
  utxosByJar: UtxosByJar
  data: CombinedRawWalletData
}

interface WalletContextEntry {
  currentWallet: CurrentWallet | null
  setCurrentWallet: React.Dispatch<React.SetStateAction<CurrentWallet | null>>
  currentWalletInfo: WalletInfo | undefined
  reloadCurrentWalletInfo: {
    reloadAll: ({ signal }: { signal: AbortSignal }) => Promise<WalletInfo>
    reloadUtxos: ({ signal }: { signal: AbortSignal }) => Promise<UtxosResponse>
  }
}

const toAddressSummary = (res: WalletDisplayResponse): AddressSummary => {
  const accounts = res.walletinfo.accounts
  return accounts
    .flatMap((it) => it.branches)
    .flatMap((it) => it.entries)
    .reduce((acc, { address, status }) => {
      acc[address] = { address, status }
      return acc
    }, {} as AddressSummary)
}

const toFidelityBondSummary = (res: UtxosResponse): FidenlityBondSummary => {
  const fbOutputs = res.utxos
    .filter((utxo) => fb.utxo.isFidelityBond(utxo))
    .sort((a, b) => {
      const aLocked = fb.utxo.isLocked(a)
      const bLocked = fb.utxo.isLocked(b)

      if (aLocked && bLocked) {
        return b.value - a.value
      } else {
        return aLocked ? -1 : 1
      }
    })
  return {
    fbOutputs,
  }
}

const WalletContext = createContext<WalletContextEntry | undefined>(undefined)

const restoreWalletFromSession = (): CurrentWallet | null => {
  const session = getSession()
  return session && session.name && session.token
    ? {
        name: session.name,
        token: session.token,
      }
    : null
}

export const groupByJar = (utxos: Utxos): UtxosByJar => {
  return utxos.reduce((res, utxo) => {
    const { mixdepth } = utxo
    res[mixdepth] = res[mixdepth] || []
    res[mixdepth].push(utxo)
    return res
  }, {} as UtxosByJar)
}

const toWalletInfo = (data: CombinedRawWalletData): WalletInfo => {
  const balanceSummary = toBalanceSummary(data)
  const addressSummary = toAddressSummary(data.display)
  const fidelityBondSummary = toFidelityBondSummary(data.utxos)
  const utxosByJar = groupByJar(data.utxos.utxos)

  return {
    balanceSummary,
    addressSummary,
    fidelityBondSummary,
    utxosByJar,
    data,
  }
}

const toCombinedRawData = (utxos: UtxosResponse, display: WalletDisplayResponse) => ({ utxos, display })

const WalletProvider = ({ children }: PropsWithChildren<any>) => {
  const [currentWallet, setCurrentWallet] = useState(restoreWalletFromSession())

  const [utxoResponse, setUtxoResponse] = useState<UtxosResponse>()
  const [displayResponse, setDisplayResponse] = useState<WalletDisplayResponse>()

  const fetchUtxos = useCallback(
    async ({ signal }: { signal: AbortSignal }) => {
      if (!currentWallet) {
        throw new Error('Cannot load wallet info: Wallet not present')
      }

      const { name: walletName, token } = currentWallet
      return await Api.getWalletUtxos({ walletName, token, signal }).then(
        (res): Promise<UtxosResponse> => (res.ok ? res.json() : Api.Helper.throwError(res)),
      )
    },
    [currentWallet],
  )

  const fetchDisplay = useCallback(
    async ({ signal }: { signal: AbortSignal }) => {
      if (!currentWallet) {
        throw new Error('Cannot load wallet info: Wallet not present')
      }

      const { name: walletName, token } = currentWallet
      return await Api.getWalletDisplay({ walletName, token, signal }).then(
        (res): Promise<WalletDisplayResponse> => (res.ok ? res.json() : Api.Helper.throwError(res)),
      )
    },
    [currentWallet],
  )

  const reloadUtxos = useCallback(
    async ({ signal }: { signal: AbortSignal }) => {
      const response = await fetchUtxos({ signal })
      if (!signal.aborted) {
        setUtxoResponse(response)
      }
      return response
    },
    [fetchUtxos],
  )

  const reloadDisplay = useCallback(
    async ({ signal }: { signal: AbortSignal }) => {
      const response = await fetchDisplay({ signal })
      if (!signal.aborted) {
        setDisplayResponse(response)
      }
      return response
    },
    [fetchDisplay],
  )

  const reloadAll = useCallback(
    ({ signal }: { signal: AbortSignal }): Promise<WalletInfo> =>
      Promise.all([reloadUtxos({ signal }), reloadDisplay({ signal })])
        .then((data) => toCombinedRawData(data[0], data[1]))
        .then((raw) => toWalletInfo(raw)),
    [reloadUtxos, reloadDisplay],
  )

  const combinedRawData = useMemo<CombinedRawWalletData | undefined>(() => {
    if (!utxoResponse || !displayResponse) return
    return toCombinedRawData(utxoResponse, displayResponse)
  }, [utxoResponse, displayResponse])

  const currentWalletInfo = useMemo(() => {
    if (!combinedRawData) return
    return toWalletInfo(combinedRawData)
  }, [combinedRawData])

  const reloadCurrentWalletInfo = useMemo(
    () => ({
      reloadAll,
      reloadUtxos,
    }),
    [reloadAll, reloadUtxos],
  )

  useEffect(() => {
    if (!currentWallet) {
      setUtxoResponse(undefined)
      setDisplayResponse(undefined)
    }
  }, [currentWallet])

  return (
    <WalletContext.Provider
      value={{
        currentWallet,
        setCurrentWallet,
        currentWalletInfo,
        reloadCurrentWalletInfo,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

const useCurrentWallet = () => {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error('useCurrentWallet must be used within a WalletProvider')
  }
  return context.currentWallet
}

const useSetCurrentWallet = () => {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error('useSetCurrentWallet must be used within a WalletProvider')
  }
  return context.setCurrentWallet
}

const useCurrentWalletInfo = () => {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error('useCurrentWalletInfo must be used within a WalletProvider')
  }
  return context.currentWalletInfo
}

const useReloadCurrentWalletInfo = () => {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error('useReloadCurrentWalletInfo must be used within a WalletProvider')
  }
  return context.reloadCurrentWalletInfo
}

export {
  WalletContext,
  WalletProvider,
  useCurrentWallet,
  useSetCurrentWallet,
  useCurrentWalletInfo,
  useReloadCurrentWalletInfo,
}
