import React, { useEffect, useState } from 'react'
import * as rb from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { useSettings } from '../context/SettingsContext'
import { useCurrentWallet, useCurrentWalletInfo, useSetCurrentWalletInfo } from '../context/WalletContext'
import Balance from './Balance'
import Sprite from './Sprite'
import { walletDisplayName } from '../utils'

const WalletHeader = ({ name, balance, unit, showBalance }) => {
  return (
    <div className="d-flex flex-column align-items-center">
      <h6 className="text-secondary">{walletDisplayName(name)}</h6>
      <h4>
        <Balance value={balance} unit={unit} showBalance={showBalance || false} />
      </h4>
    </div>
  )
}

const PrivacyLevels = ({ accounts }) => {
  const sortedAccounts = accounts.sort((lhs, rhs) => lhs.account - rhs.account).reverse()

  return (
    <div className="d-flex justify-content-center">
      <div className="d-flex flex-column align-items-start" style={{ gap: '1rem' }}>
        {sortedAccounts.map(({ account, account_balance: balance, branches }) => (
          <PrivacyLevel key={account} level={parseInt(account)} balance={balance} />
        ))}
      </div>
    </div>
  )
}

const PrivacyLevel = ({ level, balance }) => {
  const settings = useSettings()

  const filledShields = Array(level + 1)
    .fill()
    .map((_, index) => {
      return <Sprite key={index} symbol="shield-filled" width="24" height="30" />
    }) // todo: no IE support. fine?
  const outlienedShields = Array(5 - filledShields.length)
    .fill()
    .map((_, index) => {
      return <Sprite key={index} symbol="shield-outline" width="24" height="30" />
    }) // todo: no IE support. fine?
  return (
    <div className="d-flex align-items-center">
      <div className={`d-flex privacy-level-${level}`}>
        {filledShields}
        {outlienedShields}
      </div>
      <div className="ps-2">
        <Balance value={balance} unit={settings.unit} showBalance={settings.showBalance} />
      </div>
    </div>
  )
}

export default function CurrentWallet() {
  const settings = useSettings()
  const wallet = useCurrentWallet()
  const walletInfo = useCurrentWalletInfo()
  const setWalletInfo = useSetCurrentWalletInfo()

  const [alert, setAlert] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const abortCtrl = new AbortController()
    const { name, token } = wallet
    const opts = {
      headers: { Authorization: `Bearer ${token}` },
      signal: abortCtrl.signal,
    }

    setAlert(null)
    setIsLoading(true)

    fetch(`/api/v1/wallet/${name}/display`, opts)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.message || 'Loading wallet failed.'))))
      .then((data) => setWalletInfo(data.walletinfo))
      .catch((err) => {
        !abortCtrl.signal.aborted && setAlert({ variant: 'danger', message: err.message })
      })
      .finally(() => setIsLoading(false))

    return () => abortCtrl.abort()
  }, [wallet, setWalletInfo])

  return (
    <rb.Container fluid className="privacy-levels">
      {alert && (
        <rb.Row>
          <rb.Col>
            <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>
          </rb.Col>
        </rb.Row>
      )}
      {isLoading && (
        <rb.Row>
          <rb.Col>
            <div className="mb-3">
              <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
              Loading
            </div>
          </rb.Col>
        </rb.Row>
      )}
      {!isLoading && wallet && walletInfo && (
        <rb.Row className="justify-content-center">
          <rb.Col xs={10} sm={8} md={6} lg={4}>
            <rb.Row>
              <WalletHeader
                name={wallet.name}
                balance={walletInfo.total_balance}
                unit={settings.unit}
                showBalance={settings.showBalance}
              />
            </rb.Row>
            <rb.Row className="mt-4">
              <rb.Col>
                <Link to="/receive" className="btn btn-outline-dark w-100">
                  Deposit
                </Link>
              </rb.Col>
              <rb.Col>
                <Link to="/send" className="btn btn-outline-dark w-100">
                  Withdraw
                </Link>
              </rb.Col>
            </rb.Row>
            <rb.Row>
              <hr className="my-4" />
            </rb.Row>
            <rb.Row>
              <PrivacyLevels accounts={walletInfo.accounts} />
            </rb.Row>
            <rb.Row>
              <hr className="my-4" />
            </rb.Row>
            <rb.Row>
              <Link to="/advancedwallet" className="btn btn-outline-dark">
                Show Advanced View
              </Link>
            </rb.Row>
          </rb.Col>
        </rb.Row>
      )}
    </rb.Container>
  )
}
