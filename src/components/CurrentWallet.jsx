import React from 'react'
import { useState, useEffect } from 'react'
import * as rb from 'react-bootstrap'
import DisplayAccounts from './DisplayAccounts'
import DisplayUTXOs from './DisplayUTXOs'

export default function CurrentWallet ({ currentWallet }) {
  const [walletInfo, setWalletInfo] = useState(null)
  const [utxos, setUtxos] = useState(null)
  const [showUTXO, setShowUTXO] = useState(false)
  const [alert, setAlert] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    const abortCtrl = new AbortController()
    const { name, token } = currentWallet
    const opts = {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      signal: abortCtrl.signal
    }

    setAlert(null)
    setIsLoading(true)
    fetch(`/api/v1/wallet/${name}/display`, opts)
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(data => setWalletInfo(data.walletinfo))
      .catch(err => setAlert({ variant: 'danger', message: err.message }))
      .finally(() => setIsLoading(false))

    return () => abortCtrl.abort()
  }, [currentWallet])

  useEffect(() => {
    const abortCtrl = new AbortController()
    const { name, token } = currentWallet
    const opts = {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      signal: abortCtrl.signal
    }

    setAlert(null)
    setIsLoading(true)
    fetch(`/api/v1/wallet/${name}/utxos`, opts)
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(data => setUtxos(data.utxos))
      .catch(err => setAlert({ variant: 'danger', message: err.message }))
      .finally(() => setIsLoading(false))

    return () => abortCtrl.abort()
  }, [currentWallet])

  return (
    <div>
      <h1>{currentWallet.name}</h1>
      {walletInfo && <p>Total Balance: {walletInfo?.total_balance} BTC</p>}
      {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}
      {isLoading &&
        <>
          <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
          Loading
        </>}
      {walletInfo && <DisplayAccounts accounts={walletInfo.accounts} />}
      {utxos && <rb.Button onClick={() => { setShowUTXO(!showUTXO) }} className="my-3">{showUTXO ? 'Hide UTXOs' : 'Show UTXOs'}</rb.Button>}
      {utxos && showUTXO && <DisplayUTXOs utxos={utxos} className="mt-3"  />}
    </div>
  )
}
