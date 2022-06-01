import React from 'react'
import * as rb from 'react-bootstrap'
import { Trans, useTranslation } from 'react-i18next'
// @ts-ignore
import PageTitle from './PageTitle'
// @ts-ignore
import { useSettings, useSettingsDispatch } from '../context/SettingsContext'
import { isFeatureEnabled } from '../constants/features'
import { FidelityBondAdvanced } from '../components/FidelityBondAdvanced'
import Sprite from './Sprite'

import styles from './FidelityBond.module.css'

function AdvancedModeToggleButton() {
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

export default function FidelityBond() {
  const featureFidelityBondsEnabled = isFeatureEnabled('fidelityBonds')

  const { t } = useTranslation()
  const settings = useSettings()

  if (!featureFidelityBondsEnabled) {
    return (
      <div>
        <h2>Feature not enabled</h2>
      </div>
    )
  }

  return (
    <div className={styles['fidelity-bond']}>
      <rb.Row>
        <rb.Col xs={{ span: 12, order: 2 }} sm={{ span: 'auto', order: 1 }}>
          <PageTitle title={t('fidelity_bond.title')} subtitle={t('fidelity_bond.subtitle')} />
        </rb.Col>
        <rb.Col
          xs={{ span: 12, order: 1 }}
          sm={{ span: 'auto', order: 2 }}
          className="ms-auto d-inline-flex justify-content-end align-items-start mb-4"
        >
          <AdvancedModeToggleButton />
        </rb.Col>
      </rb.Row>
      <rb.Row>
        <rb.Col>
          <div className="mb-4">
            <Trans i18nKey="fidelity_bond.description">
              <a
                href="https://github.com/JoinMarket-Org/joinmarket-clientserver/blob/master/docs/fidelity-bonds.md"
                target="_blank"
                rel="noopener noreferrer"
                className="text-secondary"
              >
                See the documentation about Fidelity Bonds
              </a>{' '}
              for more information.
            </Trans>
          </div>

          {settings.useAdvancedWalletMode ? (
            <rb.Alert variant="warning" className="mb-4">
              <Trans i18nKey="fidelity_bond.alert_warning_advanced_mode_active">
                You are in advanced mode. It is assumed that you know what you are doing.
                <br />
                <small>
                  e.g. a transaction creating a Fidelity Bond <b>should have no change</b>, etc.
                </small>
              </Trans>
            </rb.Alert>
          ) : (
            <rb.Alert variant="danger" className="mb-4">
              <Trans i18nKey="fidelity_bond.alert_warning_advanced_mode">
                Fidelity Bonds are currently only available in advanced mode.
              </Trans>
            </rb.Alert>
          )}

          {settings.useAdvancedWalletMode && <FidelityBondAdvanced />}
        </rb.Col>
      </rb.Row>
    </div>
  )
}
