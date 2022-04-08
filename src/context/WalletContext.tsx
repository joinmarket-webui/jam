import React, { createContext, useEffect, useState, useContext, PropsWithChildren } from 'react'

import { getSession } from '../session'

interface CurrentWallet {
  name: string
  token: string
}

// TODO: move these interfaces to JmWalletApi, once distinct types are used as return value instead of plain "Response"
interface WalletInfo {
  wallet_name: string
  total_balance: string
  accounts: Account[]
}

interface Account {
  account: string
  account_balance: string
  branches: Branch[]
}

interface Branch {
  branch: string
  balance: string
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

interface WalletContextEntry {
  currentWallet: CurrentWallet | null
  setCurrentWallet: React.Dispatch<React.SetStateAction<CurrentWallet | null>>
  currentWalletInfo: WalletInfo | null
  setCurrentWalletInfo: React.Dispatch<React.SetStateAction<WalletInfo | null>>
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

const WalletProvider = ({ children }: PropsWithChildren<any>) => {
  const [currentWallet, setCurrentWallet] = useState(restoreWalletFromSession())
  const [currentWalletInfo, setCurrentWalletInfo] = useState<WalletInfo | null>(null)

  useEffect(() => {
    if (!currentWallet) {
      setCurrentWalletInfo(null)
    }
  }, [currentWallet])

  return (
    <WalletContext.Provider value={{ currentWallet, setCurrentWallet, currentWalletInfo, setCurrentWalletInfo }}>
      {children}
    </WalletContext.Provider>
  )
}

const useCurrentWallet = () => {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context.currentWallet
}

const useSetCurrentWallet = () => {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error('useSetWallet must be used within a WalletProvider')
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

const useSetCurrentWalletInfo = () => {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error('useSetCurrentWalletInfo must be used within a WalletProvider')
  }
  return context.setCurrentWalletInfo
}

export {
  WalletContext,
  WalletProvider,
  useCurrentWallet,
  useSetCurrentWallet,
  useCurrentWalletInfo,
  useSetCurrentWalletInfo,
}
