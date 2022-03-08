import React, { createContext, useState, useContext } from 'react'

import { getSession } from '../session'

const WalletContext = createContext()

const initialWalletFromSession = () => {
  const session = getSession()
  return !(session && session.name && session.token)
    ? null
    : {
        name: session.name,
        token: session.token,
      }
}

const WalletProvider = ({ children }) => {
  const [currentWallet, setCurrentWallet] = useState(initialWalletFromSession())
  const [currentWalletInfo, setCurrentWalletInfo] = useState(null)

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
