import React from 'react'
import { useState, useEffect } from 'react'
import * as rb from 'react-bootstrap'
import DisplayMixdepths from './DisplayMixdepths'
import DisplayUTXOs from './DisplayUTXOs'

export default function CurrentWallet ({ currentWallet, activeWallet, onSend, listUTXOs }) {
  const [wallet_info, setWalletInfo] = useState(null)
  const [UTXOHistory, setUTXOHistory] = useState(null)
  const [showUTXO, setShowUTXO] = useState(false)
  const [alert, setAlert] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const listWalletInfo = async () => {
    const { name, token } = currentWallet

    if (!token ) {
      return alert(`Please unlock ${name} first`)
    }

    setAlert(null)
    setIsLoading(true)
    try {
      const res = await fetch(`/api/v1/wallet/${name}/display`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (res.ok) {
        const { walletinfo } = await res.json()
        const balance = walletinfo.total_balance
        const mix_depths = walletinfo.accounts
        const wallet_info = { balance }
        wallet_info[mix_depths[0].account] = mix_depths[0].account_balance
        wallet_info[mix_depths[1].account] = mix_depths[1].account_balance
        wallet_info[mix_depths[2].account] = mix_depths[2].account_balance
        wallet_info[mix_depths[3].account] = mix_depths[3].account_balance
        wallet_info[mix_depths[4].account] = mix_depths[4].account_balance

        return [walletinfo]
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
      return alert(`Please unlock ${name} first`)
    }

    const ws = new WebSocket(`ws://${window.location.hostname}:${window.location.port}`)
    ws.onopen = event => {
      console.log('connected to websocket')
      ws.send(token)
    }
    ws.onmessage = (event) => {
      // For now we only have one message type,
      // namely the transaction notification:
      // For now, note that since the `getUtxos` function
      // is called on every render of the display page,
      // we don't need to somehow use this data other
      // than as some kind of popup/status bar notifier.
      // In future it might be possible to use the detailed
      // transaction deserialization passed in this notification,
      // for something.
      var wsdata = JSON.parse(event.data)
      console.log(`Websocket sent: ${wsdata.txid}`)
    }
    const getWalletInfo = async () => {
      const wallet_info = await listWalletInfo()
      setWalletInfo(wallet_info)
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
      {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}
      {isLoading &&
        <>
          <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
          Loading
        </>}
      {wallet_info?.map((walletInfo) => <DisplayMixdepths walletInfo={walletInfo} />)}
      <p></p>
      {UTXOHistory && <rb.Button onClick={() => { setShowUTXO(!showUTXO) }}>{showUTXO ? 'Hide UTXOs' : 'Show UTXOs'}</rb.Button>}
      <p></p>
      {UTXOHistory && showUTXO && <DisplayUTXOs utxos={UTXOHistory} />}
    </div>
  )
}
