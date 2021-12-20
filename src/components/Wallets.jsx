import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as rb from 'react-bootstrap'
import Alert from './Alert'
import Wallet from './Wallet'

export default function Wallets({ currentWallet, startWallet, stopWallet }) {
  const [walletList, setWalletList] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [alert, setAlert] = useState(currentWallet?.name && {
    variant: 'info',
    message: `There can be only one active wallet. If you want to open another wallet, please lock ${currentWallet.name} first.`,
    dismissible: true
  })

  useEffect(() => {
    const abortCtrl = new AbortController()
    const opts = { signal: abortCtrl.signal }

    setIsLoading('Loading wallets')
    fetch('/api/v1/wallet/all', opts)
      .then(res => res.ok ? res.json() : Promise.reject(new Error(res.message || 'Loading wallets failed.')))
      .then(data => {
        const { wallets = [] } = data
        if (currentWallet) {
          wallets.sort((a, b) => b === currentWallet.name)
        }
        setWalletList(wallets)
      })
      .catch(err => {
        if (!abortCtrl.signal.aborted) {
          setAlert({ variant: 'danger', message: err.message })
        }
      })
      .finally(() => setIsLoading(false))

    return () => abortCtrl.abort()
  }, [currentWallet])

  return (
    <>
      <h1>Wallets</h1>
      {alert && <Alert {...alert} />}
      {isLoading &&
        <div>
          <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
          Loading wallets
        </div>}
      {walletList?.map(wallet =>
        <Wallet key={wallet} name={wallet} currentWallet={currentWallet} startWallet={startWallet} stopWallet={stopWallet} setAlert={setAlert} />)}

      <Link to="/create-wallet" className={`btn mt-4 ${walletList?.length === 0 ? 'btn-dark' : 'btn-outline-dark'}`}>Create Wallet</Link>
    </>
  )
}
