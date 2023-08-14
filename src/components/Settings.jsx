import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import Sprite from './Sprite'
import Alert from './Alert'
import { LogOverlay } from './LogOverlay'
import { ConfirmModal } from './Modal'
import { useSettings, useSettingsDispatch } from '../context/SettingsContext'
import { useServiceInfo } from '../context/ServiceInfoContext'
import { SATS, BTC } from '../utils'
import * as Api from '../libs/JmWalletApi'
import { fetchFeatures } from '../libs/JamApi'
import { routes } from '../constants/routes'
import languages from '../i18n/languages'
import styles from './Settings.module.css'
import SeedModal from './settings/SeedModal'
import FeeConfigModal from './settings/FeeConfigModal'
import { isDebugFeatureEnabled } from '../constants/debugFeatures'

export default function Settings({ wallet, stopWallet }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const settings = useSettings()
  const settingsDispatch = useSettingsDispatch()
  const serviceInfo = useServiceInfo()

  const [showingSeed, setShowingSeed] = useState(false)
  const [showingFeeConfig, setShowingFeeConfig] = useState(false)
  const [lockingWallet, setLockingWallet] = useState(false)
  const [showConfirmLockModal, setShowConfirmLockModal] = useState(null)
  const [showLogsEnabled, setShowLogsEnabled] = useState(false)
  const [showingLogs, setShowingLogs] = useState(false)
  const [alert, setAlert] = useState(null)

  const setTheme = (theme) => {
    if (window.JM.THEMES.includes(theme)) {
      document.documentElement.setAttribute(window.JM.THEME_ROOT_ATTR, theme)
      settingsDispatch({ theme })
    }
  }

  const isSats = settings.unit === SATS
  const isLightTheme = settings.theme === window.JM.THEMES[0]

  const lockWallet = useCallback(
    async ({ force, destination }) => {
      if (!force && (serviceInfo.coinjoinInProgress || serviceInfo.makerRunning)) {
        setShowConfirmLockModal({ destination })
        return
      }

      setLockingWallet(true)

      try {
        const { name: walletName, token } = wallet
        const res = await Api.getWalletLock({ walletName, token })

        setLockingWallet(false)
        if (res.ok || res.status === 401) {
          stopWallet()
          navigate(destination)
        } else {
          await Api.Helper.throwError(res)
        }
      } catch (e) {
        setLockingWallet(false)
        setAlert({ variant: 'danger', dismissible: false, message: e.message })
      }
    },
    [wallet, stopWallet, navigate, serviceInfo]
  )

  useEffect(() => {
    const abortCtrl = new AbortController()
    fetchFeatures({ token: wallet.token, signal: abortCtrl.signal })
      .then((res) => (res.ok ? res.json() : Api.Helper.throwError(res)))
      .then((data) => data && data.features)
      .then((features) => {
        if (abortCtrl.signal.aborted) return
        setShowLogsEnabled(features && features.logs === true)
      })
      .catch((_) => {
        if (abortCtrl.signal.aborted) return
        setShowLogsEnabled(false)
      })

    return () => {
      abortCtrl.abort()
    }
  }, [wallet])

  return (
    <div className={styles.settings}>
      <div className="d-flex flex-column gap-3">
        <div className={styles['section-title']}>{t('settings.section_title_display')}</div>
        {alert && <Alert {...alert} />}
        <ConfirmModal
          isShown={showConfirmLockModal}
          title={t('wallets.wallet_preview.modal_lock_wallet_title')}
          onCancel={() => setShowConfirmLockModal(null)}
          onConfirm={() => {
            setShowConfirmLockModal(null)
            lockWallet({ force: true, destination: showConfirmLockModal?.destination })
          }}
        >
          {(serviceInfo?.makerRunning
            ? t('wallets.wallet_preview.modal_lock_wallet_maker_running_text')
            : t('wallets.wallet_preview.modal_lock_wallet_coinjoin_in_progress_text')) +
            ' ' +
            t('wallets.wallet_preview.modal_lock_wallet_alternative_action_text')}
        </ConfirmModal>
        <div className={styles['settings-group-container']}>
          <rb.Button
            variant="outline-dark"
            className={styles['settings-btn']}
            onClick={() => settingsDispatch({ showBalance: !settings.showBalance })}
          >
            <Sprite symbol={settings.showBalance ? 'hide' : 'show'} width="24" height="24" />
            {settings.showBalance ? t('settings.hide_balance') : t('settings.show_balance')}
          </rb.Button>

          <rb.Button
            variant="outline-dark"
            className={styles['settings-btn']}
            onClick={() => settingsDispatch({ unit: isSats ? BTC : SATS })}
          >
            <Sprite symbol={isSats ? BTC : SATS} width="24" height="24" />
            {isSats ? t('settings.use_btc') : t('settings.use_sats')}
          </rb.Button>

          <rb.Button
            variant="outline-dark"
            className={styles['settings-btn']}
            onClick={() => setTheme(isLightTheme ? window.JM.THEMES[1] : window.JM.THEMES[0])}
          >
            <Sprite symbol={isLightTheme ? window.JM.THEMES[0] : window.JM.THEMES[1]} width="24" height="24" />
            {isLightTheme ? t('settings.use_dark_theme') : t('settings.use_light_theme')}
          </rb.Button>

          <rb.Dropdown>
            <rb.Dropdown.Toggle variant="outline-dark" className={styles['settings-btn']}>
              <Sprite symbol="globe" width="24" height="24" />
              {languages.find((lng) => lng.key === (i18n.resolvedLanguage || i18n.language))?.description ||
                languages[0].description}
            </rb.Dropdown.Toggle>

            <rb.Dropdown.Menu variant={settings.theme === 'light' ? 'light' : 'dark'}>
              {languages.map((lng, index) => {
                return (
                  <rb.Dropdown.Item key={index} onClick={() => i18n.changeLanguage(lng.key)}>
                    {lng.description}
                  </rb.Dropdown.Item>
                )
              })}
              <rb.Dropdown.Item
                href="https://github.com/joinmarket-webui/jam/tree/master/src/i18n/README.md"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('settings.text_help_translate')}
              </rb.Dropdown.Item>
            </rb.Dropdown.Menu>
          </rb.Dropdown>
        </div>
        <div className={styles['section-title']}>{t('settings.section_title_market')}</div>
        <rb.Button variant="outline-dark" className={styles['settings-btn']} onClick={(e) => setShowingFeeConfig(true)}>
          <Sprite symbol="coins" width="24" height="24" />
          {t('settings.show_fee_config')}
        </rb.Button>
        {showingFeeConfig && <FeeConfigModal show={showingFeeConfig} onHide={() => setShowingFeeConfig(false)} />}

        {showLogsEnabled && (
          <>
            <rb.Button variant="outline-dark" className={styles['settings-btn']} onClick={() => setShowingLogs(true)}>
              <Sprite symbol="console" width="24" height="24" />
              {t('settings.show_logs')}
            </rb.Button>
            <LogOverlay currentWallet={wallet} show={showingLogs} onHide={() => setShowingLogs(false)} />
          </>
        )}
        <div className={styles['section-title']}>{t('settings.section_title_wallet')}</div>
        <div className={styles['settings-group-container']}>
          <rb.Button variant="outline-dark" className={styles['settings-btn']} onClick={(e) => setShowingSeed(true)}>
            <Sprite symbol="mnemonic" width="24" height="24" />
            {showingSeed ? t('settings.hide_seed') : t('settings.show_seed')}
          </rb.Button>
          {showingSeed && <SeedModal wallet={wallet} show={showingSeed} onHide={() => setShowingSeed(false)} />}

          <rb.Button
            variant="outline-dark"
            className={styles['settings-btn']}
            onClick={() => lockWallet({ force: false, destination: routes.walletList })}
          >
            {lockingWallet ? (
              <>
                <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="mx-1" />
                {t('settings.button_locking_wallet')}
              </>
            ) : (
              <>
                <Sprite symbol="lock" width="24" height="24" />
                {t('settings.button_lock_wallet')}
              </>
            )}
          </rb.Button>
          <Link to={routes.walletList} className={`btn btn-outline-dark ${styles['settings-btn']}`}>
            <Sprite symbol="wallet" width="24" height="24" />
            {t('settings.button_switch_wallet')}
          </Link>
          <rb.Button
            variant="outline-dark"
            className={styles['settings-btn']}
            onClick={() => lockWallet({ force: false, destination: routes.createWallet })}
          >
            {lockingWallet ? (
              <>
                <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="mx-1" />
                {t('settings.button_locking_wallet')}
              </>
            ) : (
              <>
                <Sprite symbol="plus" width="24" height="24" />
                {t('settings.button_create_wallet')}
              </>
            )}
          </rb.Button>

          {isDebugFeatureEnabled('rescanChainPage') && (
            <Link to={routes.rescanChain} className={`btn btn-outline-dark ${styles['settings-btn']}`}>
              <Sprite symbol="block" width="24" height="24" />
              {t('settings.button_rescan_chain')}
            </Link>
          )}
        </div>

        <div className={styles['section-title']}>{t('settings.section_title_community')}</div>
        <div className={styles['settings-links']}>
          <a
            href="https://matrix.to/#/%23jam:bitcoin.kyoto"
            target="_blank"
            rel="noopener noreferrer"
            className="link-dark"
          >
            <div className="d-flex align-items-center">
              <Sprite symbol="matrix" width="24" height="24" className="me-2 p-1" />
              {t('settings.matrix')}
            </div>
          </a>
          <a href="https://t.me/JoinMarketWebUI" target="_blank" rel="noopener noreferrer" className="link-dark">
            <div className="d-flex align-items-center">
              <Sprite symbol="telegram" width="24" height="24" className="me-2 p-1" />
              {t('settings.telegram')}
            </div>
          </a>
          <a href="https://twitter.com/jamapporg" target="_blank" rel="noopener noreferrer" className="link-dark">
            <div className="d-flex align-items-center">
              <Sprite symbol="twitter" width="24" height="24" className="me-2 p-1" />
              {t('settings.jam_twitter')}
            </div>
          </a>
          <a href="https://twitter.com/joinmarket" target="_blank" rel="noopener noreferrer" className="link-dark">
            <div className="d-flex align-items-center">
              <Sprite symbol="twitter" width="24" height="24" className="me-2 p-1" />
              {t('settings.jm_twitter')}
            </div>
          </a>
        </div>
        <div className={styles['section-title']}>{t('settings.section_title_dev')}</div>
        <div className={styles['settings-links']}>
          <a href="https://jamdocs.org" target="_blank" rel="noopener noreferrer" className="link-dark">
            <div className="d-flex align-items-center">
              <Sprite symbol="file" width="24" height="24" className="me-2" />
              {t('settings.documentation')}
            </div>
          </a>
          <a
            href="https://github.com/joinmarket-webui/jam"
            target="_blank"
            rel="noopener noreferrer"
            className="link-dark"
          >
            <div className="d-flex align-items-center">
              <Sprite symbol="github" width="24" height="24" className="me-2 p-1" />
              {t('settings.github')}
            </div>
          </a>
        </div>
      </div>
    </div>
  )
}
