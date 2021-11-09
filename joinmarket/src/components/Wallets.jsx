import React, { useState } from 'react'
import Alert from './Alert'
import Wallet from './Wallet'

export default function Wallets({ currentWallet, activeWallet, walletList, onDisplay }) {
  const [alert, setAlert] = useState(activeWallet
    ? {
      variant: 'info',
      message: `There can be only one active wallet. If you want to open another wallet, please lock ${activeWallet} first.`,
      dismissible: true
    }
    : null)

  return (
    <>
      <h1>Wallets</h1>
      {alert
        ? <Alert {...alert} />
        : null}
      {walletList.map(wallet =>
        <Wallet key={wallet} name={wallet} currentWallet={currentWallet} activeWallet={activeWallet} setAlert={setAlert} onDisplay={onDisplay} />)}
    </>
  )
}
