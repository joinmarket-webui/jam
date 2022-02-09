import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as rb from 'react-bootstrap'
import Alert from './Alert'
import Wallet from './Wallet'
import { walletDisplayName } from '../utils'
import * as Api from '../libs/JmWalletApi'

export default function Wallets({ currentWallet, startWallet, stopWallet }) {
  const [walletList, setWalletList] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [alert, setAlert] = useState(
    currentWallet?.name && {
      variant: 'info',
      message: `There can be only one active wallet. If you want to open another wallet, please lock ${walletDisplayName(
        currentWallet.name
      )} first.`,
      dismissible: true,
    }
  )

  useEffect(() => {
    const abortCtrl = new AbortController()

    setIsLoading(true)
    Api.getWalletAll({ signal: abortCtrl.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.message || 'Loading wallets failed.'))))
      .then((data) => {
        const { wallets = [] } = data
        if (currentWallet) {
          wallets.sort((a, b) => b === currentWallet.name)
        }
        setWalletList(wallets)
        if (wallets.length === 0) {
          setAlert({
            variant: 'info',
            message: 'It looks like you do not have a wallet, yet. Please create one first.',
            dismissible: true,
          })
        }
      })
      .catch((err) => {
        if (!abortCtrl.signal.aborted) {
          setAlert({ variant: 'danger', message: err.message })
        }
      })
      .finally(() => setIsLoading(false))

    return () => abortCtrl.abort()
  }, [currentWallet])

  return (
    <>
      <h2 className="text-center">Your wallets</h2>
      {alert && <Alert {...alert} />}
      {isLoading && (
        <div>
          <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
          Loading wallets
        </div>
      )}
      <rb.Row className="justify-content-center">
        <rb.Col md={10} lg={8} xl={6}>
          <div className="border-top px-3"></div>
        </rb.Col>
      </rb.Row>
      {walletList?.map((wallet) => (
        <Wallet
          key={wallet}
          name={wallet}
          currentWallet={currentWallet}
          startWallet={startWallet}
          stopWallet={stopWallet}
          setAlert={setAlert}
        />
      ))}
      <div className="d-flex justify-content-center">
        <Link
          to="/create-wallet"
          className={`btn mt-3 weight py-1 px-3 ${walletList?.length === 0 ? 'btn-dark' : 'btn-outline-dark'}`}
        >
          Create new wallet
        </Link>
      </div>
    </>
  )
}
