import React from 'react'
import * as rb from 'react-bootstrap'
import Sprite from './Sprite'
import { useSettings, useSettingsDispatch } from '../context/SettingsContext'
import { SATS, BTC } from '../utils'

export default function Settings({ currentWallet }) {
  const settings = useSettings()
  const settingsDispatch = useSettingsDispatch()

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
      <h1 className="mb-4">Settings</h1>

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
      </div>
    </div>
  )
}
