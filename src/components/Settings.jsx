import React from 'react'
import * as rb from 'react-bootstrap'
import { useSettings, useSettingsDispatch } from '../context/SettingsContext'
import { SATS, BTC } from '../utils'

export default function Settings({ currentWallet }) {
  const settings = useSettings()
  const settingsDispatch = useSettingsDispatch()

  return (
    <div>
      <h1>Settings</h1>
      <rb.Form.Check
        type="switch"
        label="Show balances"
        checked={settings.showBalance}
        onChange={(e) => settingsDispatch({ showBalance: e.target.checked })}
      />
      <rb.Form.Check
        type="switch"
        label={`Display amounts in ${SATS}`}
        checked={settings.unit === SATS}
        onChange={(e) => settingsDispatch({ unit: e.target.checked ? SATS : BTC })}
        className="mb-4"
      />
    </div>
  )
}
