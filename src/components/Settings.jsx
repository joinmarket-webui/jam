import React, { useEffect, useState } from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import Sprite from './Sprite'
import PageTitle from './PageTitle'
import Seedphrase from './Seedphrase'
import ToggleSwitch from './ToggleSwitch'
import { useSettings, useSettingsDispatch } from '../context/SettingsContext'
import { useCurrentWallet } from '../context/WalletContext'
import { SATS, BTC, walletDisplayName } from '../utils'
import * as Api from '../libs/JmWalletApi'
import languages from '../i18n/languages'

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
                  <ToggleSwitch label={t('settings.reveal_seed')} onToggle={(isToggled) => setRevealSeed(isToggled)} />
                </div>
              </div>
            </>
          )}
        </>
      </rb.Modal.Body>
    </rb.Modal>
  )
}

export default function Settings() {
  const { t } = useTranslation()
  const [showingSeed, setShowingSeed] = useState(false)
  const settings = useSettings()
  const settingsDispatch = useSettingsDispatch()
  const { i18n } = useTranslation()

  const setTheme = (theme) => {
    if (window.JM.THEMES.includes(theme)) {
      document.documentElement.setAttribute(window.JM.THEME_ROOT_ATTR, theme)
      settingsDispatch({ theme })
    }
  }

  const isSats = settings.unit === SATS
  const isLightTheme = settings.theme === window.JM.THEMES[0]

  return (
    <div>
      <PageTitle title={t('settings.title')} />
      <div style={{ marginLeft: '-.75rem' }}>
        <rb.Button
          variant="outline-dark"
          className="border-0 mb-2 d-inline-flex align-items-center"
          onClick={() => settingsDispatch({ showBalance: !settings.showBalance })}
        >
          <Sprite symbol={settings.showBalance ? 'hide' : 'show'} width="24" height="24" className="me-2" />
          {settings.showBalance ? t('settings.hide_balance') : t('settings.show_balance')}
        </rb.Button>

        <br />

        <rb.Button
          variant="outline-dark"
          className="border-0 mb-2 d-inline-flex align-items-center"
          onClick={() => settingsDispatch({ unit: isSats ? BTC : SATS })}
        >
          <Sprite symbol={isSats ? BTC : SATS} width="24" height="24" className="me-2" />
          {isSats ? t('settings.use_btc') : t('settings.use_sats')}
        </rb.Button>

        <br />

        <rb.Button
          variant="outline-dark"
          className="border-0 mb-2 d-inline-flex align-items-center"
          onClick={(e) => setTheme(isLightTheme ? window.JM.THEMES[1] : window.JM.THEMES[0])}
        >
          <Sprite
            symbol={isLightTheme ? window.JM.THEMES[0] : window.JM.THEMES[1]}
            width="24"
            height="24"
            className="me-2"
          />
          {isLightTheme ? t('settings.use_dark_theme') : t('settings.use_light_theme')}
        </rb.Button>

        <br />

        <rb.Button
          variant="outline-dark"
          className="border-0 mb-2 d-inline-flex align-items-center"
          onClick={(e) => settingsDispatch({ useAdvancedWalletMode: !settings.useAdvancedWalletMode })}
        >
          <Sprite
            symbol={settings.useAdvancedWalletMode ? 'wand' : 'console'}
            width="24"
            height="24"
            className="me-2"
          />
          {settings.useAdvancedWalletMode ? t('settings.use_normal_mode') : t('settings.use_dev_mode')}
        </rb.Button>

        <br />

        <rb.Dropdown>
          <rb.Dropdown.Toggle variant="outline-dark" className="border-0 mb-2 d-inline-flex align-items-center">
            <Sprite symbol="globe" width="24" height="24" className="me-2" />
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
              rel="noopener noreferrer"
            >
              {t('settings.text_help_translate')}
            </rb.Dropdown.Item>
          </rb.Dropdown.Menu>
        </rb.Dropdown>

        <rb.Button
          variant="outline-dark"
          className="border-0 mb-2 d-inline-flex align-items-center"
          onClick={(e) => setShowingSeed(true)}
        >
          <Sprite symbol="mnemonic" width="24" height="24" className="me-2" />
          {showingSeed ? t('settings.hide_seed') : t('settings.show_seed')}
        </rb.Button>
        {showingSeed && <SeedModal show={showingSeed} onHide={() => setShowingSeed(false)} />}
      </div>
    </div>
  )
}
