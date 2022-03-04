import React from 'react'
import * as rb from 'react-bootstrap'
import Sprite from './Sprite'
import PageTitle from './PageTitle'
import { useSettings, useSettingsDispatch } from '../context/SettingsContext'
import { SATS, BTC } from '../utils'
import { useTranslation } from 'react-i18next'
import { supportedLanguages } from '../i18n'

export default function Settings({ currentWallet }) {
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
      <PageTitle title="Settings" />
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
          {settings.showBalance ? 'Hide' : 'Show'} balance
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
          Display amounts in {isSats ? BTC : SATS}
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
          Switch to {isLightTheme ? 'dark' : 'light'} theme
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
          Use {settings.useAdvancedWalletMode ? 'magic' : 'advanced'} wallet mode
        </rb.Button>

        <rb.Dropdown>
          <rb.Dropdown.Toggle variant="outline-dark" className="border-0 mb-2 d-inline-flex align-items-center">
            <Sprite symbol="globe" width="24" height="24" className="me-2" />
            {supportedLanguages.find((lng) => lng.key === i18n.language).description}
          </rb.Dropdown.Toggle>

          <rb.Dropdown.Menu variant={settings.theme === 'light' ? 'light' : 'dark'}>
            {supportedLanguages.map((lng, index) => {
              return (
                <rb.Dropdown.Item key={index} onClick={() => i18n.changeLanguage(lng.key)}>
                  {lng.description}
                </rb.Dropdown.Item>
              )
            })}
            <rb.Dropdown.Item href="https://t.me/JoinMarketWebUI">Missing your language? Help us out!</rb.Dropdown.Item>
          </rb.Dropdown.Menu>
        </rb.Dropdown>
      </div>
    </div>
  )
}
