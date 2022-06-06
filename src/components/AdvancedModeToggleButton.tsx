import React from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import Sprite from './Sprite'
// @ts-ignore
import { useSettings, useSettingsDispatch } from '../context/SettingsContext'

export function AdvancedModeToggleButton() {
  const { t } = useTranslation()
  const settings = useSettings()
  const settingsDispatch = useSettingsDispatch()

  return (
    <rb.Button
      variant="outline-dark"
      className="border-0 d-inline-flex justify-content-center align-items-center"
      onClick={() => settingsDispatch({ useAdvancedWalletMode: !settings.useAdvancedWalletMode })}
    >
      <Sprite symbol={settings.useAdvancedWalletMode ? 'wand' : 'console'} width="20" height="20" className="me-2" />
      <small>{settings.useAdvancedWalletMode ? t('settings.use_normal_mode') : t('settings.use_dev_mode')}</small>
    </rb.Button>
  )
}
