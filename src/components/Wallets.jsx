import React, { useState } from 'react'
import Alert from './Alert'
import Wallet from './Wallet'

export default function Wallets({ currentWallet, walletList, startWallet, stopWallet }) {
  const [alert, setAlert] = useState(currentWallet &&
    {
      variant: 'info',
      message: `There can be only one active wallet. If you want to open another wallet, please lock ${currentWallet.name} first.`,
      dismissible: true
    })

  return (
    <>
      <h1>Wallets</h1>
      {alert && <Alert {...alert} />}
      {walletList.map(wallet =>
        <Wallet key={wallet} name={wallet} currentWallet={currentWallet} startWallet={startWallet} stopWallet={stopWallet} setAlert={setAlert} />)}
    </>
  )
}
