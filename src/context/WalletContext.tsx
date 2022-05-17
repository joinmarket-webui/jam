import React, { createContext, useEffect, useCallback, useState, useContext, PropsWithChildren } from 'react'

import { getSession } from '../session'
import * as Api from '../libs/JmWalletApi'

interface CurrentWallet {
  name: string
  token: string
}

// TODO: move these interfaces to JmWalletApi, once distinct types are used as return value instead of plain "Response"
type Utxo = {
  address: string
  path: string
  label: string
  value: number // in sats
  tries: number
  tries_remaining: number
  external: boolean
  mixdepth: number
  confirmations: number
  frozen: boolean
  utxo: string
  locktime?: string
}
export type Utxos = Utxo[]
interface UtxosResponse {
  utxos: Utxos
}
interface WalletDisplayResponse {
  walletinfo: WalletDisplayInfo
}

// caution: raw value is either "<total_and_available_balance>" or "<available_balance> (<total_balance>)"
export type BalanceString = `${number}.${string} (${number}.${string})` | `${number}.${string}`

interface WalletDisplayInfo {
  wallet_name: string
  total_balance: BalanceString
  accounts: Account[]
}

interface Account {
  account: string
  account_balance: BalanceString
  branches: Branch[]
}

interface Branch {
  branch: string
  balance: BalanceString
  entries: BranchEntry[]
}

interface BranchEntry {
  hd_path: string
  address: string
  amount: string
  status: string
  label: string
  extradata: string
}

interface WalletInfo {
  data: {
    utxos: UtxosResponse
    display: WalletDisplayResponse
  }
}

interface WalletContextEntry {
  currentWallet: CurrentWallet | null
  setCurrentWallet: React.Dispatch<React.SetStateAction<CurrentWallet | null>>
  currentWalletInfo: WalletInfo | null
  reloadCurrentWalletInfo: ({ signal }: { signal: AbortSignal }) => Promise<WalletInfo>
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

const loadWalletInfoData = async ({
  walletName,
  token,
  signal,
}: Api.WalletRequestContext & { signal: AbortSignal }): Promise<WalletInfo> => {
  const loadingWallet = Api.getWalletDisplay({ walletName, token, signal }).then(
    (res): Promise<WalletDisplayResponse> => (res.ok ? res.json() : Api.Helper.throwError(res))
  )

  const loadingUtxos = Api.getWalletUtxos({ walletName, token, signal }).then(
    (res): Promise<{ utxos: Utxos }> => (res.ok ? res.json() : Api.Helper.throwError(res))
  )

  const data = await Promise.all([loadingWallet, loadingUtxos])
  return {
    data: {
      display: data[0],
      utxos: data[1],
    },
  }
}

const WalletProvider = ({ children }: PropsWithChildren<any>) => {
  const [currentWallet, setCurrentWallet] = useState(restoreWalletFromSession())
  const [currentWalletInfo, setCurrentWalletInfo] = useState<WalletInfo | null>(null)

  const reloadCurrentWalletInfo = useCallback(
    async ({ signal }: { signal: AbortSignal }) => {
      if (!currentWallet) {
        throw new Error('Cannot load wallet info: Wallet not present')
      } else {
        const { name: walletName, token } = currentWallet
        return loadWalletInfoData({ walletName, token, signal }).then((walletInfo) => {
          if (!signal.aborted) {
            setCurrentWalletInfo(walletInfo)
          }
          return walletInfo
        })
      }
    },
    [currentWallet]
  )

  useEffect(() => {
    if (!currentWallet) {
      setCurrentWalletInfo(null)
      return
    }

    const abortCtrl = new AbortController()

    reloadCurrentWalletInfo({ signal: abortCtrl.signal })
      // If the auto-reloading on wallet change fails, the error can currently
      // only be logged and cannot be displayed to the user satisfactorily.
      // This might change in the future but is okay for now - components can
      // always trigger a reload on demand and inform the user as they see fit.
      .catch((err) => console.error(err))

    return () => {
      abortCtrl.abort()
    }
  }, [currentWallet, reloadCurrentWalletInfo])

  return (
    <WalletContext.Provider value={{ currentWallet, setCurrentWallet, currentWalletInfo, reloadCurrentWalletInfo }}>
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
  BranchEntry,
}
