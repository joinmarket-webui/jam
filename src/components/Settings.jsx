import React, { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import Sprite from './Sprite'
import Seedphrase from './Seedphrase'
import ToggleSwitch from './ToggleSwitch'
import Alert from './Alert'
import { ConfirmModal } from './Modal'
import { useSettings, useSettingsDispatch } from '../context/SettingsContext'
import { useCurrentWallet } from '../context/WalletContext'
import { useServiceInfo } from '../context/ServiceInfoContext'
import { SATS, BTC, walletDisplayName } from '../utils'
import * as Api from '../libs/JmWalletApi'
import { routes } from '../constants/routes'
import languages from '../i18n/languages'
import styles from './Settings.module.css'

function SeedModal({ show = false, onHide }) {
  const { t } = useTranslation()
  const currentWallet = useCurrentWallet()
  const [revealSeed, setRevealSeed] = useState(false)
  const [seedError, setSeedError] = useState(false)
  const [seed, setSeed] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadSeed = async () => {
      setIsLoading(true)
      try {
        const { name: walletName, token } = currentWallet
        const res = await Api.getWalletSeed({ walletName, token })
        const { seedphrase } = await (res.ok ? res.json() : Api.Helper.throwError(res))

        setIsLoading(false)
        setSeed(seedphrase)
      } catch (e) {
        setIsLoading(false)
        setSeedError(true)
      }
    }

    if (show) {
      loadSeed()
    }
  }, [show, currentWallet])

  return (
    <rb.Modal size="lg" show={show} onHide={onHide} keyboard={false} centered={true} animation={true}>
      <rb.Modal.Header closeButton>
        <rb.Modal.Title>{walletDisplayName(currentWallet.name)}</rb.Modal.Title>
      </rb.Modal.Header>
      <rb.Modal.Body>
        <>
          {isLoading && (
            <div className="d-flex justify-content-center align-items-center">
              <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
            </div>
          )}
          {seedError && (
            <div className="text-danger" style={{ marginLeft: '1rem' }}>
              {t('settings.error_loading_seed_failed')}
            </div>
          )}
          {seed && (
            <>
              <div className="mb-4">{t('settings.seed_modal_info_text')}</div>
              <rb.Row className="justify-content-center align-items-center">
                <rb.Col xs={12} md={10} className="mb-4">
                  <Seedphrase seedphrase={seed} centered={true} isBlurred={!revealSeed} />
                </rb.Col>
              </rb.Row>
              <div className="d-flex justify-content-center align-items-center">
                <div className="mb-2">
                  <ToggleSwitch
                    label={t('settings.reveal_seed')}
                    toggledOn={revealSeed}
                    onToggle={(isToggled) => setRevealSeed(isToggled)}
                  />
                </div>
              </div>
            </>
          )}
        </>
      </rb.Modal.Body>
    </rb.Modal>
  )
}

export default function Settings({ stopWallet }) {
  const [showingSeed, setShowingSeed] = useState(false)
  const [lockingWallet, setLockingWallet] = useState(false)
  const [showConfirmLockModal, setShowConfirmLockModal] = useState(null)
  const [alert, setAlert] = useState(null)

  const { t } = useTranslation()
  const settings = useSettings()
  const settingsDispatch = useSettingsDispatch()
  const { i18n } = useTranslation()
  const currentWallet = useCurrentWallet()
  const navigate = useNavigate()
  const serviceInfo = useServiceInfo()

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
        const { name: walletName, token } = currentWallet
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
    [currentWallet, stopWallet, navigate, serviceInfo]
  )

  return (
    <div className={styles.settings}>
      <div className="d-flex flex-column gap-3">
        <div className={styles['section-title']}>{t('settings.title')}</div>
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
            onClick={(e) => setTheme(isLightTheme ? window.JM.THEMES[1] : window.JM.THEMES[0])}
          >
            <Sprite symbol={isLightTheme ? window.JM.THEMES[0] : window.JM.THEMES[1]} width="24" height="24" />
            {isLightTheme ? t('settings.use_dark_theme') : t('settings.use_light_theme')}
          </rb.Button>

          <rb.Button
            variant="outline-dark"
            className={styles['settings-btn']}
            onClick={(e) => settingsDispatch({ useAdvancedWalletMode: !settings.useAdvancedWalletMode })}
          >
            <Sprite symbol={settings.useAdvancedWalletMode ? 'wand' : 'console'} width="24" height="24" />
            {settings.useAdvancedWalletMode ? t('settings.use_normal_mode') : t('settings.use_dev_mode')}
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
                href="https://github.com/joinmarket-webui/joinmarket-webui/tree/master/src/i18n/README.md"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('settings.text_help_translate')}
              </rb.Dropdown.Item>
            </rb.Dropdown.Menu>
          </rb.Dropdown>
        </div>

        <div className={styles['section-title']}>{t('settings.section_title_wallet')}</div>
        <div className={styles['settings-group-container']}>
          <rb.Button variant="outline-dark" className={styles['settings-btn']} onClick={(e) => setShowingSeed(true)}>
            <Sprite symbol="mnemonic" width="24" height="24" />
            {showingSeed ? t('settings.hide_seed') : t('settings.show_seed')}
          </rb.Button>
          {showingSeed && <SeedModal show={showingSeed} onHide={() => setShowingSeed(false)} />}

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
        </div>

        <div className={styles['section-title']}>{t('settings.section_title_community')}</div>
        <div className={styles['settings-links']}>
          <a
            href="https://github.com/joinmarket-webui/joinmarket-webui"
            target="_blank"
            rel="noopener noreferrer"
            className="link-dark"
          >
            <div className="d-flex align-items-center">
              <Sprite symbol="github" width="24" height="24" className="me-2 p-1" />
              {t('settings.github')}
            </div>
          </a>
          <a href="https://t.me/JoinMarketWebUI" target="_blank" rel="noopener noreferrer" className="link-dark">
            <div className="d-flex align-items-center">
              <Sprite symbol="telegram" width="24" height="24" className="me-2 p-1" />
              {t('settings.telegram')}
            </div>
          </a>
          <a href="https://twitter.com/joinmarket" target="_blank" rel="noopener noreferrer" className="link-dark">
            <div className="d-flex align-items-center">
              <Sprite symbol="twitter" width="24" height="24" className="me-2 p-1" />
              {t('settings.jm_twitter')}
            </div>
          </a>
        </div>
      </div>
    </div>
  )
}
