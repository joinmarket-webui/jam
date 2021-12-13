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

  const fetchWalletInfo = async () => {
    const { name, token } = currentWallet

    setAlert(null)
    setIsLoading(true)
    try {
      const res = await fetch(`/api/v1/wallet/${name}/display`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (res.ok) {
        const data = await res.json()
        return data.walletinfo
      } else {
        const { message } = await res.json()
        setAlert({ variant: 'danger', message })
      }
    } catch (e) {
      setAlert({ variant: 'danger', message: e.message })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchUTXOs = async () => {
    const { name, token } = currentWallet

    try {
      const res = await fetch(`/api/v1/wallet/${name}/utxos`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const { utxos } = await res.json()
      return utxos
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    const getWalletInfo = async () => {
      const walletInfo = await fetchWalletInfo()
      setWalletInfo(walletInfo)
    }

    const getUTXOs = async () => {
      const utxos = await fetchUTXOs()
      setUtxos(utxos)
    }

    getWalletInfo()
    getUTXOs()
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
