import React, { useEffect, useState, useMemo, useCallback } from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { useSettings, useSettingsDispatch } from '../context/SettingsContext'
import { useCurrentWallet, useCurrentWalletInfo, useReloadCurrentWalletInfo } from '../context/WalletContext'
import Balance from './Balance'
import Sprite from './Sprite'
import { walletDisplayName } from '../utils'
import styles from './CurrentWalletMagic.module.css'
import { ExtendedLink } from './ExtendedLink'
import { routes } from '../constants/routes'
import { useBalanceSummary } from '../hooks/BalanceSummary'
import { DisplayAccountsOverlay } from './DisplayAccountsOverlay'

const WalletHeader = ({ name, balance, unit, showBalance, loading }) => {
  return (
    <div className="d-flex flex-column align-items-center">
      {loading && (
        <rb.Placeholder as="div" animation="wave">
          <rb.Placeholder className={styles['wallet-header-title-placeholder']} />
        </rb.Placeholder>
      )}
      {!loading && <h1 className="text-secondary fs-6">{walletDisplayName(name)}</h1>}
      {loading && (
        <rb.Placeholder as="div" animation="wave">
          <rb.Placeholder className={styles['wallet-header-subtitle-placeholder']} />
        </rb.Placeholder>
      )}
      {!loading && (
        <h2>
          <Balance
            valueString={balance}
            convertToUnit={unit}
            showBalance={showBalance || false}
            enableVisibilityToggle={false}
          />
        </h2>
      )}
    </div>
  )
}

const PrivacyLevels = ({ accountBalances, loading, onAccountClicked }) => {
  const numPrivacyLevelsPalceholders = 5
  const sortedAccountBalances = useMemo(() => {
    if (!accountBalances) return []
    return Object.values(accountBalances).sort((lhs, rhs) => lhs.accountIndex - rhs.accountIndex)
  }, [accountBalances])

  return (
    <div className="d-flex justify-content-center">
      <div className="d-flex flex-column align-items-start" style={{ gap: '1rem' }}>
        {loading
          ? Array(numPrivacyLevelsPalceholders)
              .fill('')
              .map((_, index) => <LoadingPrivacyLevel key={index} level={numPrivacyLevelsPalceholders} />)
          : sortedAccountBalances.map(({ accountIndex, totalBalance }) => (
              <PrivacyLevel
                key={accountIndex}
                numAccounts={sortedAccountBalances.length}
                level={accountIndex}
                balance={totalBalance}
                loading={loading}
                onClick={onAccountClicked}
              />
            ))}
      </div>
    </div>
  )
}

const LoadingPrivacyLevel = ({ level }) => {
  const loadingShields = Array(level)
    .fill('')
    .map((_, index) => {
      return <Sprite key={index} symbol="shield-filled-loading" width="24" height="30" />
    })

  return (
    <div className="d-flex align-items-center" style={{ cursor: 'wait' }}>
      <div className="d-flex">{loadingShields}</div>
      <div className="ps-2">
        <Balance loading={true} />
      </div>
    </div>
  )
}

const PrivacyLevel = ({ numAccounts, level, balance, onClick }) => {
  const settings = useSettings()

  const filledShields = Array(level + 1)
    .fill('')
    .map((_, index) => {
      return <Sprite key={index} symbol="shield-filled" width="24" height="30" />
    })
  const outlinedShields = Array(numAccounts - filledShields.length)
    .fill('')
    .map((_, index) => {
      return <Sprite key={index} symbol="shield-outline" width="24" height="30" />
    })

  return (
    <div className="d-flex align-items-center" onClick={() => onClick && onClick(level)} style={{ cursor: 'pointer' }}>
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
  const currentWalletInfo = useCurrentWalletInfo()
  const balanceSummary = useBalanceSummary(currentWalletInfo)
  const reloadCurrentWalletInfo = useReloadCurrentWalletInfo()

  const [alert, setAlert] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const accounts = useMemo(
    () => currentWalletInfo && currentWalletInfo.data.display.walletinfo.accounts,
    [currentWalletInfo]
  )
  const [selectedAccountIndex, setSelectedAccountIndex] = useState(0)
  const [isAccountOverlayShown, setIsAccountOverlayShown] = useState(false)

  const onAccountClicked = useCallback((accountIndex) => {
    setSelectedAccountIndex(accountIndex)
    setIsAccountOverlayShown(true)
  }, [])

  useEffect(() => {
    const abortCtrl = new AbortController()

    setAlert(null)
    setIsLoading(true)

    reloadCurrentWalletInfo({ signal: abortCtrl.signal })
      .catch((err) => {
        const message = err.message || t('current_wallet.error_loading_failed')
        !abortCtrl.signal.aborted && setAlert({ variant: 'danger', message })
      })
      .finally(() => !abortCtrl.signal.aborted && setIsLoading(false))

    return () => abortCtrl.abort()
  }, [currentWallet, reloadCurrentWalletInfo, t])

  return (
    <>
      {accounts && (
        <DisplayAccountsOverlay
          accounts={accounts}
          selectedAccountIndex={selectedAccountIndex}
          show={isAccountOverlayShown}
          onHide={() => setIsAccountOverlayShown(false)}
        />
      )}
      <div className="privacy-levels">
        {alert && (
          <rb.Row>
            <rb.Col>
              <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>
            </rb.Col>
          </rb.Row>
        )}
        <>
          <rb.Row
            onClick={() => settingsDispatch({ showBalance: !settings.showBalance })}
            style={{ cursor: 'pointer' }}
          >
            <WalletHeader
              name={currentWallet?.name}
              balance={balanceSummary?.totalBalance}
              unit={settings.unit}
              showBalance={settings.showBalance}
              loading={isLoading}
            />
          </rb.Row>
          <rb.Row className="mt-4">
            <rb.Col>
              {/* Always receive on first mixdepth. */}
              <ExtendedLink
                to={routes.receive}
                state={{ account: 0 }}
                className="btn btn-outline-dark w-100"
                disabled={isLoading}
              >
                <div className="d-flex justify-content-center align-items-center">
                  <Sprite symbol="receive" width="24" height="24" />
                  <div className="ps-1">{t('current_wallet.button_deposit')}</div>
                </div>
              </ExtendedLink>
            </rb.Col>
            <rb.Col>
              {/* Todo: Withdrawing needs to factor in the privacy levels as well.
              Depending on the mixdepth/account there will be different amounts available. */}
              <ExtendedLink to={routes.send} className="btn btn-outline-dark w-100" disabled={isLoading}>
                <div className="d-flex justify-content-center align-items-center">
                  <Sprite symbol="send" width="24" height="24" />
                  <div className="ps-1">{t('current_wallet.button_withdraw')}</div>
                </div>
              </ExtendedLink>
            </rb.Col>
          </rb.Row>
          <rb.Row>
            <hr className="my-4" />
          </rb.Row>
          <rb.Row>
            <PrivacyLevels
              accountBalances={balanceSummary?.accountBalances}
              loading={isLoading}
              onAccountClicked={onAccountClicked}
            />
          </rb.Row>
          <rb.Row>
            <hr className="my-4" />
          </rb.Row>
        </>
      </div>
    </>
  )
}
