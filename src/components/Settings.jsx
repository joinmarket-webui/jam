import React, { useState } from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import Sprite from './Sprite'
import PageTitle from './PageTitle'
import Seedphrase from './Seedphrase'
import ToggleSwitch from './ToggleSwitch'
import { useSettings, useSettingsDispatch } from '../context/SettingsContext'
import { SATS, BTC } from '../utils'
import * as Api from '../libs/JmWalletApi'
import languages from '../i18n/languages'

export default function Settings({ currentWallet }) {
  const { t } = useTranslation()
  const [seed, setSeed] = useState('')
  const [showingSeed, setShowingSeed] = useState(false)
  const [revealSeed, setRevealSeed] = useState(false)
  const [seedError, setSeedError] = useState(false)
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
      <PageTitle title={t('settings.heading')} />
      <div style={{ marginLeft: '-.75rem' }}>
        <rb.Button
          variant="outline-dark"
          className="border-0 mb-2 d-inline-flex align-items-center"
          onClick={(e) => {
            e.preventDefault()
            settingsDispatch({ showBalance: !settings.showBalance })
          }}
        >
          <Sprite symbol={settings.showBalance ? 'hide' : 'show'} width="24" height="24" className="me-2" />
          {settings.showBalance ? t('settings.hide_balance') : t('settings.show_balance')}
        </rb.Button>

        <br />

        <rb.Button
          variant="outline-dark"
          className="border-0 mb-2 d-inline-flex align-items-center"
          onClick={(e) => {
            e.preventDefault()
            settingsDispatch({ unit: isSats ? BTC : SATS })
          }}
        >
          <Sprite symbol={isSats ? BTC : SATS} width="24" height="24" className="me-2" />
          {isSats ? t('settings.use_btc') : t('settings.use_sats')}
        </rb.Button>

        <br />

        <rb.Button
          variant="outline-dark"
          className="border-0 mb-2 d-inline-flex align-items-center"
          onClick={(e) => {
            e.preventDefault()
            setTheme(isLightTheme ? window.JM.THEMES[1] : window.JM.THEMES[0])
          }}
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
          onClick={(e) => {
            e.preventDefault()
            settingsDispatch({ useAdvancedWalletMode: !settings.useAdvancedWalletMode })
          }}
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
          onClick={async (e) => {
            e.preventDefault()
            setSeedError(false)
            setRevealSeed(false)
            if (!showingSeed) {
              const { name: walletName, token } = currentWallet
              const res = await Api.getWalletSeed({ walletName, token })
              if (res.ok) {
                const { seedphrase } = await res.json()
                setSeed(seedphrase)
                setShowingSeed(!showingSeed)
              } else {
                setSeedError(true)
              }
            } else {
              setShowingSeed(!showingSeed)
            }
          }}
        >
          <Sprite symbol="mnemonic" width="24" height="24" className="me-2" />
          {showingSeed ? t('settings.hide_seed') : t('settings.show_seed')}
        </rb.Button>
        {seedError && (
          <div className="text-danger" style={{ marginLeft: '1rem' }}>
            {t('settings.error_loading_seed_failed')}
          </div>
        )}
        {showingSeed && (
          <div style={{ marginLeft: '1rem' }}>
            <div className="mb-4">
              <Seedphrase seedphrase={seed} isBlurred={!revealSeed} />
            </div>
            <div className="mb-2">
              <ToggleSwitch
                label={t('settings.reveal_seed')}
                onToggle={(isToggled) => {
                  setRevealSeed(isToggled)
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
