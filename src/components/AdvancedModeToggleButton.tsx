import React, { useEffect, useState } from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import Sprite from './Sprite'
// @ts-ignore
import { useSettings } from '../context/SettingsContext'

interface AdvancedModeToggleLinkProps {
  onChange: (isAdvancedMode: boolean) => void
  initialValue?: boolean
}

export function AdvancedModeToggleButton({ onChange, initialValue = undefined }: AdvancedModeToggleLinkProps) {
  const { t } = useTranslation()
  const settings = useSettings()

  const [isAdvancedView, setIsAdvancedView] = useState<boolean>(
    initialValue !== undefined ? initialValue : settings.useAdvancedWalletMode
  )

  useEffect(() => {
    onChange(isAdvancedView)
  }, [onChange, isAdvancedView])

  return (
    <rb.Button
      variant="outline-dark"
      className="border-0 d-inline-flex justify-content-center align-items-center"
      onClick={() => setIsAdvancedView((current) => !current)}
    >
      <Sprite symbol={isAdvancedView ? 'wand' : 'console'} width="20" height="20" className="me-2" />
      <small>{isAdvancedView ? t('global.text_simple_view') : t('global.text_advanced_view')}</small>
    </rb.Button>
  )
}
