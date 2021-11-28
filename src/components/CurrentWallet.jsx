import React from 'react'
import { useState, useEffect } from 'react'
import * as rb from 'react-bootstrap'
import DisplayAccounts from './DisplayAccounts'
import DisplayUTXOs from './DisplayUTXOs'

export default function CurrentWallet ({ currentWallet, activeWallet, onSend, listUTXOs }) {
  const [walletInfo, setWalletInfo] = useState(null)
  const [UTXOHistory, setUTXOHistory] = useState(null)
  const [showUTXO, setShowUTXO] = useState(false)
  const [alert, setAlert] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const listWalletInfo = async () => {
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

  useEffect(() => {
    const { name, token } = currentWallet
    if (!token) {
      return setAlert({ variant: 'warning', message: `Please unlock ${name} first` })
    }

    const ws = new WebSocket(`ws://${window.location.hostname}:${window.location.port}`)
    ws.onopen = event => {
      console.log('connected to websocket')
      ws.send(token)
    }
    ws.onmessage = event => {
      // For now we only have one message type, namely the transaction notification:
      // For now, note that since the `getUtxos` function is called on every render of
      // the display page, we don't need to somehow use this data other than as some
      // kind of popup/status bar notifier.
      // In future it might be possible to use the detailed transaction deserialization
      // passed in this notification, for something.
      const wsdata = JSON.parse(event.data)
      console.log(`Websocket sent: ${wsdata.txid}`)
    }

    const getWalletInfo = async () => {
      const walletInfo = await listWalletInfo()
      setWalletInfo(walletInfo)
    }

    const getUTXOs = async () => {
      const utxos = await listUTXOs()
      setUTXOHistory(utxos)
    }

    getWalletInfo()
    getUTXOs()
  }, [])

  return (
    <div>
      <h1>{activeWallet}</h1>
      {walletInfo && <p>Total Balance: {walletInfo?.total_balance} BTC</p>}
      {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}
      {isLoading &&
        <>
          <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
          Loading
        </>}
      {walletInfo && <DisplayAccounts accounts={walletInfo.accounts} />}
      <p></p>
      {UTXOHistory && <rb.Button onClick={() => { setShowUTXO(!showUTXO) }}>{showUTXO ? 'Hide UTXOs' : 'Show UTXOs'}</rb.Button>}
      <p></p>
      {UTXOHistory && showUTXO && <DisplayUTXOs utxos={UTXOHistory} />}
    </div>
  )
}
