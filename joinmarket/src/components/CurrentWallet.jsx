import React from 'react'
import { useState, useEffect } from 'react'
import { Button } from './Button'
import DisplayMixdepth from './DisplayMixdepth'
import DisplayUTXOs from './DisplayUTXOs'

const CurrentWallet = ({ currentWallet, activeWallet, onSend, listUTXOs }) => {
  const [wallet_info, setWalletInfo] = useState([])
  const [UTXOHistory, setUTXOHistory] = useState({})
  const [showUTXO, setShowUTXO] = useState(false)

  const listWalletInfo = async () => {
    const { name, token } = currentWallet

    if (!token ) {
      return alert(`Please unlock ${name} first`)
    }

    try {
      const res = await fetch(`/api/v1/wallet/${name}/display`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
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
    } catch (e) {
      console.error(e)
      alert('Error while loading.')
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
      console.log(wallet_info)
      setWalletInfo(wallet_info)
    }

    const getUTXOs = async () => {
      const utxos = await listUTXOs()
      setUTXOHistory(utxos)
      console.log(utxos)
    }

    getWalletInfo()
    getUTXOs()
  }, [])

  return (
    <div>
      <h1>{activeWallet}</h1>
      {wallet_info?.map((walletInfo, index) => {
        return <DisplayMixdepth key={index} walletInfo={walletInfo}></DisplayMixdepth>
      })}
      <p></p>
      <Button onClick={() => { setShowUTXO(!showUTXO) }}>{showUTXO ? 'Hide UTXOs' : 'Show UTXOs'}</Button>
      <p></p>
      { showUTXO
        ? Object.entries(UTXOHistory).map(([key, val]) =>
            <DisplayUTXOs key={key} utxoID={key} utxo={val}> </DisplayUTXOs>
          )
        : null
      }
    </div>
  )
}

export default CurrentWallet
