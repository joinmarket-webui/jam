import { useEffect, useState, useMemo } from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useSettings, useSettingsDispatch } from '../context/SettingsContext'
import { useCurrentWalletInfo, useReloadCurrentWalletInfo } from '../context/WalletContext'
import { walletDisplayName } from '../utils'
import { routes } from '../constants/routes'
import Balance from './Balance'
import Sprite from './Sprite'
import { ExtendedLink } from './ExtendedLink'
import { JarDetailsOverlay } from './jar_details/JarDetailsOverlay'
import { Jars } from './Jars'
import styles from './MainWalletView.module.css'

const WalletHeader = ({ name, balance /*: AmountSats */, unit, showBalance, loading }) => {
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
            valueString={`${balance}`}
            convertToUnit={unit}
            showBalance={showBalance || false}
            enableVisibilityToggle={false}
          />
        </h2>
      )}
    </div>
  )
}

export default function MainWalletView({ wallet }) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const settings = useSettings()
  const settingsDispatch = useSettingsDispatch()
  const currentWalletInfo = useCurrentWalletInfo()
  const reloadCurrentWalletInfo = useReloadCurrentWalletInfo()

  const [alert, setAlert] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showJars, setShowJars] = useState(false)

  const jars = useMemo(
    () => currentWalletInfo && currentWalletInfo.data.display.walletinfo.accounts,
    [currentWalletInfo]
  )

  const [selectedJarIndex, setSelectedJarIndex] = useState(0)
  const [isAccountOverlayShown, setIsAccountOverlayShown] = useState(false)

  const onJarClicked = (jarIndex) => {
    if (jarIndex === 0) {
      const isEmpty = currentWalletInfo?.balanceSummary.accountBalances[jarIndex]?.calculatedTotalBalanceInSats === 0

      if (isEmpty) {
        navigate(routes.receive, { state: { account: jarIndex } })
        return
      }
    }

    setSelectedJarIndex(jarIndex)
    setIsAccountOverlayShown(true)
  }

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
  }, [wallet, reloadCurrentWalletInfo, t])

  return (
    <div>
      {alert && (
        <rb.Row>
          <rb.Col>
            <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>
          </rb.Col>
        </rb.Row>
      )}

      {jars && isAccountOverlayShown && (
        <JarDetailsOverlay
          jars={jars}
          initialJarIndex={selectedJarIndex}
          walletInfo={currentWalletInfo}
          wallet={wallet}
          isShown={isAccountOverlayShown}
          onHide={() => setIsAccountOverlayShown(false)}
        />
      )}
      <rb.Row onClick={() => settingsDispatch({ showBalance: !settings.showBalance })} style={{ cursor: 'pointer' }}>
        <WalletHeader
          name={wallet.name}
          balance={currentWalletInfo?.balanceSummary.calculatedTotalBalanceInSats}
          unit={settings.unit}
          showBalance={settings.showBalance}
          loading={isLoading}
        />
      </rb.Row>
      <rb.Row className="mt-4 mb-5 d-flex justify-content-center">
        <rb.Col xs={10} md={8}>
          <rb.Row>
            <rb.Col>
              {/* Always receive on first mixdepth. */}
              <ExtendedLink
                to={routes.receive}
                state={{ account: 0 }}
                className={`${styles['send-receive-button']} btn btn-outline-dark w-100`}
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
              <ExtendedLink
                to={routes.send}
                className={`${styles['send-receive-button']} btn btn-outline-dark w-100`}
                disabled={isLoading}
              >
                <div className="d-flex justify-content-center align-items-center">
                  <Sprite symbol="send" width="24" height="24" />
                  <div className="ps-1">{t('current_wallet.button_withdraw')}</div>
                </div>
              </ExtendedLink>
            </rb.Col>
          </rb.Row>
        </rb.Col>
      </rb.Row>
      <rb.Collapse in={showJars}>
        <rb.Row>
          <div className="mb-5">
            <div>
              {isLoading ? (
                <rb.Placeholder as="div" animation="wave">
                  <rb.Placeholder className={styles['jars-placeholder']} />
                </rb.Placeholder>
              ) : (
                <Jars
                  accountBalances={currentWalletInfo?.balanceSummary.accountBalances}
                  totalBalance={currentWalletInfo?.balanceSummary.calculatedTotalBalanceInSats}
                  onClick={onJarClicked}
                />
              )}
            </div>
          </div>
        </rb.Row>
      </rb.Collapse>
      <rb.Row className="d-flex justify-content-center">
        <rb.Col xs={showJars ? 12 : 10} md={showJars ? 12 : 8}>
          <div className={styles['jars-divider-container']}>
            <hr className={styles['jars-divider-line']} />
            <div className={styles['jars-divider-button']} onClick={() => setShowJars((current) => !current)}>
              <Sprite symbol={showJars ? 'caret-up' : 'caret-down'} width="20" height="20" />
            </div>
            <hr className={styles['jars-divider-line']} />
          </div>
        </rb.Col>
      </rb.Row>
    </div>
  )
}
