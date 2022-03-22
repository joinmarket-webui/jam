import React, { useEffect, useState } from 'react'
import * as rb from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSettings, useSettingsDispatch } from '../context/SettingsContext'
import { useCurrentWallet, useCurrentWalletInfo, useSetCurrentWalletInfo } from '../context/WalletContext'
import Balance from './Balance'
import Sprite from './Sprite'
import { walletDisplayName } from '../utils'
import * as Api from '../libs/JmWalletApi'

const WalletHeader = ({ name, balance, unit, showBalance }) => {
  return (
    <div className="d-flex flex-column align-items-center">
      <h6 className="text-secondary">{walletDisplayName(name)}</h6>
      <h4>
        <Balance valueString={balance} convertToUnit={unit} showBalance={showBalance || false} />
      </h4>
    </div>
  )
}

const PrivacyLevels = ({ accounts }) => {
  const sortedAccounts = accounts.sort((lhs, rhs) => lhs.account - rhs.account)
  const numAccounts = sortedAccounts.length

  return (
    <div className="d-flex justify-content-center">
      <div className="d-flex flex-column align-items-start" style={{ gap: '1rem' }}>
        {sortedAccounts.map(({ account, account_balance: balance, branches }) => (
          <PrivacyLevel key={account} numAccounts={numAccounts} level={parseInt(account)} balance={balance} />
        ))}
      </div>
    </div>
  )
}

const PrivacyLevel = ({ numAccounts, level, balance }) => {
  const settings = useSettings()

  const filledShields = Array(level + 1)
    .fill()
    .map((_, index) => {
      return <Sprite key={index} symbol="shield-filled" width="24" height="30" />
    })
  const outlinedShields = Array(numAccounts - filledShields.length)
    .fill()
    .map((_, index) => {
      return <Sprite key={index} symbol="shield-outline" width="24" height="30" />
    })
  return (
    <div className="d-flex align-items-center">
      <div className={`d-flex privacy-level-${level}`}>
        {filledShields}
        {outlinedShields}
      </div>
      <div className="ps-2">
        <Balance valueString={balance} convertToUnit={settings.unit} showBalance={settings.showBalance} />
      </div>
    </div>
  )
}

export default function CurrentWalletMagic() {
  const { t } = useTranslation()
  const settings = useSettings()
  const settingsDispatch = useSettingsDispatch()
  const currentWallet = useCurrentWallet()
  const walletInfo = useCurrentWalletInfo()
  const setWalletInfo = useSetCurrentWalletInfo()

  const [alert, setAlert] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const abortCtrl = new AbortController()
    const { name: walletName, token } = currentWallet

    setAlert(null)
    setIsLoading(true)

    Api.getWalletDisplay({ walletName, token, signal: abortCtrl.signal })
      .then((res) => (res.ok ? res.json() : Api.Helper.throwError(res, t('current_wallet.error_loading_failed'))))
      .then((data) => setWalletInfo(data.walletinfo))
      .catch((err) => {
        !abortCtrl.signal.aborted && setAlert({ variant: 'danger', message: err.message })
      })
      .finally(() => !abortCtrl.signal.aborted && setIsLoading(false))

    return () => abortCtrl.abort()
  }, [currentWallet, setWalletInfo, t])

  return (
    <div className="privacy-levels">
      {alert && (
        <rb.Row>
          <rb.Col>
            <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>
          </rb.Col>
        </rb.Row>
      )}
      {isLoading && (
        <rb.Row className="justify-content-center">
          <rb.Col className="flex-grow-0">
            <div className="d-flex justify-content-center align-items-center">
              <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
              {t('current_wallet.text_loading')}
            </div>
          </rb.Col>
        </rb.Row>
      )}
      {!isLoading && currentWallet && walletInfo && (
        <>
          <rb.Row
            onClick={() => settingsDispatch({ showBalance: !settings.showBalance })}
            style={{ cursor: 'pointer' }}
          >
            <WalletHeader
              name={currentWallet.name}
              balance={walletInfo.total_balance}
              unit={settings.unit}
              showBalance={settings.showBalance}
            />
          </rb.Row>
          <rb.Row className="mt-4">
            <rb.Col>
              {/* Always receive on first mixdepth. */}
              <Link to="/receive" state={{ account: 0 }} className="btn btn-outline-dark w-100">
                {t('current_wallet.button_deposit')}
              </Link>
            </rb.Col>
            <rb.Col>
              {/* Todo: Withdrawing needs to factor in the privacy levels as well.
                Depending on the mixdepth/account there will be different amounts available. */}
              <Link to="/send" className="btn btn-outline-dark w-100">
                {t('current_wallet.button_withdraw')}
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
            <Link to="/" className="btn btn-outline-dark">
              <div className="d-flex justify-content-center align-items-center">
                <Sprite symbol="wallet" width="24" height="24" />
                <div className="ps-1">{t('current_wallet.button_switch_wallet')}</div>
              </div>
            </Link>
          </rb.Row>
        </>
      )}
    </div>
  )
}
