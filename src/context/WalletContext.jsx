import React, { createContext, useState, useContext } from 'react'

const WalletContext = createContext()

const WalletProvider = ({ children }) => {
  const [currentWallet, setCurrentWallet] = useState(null)
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

export { WalletProvider, useCurrentWallet, useSetCurrentWallet, useCurrentWalletInfo, useSetCurrentWalletInfo }
