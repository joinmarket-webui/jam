import React, { useState, useEffect } from 'react'
import * as rb from 'react-bootstrap'
import DisplayAccounts from './DisplayAccounts'
import DisplayAccountUTXOs from './DisplayAccountUTXOs'
import DisplayUTXOs from './DisplayUTXOs'
import { useCurrentWallet, useCurrentWalletInfo, useSetCurrentWalletInfo } from '../context/WalletContext'
import * as Api from '../libs/JmWalletApi'

export default function CurrentWalletAdvanced() {
  const currentWallet = useCurrentWallet()
  const walletInfo = useCurrentWalletInfo()
  const setWalletInfo = useSetCurrentWalletInfo()
  const [fidelityBonds, setFidelityBonds] = useState(null)
  const [utxos, setUtxos] = useState(null)
  const [showUTXO, setShowUTXO] = useState(false)
  const [alert, setAlert] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const abortCtrl = new AbortController()
    const { name, token } = currentWallet

    const setUtxoData = (utxos) => {
      setUtxos(utxos)
      setFidelityBonds(utxos.filter((utxo) => utxo.locktime))
    }

    setAlert(null)
    setIsLoading(true)

    const loadingWallet = Api.getWalletDisplay({ walletName: name, token, signal: abortCtrl.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.message || 'Loading wallet failed.'))))
      .then((data) => setWalletInfo(data.walletinfo))
      .catch((err) => {
        !abortCtrl.signal.aborted && setAlert({ variant: 'danger', message: err.message })
      })

    const loadingUtxos = Api.getWalletUtxos({ walletName: name, token, signal: abortCtrl.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.message || 'Loading UTXOs failed.'))))
      .then((data) => setUtxoData(data.utxos))
      .catch((err) => {
        !abortCtrl.signal.aborted && setAlert({ variant: 'danger', message: err.message })
      })

    Promise.all([loadingWallet, loadingUtxos]).finally(() => !abortCtrl.signal.aborted && setIsLoading(false))

    return () => abortCtrl.abort()
  }, [currentWallet, setWalletInfo])

  return (
    <div>
      {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}
      {isLoading && (
        <rb.Row className="justify-content-center">
          <rb.Col className="flex-grow-0">
            <div className="d-flex mb-3">
              <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
              Loading
            </div>
          </rb.Col>
        </rb.Row>
      )}
      {!isLoading && walletInfo && <DisplayAccounts accounts={walletInfo.accounts} className="mb-4" />}
      {!!fidelityBonds?.length && (
        <div className="mt-5 mb-3 pe-3">
          <h5>Fidelity Bonds</h5>
          <DisplayUTXOs utxos={fidelityBonds} className="pe-2" />
        </div>
      )}
      {utxos && (
        <rb.Button
          variant="outline-dark"
          onClick={() => {
            setShowUTXO(!showUTXO)
          }}
          className="mb-3"
        >
          {showUTXO ? 'Hide UTXOs' : 'Show UTXOs'}
        </rb.Button>
      )}
      {utxos && showUTXO && <DisplayAccountUTXOs utxos={utxos} className="mt-3" />}
    </div>
  )
}
